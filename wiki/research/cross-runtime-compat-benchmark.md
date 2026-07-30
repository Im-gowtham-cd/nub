# Cross-runtime Node-compatibility benchmark — Deno's own corpus, run identically against node / nub / bun / deno

## Why this exists

Nub's internal "98%" compat figure is self-graded: the harness that produced it drops the tests Nub fails, so the denominator shrinks until the number looks good. That is not a number we can put in a whitepaper and defend. This document replaces it with an externally-defined, non-cherry-picked measurement: we take **Deno's own published Node-compat test corpus** — the ~4,400-file set behind Deno's [v2.8 head-to-head](https://deno.com/blog/v2.8#nodejs-api-compatibility) — and run it *identically* against four runtimes: real `node`, `nub` (default augmented mode), `bun`, and `deno`. We do not pick the tests. Deno did. We report whatever Nub honestly scores, including every failure.

The thesis under test: the tests Bun and Deno fail are overwhelmingly *reimplementation gaps* — obscure API edges, exact error-message text, flag behavior, undici/proxy semantics — that Nub passes **for free** because underneath it is the user's real Node, not a from-scratch reimplementation. If the thesis holds, Nub's pass rate tracks real Node's pass rate ~1:1, while Bun and Deno sit far below because they are re-deriving the API surface.

## Status of the numbers in this doc

There are two measurement scopes here, and they must not be confused:

- **Full corpus (4,459 files, the headline):** the harness is complete and validated; the full run is long-running (~27+ min on this host) and its aggregate self-writes to `tests/cross-runtime/results.json` and the summary table on completion. **The full-corpus headline percentages are pending that run's completion** — re-run `node tests/cross-runtime/run.mjs` and read `perRuntime[].pct` plus `nubVsNode.nubRegressions`. Do not quote a full-corpus headline until that file's `meta.denominator` reads 4459 (the smoke output has `denominator: 30`).
- **30-file smoke slice (validated, directional only):** the harness was validated end-to-end on the alphabetically-first 30 runnable files (`abort/`, `client-proxy/`). These numbers are **directionally** consistent with the thesis but are **not representative of the full corpus** and must never be cited as the answer. The smoke slice is node-internals- and proxy-heavy; the full corpus is dominated by `parallel/`.

Everything below labeled "smoke slice" is the 30-file validation. Everything labeled "full corpus" is the headline scope to be filled from the completed `results.json`.

## 1. Methodology

### The corpus is Deno's, not ours

The test files live at `deno/tests/node_compat/runner/suite/test` — Deno's vendored checkout of `denoland/node_test`, which mirrors Node's own test suite at a pinned tag (corpus Node version **v25.8.1**). Enumeration reproduces Deno's `collect_all_tests` (`mod.rs`) exactly:

- All `test-*.{js,mjs,cjs,ts}` under `runner/suite/test`, **minus** Deno's `IGNORED_TEST_DIRS` (`addons`, `async-hooks`, `benchmark`, `cctest`, `common`, `doctool`, `embedding`, `fixtures`, `fuzzers`, `js-native-api`, `known_issues`, `node-api`, `overlapped-checker`, `report`, `testpy`, `tick-processor`, `tools`, `v8-updates`, `wpt`) → **4,852 eligible**.
- **Minus** the `config.jsonc` entries marked `ignore:true` (318) and `darwin:false` (75) → **393 excluded**, leaving **4,459 RUN** on darwin.

That 4,459 matches Deno's *published Darwin denominator* (node-test-viewer Darwin shows 3,402 / 4,459) **to the file** — strong evidence the corpus and denominator are reproduced faithfully rather than approximately. The 393 excluded files are dropped for **all four runtimes equally**, exactly as Deno's runner skips them — never dropped only where Nub fails. This is the structural fix for the self-graded "98%": the denominator is fixed and externally owned.

### A note on Deno's two published denominators

