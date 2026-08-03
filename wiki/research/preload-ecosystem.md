# The Node preload ecosystem — who relies on `--require` / `--import`, and what breaks

**Status:** 2026-08-03. Survey commissioned while integrating [varlock](varlock-integration.md), to find out what else in the ecosystem depends on the same mechanism.

**Grounding:** every download figure was measured against `api.npmjs.org` on 2026-08-03 (window 2026-07-27 → 2026-08-02). Every behavioral claim was reproduced on Node 26.5.0 unless another version is named. Source claims cite a local clone under `.repos/` or an unpacked npm tarball. Anything not verified is labelled UNVERIFIED in place.

## What counts as a preload

A module Node loads *before* the entry point, through one of four channels:

| Channel | Form | Inherited by children? |
|---|---|---|
| CJS preload | `node --require <m>` / `-r <m>` | No (argv) |
| ESM preload | `node --import <m>` (20.6+) | No (argv) |
| Environment | `NODE_OPTIONS="--require/--import <m>"` | **Yes — every descendant process AND every worker thread** |
| Loader hooks | `module.register()` / `module.registerHooks()` called *from* a preload | Follows whichever channel registered it |

The environment channel is the one that causes trouble, and it is the one nub uses to compile `nub.jsonc` `preload:` entries.

### The ordering law

Measured across three independent runs, and consistent with Node's own CLI documentation (*"Modules preloaded with `--require` will run before modules preloaded with `--import`"*):

- **All `--require` run before all `--import`**, regardless of channel or argv position.
- Within a phase, `NODE_OPTIONS` entries run **before** argv entries.
- Repeating the same specifier is a no-op (module cache).
- **`process.execArgv` does not contain `NODE_OPTIONS`-supplied flags.** A tool that sniffs only `execArgv` to detect a rival preload cannot see one delivered through the environment. `tsx` is the only tool found that reads both.

### Hook chaining

| System | Registration order | Runs first | Sees transformed source |
|---|---|---|---|
| `module.registerHooks` (sync) | A then B | B (outermost) | B |
| `pirates` / `Module._extensions` | P1 then P2 | P1 (innermost) | P2 |

Net law either way: **last registered gets the final word.** Async `module.register()` hooks are always *inner* to sync `registerHooks` hooks regardless of registration order, so a sync-hook transpiler always wins over an async-loader one.

## The ranking, and why downloads are the wrong axis

Two instruments were available and **both are proxies that fail in opposite directions**, so neither is quoted alone:

- **npm downloads** measure *installs*, overwhelmingly transitive. `pirates` at 80.6M/wk and `why-is-node-running` at 75.7M/wk are artifacts of being dependencies of every `*-register` package and of vitest respectively — not evidence anyone invokes their preload entry point.
- **GitHub code search** measures what humans *commit*, and is structurally blind to what tools *inject at runtime*. The tell: `"--require .pnp.cjs"` returns **10 hits**, even though Yarn PnP writes exactly that string into `NODE_OPTIONS` for every script in every PnP project on earth. Same for the Kubernetes auto-instrumentation operators — `"NODE_OPTIONS newrelicinstrumentation.js"` returns 4.

A separate instrument, the npm registry's `depends:` search, was **discarded as broken** — it returns fuzzy text matches (`csstype` reported as a dependent of `import-in-the-middle`) with absurd totals.

So the table below reports both numbers and treats the gap between them as information.

### Tier 1 — the giants

