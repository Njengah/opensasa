import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmPackCommand = process.platform === "win32"
  ? {
      file: "cmd",
      args: ["/c", "npm", "pack", "--dry-run", "--json"],
    }
  : {
      file: "npm",
      args: ["pack", "--dry-run", "--json"],
    };

test("root package has npm publish metadata", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );

  assert.equal(packageJson.name, "opensasa");
  assert.equal(packageJson.version, "0.1.0-alpha.1");
  assert.equal(packageJson.description, "Local-first AI coding workflow metadata tracker.");
  assert.equal(packageJson.license, "MIT");
  assert.equal(packageJson.bin.opensasa, "./dist/index.js");
  assert.equal(packageJson.homepage, "https://github.com/Njengah/opensasa#readme");
  assert.equal(packageJson.bugs.url, "https://github.com/Njengah/opensasa/issues");
  assert.equal(packageJson.repository.type, "git");
  assert.equal(packageJson.repository.url, "https://github.com/Njengah/opensasa.git");
  assert.ok(packageJson.keywords.includes("cli"));
  assert.ok(packageJson.keywords.includes("local-first"));
  assert.deepEqual(packageJson.files, [
    "dist",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
  ]);
});

test("npm pack dry run includes the CLI bin and excludes development-only files", async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  const binPath = packageJson.bin.opensasa.replace("./", "");
  const binSource = await readFile(path.join(root, binPath), "utf8");
  const { stdout } = await execFileAsync(
    npmPackCommand.file,
    npmPackCommand.args,
    { cwd: root },
  );
  const [packInfo] = JSON.parse(stdout);
  const packedPaths = packInfo.files.map((file) => file.path);

  assert.match(binSource, /^#!\/usr\/bin\/env node/);
  assert.equal(packInfo.name, "opensasa");
  assert.equal(packInfo.version, packageJson.version);
  assert.ok(packedPaths.includes("package.json"));
  assert.ok(packedPaths.includes("README.md"));
  assert.ok(packedPaths.includes("CHANGELOG.md"));
  assert.ok(packedPaths.includes("LICENSE"));
  assert.ok(packedPaths.includes(binPath));
  assert.equal(packedPaths.some((entry) => entry.startsWith("src/")), false);
  assert.equal(packedPaths.some((entry) => entry.startsWith("tests/")), false);
  assert.equal(packedPaths.some((entry) => entry.startsWith("docs/")), false);
  assert.equal(packedPaths.some((entry) => entry.startsWith("vscode-extension/")), false);
  assert.equal(packedPaths.some((entry) => entry.startsWith(".github/")), false);
});
