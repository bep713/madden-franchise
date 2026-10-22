# C27 perf: optimization plan (session 2)

Follows `.claude/plans/c27-open-perf.md` (baseline). Baseline: open 394 ms, read-all 3190 ms (11.4M fields, 38% of time in GC, heap 1.8 GB).

## Goal
Cut read-all (Phase B) by >= 40% and open (Phase A) by ~30%, with zero behaviour change.
Guard: `perf/results/fingerprint.json` reproduced exactly + `npm test` (1215 passing) after every step.
Work on `perf/c27-profile` (harness there), then re-apply the winners without instrumentation on `perf/c27-open`.

## Steps (ordered by risk, then measured gain; each is its own commit-sized change, re-bench after each)

### Step 1 - Table2/Table3 passes: precompute per table (B4, B5; ~420 ms self + GC)
Files: `src/FranchiseFileTable.js` (`_parseTable2Values` :591, `_parseTable3Values` :613)
- Before the record loop, compute once from `this.loadedOffsets`: `table2Keys` = offsets with `valueInSecondTable`, `table3Keys` = offsets with `valueInThirdTable`, and `strategyContext` (one shared object per table; it holds only gameYear/gameType/tableName).
- Loop over records, look fields up via `record.fields[key]` (or index into `fieldsArray`, same order as offsetTable) instead of `fieldsArray.filter`. Skip tables where the list is empty.
- Overflow: only call `getTable3OverflowRecord` if the table has an `Overflow` offset (`utilService.js:224` stays as is; just gated).
- Risk: shared `strategyContext` object must not be mutated by strategies. Check `src/strategies/**/table3Field` for writes before sharing; else keep per-field copy only for tables where needed.
- Output order of `table2Records`/`table3Records` must stay record-major, field order within a record (fingerprint/save tests depend on it).

### Step 2 - Record construction (B2, B3; Proxy 426 ms + `readRecords` 203 ms)
Files: `src/FranchiseFileRecord.js` (ctor :10, Proxy :27), `src/FranchiseFileTable.js` (`readRecords` fn :962)
- `data.slice` -> `data.subarray` is NOT a pure win to assume: `slice` on Buffer already aliases memory in Node (same as subarray), so only micro-gain. Measure, keep only if it helps.
- Proxy: replace the per-record `Proxy` with a per-table generated record subclass whose prototype has getter/setter pairs for each offset name (built once from `offsetTable`). Preserves `record.FieldName` get/set returning `field.value`. Behaviour to preserve: unknown prop returns `null` (not undefined) via Proxy get; set of unknown prop assigns on target. Handle with a small fallback only if tests/consumers rely on it (grep tests for reading non-existent props); a name that collides with a real property of the record (`index`, `data`, `fields`, ...) currently resolves to the field first, keep that precedence.
- Highest-risk step; do after Step 1 and only if the benchmark shows Proxy cost is still material.

### Step 3 - Lazy field creation (B1; `parseRecordFields` 1828 ms self + most GC)
Files: `src/FranchiseFileRecord.js` (`parseRecordFields` :105, `fields`/`fieldsArray` getters :50-56, `data` setter :62, `clearCachedFieldValues` :162), `src/FranchiseFileField.js`, Table2/3 passes from Step 1.
- Make `_fields`/`_fieldsArray` materialize on first access (`fields`, `fieldsArray`, getFieldByKey, generated accessors from Step 2). Records never touched stay as a Buffer view + index only.
- Problem: Table2/Table3 passes currently touch every field with a table2/3 value to attach `secondTableField`/`thirdTableField` and push to `table2Records`/`table3Records` (consumed by save/`recalculate` logic). Those must still exist eagerly for such fields. So eager creation only for fields in `table2Keys`/`table3Keys`; the rest created lazily. This needs `fieldsArray` ordering preserved when partially materialized: simplest is all-or-nothing per record, materialized eagerly only for records in tables with table2/3 (Player etc.), lazily for others (stats tables: GameDefensiveStats 45k x 23, etc.).
- Also `isChanged` setter and `data` setter iterate fields: iterate only if materialized.
- Gain: avoids ~most of 11.4M allocations in non-table2/3 tables; Player table (855 ms) improves only via Step 1.
- Before starting: grep all `fieldsArray`/`.fields` consumers in `src/` and `tests/` to confirm laziness is invisible.

