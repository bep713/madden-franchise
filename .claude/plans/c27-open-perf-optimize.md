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

### Step 4 - Schema/open (A1, A2; ~230 ms of 394 ms)
Files: `src/FranchiseSchema.js` (`evaluateSchemaGzip` :69), `src/FranchiseEnum.js`
- Build each `FranchiseEnum` once per enum name in `enumMap` (memo Map) and share across attributes instead of `new FranchiseEnum(...)` per attribute (:90, :103). Check no code mutates an attribute's enum instance (`addMember`, etc.) since sharing makes this visible across attributes.
- First split the 230 ms with a timer (gunzip vs JSON.parse vs enum build) to confirm enum build dominates before changing.
- Optional: cache parsed schema per path+mtime across opens (module-level Map). Only if consumers never mutate the schema object (extra-schema merge at :97-115 mutates `this.schemas`, so cache would need to cache pre-merge state or clone). Skip unless Step 4a leaves open slow.

### Step 5 - Small items (only if bench says worthwhile)
- B8 `_parseEmptyRecords` (177 ms): read next-pointer via `this.data.readUInt32BE(table1StartIndex + idx * record1Size)` instead of `records[idx].data` (also valid with lazy records).
- B9: enum value->member `Map` in `FranchiseEnum.getMemberByUnformattedValue` (`:75-106`), which currently does linear `filter`. Helps value reads, not read-all.
- B7: `byteArrayToLong(Buffer.from(...).reverse())` -> `readUInt32LE`.

## Out of scope / decided against
- B6 zstd decode (131 us/field): lazy already; leave unless asked.
- A4 inflate (2%), A5-A9: negligible.
- Worker threads / streaming: public API changes.

## Verification (per step)
1. `node --expose-gc perf/bench.mjs --scenario read-all --runs 10 --json perf/results/stepN.json`; compare median to baseline (3190 ms); also `open` for step 4, and `--trace-gc` for steps 2-3.
2. Fingerprint script output identical to `perf/results/fingerprint.json`.
3. `npm test` green (1215 passing), including c27 specs and save round-trip tests.
4. Keep a step only if median improves >= ~5% (Step 1/4/5) or >= 15% (Steps 2/3, higher risk); otherwise revert it.
5. Finally re-apply kept steps on `perf/c27-open` off master with no `perf/` code; rerun tests; review `git diff master` against this plan.

## Delegation
Medium size, tightly coupled files (Table, Record, Field). I implement it myself sequentially, Step 1 -> 5; no parallel subagents (steps touch the same files).

## Results log
- Step 1 (done, commit 8869aa3): read-all median 3190 -> 2675 ms (-16%), fingerprint identical, 1215 tests pass.
- Step 2 (tried, REVERTED): per-offsetTable generated record subclass with prototype accessors replacing the per-record Proxy. Fingerprint + tests passed, but read-all regressed to ~3600 ms (without a null-on-miss prototype Proxy) / ~4400 ms (with it). Cause: one hidden class per table makes the record ctor / parseRecordFields property-store sites megamorphic across 2267 tables, and a Proxy in the prototype chain slows every store. Dropping the Proxy would also change unknown-prop reads from null to undefined. Not worth pursuing; Proxy cost (~426 ms ctor) is better attacked by Step 3 (lazy fields) or by making the Proxy cheaper (e.g. cache `target.fields` in the get trap).
- Step 3 (done): lazy `_fields`/`_fieldsArray` in `FranchiseFileRecord` (materialized on first access; Proxy trap checks a per-offsetTable cached name Set so `index`/`data` etc. don't materialize). read-all median 2675 -> 1340 ms (-50%; 3190 baseline -> -58%), open unchanged (~382 ms), fingerprint identical, 1215 tests pass. Note: unknown-prop reads still return null; the `Object.prototype` names (`constructor`, `toString`) now resolve to the record instead of `fields.<name>.value` (previously undefined).