Deno reports two figures and they use different denominators; both are reproduced as cross-checks below:

- The **blog 76.4%** (3,405 / 4,457) comes from Deno's runner without `--report`, which retains only tests *explicitly listed in `config.jsonc`* (`mod.rs`: "only run tests listed in config.jsonc"). That is a curated denominator.
- The **node-test-viewer 76.30% Darwin** (3,402 / 4,459) comes from the `--report` path, which runs the full collected set minus ignores. This is the broader, less-curated denominator and the one our harness reproduces (4,459).

We report against the 4,459 (viewer) denominator because it is the more honest, less-curated of the two. The small drift between 4,457 and 4,459 is Deno's own moving-corpus drift across platforms/dates (the blog itself shows Linux 3,407/4,464, Darwin 3,402/4,459, Windows 3,305/4,354).

### The four invocation recipes

One fixed file list. Per-runtime invocation differs *only* in the binary and how each CLI ingests flags — which is inherent and is exactly how Deno's own runner already differs per target. Shared across all four: `cwd = runner/suite`, path = `test/<subdir>/<file>` (so `require('../common')`, `common/fixtures`, `--require ./test/fixtures/...`, and the suite-root `package.json {"type":"commonjs"}` all resolve identically), and a scrubbed env (`PATH` + `HOME` + controlled vars only) carrying `NODE_TEST_KNOWN_GLOBALS=0`, `NODE_SKIP_FLAG_CHECK=1`, `NO_COLOR=1`, `NODE_OPTIONS` derived from each test's `// Flags:` directive, and `TEST_SERIAL_ID`.

- **node** / **nub**: real Node flags from `// Flags:` passed directly as CLI args (`node` understands them natively — `--expose-gc`, `--expose-internals`, `--experimental-vm-modules`, `--require`, …); then `test/<relPath>`. **nub runs in DEFAULT augmented mode — never `--node`.** This is the whole point: we measure Nub *with* its augmentation active.
- **bun**: bare `bun <path>` (`bun run`-equivalent). Node-style flags routed via `NODE_OPTIONS` (Bun honors a subset; unknown ones it ignores). Bun gets no `// Flags:` CLI forwarding — matching the recon recipe and the fact that Deno's runner doesn't run Bun at all. Tests needing node-internal flags legitimately fail for Bun; counted, not excused.
- **deno**: mirrors Deno's runner's own translation — `deno run -A --quiet --unstable-unsafe-proto --unstable-bare-node-builtins --unstable-detect-cjs <path>`, switching to `deno test --no-check --unstable-detect-cjs` for `node:test` files, with `// Flags:` translated to `--v8-flags`/deno-args/`NODE_OPTIONS` the way `mod.rs:parse_flags` does, plus any per-test `extraDenoArgs` from `config.jsonc`.

### Pass criterion (identical to Deno's)

