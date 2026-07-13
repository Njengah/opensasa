import assert from "node:assert/strict";
import { test } from "node:test";
import { hashProjectIdentity, isProjectIdentityHash } from "../dist/project.js";

test("hashes project identities without retaining the path", () => {
  const first = hashProjectIdentity("./example-project");
  const second = hashProjectIdentity("example-project");

  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.equal(isProjectIdentityHash(first), true);
  assert.equal(first.includes("example-project"), false);
});