### Step 3b - Per-field materialization (Table2/Table3 passes; next to implement)
Files: `src/FranchiseFileRecord.js`, `src/FranchiseFileTable.js` (`_parseTable2Values`, `_parseTable3Values`, `_getFieldIndexes`), `src/services/utilService.js` (`getTable3OverflowRecord`).
Why: after Step 3, the table2/3 passes call `record.fieldsArray`, which fully materializes every record in the 197 tables with table2/3 offsets. Measured on C27 (`perf/t3count.mjs`): 5.79M of 11.39M fields are still created, but only 208k (3.6%) are table2/3 fields. Player alone: 16500 x 282 fields to reach 5 strings (830 of 1340 ms read-all). Season*Stats tables are ~100% empty records fully materialized for 1 string column. Table3 alone is negligible (CharacterVisuals 16000 x 2, CharacterGameplay 1 field); the gain is table2, same fix covers both.
- Add `record._getField(name)`: create + cache a single field in a partial cache. Route `getFieldByKey`, Proxy get/set traps, `getTable3OverflowRecord` (via `getFieldByKey`) and the table2/3 passes through it. Passes iterate precomputed offset names instead of `fieldsArray` indexes; keep record-major, offset-order push into `table2Records`/`table3Records`.
- `fields` / `fieldsArray` getters: full materialization that REUSES already-created field instances (identity matters: `table2Records` holds `field.secondTableField`). Rebuild the `fields` object in offset order so `Object.keys(record.fields)` order is unchanged.
- Correctness trap: `data` setter, `isChanged` setter and `clearCachedFieldValues` currently no-op when `_fieldsArrayCache === null`. They must iterate the partial cache, otherwise `_onRecordEmpty`/`empty()` leave stale cached values in already-created Overflow/string fields.
- Check first: any offset table with duplicate `name`s (index-based Step 1 tolerates them, a name-keyed cache would merge them). If found, key the partial cache by offset index instead.
- Keep `table2Records`/`table3Records` eager: `CommonAlgorithms.save` walks all units to shift offsets; deferring them to save time is riskier for little extra gain.
- Expected: ~5.6M fewer field allocations (similar to what Step 3 removed); estimate read-all ~600-800 ms, unmeasured. Keep threshold: >= 15%.

### Step 3c - Shared Proxy handler
Files: `src/FranchiseFileRecord.js` (ctor :40)
- The ctor builds a new handler object + 2 closures per record (~1.5M allocations over 526k records). Hoist to one module-level handler; get field names from `getFieldNames(target._offsetTable)` (WeakMap-cached). Still one Proxy shape, so no megamorphism (unlike reverted Step 2). Low risk; keep if >= 5%.

### Step 4 - Schema/open (A1, A2; ~230 ms of 394 ms)
Files: `src/FranchiseSchema.js` (`evaluateSchemaGzip` :69), `src/FranchiseEnum.js`
- Build each `FranchiseEnum` once per enum name in `enumMap` (memo Map) and share across attributes instead of `new FranchiseEnum(...)` per attribute (:90, :103). Check no code mutates an attribute's enum instance (`addMember`, etc.) since sharing makes this visible across attributes.
- First split the 230 ms with a timer (gunzip vs JSON.parse vs enum build) to confirm enum build dominates before changing.
- Optional: cache parsed schema per path+mtime across opens (module-level Map). Only if consumers never mutate the schema object (extra-schema merge at :97-115 mutates `this.schemas`, so cache would need to cache pre-merge state or clone). Skip unless Step 4a leaves open slow.