Child exit 0 = pass; timeout = fail. Tests carrying an expected-failure config (top-level or per-platform `exitCode`/`output`) pass **only** when they fail in exactly the configured way (wildcard-matched; `[WILDCARD]` is the only token `config.jsonc` uses and is implemented; exotic tokens degrade to a flagged permissive match). A test with an expected-failure config that exits 0 is marked **FAIL**. `NODE_TEST_KNOWN_GLOBALS=0` is applied to all four (it is load-bearing — without it Nub fails trivially because its injected globals trip `common`'s leaked-globals check; Deno disables that check for everyone, so applying it is *faithful*, not a thumb on the scale; see §4).

### Honest caveats that bias the absolute number

These must accompany any figure cited from this benchmark:

1. **Version skew (the big one).** The corpus is pinned to Node **v25.8.1**; the local `node`/`nub` binaries are **26.2.0**. Real node-26.2.0 will *fail* some v25.8.1 tests purely on changed error-message / deprecation text (e.g. `test-assert`, `test-error-format-list`, `test-crypto-hash`), not on compat bugs. So **real Node itself will not score 100%** on this corpus, and **Nub's ceiling is whatever real node-26.2.0 scores here — not 100%**. The honest Nub metric is therefore the **nub-vs-node delta**, not the raw pass%: files Nub fails that node passes = real Nub regressions (should be ~0 for a faithful augmenter); files node fails that Nub passes = version-drift artifacts Nub happened to mute. The harness computes both (`nubVsNode.nubRegressions` / `nubVsNode.nubFixesVsNode`). To get a clean absolute number, vendor a corpus pinned to v26.2.0 (mirror Deno's `setup.ts` at the matching tag) or run v25.8.1 binaries.
2. **`process.execPath` under nub points to the real node** (`…/v26.2.0/bin/node`), so child-respawning tests (`spawn(process.execPath)`) run real node in the child. This is faithful to Nub's actual contract — the PATH shim hijacks `node` *lookups*, not `execPath` — and is a structural reason Nub tracks node 1:1.
3. **393 files excluded equally** (318 `ignore:true` + 75 `darwin:false`), exactly as Deno skips them.
4. **Bun gets no `// Flags:` forwarding** (matches the `bun <file>` recipe). Tests needing node-internal flags fail for bun/deno and pass for node/nub — counted equally; a real reimplementation gap, not a harness bias.
5. **A self-skipping test counts as a PASS, so *adding* a feature can *lower* a runtime's score.** The pass criterion is exit-code-0 (Deno's own). A test guarded on a missing module exits 0 after printing `1..0 # Skipped: …`, and the harness scores that a pass. Demonstrated concretely by the Bun 1.4 re-measurement (§6): bun 1.3.14 lacks `node:sqlite`, so all 18 `test-sqlite-*` files skip-passed; bun 1.4 *ships* `node:sqlite`, the files then actually execute, and they fail on an unrelated limitation — so implementing the module cost Bun 20 tests of headline score. Any cross-version comparison on this corpus must separate `SKIP → ran` transitions from genuine regressions, or it will systematically under-credit the runtime that added capability.

## 2. Headline table

**Full corpus (4,459 files) — PENDING the completed run.** Fill from `results.json` `perRuntime[].pct` once `meta.denominator == 4459`:

| Runtime | pass | fail | timeout | pass% (this corpus) | Deno's published cross-check |
|---|---|---|---|---|---|
| node 26.2.0 | _pending_ | _pending_ | _pending_ | _pending_ (ceiling < 100% due to v25.8.1 skew) | n/a (this is the reference) |
| **nub (augmented)** | _pending_ | _pending_ | _pending_ | _pending_ (tracks node ± delta) | n/a |
| deno 2.8.1 | _pending_ | _pending_ | _pending_ | _pending_ | 76.30% Darwin (3,402/4,459) / blog 76.4% |
| bun 1.3.14 | _pending_ | _pending_ | _pending_ | _pending_ | blog 36.4% excl. bail-outs (1,623/4,457) |

The Deno/Bun cross-check columns are the sanity check: if our deno number lands near ~76% and our bun number near ~36%, the harness is faithfully reproducing Deno's measurement and our node/nub numbers are trustworthy on the same axis.

**30-file smoke slice (validation only — NOT the headline, NOT representative):**

| Runtime | pass | fail | pass% (30-file slice) |
|---|---|---|---|
| node 26.2.0 | 30 | 0 | 100% |
| nub (augmented) | 30 | 0 | 100% |
| deno 2.8.1 | 11 | 19 | 36.67% |
| bun 1.3.14 | 5 | 25 | 16.67% |

On this slice node = nub = 100%, deno 36.7%, bun 16.7% — directionally exactly the thesis (nub pinned to node; bun/deno far below). But the slice is `abort/` + `client-proxy/`, which is node-internals- and proxy-heavy and *understates* bun/deno relative to the full `parallel/`-dominated corpus (the full deno number will rise toward ~76%). Treat the slice as proof the harness works, not as the result.

