# Full-read perf: field value decoding (plan, not started)

Separate from `.claude/plans/c27-open-perf-optimize.md`. That plan made sparse/lazy reads cheap (read-all -87%). This one targets **full table reads**: `readRecords`, then `.value` on every field via `fieldsArray` (what madden-franchise-editor `FranchiseFileManager._serializeRecord` does).

Base branch: whatever contains the c27-open work (`perf/c27-open`, or master once that PR merges). The steps below assume lazy fields (`_getFieldAt`, `_fieldCache`) from that work. The `perf/` harness is excluded from git (`.git/info/exclude`); copy it over from `perf/c27-profile` if the new worktree lacks it.

## Baseline (measured 2026-10-21 on `perf/c27-profile` @ c1ff8b4, C27 file, Node 22.19)
`node --expose-gc --max-old-space-size=8192 --cpu-prof perf/bench.mjs --scenario select-big --big-n 8 --runs 2 --warmup 1`
- 8 biggest tables, 151,880 records, 7.73M fields. readRecords 128 ms, serialize (`field.value`) ~5.8 s per pass. Player 3.9 s of that.
- Heap after read: 2.6 GB (includes the bench's output objects).
- Per-pass cost from the CPU profile (4 passes aggregated / 4):

| Cost | ~ms / pass | Where |
|---|---|---|
| GC | ~2000 (31% of all samples) | per-field allocations |
| Enum lookup (self) | ~1140 | `src/FranchiseEnum.js:75` `getMemberByUnformattedValue` |
| `parseRecordFields` (self, incl. inlined Field ctor) | ~600 | `src/FranchiseFileRecord.js:149` |
| `BitView` construction | ~380 + GC | `src/FranchiseFileField.js:252`, `bit-buffer.js:11` |
| `dec2bin` | ~150 | `src/services/utilService.js:11` |
| Reference string build | ~85 | `utilService.getBinaryReferenceData` :218 |

- Memory: one `BitView` + its `Uint8Array` = **146 B** (measured, 1M instances). 7.7M fields -> ~1.1 GB; full select-all (11.4M fields) -> ~1.6 GB of the ~4.3 GB peak.
- Re-take this baseline on the base branch before Step 1, plus a full `select-all` (3 runs + 2 warmup, `--max-old-space-size=8192`).

## Goal
Cut full-read serialize time by >= 40% and peak heap by >= 1 GB on C27 select-all, with zero behaviour change to existing APIs.

## Steps (each its own commit, re-bench after each)

### Step 1 - Enum decode cache (biggest CPU item, low risk)
Files: `src/FranchiseEnum.js`, `src/FranchiseFileField.js` (`_parseFieldValue` enum branch :297-313).
- Today, per enum read: `dec2bin(raw, enum._maxLength)` string, then `filter` over all members (closure + 2 string compares each), then `find`; a miss throws an `Error` (stack capture) that `_parseFieldValue` catches and turns into the binary string.
- Add to `FranchiseEnum` a lazily built `Map<number, string>` from raw bits to the final `_parseFieldValue` result (member name, or the binary string on a miss). Add a method, e.g. `getNameByRawValue(raw)`, that computes on a miss using the current logic exactly (dec2bin + `getMemberByUnformattedValue` in try/catch) and memoizes. The result is a pure function of `raw` and the enum state, so outputs can't change.
- Invalidation: clear in `addMember` and `setMemberLength`; also when `_members.length` or `_maxLength` differs from the values recorded when the cache was built (covers external `enum.members.push(...)`). `FranchiseEnumValue._unformattedValue` only changes via `setMemberLength`, which goes through the enum.
- Check first: any code outside `FranchiseEnum` that mutates members or `_maxLength` (grep `src/`, `tests/`, and the editor repo).
- Cache size is bounded by the distinct raw values actually seen per enum.
- Expected: ~1.1-1.3 s per pass (~20%), plus less GC (no throw/closures).

### Step 2 - No per-field `BitView` on the read path (biggest memory item)
Files: `src/FranchiseFileField.js`, `src/services/utilService.js` (new helper).
- Add `utilService.getBitsBE(buf, bitOffset, bits)`: a copy of bit-buffer's `getBits` big-endian branch over a Buffer (same loop, same bounds-check error, `>>> 0` result), and `getFloat32BE(buf, bitOffset)` via a module-level scratch `DataView` (same as `BitView.getFloat32`). Same algorithm on the same bytes, so values come out the same.
- The field's read source is `this._unformattedValue` if set (it may be a caller-supplied BitView over another buffer via `setUnformattedValueWithoutChangeEvent`), else `this._recordBuffer` through the helpers. `_parseFieldValue` takes the source and branches; keep the BitView path for set sources.
- `value` getter: stop calling `_setUnformattedValueIfEmpty` on read; cache with `_value` (init `_value = null` in the ctor). `clearCachedValues` still nulls both, so the next read re-reads the record buffer (same as today).
- Create the BitView only where callers need one: `unformattedValue` getter, `value` setter, `getValueAs`, `referenceData` (or make `referenceData` use the helper too). `FranchiseFileTable2Field`/`Table3Field` offset setters call `fieldReference.unformattedValue.setBits(...)`, which goes through the getter: fine.
- Trap: today `_setUnformattedValueIfEmpty` also resets `_value` to null on the first read after `clearCachedValues`; the new cache check must give the same result (both null after clear -> recompute).
- Rejected alternative: one shared BitView per record. Cheaper to do, but a caller changing `bigEndian` (or anything else) on one field's `unformattedValue` would affect its siblings.
- Expected: -146 B and 2 allocations per read field (~1.1 GB on select-big, ~1.6 GB on select-all), ~0.4 s CPU plus a large share of GC.

### Step 3 - Build the `fields` object only when `.fields` is used
Files: `src/FranchiseFileRecord.js` (`parseRecordFields` :149, `_fields` / `_fieldsArray` getters :86-98).
- `fieldsArray` should build only the array (preallocated to `_offsetTable.length`, reusing `_getFieldAt`). Build the name-keyed `fields` object on first `.fields` access, in offset order (last-wins on duplicate names, as today), so `Object.keys(record.fields)` order is unchanged.
- `parseRecordFields()` is public and returns the object: keep its contract (builds both).
- Check `src/` for internal `.fields` uses on hot paths (save, table2/3 passes) that would just move the cost.
- Expected: unknown split; the ~600 ms self time includes the inlined Field ctor. Keep only if >= 5%.

### Step 4 - Small items (bundle; keep if >= 5% together)
- Reference values (`_parseFieldValue` :314-330): `dec2bin(getBits(offset, 32), 32)` instead of `getReferenceDataFromBitview` + `getBinaryReferenceData`. That is the same string: 15-bit tableId then 17-bit rowNumber, contiguous big-endian bits. Keep the try/catch fallback.
- `int[]` branch (:346-357) and the setter (:172-182): `2 ** (offset.length - 1)` instead of `getMaxValueBinary` + `bin2dec` (regex test + parseInt per read).
- Field shape: init `_value = null` (Step 2) and always set `secondTableField` / `thirdTableField` (null when unused), so every field shares one hidden class. Check no consumer tests `'secondTableField' in field` / `hasOwnProperty`.

### Step 5 (optional, opt-in API) - Field-free value reads
- e.g. `record.toValues()` -> `{ [name]: value }` (or `table.getRecordValues(index)`), decoding straight from the record buffer with the Step 1/2 helpers. Reuse a field's cached value when that field already exists (it may hold unsaved edits); otherwise decode without creating a Field.
- Removes the remaining Field object (~80+ B) per field and most of the remaining GC for read-only bulk consumers. Existing API unchanged; the editor needs to switch `_serializeRecord` to benefit (separate editor change; that function also reads `f.value` twice per field).
- Decide after Steps 1-4 are measured.

## Out of scope
- Table2 string decode (`FranchiseFileTable2Field.value` regex): ~40 ms/pass. Not worth the `/\0.*$/` edge-case risk (a newline after the NUL changes the match).
- Write paths (`getMemberByName` / `getMemberByValue` linear scans): not on the read path.

## Verification (per step)
1. `node --expose-gc --max-old-space-size=8192 perf/bench.mjs --scenario select-all --runs 3 --warmup 2 --json perf/results/fr-stepN.json`, plus `select-big --big-n 8` for faster iteration and `read-all` (must not regress). Record serialize median and heap after read.
2. Value fingerprint: the existing fingerprint covers read-all only. Before Step 1, add a select-all value fingerprint (hash of every `field.value` per table, plus `referenceData` for reference fields) on the base branch; every step must reproduce it exactly.
3. `node perf/savecmp.mjs --root . --json perf/results/save-fr-stepN.json` identical to the base branch's output (Step 2 touches the setter/BitView path).
4. `npm test` green. Add unit tests for: the enum cache invalidating after `addMember` / `setMemberLength`; `getBitsBE` matching `BitView.getBits` (big-endian) on random offsets/lengths up to 32 bits, including the out-of-range error; and reading a value after `setUnformattedValueWithoutChangeEvent` with a foreign BitView, then after `clearCachedValues`.
5. M26 cross-check (`tests/data/CAREER-26COMPRESS`, `--skip-errors`) for the final result.
6. Keep thresholds: Steps 1-2 >= 10% serialize time or >= 500 MB heap; Steps 3-4 >= 5%; otherwise revert.

## Delegation
Same files across steps (Field, Record, Enum). Implement sequentially, no parallel subagents.