### Step 5 - Small items (only if bench says worthwhile)
- B8 `_parseEmptyRecords` (177 ms at baseline): after Step 3 it no longer materializes fields, so likely negligible now; re-bench before touching. If still material: read next-pointer via `this.data.readUInt32BE(table1StartIndex + idx * record1Size)` instead of `records[idx].data`.
- B9: enum value->member `Map` in `FranchiseEnum.getMemberByUnformattedValue` (`:75-106`), which currently does linear `filter`. Helps value reads, not read-all.
- B7: `byteArrayToLong(Buffer.from(...).reverse())` -> `readUInt32LE`.
- A5 (strategy header parse, open): `strategy.table.parseHeader` runs twice per table (`FranchiseFile.parse` :159 and the `FranchiseFileTable` ctor :108), 4534 calls = 10-23 ms per open (~3-4% of open). Pass the already-parsed header into the table ctor (optional ctor arg; keep the ctor's own parse as fallback for direct callers and for `:386` reset path). Saves ~5-11 ms. Optionally also make `readTableName` (`M20TableHeaderStrategy.js:131`) build the name via `data.toString('latin1', 0, nul)` instead of char-by-char `+=`, only if it measures. Lowest priority: under the 5% bar by itself; do it only bundled with other Step 5 items.

## Out of scope / decided against
- B6 zstd decode (131 us/field): lazy already; leave unless asked.
- A4 inflate (2%), A5-A9: negligible.
- Worker threads / streaming: public API changes.
- Lazy-loading strategy modules (library load): `StrategyPicker` statically imports every game's strategies; importing it from `src/` costs ~60 ms of the ~97 ms `src/index.js` import, but the profile shows that is ESM loader overhead (resolve/stat/compile of ~40 files), not strategy code. Consumers load the bundle (`dist/index.cjs`/`.mjs`): ~37 ms warm for the whole library. Lazy loading would need async `StrategyPicker.pick` (API change). Not worth it.
- Strategy hooks on the read path: `table2Field.getInitialUnformattedValue` ~20 ms / 175k calls and `table3Field.getInitialUnformattedValue` (zstd, incl. overflow `Buffer.concat`) ~3-8 ms / 33k calls per read-all (~1.5% of ~1.4-1.7 s). `parseHeaderAttributesFromSchema` <0.5 ms per open. Zstd dictionary / ISON lookup loading is lazy (first `.value`) and cached; `TDB2Converter` reads ~4 KB of JSON at import (negligible).

## Verification (per step)
1. `node --expose-gc perf/bench.mjs --scenario read-all --runs 10 --json perf/results/stepN.json`; compare median to baseline (3190 ms); also `open` for step 4, and `--trace-gc` for steps 2-3.
2. Fingerprint script output identical to `perf/results/fingerprint.json`.
3. `npm test` green (1215 passing), including c27 specs and save round-trip tests.
4. Save-path byte comparison vs master on C27 (read-all + fingerprint only cover reads; Steps 3/3b risk is in save/empty paths). Build once before Step 3b, then run after every step:
   - save with no edits;
   - edit a Player string (table2) and save;
   - empty a record, then un-empty it (`recalculateStringOffsets` path), and save;
   - CharacterVisuals table3 write large enough to hit the overflow path, and save.
   Output buffers must be byte-identical to the same script run on master.
5. Keep a step only if median improves >= ~5% (Steps 1/3c/4/5) or >= 15% (Steps 2/3/3b, higher risk); otherwise revert it.
6. Finally re-apply kept steps on `perf/c27-open` off master with no `perf/` code; rerun tests; review `git diff master` against this plan. PR description must call out the Step 3 behaviour change (`record.constructor` / `record.toString` resolve to the record's own members), since the goal says zero behaviour change.

## Next order
3c, 5a, 5b done; A5+B7 tried and reverted; B9 skipped. Step 6 done locally (worktree `../madden-franchise-c27-open`). Remaining: push + PR. Save-path check: `node perf/savecmp.mjs --root . --json perf/results/save-<step>.json`, compare to `perf/results/save-master.json` (from the master worktree).

## Delegation
Medium size, tightly coupled files (Table, Record, Field). I implement it myself sequentially, Step 1 -> 3b -> 3c -> 5; no parallel subagents (steps touch the same files).

## Results log
- Step 1 (done, commit 8869aa3): read-all median 3190 -> 2675 ms (-16%), fingerprint identical, 1215 tests pass.
- Step 2 (tried, REVERTED): per-offsetTable generated record subclass with prototype accessors replacing the per-record Proxy. Fingerprint + tests passed, but read-all regressed to ~3600 ms (without a null-on-miss prototype Proxy) / ~4400 ms (with it). Cause: one hidden class per table makes the record ctor / parseRecordFields property-store sites megamorphic across 2267 tables, and a Proxy in the prototype chain slows every store. Dropping the Proxy would also change unknown-prop reads from null to undefined. Not worth pursuing; Proxy cost (~426 ms ctor) is better attacked by Step 3 (lazy fields) or by making the Proxy cheaper (e.g. cache `target.fields` in the get trap).
- Step 3 (done): lazy `_fields`/`_fieldsArray` in `FranchiseFileRecord` (materialized on first access; Proxy trap checks a per-offsetTable cached name Set so `index`/`data` etc. don't materialize). read-all median 2675 -> 1340 ms (-50%; 3190 baseline -> -58%), open unchanged (~382 ms), fingerprint identical, 1215 tests pass. Note: unknown-prop reads still return null; the `Object.prototype` names (`constructor`, `toString`) now resolve to the record instead of `fields.<name>.value` (previously undefined).
- Save-path check built (`perf/savecmp.mjs`, 4 scenarios: no edit, Player string edit, empty/un-empty with autoUnempty, CharacterVisuals overflow write). Step 3 is byte-identical to master.
- Step 3b (done): per-field creation via `record._getFieldAt(index)` (partial cache keyed by offset index; name->index map per offsetTable, last-wins like `fields`). Table2/3 passes, Proxy traps and `getFieldByKey` create only the field they need; `fields`/`fieldsArray` reuse created instances; `data`/`isChanged`/`clearCachedFieldValues` iterate created fields. No duplicate offset names on C27. read-all median 1340 -> 614 ms (-54%; -81% vs 3190 baseline), Player 830 -> 80 ms; open unchanged (~400 ms). Fingerprint identical, save-path identical to master, 1215 tests pass (unit `RecordStub` got a `_getFieldAt`). select-all (full materialization + `.value`) 11.7 s vs 11.4-12.3 s before: no regression; it needs `--max-old-space-size=8192` (OOMs at default heap on Step 3 too). Behaviour note: `getFieldByKey('toString')` etc. now returns undefined instead of an `Object.prototype` function.
- Step 4 (measured, NOT implemented): split of `evaluateSchemaGzip` on C27_468_2.gz (4 runs, warm): readFile 1-2 ms, gunzip 54-76 ms, JSON.parse 196-308 ms, enum build 2-13 ms (2079 enum attributes). The C27 schema is V1 (denormalized, `enumMap` empty), so there is nothing to share/memoize and the enum build is <5% of schema load. Hypothesis A2 refuted. The only remaining lever is a cross-open parsed-schema cache (saves ~250 ms on 2nd+ open in one process), which needs cloning/pre-merge caching because extra-schema merge and per-attribute enum instances are mutable; skipped (risk vs. benefit, single-open consumers gain nothing). No src changes.
- Step 3c (done): one module-level Proxy handler; traps look up field indexes via `getFieldIndexes(target._offsetTable)` (WeakMap). Same-session A/B, 10 runs: read-all median ~607 -> ~562 ms (-7%), open unchanged (~392 ms). Fingerprint identical, save-path identical to master, 1215 tests pass.
- Re-profile after 3c (cpu-prof, per run): `_parseEmptyRecords` ~107 ms (record `.data` via Proxy trap), Proxy `get` trap ~120 ms (internal `_getFieldAt` / `_fieldCache` / `_data` accesses in the table2/3 passes go through the trap), GC ~350 ms.
- Step 5a / B8 (done): `_parseEmptyRecords(true)` reads next pointers from `this.data` (only from `readRecords`; the `recalculateEmptyRecordReferences` caller keeps the record path since it doesn't `updateBuffer` first); post-read loop sets `isEmpty` only on empty records and `arraySize` only for array tables. read-all ~567 -> ~521 ms (-8%). Fingerprint, save-path identical, 1215 tests pass.
- Step 5b (done): Proxy get trap returns the raw record for a module-private `RAW_RECORD` symbol; `_getFieldAt` switches to the raw record, so its internal accesses skip the traps. Fields now always get the raw record as `parent` (matches master; after 3b, fields created via the proxy had the proxy as parent). read-all ~521 -> ~416 ms (-20%; -87% vs 3190 baseline), open unchanged. Fingerprint, save-path identical, 1215 tests pass.
- select-all after 5b vs master (same session, 3 runs + 2 warmup, `--max-old-space-size=8192`, `perf/results/step5b-select.json` / `master-select.json`): total median 11573 vs 12300 ms (-6%). readRecords 478 vs 3181 ms, but serialize (`field.value` on every field) 10670 vs 8548 ms: the read work moves to first access instead of disappearing. Peak heap ~4.3 GB on both. Player ~4.2 s on both dominates.
- Strategy audit (measured, `perf/strat.mjs`, 3 runs, wrapper overhead included): C27 uses M26Strategy (M24 table/header, M20 table2, zstd table3). Open: `parseHeader` 10-23 ms (x2 per table, see Step 5 A5), `parseHeaderAttributesFromSchema` <0.5 ms. Read-all: table2 initial ~20 ms, table3 initial 3-8 ms. Library import: `src/index.js` ~97 ms (StrategyPicker graph ~60 ms, all ESM loader overhead), `dist` bundle ~37 ms. Conclusion: no strategy has a material negative effect on open or library load; only A5 added (Step 5, lowest priority).
- Step 5c / A5+B7 (tried, REVERTED): pass the already-parsed header into the `FranchiseFileTable` ctor + `readUInt32BE` in `parseOffsetTableFromData`. open median 388.6 -> 385.4 ms (-0.8%, 15 runs), under the 5% bar even bundled. B9 (enum value Map) skipped: members are mutable (`addMember`, `setMemberLength` rewrites `unformattedValue`), so a cache needs invalidation, and read-all doesn't exercise it.
- Step 6 (done locally): `perf/c27-open` off master (worktree `C:\Projects\madden-franchise-c27-open`), 6 commits cherry-picked (Step 1, 3, 3b, 3c, 5a, 5b) without `.claude/plans`. src/tests byte-identical to `perf/c27-profile`, no instrumentation in the diff, 1215 tests pass, savecmp identical to `save-master.json`. Not pushed yet.
- Madden cross-check (M26 `tests/data/CAREER-26COMPRESS`, 1895 tables, 371k records, 6.77M fields; bench `--skip-errors`, 2x interleaved, 12 runs each): read-all median master ~1582 ms -> step 5b ~262 ms (-83%), heap after read 1056 -> 194 MB; open unchanged (~103 ms). Player 204 -> 12 ms. Fingerprint identical except `PlayableMomentRequest` (pre-existing schema failure on both sides): after the failed `readRecords`, master leaves `records.length` 0 and the branch leaves 64, because field parse now throws in the table2 pass after `records` is assigned (error path only).