## 3. The definitional-pass verdict

"Definitional pass" = of the tests bun/deno fail, what fraction are *reimplementation-gap-nub-passes* — i.e. the failure is a re-derived-API gap and Nub passes precisely because it is real Node, not because of any Nub feature. This is the core thesis claim and it must be backed by categorization, not asserted.

**Smoke-slice categorization (deno axis, the 4 files in the slice that are absent from `config.jsonc` and that deno genuinely fails / node passes):** all 4 classified **reimplementation-gap-nub-passes**, 0 real-incompat, 0 harness-artifact:

- `abort/test-http-parser-consume.js` — Deno's JS `http_parser.ts` throws `TypeError: expected Object` instead of aborting on `parser.consume(0)`; Nub aborts byte-for-byte like Node (native `Assertion failed: args[0]->IsObject()`, identical stack) because it *is* real Node.
- `client-proxy/test-http-proxy-fetch.mjs` — Deno sends a plain GET with `User-Agent: Deno/2.8.1` instead of Node's undici CONNECT tunnel (`proxy-connection: keep-alive`); Nub uses real undici and the proxied request succeeds.
- `client-proxy/test-http-proxy-request-connection-refused.mjs` — Deno returns "Status Code: 400" instead of surfacing `connect ECONNREFUSED`; Nub propagates the real Node error.
- `client-proxy/test-http-proxy-request-https-proxy.mjs` — Deno's proxy logs come back empty; its `NODE_USE_ENV_PROXY` path never routes through the HTTPS proxy the way Node does; Nub honors it via real Node.

Every one is an undici / proxy / native-assert edge that a from-scratch runtime re-derives imperfectly and that Nub inherits correctly for free. **On the smoke slice the definitional-pass fraction is 4/4 = 100%** — but n=4 is far too small to generalize. The full-corpus verdict requires categorizing the full `fails.bun` and `fails.deno` lists from the completed `results.json` against the `fails.node`/`fails.nub` lists; that categorization (`bunCat`/`nubCat`) is **not yet produced** and is the explicit follow-up. The honest current statement: *the smoke slice is 100% reimplementation-gap, consistent with the thesis, but the full-corpus definitional-pass fraction is not yet measured.*

## 4. Nub's own failures, fully honest

This is the section the old self-graded "98%" hid. Nub's failures fall into exactly two buckets, and only one of them is a real compat problem:

- **Real Nub regressions** = files Nub fails that **real node passes** (`nubVsNode.nubRegressions`). These are the *only* number that represents a genuine Nub compatibility bug. On the smoke slice this list is **empty** (node and nub both 30/30). On the full corpus it must be read from `results.json` and reported verbatim — it is the honest headline for "how compatible is Nub, really."
- **Version-drift artifacts** = files node fails that nub also fails identically (shared v25.8.1-vs-26.2.0 skew) — not Nub's fault, shared with node 1:1.

There is one **real augmentation-delta** already identified and reproduced (independent of version skew): **Nub injects `Worker` and `reportError` as own-enumerable `globalThis` properties; real Node 26.2.0 leaves them absent as own props.** Verified directly on this host:

```
node:  Worker own? false (enumerable undefined)   reportError own? false
nub:   Worker own? true  (enumerable true)         reportError own? true
```

This trips Node's `common.js` `leakedGlobals()` check. In *this* harness it is masked for everyone by `NODE_TEST_KNOWN_GLOBALS=0` (faithful — Deno relies on the same), so it does **not** inflate Nub's pass count here. But it is a real own-globals delta that would surface in any test asserting the precise own-property shape of `globalThis`, and it is worth fixing (inject via a non-enumerable / non-own mechanism, or gate behind the same surface Node uses). It is orthogonal to the Node *API* each compat test targets — Nub matches Node's API behavior in all four smoke-slice files — but it is the dominant *non-version-skew* source of any Nub-specific failures and must be named, not buried. The full-corpus `nubRegressions` list will reveal how many files it actually costs once categorized.

