# C27 file-open + record-read performance: profiling & baseline plan

Living document. Session 1 = profile + baseline (fill in "Baseline results"). Session 2 = optimize.

## Context
Opening a college 27 save (`tests/data/DYNASTY-27COMPRESS`, 9.6 MB compressed, franchise format, ~30 MB inflated) is slow.
Two phases, **both in scope, record reading is the primary focus**:
- **Phase A, open**: `FranchiseFile.create(path)` -> constructor + `parse()` (inflate, schema load, table split/headers).
- **Phase B, record read**: `table.readRecords()` for each table (lazy, per table). This is where a real consumer pays for "opening" C27 (e.g. reading every table, or big ones like player/visuals tables with zstd table3 fields). Includes record/field object creation, table2 (strings) and table3 (zstd blobs) parsing.

Profiling code must not land in the module: work on a throwaway branch, keep only changes that improve perf.

## Setup (first thing next session)
1. Copy test data; never touch originals (tests depend on them):
   `tests/data/DYNASTY-27COMPRESS` -> `C:\Users\Matt\AppData\Local\Temp\claude\C--Projects-madden-franchise\62a40e3f-3455-49ef-9161-d99e79894367\scratchpad\perf\C27-baseline` (outside repo; harness reads from here). Also copy this plan into the repo at `.claude/plans/c27-open-perf.md` (untracked) so it survives discarding the branch.
2. Branch `perf/c27-profile` from master (harness + instrumentation only). Winners are re-applied cleanly (no instrumentation) on `perf/c27-open` in session 2. A stale local branch `performance-optimization` exists: check `git log master..performance-optimization` for prior ideas first. Recent commit 23f2ab0 "Fix table reads" touched this area.
3. Harness in `perf/` (add to `.git/info/exclude`, never committed): `perf/bench.mjs`, `perf/results/*.json`.

## Hotspot hypotheses

### Phase B: record reading (primary)
Path: `FranchiseFileTable.readRecords` (`src/FranchiseFileTable.js:404-515`) -> `readOffsetTable` (`:826-960`) -> `readRecords` (`:962-984`) -> `new FranchiseFileRecord` -> `parseRecordFields` -> `new FranchiseFileField` per field -> `_parseEmptyRecords` -> `_parseTable2Values` / `_parseTable3Values`.