| Tool | Weekly DL | Preload entry point | Notes |
|---|---|---|---|
| **Yarn PnP** | not on npm | `NODE_OPTIONS="--require <abs>/.pnp.cjs --experimental-loader file://<abs>/.pnp.loader.mjs"` | Almost certainly the largest *injected* preload deployment. Invisible to every instrument. |
| **`dotenv`** | 166,966,426 | `node -r dotenv/config` | The largest single preload entry point users actually type (189,440 code hits). **Migrating away — see below.** |
| **`jiti`** | 171,352,968 | `node --import jiti/register` | Larger than `dotenv`. Uses the **async** `module.register()`. Nuxt / ESLint flat config / unbuild pull it in. |
| **`source-map-support`** | 132,945,240 | `node -r source-map-support/register` | Idempotent; double-preload is safe. Upstream stale since 2024-08. |
| **`tsconfig-paths`** | 99,293,765 | `node -r tsconfig-paths/register` | Patches `Module._resolveFilename` only, so composes with a transpiler by design. |
| **`@opentelemetry/instrumentation`** | 93,926,350 | `--require @opentelemetry/auto-instrumentations-node/register` | See the cost table — this one is expensive. |
| **`tsx`** | 82,780,985 | `node --import tsx`, `--require tsx/cjs`, `NODE_OPTIONS='--import tsx'` | Best-engineered preload in the ecosystem; see its sentinel below. |
| **`import-in-the-middle` / `require-in-the-middle`** | 72,485,892 / 51,429,592 | registered *from* a preload | The shared substrate under every APM vendor. |

### Tier 2 — widely used, clearly preload-shaped