The honest framing: **Nub's real-incompat count is `nubRegressions.length`, full stop.** Anything else in Nub's fail column is version skew shared with node. Do not report Nub's raw pass% as the compat number — report the delta.

## 5. Recommendation for the whitepaper / visualizer

**What number to show.** Not a single "98%" and not a bare "100%". Show two things side by side, on the *same externally-owned corpus*:

1. **The nub-vs-node delta as the compat headline:** "On Deno's own 4,459-test Node-compat corpus, Nub's real-regression count vs. real Node is _N_ (where _N_ = `nubRegressions.length`)." If _N_ is ~0, that is the strongest possible claim and it is *true by construction*, not self-graded. Phrase it as "Nub passes every test real Node passes, minus _N_ documented deltas" rather than a percentage, because the percentage is capped below 100% by version skew and a percentage invites the same denominator games the old "98%" played.
2. **The competitive bar chart** of pass% on the identical corpus: node / nub clustered at the top, deno ~76%, bun ~36% — with the Deno-published numbers shown next to ours as the cross-check. This is where the visceral story lives: nub and node are the same bar; the reimplementations are far below.

**How to label it.** Always label the mode: the headline number is **augmented** (`nub <file>`, default), not passthrough. State the corpus version (v25.8.1) and the binary version (26.2.0) and the version-skew caveat in a footnote — the honest version of the claim survives scrutiny precisely because it discloses the ceiling. Never show a number with the failing tests dropped; show the full denominator and the delta.

**How to make the visualizer unfakeable (run LIVE).** The credibility multiplier is to make the number *reproducible in the reader's browser / CI*, not a static asset:

- Ship the harness (`tests/cross-runtime/run.mjs`) and a one-command reproducer in the repo, so anyone can run `node tests/cross-runtime/run.mjs` against their own node/nub/bun/deno and get the same `results.json`. A self-graded number that *anyone can re-derive against Deno's corpus* is no longer self-graded.
- For the web visualizer, drive it off the committed `results.json` (full-corpus, denominator 4459) plus the `meta.binaries` versions, and render the four bars from the live file — with a visible "regenerate" path (the exact command) and the corpus commit hash. Crucially, surface the **`fails.nub` and `nubVsNode.nubRegressions` lists by filename** in an expandable panel: showing your own failures by name is the anti-cherry-pick proof. A visualizer that hides the fail list is back to "98%". A visualizer that lets the reader expand every failing filename, see which are version-skew vs real, and re-run the harness, is unfakeable.
- Wire it into CI as a leg (it already partially is): on each run, assert `nubRegressions.length <= threshold` and publish `results.json` as an artifact, so the whitepaper number is continuously re-validated rather than a one-time screenshot.

In short: replace "98% (self-graded)" with "0 (or _N_) real regressions vs. node on Deno's own 4,459-test corpus, augmented mode, reproducible by you" plus the four-bar competitive chart cross-checked against Deno's published 76%/36%. The number stops being a marketing figure and becomes a falsifiable claim.

## 6. Bun 1.4 re-measurement (2026-07-22)

Prompted by Bun's claim that "Bun v1.4 will be our biggest jump in Node.js compatibility since Bun v1.0". **Bun 1.4 is not released** — the newest release is v1.3.14 (2026-05-13) — but the `canary` channel is already on the 1.4 line, so the measurable subject is **`1.4.0-canary.1+5b98630ac`** (built 2026-07-21; its tip commit is itself a Node-compat fix, oven-sh/bun#34872).

### Method