| # | Area | Location | Why suspect |
|---|------|----------|-------------|
| B1 | **Object explosion**: one `FranchiseFileField` per field per record (records x fields), each with 7+ props, plus a `Table2Field`/`Table3Field` per string/blob field | `src/FranchiseFileRecord.js:105-121`, `src/FranchiseFileField.js:14-43` | millions of allocations on big tables (C27 player tables); GC pressure. Candidate: lazy field creation, or shared offset-driven accessors |
| B2 | **`Proxy` wrapper per record** (get/set traps do 2-3 property lookups, `target.fields` getter each access) | `src/FranchiseFileRecord.js:27-43` | Proxy creation + trap cost on every record and every field access |
| B3 | Per-record `data.slice(i, i+size)` (a Buffer view alloc per record) | `src/FranchiseFileTable.js:973-977` | N record views; check cost vs subarray / shared buffer + offset |
| B4 | `_parseTable2Values`: for every record `fieldsArray.filter(f => f.secondTableField)` + forEach, then `data.slice` per string field, pushes into `table2Records` | `src/FranchiseFileTable.js:591-611`, `src/strategies/common/table2Field/FranchiseTable2FieldStrategy.js:2-11` | filter allocation per record + slice per string; precompute which offsets are string once per table |
| B5 | `_parseTable3Values`: per record `fieldsArray.filter`, **`getTable3OverflowRecord(record)` forces `Overflow` field `.value` (creates a BitView, reference to binary string, `substring`, `bin2dec` with regex validation x2) for every record**, builds a `strategyContext` object per field, `data.slice` per blob | `src/FranchiseFileTable.js:613-647`, `src/services/utilService.js:224-242,201-206` | string-heavy path run for every record of every table with table3; strategyContext should be per-table; overflow check can read bits directly |
| B6 | Zstd table3 value decode (lazy, on `.value`): `zstdDecompressSync` with dictionary, `indexOf` for zstd magic, `isonVisualsToJson` + `JSON.stringify` per field | `src/strategies/common/table3Field/FranchiseZstdTable3FieldStrategy.js:98-130`, `src/services/isonProcessor.js` | CPU heavy when a consumer reads many visuals; dictionary cache already exists (`:13-14`) but passed as a Buffer each call (check dictionary re-parse cost) |
| B7 | `readOffsetTable`: per attribute `byteArrayToLong(data.slice(..))` (does `Buffer.from` copy + `reverse` + loop), several sorts, closure/regex work; runs once per table, but also `schema` setter re-run | `src/FranchiseFileTable.js:826-960`, `src/services/utilService.js:125-140` | small per table but C27 has many attributes; replace with `readUInt32LE`-style read |
| B8 | `_parseEmptyRecords`: walks the empty linked list reading `records[i].data.readUInt32BE(0)` | `src/FranchiseFileTable.js:517-536` | O(empties); big if tables have many empty slots (C27 pre-sized tables) |
| B9 | Value materialization (lazy but common after open): `FranchiseFileField.value` -> new `BitView` per field + `_parseFieldValue`; enums use `dec2bin` + `getMemberByUnformattedValue` which does a **linear `filter` over members** per read; references build 32-char binary strings | `src/FranchiseFileField.js:53-64,252-259,292-373`, `src/FranchiseEnum.js:75-106` | measure a "read every field of every record" scenario; likely very costly (BitView alloc per field, string conversions) |
| B10 | `isLoadingNewOffsets` + `names.includes` on repeated `readRecords` calls, `attribsToLoad` partial-load path | `src/FranchiseFileTable.js:404-413,464-479,985-997` | repeated-call overhead (cheap early-out when already read) |

### Phase A: open
| # | Area | Location | Why suspect |
|---|------|----------|-------------|
| A1 | Schema gunzip + `JSON.parse` of C27 schema (2.9 MB gz) every open, no cross-open cache | `src/FranchiseSchema.js:69-76` | sync, large |
| A2 | **Enum duplication**: `new FranchiseEnum(this.enumMap[attribute.enum])` runs **per attribute**, copying every member (new `FranchiseEnumValue`, `parseInt`, `dec2bin`) | `src/FranchiseSchema.js:77-96`, `src/FranchiseEnum.js:5-24`, `src/FranchiseEnumValue.js:5-17` | same enum rebuilt for every attribute using it; likely the biggest open cost, and enum instances also feed B9 |
| A3 | Extra-schema merge + `calculateInheritedSchemas` | `src/FranchiseSchema.js:97-115` | every open if an extra schema is missing |
| A4 | zlib inflate of ~30 MB | `unpackFile` `src/FranchiseFile.js:488-494` | floor, measure to know it |
| A5 | Header parsed **twice per table** (`FranchiseFile.parse` `:158-159` then `FranchiseFileTable` ctor `:108`); `readTableName` builds strings char by char; 0x1000 slice per table | `src/strategies/common/header/m20/M20TableHeaderStrategy.js:1-115,131-139` | x table count x 2 |
| A6 | Per-table `slice` x2, `EventEmitter`, `.on('change')` closure, 5 arrays + Map in ctor | `src/FranchiseFile.js:150-194`, `src/FranchiseFileTable.js:89-128` | allocation heavy |
| A7 | `table.schema = schema` setter per table (re-runs `parseHeaderAttributesFromSchema`, resets 6 collections) | `src/FranchiseFile.js:220-225`, `src/FranchiseFileTable.js:135-160` | redundant work |
| A8 | `schemaPicker.pick`: `readdirSync` + `statSync` + regex over all schema dirs each open | `src/services/schemaPicker.js:12-24,37-57` | small, uncached |
| A9 | `Promise`/`Promise.all` wrappers, `readFileSync` | `src/FranchiseFile.js:65,109-233` | expected negligible; confirm |

