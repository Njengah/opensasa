import assert from "node:assert/strict";
import { test } from "node:test";
import { runVerificationCommand } from "../dist/verify.js";

test("records a passing verification without command output", async () => {
  const result = await runVerificationCommand("tests", `"${process.execPath}" -e "process.exit(0)"`);

  assert.equal(result.kind, "tests");
  assert.equal(result.outcome, "passed");
  assert.equal(result.exit_code, 0);
  assert.equal(typeof result.duration_seconds, "number");
  assert.equal(Object.hasOwn(result, "command"), false);
  assert.equal(Object.hasOwn(result, "output"), false);
});

test("records a failing verification exit code", async () => {
  const result = await runVerificationCommand("lint", `"${process.execPath}" -e "process.exit(3)"`);

  assert.equal(result.kind, "lint");
  assert.equal(result.outcome, "failed");
  assert.equal(result.exit_code, 3);
});