Both bun binaries were run **interleaved inside one harness process** — each test executes on 1.3.14 and 1.4-canary back-to-back — because this host is permanently contended (load 45–76 throughout) and timeouts are the only load-sensitive term. Only a load-matched delta is trustworthy here; a bare absolute compared against a run from another day is not. The corpus was a fresh clone of the pinned `colinhacks/node_test@node-25.8.1` (commit `c5baef08`), `config.jsonc` byte-identical to the vendored copy, and the run used an isolated copy of `run.mjs` (the tracked runner unconditionally overwrites `tests/cross-runtime/results.json`). The only harness delta was a second runtime key, `bun14`, whose command construction is byte-identical to `bun`.

### Results — denominator 4459, darwin, parallelism 10, 20s timeout

| runtime | pass | fail | timeout | raw pct | node-relative (site metric) |
|---|---|---|---|---|---|
| node 25.8.1 | 4361 | 98 | 10 | 97.80% | 100% |
| bun 1.3.14 | 1768 | 2691 | 170 | 39.65% | **40.5%** |
| bun 1.4.0-canary | 2255 | 2204 | 103 | 50.57% | **51.7%** |

**Delta: +487 tests, +10.9 pp raw / +11.2 pp node-relative.**

Two independent controls confirm the reproduction rather than assuming it. bun 1.3.14 scored 1768 pass / 170 timeout against the 2026-06-17 baseline's 1770 / 168 — within 2 tests. And its node-relative rate computes to **exactly 40.5%**, matching the figure published on the homepage. Node itself landed 4361/4459 = 97.80% against the baseline's 97.76%.

### What moved

525 files went fail→pass; 38 went pass→fail. By module, the gains are concentrated in the network and filesystem surface: `http` +129, `fs` +81, `http2` +54, `tls` +40, `worker` +31, `trace` +28, `https` +21, `diagnostics` +17, `net` +17, `buffer` +16, `vm` +12. Timeouts also fell 170 → 103.

Both directions were skip-audited by re-running every file in the delta under both binaries and classifying the TAP output (see caveat 5 above):

- **Of the 38 apparent regressions, 20 are `SKIP → ran` artifacts** — 18 `test-sqlite-*` plus `test-webstorage` and `test-config-file`. Bun 1.3.14 has no `node:sqlite`, so these skip-passed; 1.4 ships it (`DatabaseSync`, `StatementSync`, `Session`, `constants`, `backup`), the tests execute, and they die on a *different* limitation — `Cannot use describe outside of the test runner. Run "bun test" to run tests.` **The genuine regression count is 18**, spread across `stream` (6), `inspector` (2), and one each of `http`, `http2`, `https`, `tls`, `crypto`, `zlib`, `esm`, `dh`.
- **Of the 525 gains, 520 are genuine run→run fixes.** Zero are cases of 1.4 skipping something 1.3.14 executed. The remaining 5 (`test-webcrypto-derive*`, `test-webcrypto-export-import-rsa`) are files where 1.3.14 crashed and 1.4 now exits 0 via `1..0 # Skipped: Skipping unsupported test cases` — a free pass, but 5 of 525.

So the honest reading is **~520 genuine fixes against 18 genuine regressions**; the headline +487 is net of 20 tests Bun *lost by implementing `node:sqlite`*. Bun's "biggest jump since 1.0" framing is supported by this corpus.

### Bearing on nub's published figures

Nothing to change yet, and the number should not be published as-is: 1.4 is an unreleased canary, and a canary can regress or improve before GA. When 1.4 ships, the Bun bar moves **40.5% → ~51.7%** (nub 98.8%, Deno 2.8 77.4% unchanged), and the refresh should be a **full four-runtime re-run in one process**, not a hand-edit of the Bun row — the June `results.json` used the local `deno` submodule suite (eligible 4861, denominator 4468) while a fresh clone of the pinned tag yields 4852/4459, so the two are not interchangeable at file granularity.

## 7. Skip-pass census + nub v0.5.0 regression audit (2026-07-23)

