# OpenSasa Workflow Modes

OpenSasa supports three local workflow modes. All three write only safe session
metadata to the local SQLite database.

## Manual mode

Use `log` when a session is already complete and you want to record it directly:

```bash
node ./dist/index.js log \
  --provider OpenAI \
  --model-id gpt-5 \
  --task-type bug_fix \
  --final-outcome accepted
```

This is the fastest mode for backfilling a session. Optional metadata can be
provided with the other `log` flags.

## Wrapper mode

Use `draft` and `finalize` when you want OpenSasa to capture the session window:

```bash
node ./dist/index.js draft \
  --provider OpenAI \
  --model-id gpt-5 \
  --task-type feature \
  --json

node ./dist/index.js finalize <session-id> \
  --final-outcome accepted \
  --tests-outcome passed
```

Use `verify` to run a local test, build, or lint command for a session. Only the
pass/fail outcome, exit code, and duration are retained; command text and
terminal output are not stored.

## Agent mode

Use `heartbeat` to record local activity and `agent status` to inspect the most
recent heartbeat:

```bash
node ./dist/index.js heartbeat --project-path .
node ./dist/index.js agent status
```

Heartbeats contain only a timestamp and optional project identity hash. OpenSasa
does not start a background process automatically yet.

## Shared privacy boundary

None of these modes stores source code, private prompts, model responses, exact
file paths, repository names, secrets, or raw terminal output. See the project
privacy documentation for the full boundary.