## Instrumentation (throwaway branch only)
- `perf/timer.js`: `measure(label, fn)` / `start(label)`+`end(label)` via `process.hrtime.bigint()`, accumulating `{totalNs, calls}` into `globalThis.__perf`, so per-record / per-field calls are summed with counts.
- Temporary wraps (never committed): Phase A at the items above; Phase B at `readOffsetTable`, record construction loop (split: `slice`, `new FranchiseFileRecord`, Proxy creation, field creation), `_parseEmptyRecords`, `_parseTable2Values`, `_parseTable3Values` (split: filter, overflow lookup, strategyContext, slice), and total `readRecords` per table. Also counters: records, fields, table2 fields, table3 fields created.
- Tools: `node --cpu-prof` on the harness (open `.cpuprofile` in DevTools or speedscope) to cross-check manual timers; `--trace-gc` for GC share; `process.memoryUsage()` (heap, external, rss) before/after each phase; `v8.getHeapStatistics()` optional.
- Note manual timers add overhead on per-record/per-field paths; for those, rely on sampling profile numbers and use manual timers only at the per-table level.

## Harness: `perf/bench.mjs`
Run with `node --expose-gc`. Args: `--file` (default scratchpad copy), `--runs N` (10), `--warmup 2`, `--scenario`, `--json out`.
Scenarios (each reports cold run separately, then warm median/min/p95; `gc()` between runs):
1. `open`: `FranchiseFile.create` only (Phase A).
2. `read-all`: open, then `await table.readRecords()` for every table (full records parse, no value access). Per-table timing list, top 15 slowest tables with record count, field count, table2/table3 flags.
3. `read-big`: only the N largest tables by `records x fields` (find them from headers), fast iteration loop for session 2.
4. `touch-values`: after `read-all`, access `.value` on every field of the first K records of the biggest tables (B9), excluding table3 zstd; plus a separate `touch-table3` that reads `.value` on a sample (e.g. 1000) table3 fields (B6).
5. `open+read-all` end-to-end (what a consumer experiences).
Report: table count, record/field totals, heap delta and RSS per phase.
Defaults for settings (`FranchiseFile.create(path)`), same for every run.

## Correctness guard (for session 2)
Fingerprint from the baseline: table count; hash of ordered `[name, tableId, recordCapacity, data.length]`; per-table record count; hash of a sample of field values (first/last 50 records of the 5 biggest tables, all fields, JSON-hashed; skip table3 values except a fixed sample); schema + enum member-count hash. Store in `perf/results/fingerprint.json`; every optimization must reproduce it exactly, and `npm test` (incl. c27 specs, save round-trip tests) stays green.

## Baseline results (measured 2026-10-19)
Machine: Windows 10, Node v22.19.0. Input: scratchpad copy of DYNASTY-27COMPRESS. 5-10 warm runs after 2 warmup. Raw JSON in `perf/results/` (excluded from git).
| Metric | Cold | Warm median | Warm min | Notes |
|---|---|---|---|---|
| `create` total (A) | 472 ms | 394 ms | 388 ms | p95 411 |
| `read-all` total (B) | 3279 ms | 3190 ms | 3140 ms | 2267 tables, 526,415 records, 11,390,022 fields |
| open + read-all (end-to-end) | 3714 ms | 3602 ms | 3558 ms | |
| Top 5 slowest tables | | | | Player 855 ms (16.5k rec x 282 attrs, t2+t3), GameDefensiveStats 367 (45.6k x 23), GameOffensiveStats 161 (27.4k x 26), CareerOffensiveStats 137 (2.4k x 86), HistoryEntry 83 (38.4k x 9) |
| B9 touch-values | | 53.7 ms / 100k fields | | 73,200 fields; ~0.5 us per `.value` |
| B6 zstd decode | | 131 ms / 1000 fields | | ~131 us per table3 field (first 1000 table3 fields in file order) |
| Heap / RSS after open | | heap 88 MB, ext 73 MB, rss ~230 MB | | |
| Heap / RSS after read-all | | heap 1826 MB, ext 40 MB, rss ~1980 MB | | ~1.7 GB heap for 11.4M fields = ~150 B/field |