Two questions, one instrumented run: how much of each runtime's score is *earned*, and has nub itself drifted since the June measurement. The harness was extended to classify every outcome as `skipPass` (TAP `1..0` — the file asserted nothing) or a real pass. The marker is emitted by the **test**, not the runtime, so the classification is symmetric.

### Free passes are real and scale inversely with capability

| runtime | pass | free passes | share of passes |
|---|---|---|---|
| node 25.8.1 | 4321 | 109 | 2.52% |
| nub v0.5.0 | 4239 | 109 | 2.57% |
| bun 1.3.14 | 1761 | 190 | 10.79% |
| bun 1.4-canary | 2250 | 175 | 7.78% |
| deno 2.8.1 | 3377 | 166 | 4.92% |

node and nub record **identical** free-pass counts (109) — the expected result, since nub *is* node and the same tests self-skip. Recomputing node-relative rates with free passes removed from numerator and denominator:

| runtime | soft (published metric) | hard | delta |
|---|---|---|---|
| nub | 98.10% | 98.05% | −0.05 pp |
| deno | 78.15% | 76.23% | −1.92 pp |
| bun 1.4-canary | 52.07% | 49.26% | −2.81 pp |
| bun 1.3.14 | 40.75% | **37.30%** | **−3.46 pp** |

The bias is proportional to how much a runtime is missing: nub forfeits 0.05 pp, Bun 1.3.14 forfeits 3.46 pp. **The published chart is therefore modestly generous to Bun and Deno, and understates nub's lead.** Bun's 40.5% bar is ~37.3% on a hard-pass basis. Bun's own free-pass share falling 10.8% → 7.8% across 1.3.14 → 1.4 is independent corroboration that 1.4 is earning more of its score.

### nub v0.5.0 has regressed against node: 70 confirmed (June: ~53–57)

Verification chain, each stage narrowing: parallel run surfaced 86 candidates → serial re-run (one test at a time, so contention cannot manufacture a failure) held 73 → **strict unanimity (3 runs per runtime, no short-circuit; confirm only if node passes 3/3 AND nub fails 3/3) confirms 70** (2 flaky, 1 dissolved). Of the 70: 57 always-hard-fail, 13 always-hang. By directory: `parallel` 37, `es-module` 12, `module-hooks` 11, `test-runner` 8, `sequential` 2.

*Methodology note, recorded because it nearly skewed this number:* the first serial verifier short-circuited as soon as it observed the state it was testing for (node pass, nub fail), so a single flaky nub failure was enough to confirm a regression — both retry loops leaned toward confirming. The strict unanimity pass is the correction. It moved 73 → 70, so the bias was small here, but a verifier must not retry *toward* the conclusion it is testing.

Both dominant clusters **pass under `nub --node`**, which localizes them to augmentation rather than version skew:

1. **`module-hooks` builtin interception (11 tests) — root-caused.** nub's preload pulls in `zlib` before user code runs: under nub, `process.moduleLoadList.includes('NativeModule zlib')` is `true`; under plain node it is `false`. These tests open with `assert(!process.moduleLoadList.includes('NativeModule zlib'))` — they pick zlib precisely because it is "unlikely to be loaded already" — so they fail on the *precondition*, before exercising any hook. Fix direction: lazy-require zlib at point of use in the preload, so it does not appear on `moduleLoadList` at user-code start.
2. **`heap-prof` hang (10 tests).** 9 `parallel/test-heap-prof-*` plus `sequential/test-diagnostic-dir-heap-prof`. A genuine hang, not contention: 3/3 timeouts at 25s standalone on an otherwise-idle invocation, while `nub --node` exits 0. A hang is a worse failure mode than an assertion failure and deserves priority.

Remaining clusters, undiagnosed: `es-module` 12, `test-runner` output/coverage 8, `compile-cache` 6, `repl` 3, `trace-events` 2.

