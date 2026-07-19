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

test("README links to dedicated install docs", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/INSTALL\.md\]\(\.\/docs\/INSTALL\.md\)/);
});

test("install docs cover the local linked CLI flow", async () => {
  const installDoc = await readFile(path.join(root, "docs", "INSTALL.md"), "utf8");

  assert.match(installDoc, /## Prerequisites/);
  assert.match(installDoc, /git clone https:\/\/github\.com\/Njengah\/opensasa\.git/);
  assert.match(installDoc, /npm install/);
  assert.match(installDoc, /npm run build/);
  assert.match(installDoc, /npm link/);
  assert.match(installDoc, /opensasa --help/);
  assert.match(installDoc, /node \.\/dist\/index\.js --help/);
  assert.match(installDoc, /--db-path \.\/opensasa-dev\.db/);
  assert.match(installDoc, /npm unlink -g opensasa/);
  assert.match(installDoc, /`v0\.1` does not include uploads or contribution submission/);
});

test("README links to the first release checklist", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/FIRST_RELEASE_CHECKLIST\.md\]\(\.\/docs\/FIRST_RELEASE_CHECKLIST\.md\)/);
});

test("README links to the demo walkthrough", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/DEMO_WALKTHROUGH\.md\]\(\.\/docs\/DEMO_WALKTHROUGH\.md\)/);
});

test("demo walkthrough covers the seeded end-to-end flow", async () => {
  const walkthrough = await readFile(path.join(root, "docs", "DEMO_WALKTHROUGH.md"), "utf8");

  assert.match(walkthrough, /opensasa demo-seed --db-path \.\/opensasa-demo\.db/);
  assert.match(walkthrough, /opensasa sessions --db-path \.\/opensasa-demo\.db/);
  assert.match(walkthrough, /opensasa report --db-path \.\/opensasa-demo\.db --compact/);
  assert.match(walkthrough, /opensasa inspect <session-id> --db-path \.\/opensasa-demo\.db/);
  assert.match(walkthrough, /opensasa inspect <session-id> --contribution --db-path \.\/opensasa-demo\.db/);
  assert.match(walkthrough, /opensasa export <session-id> --db-path \.\/opensasa-demo\.db --out \.\/contribution\.json --yes/);
  assert.match(walkthrough, /opensasa dashboard --db-path \.\/opensasa-demo\.db --port 3210/);
  assert.match(walkthrough, /There is no upload destination or submission\s+workflow in `v0\.1`/);
  assert.match(walkthrough, /In under 10 minutes/);
});

test("first release checklist covers beta release readiness", async () => {
  const checklist = await readFile(path.join(root, "docs", "FIRST_RELEASE_CHECKLIST.md"), "utf8");

  assert.match(checklist, /v0\.1\.0-beta\.1/);
  assert.match(checklist, /## 1\. Product Scope Freeze/);
  assert.match(checklist, /manual export only/);
  assert.match(checklist, /## 2\. Verification Evidence/);
  assert.match(checklist, /npm test/);
  assert.match(checklist, /npm pack --dry-run --json/);
  assert.match(checklist, /## 3\. Local Workflow Smoke Test/);
  assert.match(checklist, /opensasa export <session-id> --out \.\/contribution\.json --yes/);
  assert.match(checklist, /## 4\. Documentation Review/);
  assert.match(checklist, /## 5\. Release Notes Draft/);
  assert.match(checklist, /## 6\. Packaging And Tagging Readiness/);
  assert.match(checklist, /## 7\. Not Ready Means Do Not Tag/);
  assert.match(checklist, /Do not create the beta tag yet/);
});