CPU profile (`--cpu-prof`, read-all, cold + 1 run = 2 opens + 2 read-alls, 7.8 s total; self time):
- GC 2963 ms (37.9%); `--trace-gc` on one cold run: ~2150 ms in GC, only ~59 ms mark-compact, rest scavenges (allocation churn, not retention)
- `parseRecordFields` (FranchiseFileRecord.js:105) 1828 ms (23.4%)
- `evaluateSchemaGzip` (FranchiseSchema.js:69) 458 ms (5.9%), ~230 ms per open, i.e. over half of Phase A (gunzip + parse + enum build inlined; A1/A2 not separated, split with a timer if needed in session 2)
- `FranchiseFileRecord` ctor (:10, Proxy creation) 426 ms (5.4%)
- table3 closure `FranchiseFileTable.js:616` 295 ms (3.8%); `readRecords` (:962) 203 ms; `_parseEmptyRecords` 177 ms (2.3%); zlib inflate 165 ms (2.1%); table2 closure (:594) 127 ms; Proxy `get` 100 ms
- `readOffsetTable` and overflow lookup (`getTable3OverflowRecord`, 49 ms) are small

Not measured individually (manual timers skipped; the sampling profile gave a clear ranking and timers would distort the per-field path): A1/A2/A5-A8 split, B7. Add per-table timers in session 2 only if needed.

Ranking of actual cost (drives session-2 order):
1. B1/B2/B3: record + field + Proxy allocation (`parseRecordFields`, record ctor, GC churn). About 60-65% of Phase B once its share of GC is included. Biggest win: lazy field creation / slimmer records.
2. GC pressure as a consequence of 1 (and of B5/B4 per-record `filter` + `slice` allocations).
3. B5/B4: table3/table2 per-record filter + closures (~420 ms self).
4. A1/A2: schema load + enum duplication (~230 ms of the ~400 ms open).
5. B8 empty-record walk (177 ms), B3 slice in `readRecords` (203 ms).
6. B9 (0.5 us per value) and B6 (131 us per zstd field) are only paid when values are touched; B6 is dominant per-field but lazy.
B7, B10, A4 (inflate, 2%), A5-A9: negligible or unmeasured.

Fingerprint saved at `perf/results/fingerprint.json`. `npm test`: 1215 passing on `perf/c27-profile` (no src changes).

## Candidate optimizations (session 2, not started; reorder by measured cost)
- B5: compute per-table once: indices of table3 offsets, `strategyContext`, whether an `Overflow` offset exists; read the Overflow reference bits directly instead of via `field.value`; skip tables with no Overflow field.
- B4: precompute string-offset indices per table instead of `fieldsArray.filter` per record.
- B1/B2/B3: lazy field creation (create `FranchiseFileField` on first access), drop or slim the Proxy (e.g. generate property accessors from the offset table on a per-table record class), use `subarray`/shared buffer + base offset.
- B7: replace `byteArrayToLong(Buffer.from(slice).reverse())` with `data.readUInt32LE`.
- B9: share a single `BitView`/read via Buffer methods for aligned types; add enum lookup Map (value -> member) instead of linear `filter`.
- A2: construct each `FranchiseEnum` once per enum and share across attributes; A1: cache parsed schema per path; A5: parse header once and pass to the table; A8: cache directory scan.
- Each candidate: implement on the profile branch, rerun harness, keep only if median improves meaningfully and fingerprint + `npm test` pass; then re-apply cleanly on `perf/c27-open`.

## Verification (session 1 deliverable)
1. Scratchpad copy exists; `git diff --stat tests/data` is empty (originals untouched).
2. `node --expose-gc perf/bench.mjs --scenario open|read-all|touch-values|end-to-end --runs 10 --json perf/results/baseline.json` runs on the copy and prints the breakdown.
3. `--cpu-prof` profile of `read-all` agrees with the ranking of manual per-table timers.
4. Baseline table above filled in with the ranking; fingerprint saved; `npm test` passes on the profile branch.
5. `git status` clean except excluded `perf/`; no instrumentation will be committed.