**Do not publish a refreshed nub percentage from this run.** The host was contended (load 45–78), so every absolute is depressed — node itself scored 97.33% here against 97.80% on the quiet run. The load-robust results are the free-pass ratios (a self-skip exits instantly and cannot time out) and the 70-regression delta, both of which held steady across runs at very different load.

## Reproducing

```sh
node tests/cross-runtime/run.mjs            # full 4,459-file corpus; writes results.json + summary
node tests/cross-runtime/run.mjs --limit 30 # the validated smoke slice
# Read: perRuntime[].pct, fails.{node,nub,bun,deno}, nubVsNode.nubRegressions (the only real-bug list)
```

Corpus: `deno/tests/node_compat` (denoland/node_test, Node v25.8.1). Binaries on this host: node v26.2.0, nub 0.0.11 (node 26.2.0), bun 1.3.14, deno 2.8.1. Platform: darwin/arm64.

## Changelog

- 2026-07-23 — Skip-pass census + nub regression audit (§7). Quantified the caveat-5 bias across all five runtimes: free passes are **2.5% of node's and nub's passes but 10.8% of bun 1.3.14's**, so removing them costs nub 0.05 pp and bun 3.46 pp — **the published chart is modestly generous to Bun/Deno and understates nub's lead** (bun's 40.5% bar is ~37.3% hard). node and nub record identical free-pass counts (109), the expected identity. Separately and more urgently: **nub v0.5.0 shows 70 confirmed regressions vs node, up from ~53–57 (v0.0.49) in June** — verified 86 → 73 → 70 through serial then strict-unanimity re-runs. Two clusters diagnosed, both passing under `--node` so both are augmentation bugs: **`module-hooks` (11) root-caused to nub's preload eagerly loading `zlib`**, tripping the tests' `moduleLoadList` precondition; and **`heap-prof` (10) genuinely hanging** (3/3 timeouts standalone). No published figure changed — the host was contended, so absolutes from this run are depressed; only the load-robust ratios and the regression delta are quoted.
- 2026-07-22 — Bun 1.4 re-measurement (§6). Bun 1.4 is unreleased; measured `1.4.0-canary.1+5b98630ac` interleaved against released 1.3.14 in one process so the delta is load-matched on a contended host. **Bun 40.5% → 51.7% node-relative (1768 → 2255 of 4361), +487 tests / +11.2 pp**; 525 fail→pass, 38 pass→fail. Reproduction validated two ways: 1.3.14 landed within 2 tests of the 2026-06-17 baseline, and its node-relative rate computes to exactly the published 40.5%. New methodological finding added as caveat 5: **the exit-0 pass criterion scores a self-skipping test as a pass, so adding a feature can lower a runtime's score** — 20 of Bun's 38 "regressions" are `SKIP → ran` transitions caused by 1.4 shipping `node:sqlite`, leaving 18 genuine regressions against ~520 genuine fixes. No published figure changed: canary is not a shippable number, and the refresh when 1.4 GAs should be a full four-runtime re-run (the June results used the `deno` submodule suite, denominator 4468, vs 4459 from a fresh clone of the pinned tag).
- 2026-05-31 — Initial cross-runtime run on Deno's v2.8 corpus. Harness validated and faithful to Deno's `mod.rs`/`report.rs`/`config.jsonc` (4,459-file darwin denominator reproduced to the file). Headline full-corpus percentages PENDING the completed long run (self-writes to `tests/cross-runtime/results.json`); the 30-file smoke slice (node=nub=100%, deno=36.7%, bun=16.7%) is validation-only and explicitly not representative. Definitional-pass verdict 4/4 reimplementation-gap on the smoke slice; full-corpus categorization is the follow-up. Nub's own real-incompat metric defined as `nubVsNode.nubRegressions` (empty on the slice); one real augmentation-delta identified and reproduced on this host (Nub injects `Worker`/`reportError` as own-enumerable globals; node does not).
