#!/usr/bin/env node
// SessionStart hook: re-inject a PER-SESSION grounding note after a context compaction.
//
// THE PROBLEM IT SOLVES. Compaction does not eat the file list — that survives fine. It eats the MODEL:
// the threat model, which alternatives were already ruled out and why, which of two similar products is
// under discussion, and the standing process rules. A session that loses those re-derives settled
// answers, re-litigates closed decisions, and relays stale framing as fact. On a long epic that costs
// the operator a correction every time, which is what motivated this.
//
// WHY IT IS PER-SESSION AND NOT ONE SHARED FILE. Different long-running efforts in this repo need
// different grounding, and a note useful to one is noise to another. Keying by session id lets any
// session author its own without colliding — write `.fray/reground/<session-id>.md` and it is picked up
// from the next compaction onward. `.fray/reground/_default.md` is the opt-in shared fallback for when
// a note should apply to every session in the repo; absent that file, nothing fires.
//
// WHY THIS EXISTS ALONGSIDE `precompact-instructions.mjs`, not instead of it. That hook steers what the
// summarizer KEEPS; this one restores what it dropped anyway. The gap is real for fray workers
// specifically: `precompact-instructions.mjs` deliberately goes INERT when `FRAY_UI_THREAD` is set,
// because the dispatching harness registers its own brief — so a fray-ui session currently gets no
// compaction steering from this repo at all.
//
// THE CHANNEL: SessionStart hooks emit `hookSpecificOutput.additionalContext`, which is spliced into the
// session as context. This is NOT the PreCompact plain-stdout channel — do not "simplify" it to a bare
// `console.log`, which would be discarded.
//
// SCOPE: `compact` only. On `startup`/`resume`/`clear` the operator gets the normal orientation path;
// firing there would inject the same block on every launch.
import { readFileSync } from "node:fs";
import { join } from "node:path";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  // No stdin / not JSON. Emit nothing rather than injecting into an unknown context — a spurious
  // injection on every session start is a worse failure than a missed one after a compaction.
  process.exit(0);
}

if ((input.source ?? "") !== "compact") process.exit(0);

// Sub-agents compact independently and carry their own self-contained briefs; steering a child with its
// parent's grounding would be off-task for it.
if (input.agent_id ?? input.agentId) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
// The hook payload is authoritative; the env vars are a fallback for harnesses that set one but do not
// populate `session_id` on the event.
const sessionId = (
  input.session_id ??
  input.sessionId ??
  process.env.CLAUDE_SESSION_ID ??
  process.env.FRAY_UI_THREAD ??
  ""
).trim();

const candidates = [];
if (sessionId) candidates.push(join(root, ".fray/reground", `${sessionId}.md`));
candidates.push(join(root, ".fray/reground/_default.md"));

for (const path of candidates) {
  let note;
  try {
    note = readFileSync(path, "utf8").trim();
  } catch {
    continue; // Absent is the normal case — most sessions never author one.
  }
  if (!note) continue;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `⟦POST-COMPACTION RE-GROUNDING — ${path.replace(`${root}/`, "")}⟧\n\n${note}`,
      },
    }),
  );
  break; // A session-specific note wins; the shared fallback is only for sessions without one.
}
