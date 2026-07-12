import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { collectGitMetadata } from "../dist/git-metadata.js";

function git(path, ...args) {
  execFileSync("git", ["-C", path, ...args], { stdio: "ignore" });
}

test("collects only coarse git metadata", () => {
  const root = mkdtempSync(join(tmpdir(), "opensasa-git-"));
  try {
    git(root, "init", "-q");
    git(root, "config", "user.email", "test@example.com");
    git(root, "config", "user.name", "OpenSasa Test");
    writeFileSync(join(root, "tracked.ts"), "const value = 1;\n");
    git(root, "add", "tracked.ts");
    git(root, "commit", "-qm", "initial");
    writeFileSync(join(root, "tracked.ts"), "const value = 1;\nconst next = 2;\n");
    writeFileSync(join(root, "new.ts"), "export const added = true;\n");

    assert.deepEqual(collectGitMetadata(root), {
      repo_size_bucket: "tiny",
      file_count_bucket: "tiny",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "tiny",
      lines_removed_bucket: "zero",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a non-git project path", () => {
  const root = mkdtempSync(join(tmpdir(), "opensasa-not-git-"));
  try {
    assert.throws(() => collectGitMetadata(root), /Unable to read git metadata/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