`@cspotcode/source-map-support` 54.0M (ts-node's vendored fork) · `ts-node` 48.5M · `sucrase` 47.3M · `@sentry/node` 31.4M · `@esbuild-kit/esm-loader` 13.9M (deprecated, still 13.9M) · `esbuild-register` 13.0M · `dd-trace` 9.9M · `@dotenvx/dotenvx` 9.8M · `@babel/register` 9.8M · `@opentelemetry/auto-instrumentations-node` 7.9M · `@swc-node/register` 4.7M · `module-alias` 3.9M · `newrelic` 1.4M · `elastic-apm-node` 478K · `@splunk/otel` 37K · `@instana/collector` 33K · `@appsignal/nodejs` 13K · `varlock` 169K.

### Checked and excluded — these are *not* preloads

Worth recording so the question is not re-asked:

- **Polyfills as a category.** `reflect-metadata` (39.3M), `core-js` (67.3M), `regenerator-runtime` (67.8M), `cross-fetch` (36.0M), `abort-controller` (61.4M), `whatwg-fetch` (25.7M) document **no** `-r`/`--import` entry point. They are `import`-in-your-entry side-effect modules.
- **`v8-compile-cache`** (10.6M) — its own README documents in-process `require('v8-compile-cache')`. Code search: 311 hits for the `require()` form, **3** for `-r`.
- **Most "setup file" mechanisms.** `jest` `setupFiles`, `vitest` `setupFiles`, `mocha --require`, and `ava` `require` are all **in-process**, loaded through the runner's own module registry *after* the runner has booted. They are not Node preloads and cannot hook the runner itself. Jest and Vitest set no `NODE_OPTIONS` at all. (The real-preload escape hatches are `mocha --node-option`, `ava` `nodeArguments`, and `node --test --import`.)
- **`nyc`** — does not use `NODE_OPTIONS`. It uses `spawn-wrap`, which writes a fake `node` executable into a temp dir and **prepends that dir to `PATH`**. A different hijack channel entirely, and one that collides with nub's own PATH shim rather than its `NODE_OPTIONS`.
- **`c8`** — sets only `NODE_V8_COVERAGE`.
- **`@vercel/otel`** (2.8M) — called from Next.js's `instrumentation.ts` `register()` hook. This is the framework-hook alternative to a preload, and it is why a large slice of Next.js OTel adoption never touches `NODE_OPTIONS`.

## The direction of travel: away from preloading

Three independent signals, all pointing the same way.

**1. `dotenv` — the ecosystem's single most-typed preload — is removing preloading.** On `master` (unreleased as of 2026-08-03; latest published is 17.4.2), the changelog reads *"Remove preloading. Instead use cli `dotenv run -- your-command`"*. `dotenv/config` survives as a three-line shim; the `dotenv_config_*` argv machinery is deleted. The most popular preload in Node is voluntarily moving to the run-wrapper shape.

**2. `module.register()` is runtime-deprecated.** DEP0205: doc-deprecated in Node 25.9.0 / 24.15.0, **runtime-deprecated in 26.0.0** ([nodejs/node#62401](https://github.com/nodejs/node/pull/62401)), *"will be removed in a future version."* Measured on 26.5.0 — `module.register()` emits the warning, `module.registerHooks()` is silent. This forced `tsx` onto `registerHooks` in 4.21.1. Still on the async API today, and therefore warning on Node 26: `jiti/register`, `@sentry/node`, `ts-node`'s entire ESM path.

**3. `--experimental-loader` still works on 26.5.0 but warns it "may be removed".**

The counter-signal: `node --env-file` (92,128 code hits) is absorbing the `dotenv` use case into the runtime itself.

## Upstream will not fix the inheritance problems

- [nodejs/node#47615](https://github.com/nodejs/node/issues/47615), *"Loaders that use childProcess.fork lead to endless recursion of processes"* — filed 2023-04-19, **auto-closed by the stale bot on 2026-07-04 with no fix**. The preload fork bomb is permanently userland's problem.
- [nodejs/node#52930](https://github.com/nodejs/node/issues/52930) — closed as a documentation fix. The inheritance behavior was judged under-documented, never wrong.

## The five hazards of the environment channel

Ranked by how often they actually bite. Only the first is the one people expect.

### 1. Relative and bare specifiers are fatal in an inherited `NODE_OPTIONS`

A preload specifier is resolved **from the child's cwd**, and failure is a hard exit. Measured:

```
$ cd sub && NODE_OPTIONS="--import ./pre.mjs" node app.js     # ERR_MODULE_NOT_FOUND, exit 1
$ cd elsewhere && NODE_OPTIONS="--require dd-trace/init" node app.js   # Cannot find module, exit 1
```

Every user-facing APM invocation is one of those two forms. This is exactly why every fleet-scale injector writes an **absolute** path (`/otel-auto-instrumentation-nodejs/autoinstrumentation.js`, `/opt/init.mjs`, `/usr/lib/splunk-instrumentation/.../@splunk/otel/instrument`) and why Datadog's `serverless-init` also sets `NODE_PATH`.

### 2. Preloads multiply into worker threads, not just child processes

Measured: a `--import` in `NODE_OPTIONS` runs in every `new Worker()`. Caught live during this survey — `esbuild.transformSync` spawns a worker thread, so an esbuild-backed preload re-evaluated *itself* inside its own transform.

Launcher binaries double the count again: the `tsx` binary spawns a child `node` inheriting the environment, so a `NODE_OPTIONS` preload evaluates **twice** for `tsx app.ts`. Same for `yarn node` and `ts-node --esm`. The multiplier is (child processes) × (worker threads each).

### 3. Per-process cost, multiplied by every descendant

Median of 5 runs of `node noop.js`, real installed packages, no collector listening:

| `NODE_OPTIONS` | median | delta |
|---|---|---|
| (none) | 44 ms | — |
| `--require dd-trace/init` | 154 ms | +110 ms |
| `--import @sentry/node/preload` | 250 ms | +206 ms |
| `--require @opentelemetry/auto-instrumentations-node/register` | **9,107 ms** | **+9.1 s** |

The OTel figure was bisected, not guessed: `OTEL_SDK_DISABLED=true` → 190 ms; `OTEL_METRICS_EXPORTER=none` → 1,209 ms; `OTEL_NODE_RESOURCE_DETECTORS=none` → 8,093 ms (not the cause). **About 8 s is the metrics exporter's shutdown flush against an unreachable `localhost:4318`**, and even with all exporters off the module load of ~40 instrumentation packages still costs **1.2 s per process**.

### 4. Consumers that re-parse `NODE_OPTIONS` corrupt repeated flags

**Next.js** parses `NODE_OPTIONS` into a `Record<string, string | boolean>` keyed by option name and reformats it for every forked worker. A `Record` cannot hold two `--import`s. Measured by running Next.js 16.2.12's own shipped `getFormattedNodeOptionsWithoutInspect`:

| Input | Next's output |
|---|---|
| `--import A --import B` | `--import="A B"` — both paths mashed into one bogus specifier |
| `--import=A --import=B` | `--import=B` — the first silently dropped |
| `--require A --require B` | `--require="A B"` |
| `--require A --import B` | round-trips correctly |

**The rule: repeated flags of the same name are destroyed; distinct names survive.** No upstream issue appears to exist for this.

### 5. Package managers clobber the variable outright

| Injector | Behavior |
|---|---|
| npm `node-options` npmrc field | **CLOBBERS** — `env.NODE_OPTIONS = cliConf['node-options']`, a bare assignment |
| pnpm `node-options` | **CLOBBERS** identically |
| Renovate (when `nodeMaxMemory` is set) | **CLOBBERS** with only `--max-old-space-size=<n>` |
| Electron (packaged apps) | **DROPS** `--require`/`--import` entirely; only `--max-http-header-size` and `--http-parser` survive |
| Yarn Berry PnP | **appends** — prepends its own tokens, strips only its own prior ones, preserves the rest |
| pnpm PnP linker | **appends** (upstream test: *"makeNodeRequireOption() preserves existing NODE_OPTIONS"*) |
| OpenTelemetry k8s Operator | **appends** |
| New Relic k8s-agents-operator | **appends** |
| Datadog k8s single-step injection | **UNVERIFIED** — injector is closed-source; docs say only that it *"Sets `NODE_OPTIONS` with `--require` or `--import`"* |
| Datadog `serverless-init` | **appends** |
| OTel Lambda layer | **appends** — `export NODE_OPTIONS="${NODE_OPTIONS} --import /opt/init.mjs"` |
| Splunk collector installer | writes host-wide systemd `DefaultEnvironment` — every Node process on the box |

Measured for npm 11.17.0, with a control:

| `.npmrc` | ambient env | what the script saw |
|---|---|---|
| *(no `node-options`)* | `NODE_OPTIONS=--title=MARKER` | `--title=MARKER` — survives |
| `node-options=--max-old-space-size=333` | `NODE_OPTIONS=--title=MARKER` | `--max-old-space-size=333` — **ambient gone** |

**Verified negatives** (these set no `NODE_OPTIONS`): official `node` Docker images, `actions/setup-node`, Jest, Vitest, Turborepo, Vite, Angular CLI, webpack-cli, `pm2` (uses node argv instead).

## How the ecosystem defends itself — the coexistence playbook

Every mature preload has converged on one of a few guards. This is the most directly reusable output of the survey.

**Sentinel env var, not stripping.** The instinct is to strip `NODE_OPTIONS` from children. Datadog tried and had to back off, and the comment records exactly why: *"Not passing `NODE_OPTIONS` results in issues with yarn, which relies on NODE_OPTIONS for PnP support, hence why we deviate from the DI pattern here. To avoid infinite initialization loops, we're disabling DI and tracing in the worker."* They keep the variable and pass `DD_TRACE_ENABLED=false` instead. **You cannot strip the channel, because someone else's correctness rides on it.**

**Sentry is the exception that proves it** — it strips categorically (`execArgv: []` plus `env: { ...process.env, NODE_OPTIONS: undefined }` at three call sites, and `unset NODE_OPTIONS` in its Lambda extension) with the comment *"We don't want any Node args like `--import` to be passed to the worker"*. It can afford to because its workers are self-contained.

**Detect a rival and stand down.** `dd-trace` ships a hardcoded conflict list of ten rival agents (`@appsignal/nodejs`, `@dynatrace/oneagent`, `@instana/*`, `@sentry/node`, `elastic-apm-node`, `newrelic`, `appoptics-apm`, `atatus-nodejs`, `stackify-node-apm`, `sqreen`) and warns on collision. Its `DD_INJECTION_ENABLED` guard makes an *injected* tracer bail out entirely if the app carries its own copy at a different path.

**Read both channels before deciding your tier.** `tsx` is the only tool found that inspects `process.env.NODE_OPTIONS` *and* `process.execArgv`: if a TypeScript preload appears before it, tsx downgrades from sync `registerHooks` to async `module.register()` so the entry point still evaluates. Provenance is a real regression ([tsx#795](https://github.com/privatenumber/tsx/issues/795), *"4.21.1 regression: `--import my-opentelemetry-hook.ts` causes mystery, silent exit"*, fixed in 4.22.3).

**Guard on the preload's own module identity.** Yarn's `.pnp.cjs` checks `module.parent.id === 'internal/preload'` and deletes itself from `Module._cache`, with the comment *"it might cause some issues when the file is multiple times in NODE_OPTIONS"*.

**Guard on the thread.** `elastic-apm-node`'s `start.js` checks `isMainThread` and refuses to start in a worker. A worker guard, not a subprocess guard.

## Yarn PnP and `registerHooks` — a real crash, already fixed upstream

Worth recording because it is a live trap for any runtime installing sync resolve hooks.

A **literal pass-through** `module.registerHooks({ resolve(s, c, next) { return next(s, c) } })` preloaded under Yarn PnP 4.9.2 crashes on any CommonJS `require`:

```
Error: Some options passed to require() aren't supported by PnP yet (conditions)
    at require$$0.Module._resolveFilename (.../.pnp.cjs:6381:15)
    at wrapResolveFilename (node:internal/modules/cjs/loader:1123:27)
```

Mechanism, read from both sides: `.pnp.cjs` throws on any `_resolveFilename` option key other than `paths`/`plugnplay`, and Node's hooked-CJS path always injects `conditions`. Reproduces on Node 22.15, 24.17 and 26.5. **A `load`-only hook does not trigger it** — that is the mitigation lever.

Fixed upstream in [berry#6966](https://github.com/yarnpkg/berry/pull/6966), released in **yarn 4.11.0 (2025-11-07)**, and confirmed passing there. Berry's own PR body names the trigger: *"This is more an issue when using the new `registerHook` API… Vite recently started using this API as of 7.2.0, so it now crashes."* Residual exposure is real but bounded: `packageManager` pins are sticky, so projects pinned to 4.0.0–4.10.3 (Nov 2023 – Sep 2025) still hit it.

One caveat for anyone re-running this: PnP is only active under `yarn node` (or under a runtime that injects the `.pnp.cjs` token itself). Testing with plain `node` never loads `.pnp.cjs`, so nothing crashes and the test proves nothing.

## Prior art: how other runtimes propagate a config-file `preload`

Bun has the same feature — `bunfig.toml` `preload = [...]` and a `--preload` flag — and its docs are silent on subprocess behavior, so it was measured directly on bun 1.3.14:

| child spawned… | preload ran in child? | `NODE_OPTIONS` / `BUN_OPTIONS` in child |
|---|---|---|
| in the project dir | **yes** | unset |
| with `cwd` outside the project (no `bunfig.toml`) | **no** | unset |

**Bun propagates `preload` by config-file rediscovery from the child's cwd, not by environment inheritance.** Each process independently re-reads `bunfig.toml`.

Stated precisely, because it is easy to overclaim: this fixes the **leak scope** (a descendant inside the project still gets the preload, so script coverage survives; a descendant outside the tree gets nothing, so unrelated processes are never polluted) but it does **not** fix the **fork bomb** (a preload that spawns a same-project process still triggers rediscovery and recurses). Recursion needs a sentinel regardless of channel.

## Consequences for nub

nub is both a producer and a consumer of this channel: it injects its own augmentation tokens into `NODE_OPTIONS`, and it compiles `nub.jsonc` `preload:` entries into the same variable.

**Already correct, verified by measurement:**

- nub **appends** to a pre-existing `NODE_OPTIONS` rather than clobbering it.
- nub emits **absolute paths and `file://` URLs**, never bare or relative specifiers — which is hazard 1, avoided.
- nub routes value-bearing preload/PnP flags through `NODE_OPTIONS` only, never argv, precisely because a child that rebuilds its flags by merging `process.execArgv + NODE_OPTIONS` (Next.js, `jest-worker`) would otherwise collect the same path twice.
- nub injects Yarn's `.pnp.cjs` token **before** its own so PnP's resolver patches install first.
- nub detects a foreign async loader (`tsx`/`ts-node`, or any `--import`/`--loader`) in the child's argv and downgrades its own tier, avoiding the broken sync/async hook composition on Node 22.15–24.11.
- **nub does not hit the Yarn PnP `conditions` crash**, despite installing a `registerHooks` resolve hook — measured against a `yarn@4.9.2` PnP project with PnP genuinely active (`process.versions.pnp = 3`), where a bare pass-through hook crashes. The mechanism is UNVERIFIED; the likely cause is that nub installs its own `Module._resolveFilename` override on top of PnP's and resolves PnP specifiers through `pnpapi.resolveRequest` directly. Worth confirming, since it means nub is currently safe by a side effect rather than by intent.

**The open defect: repeated same-name tokens.** `user_preload_injections` emits **one token per `preload:` entry**, and nub adds its own on top. Measured on nub 0.6.0:

| `nub.jsonc` `preload:` | emitted `NODE_OPTIONS` (excerpt) | survives Next.js's reformat |
|---|---|---|
| *(none)* | `--require=<nub>/runtime/preload.cjs` | nub's preload survives |
| `["./a.mjs","./b.mjs"]` | `--require=<nub>/preload.cjs --import=…a.mjs --import=…b.mjs` | `a.mjs` **silently dropped** |
| `["./c.cjs"]` | `--require=<nub>/runtime/preload.cjs --require=…/c.cjs` | **nub's own runtime preload dropped — the whole augmentation layer** |

The third row needs only one `.cjs` preload entry: nub's own preload is the first `--require`, Next's Record-keyed reformat keeps the last, and nub's transpilation and augmentation vanish under `next dev` / `next build` with no error. Scope is bounded — it requires a project that uses `preload:` *and* runs Next — but it fails silently.

**The fix is entirely under nub's control:** emit at most one `--import` and at most one `--require`, chaining additional entries inside nub's own preload module. Single-token input round-trips through Next intact.

**A second consideration, from the Bun measurement.** If the `preload:` leak scope (documented as Defect 1 in [varlock-integration.md](varlock-integration.md)) is worth fixing, config-file rediscovery is the shape a peer runtime already ships, and it preserves the in-project script coverage that `NODE_OPTIONS` inheritance is currently load-bearing for.

## Reproduction

- Download figures: `api.npmjs.org/downloads/point/last-week/<pkg>` — use the **bulk** comma-separated form for unscoped packages; the per-package endpoint rate-limits after roughly four calls.
- GitHub counts: `gh api -X GET search/code -f q='"<literal>"' --jq '.total_count'`. Validate against a known positive and a known negative before believing any result.
- Next.js round-trip: unpack the `next` tarball, stub the unused `commander` import out of `dist/esm/server/lib/utils.js`, and call `getFormattedNodeOptionsWithoutInspect()` with `process.env.NODE_OPTIONS` set.
- Yarn PnP crash: a project pinned to `yarn@4.9.2` with `nodeLinker: pnp`, then `yarn node --import <pass-through-resolve-hook> <cjs-file>`.

## Changelog

- 2026-08-03 — Initial write-up.
