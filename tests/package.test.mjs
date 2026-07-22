import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
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
  assert.equal(packageJson.version, "0.1.0-beta.1");
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

test("release checks workflow runs non-publishing release readiness checks", async () => {
  const workflow = await readFile(
    path.join(root, ".github", "workflows", "release-checks.yml"),
    "utf8",
  );

  assert.match(workflow, /^name:\s+Release Checks/m);
  assert.match(workflow, /^on:\s*$/m);
  assert.match(workflow, /^\s+pull_request:\s*$/m);
  assert.match(workflow, /^\s+push:\s*$/m);
  assert.match(workflow, /^\s+workflow_dispatch:\s*$/m);
  assert.match(workflow, /^\s+node-version:\s+20\s*$/m);
  assert.match(workflow, /^\s+cache:\s+npm\s*$/m);
  assert.match(workflow, /^\s+run:\s+npm ci\s*$/m);
  assert.match(workflow, /^\s+run:\s+npm test\s*$/m);
  assert.match(workflow, /npm pack --dry-run --json/);
  assert.match(workflow, /pack-dry-run\.json/);
  assert.match(workflow, /packInfo\.name !== "opensasa"/);
  assert.match(workflow, /packInfo\.version !== packageJson\.version/);
  assert.match(workflow, /binPath !== "dist\/index\.js"/);
  assert.match(workflow, /packedPaths\.includes\(binPath\)/);
  assert.match(workflow, /"src\/"/);
  assert.match(workflow, /"tests\/"/);
  assert.match(workflow, /"docs\/"/);
  assert.match(workflow, /"vscode-extension\/"/);
  assert.match(workflow, /"\.github\/"/);
  assert.match(workflow, /node \.\/dist\/index\.js --help/);
  assert.doesNotMatch(workflow, /npm\s+publish/);
  assert.doesNotMatch(workflow, /git\s+tag/);
});

test("GitHub issue templates exist and reinforce safe public reporting", async () => {
  const templateDir = path.join(root, ".github", "ISSUE_TEMPLATE");
  const templates = [
    "bug_report.yml",
    "documentation_improvement.yml",
    "feature_request.yml",
    "security_privacy_concern.yml",
  ];
  const files = await readdir(templateDir);
  const privacyWarning = /Public issues must not include secrets, source code, private prompts, model responses, exact paths, raw terminal output, customer\/company names, credentials, or private exported payload contents/;

  for (const template of templates) {
    assert.ok(files.includes(template), `${template} should exist`);
    const contents = await readFile(path.join(templateDir, template), "utf8");

    assert.match(contents, privacyWarning);
  }

  const bugReport = await readFile(path.join(templateDir, "bug_report.yml"), "utf8");
  assert.match(bugReport, /OpenSasa version/);
  assert.match(bugReport, /OS and environment/);
  assert.match(bugReport, /Command or area affected/);
  assert.match(bugReport, /Expected behavior/);
  assert.match(bugReport, /Actual behavior/);
  assert.match(bugReport, /Safe reproduction steps/);
  assert.match(bugReport, /Verification attempted/);
  assert.match(bugReport, /Was a local database, dashboard, or export involved/);

  const featureRequest = await readFile(path.join(templateDir, "feature_request.yml"), "utf8");
  assert.match(featureRequest, /Problem/);
  assert.match(featureRequest, /Proposed behavior/);
  assert.match(featureRequest, /Local-first and privacy impact/);
  assert.match(featureRequest, /v0\.1 scope fit/);
  assert.match(featureRequest, /Alternatives considered/);

  const docsRequest = await readFile(path.join(templateDir, "documentation_improvement.yml"), "utf8");
  assert.match(docsRequest, /Which doc or page is affected/);
  assert.match(docsRequest, /What is unclear, missing, or inaccurate/);

  const securityConcern = await readFile(
    path.join(templateDir, "security_privacy_concern.yml"),
    "utf8",
  );
  assert.match(securityConcern, /minimal safe reproduction details only/i);
  assert.match(securityConcern, /private disclosure path/i);
});

test("good first issue docs define starter scope and label taxonomy", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const contributing = await readFile(path.join(root, "CONTRIBUTING.md"), "utf8");
  const guide = await readFile(path.join(root, "docs", "GOOD_FIRST_ISSUES.md"), "utf8");
  const labels = await readFile(path.join(root, ".github", "labels.yml"), "utf8");

  assert.match(readme, /\[docs\/GOOD_FIRST_ISSUES\.md\]\(\.\/docs\/GOOD_FIRST_ISSUES\.md\)/);
  assert.match(contributing, /docs\/GOOD_FIRST_ISSUES\.md/);
  assert.match(guide, /# Good First Issues/);
  assert.match(guide, /v0\.1` local-first, manual-export beta track/);
  assert.match(guide, /small, reviewable\s+issue/);
  assert.match(guide, /Do not label an issue as `good first issue`/);
  assert.match(guide, /Recommended Label Taxonomy/);
  assert.match(guide, /`good first issue`/);
  assert.match(guide, /`help wanted`/);
  assert.match(guide, /`privacy`/);
  assert.match(guide, /`methodology`/);
  assert.match(guide, /`cli`/);
  assert.match(guide, /`dashboard`/);
  assert.match(guide, /`vscode-extension`/);
  assert.match(guide, /`tests`/);
  assert.match(guide, /`release`/);
  assert.match(guide, /node --test tests\/package\.test\.mjs/);
  assert.match(guide, /npm test/);
  assert.match(guide, /must not include secrets, source code, private\s+prompts, model responses, exact source or project paths, raw terminal output/);
  assert.match(labels, /name: good first issue/);
  assert.match(labels, /name: needs design/);
  assert.match(labels, /name: blocked/);
});

test("README links to dedicated install docs", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/INSTALL\.md\]\(\.\/docs\/INSTALL\.md\)/);
});

test("README links to the architecture docs", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/ARCHITECTURE\.md\]\(\.\/docs\/ARCHITECTURE\.md\)/);
});

test("README links to the security and privacy FAQ", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/SECURITY_PRIVACY_FAQ\.md\]\(\.\/docs\/SECURITY_PRIVACY_FAQ\.md\)/);
});

test("architecture docs cover the v0.1 local-first boundaries", async () => {
  const architectureDoc = await readFile(path.join(root, "docs", "ARCHITECTURE.md"), "utf8");

  assert.match(architectureDoc, /# OpenSasa Architecture/);
  assert.match(architectureDoc, /The CLI is the product engine/);
  assert.match(architectureDoc, /local SQLite database/);
  assert.match(architectureDoc, /validated before storage/);
  assert.match(architectureDoc, /dashboard server reads\s+the same SQLite database as the CLI/);
  assert.match(architectureDoc, /VS Code extension is a local workflow wrapper around the CLI/);
  assert.match(architectureDoc, /Manual export remains the default sharing boundary/);
  assert.match(architectureDoc, /does not add automatic upload, public aggregate rankings,\s+account sync, or persisted community data/);
  assert.match(architectureDoc, /validates `POST \/api\/contributions` payloads/);
  assert.match(architectureDoc, /does not upload source code,\s+prompts, responses, exact paths, raw terminal output/);
  assert.match(architectureDoc, /docs\/HOSTED_ARCHITECTURE\.md/);
});

test("hosted architecture decision preserves the local-first trust boundary", async () => {
  const hostedArchitecture = await readFile(path.join(root, "docs", "HOSTED_ARCHITECTURE.md"), "utf8");

  assert.match(hostedArchitecture, /# Hosted Architecture Decision/);
  assert.match(hostedArchitecture, /Status: decided for Phase 7 planning/);
  assert.match(hostedArchitecture, /Use an optional contribution-intake architecture/);
  assert.match(hostedArchitecture, /local SQLite database remains the personal record/);
  assert.match(hostedArchitecture, /hosted intake API may accept only validated contribution payloads/);
  assert.match(hostedArchitecture, /server-side validation must reject excluded fields/);
  assert.match(hostedArchitecture, /public views are built from aggregate records, not raw local sessions/);
  assert.match(hostedArchitecture, /sample size and confidence labels/);
  assert.match(hostedArchitecture, /source code/);
  assert.match(hostedArchitecture, /private prompts/);
  assert.match(hostedArchitecture, /raw terminal output/);
  assert.match(hostedArchitecture, /seed data only/);
  assert.match(hostedArchitecture, /automatic upload/);
  assert.match(hostedArchitecture, /background sync/);
  assert.match(hostedArchitecture, /docs\/PUBLIC_AGGREGATE_SCHEMA\.md/);
  assert.match(hostedArchitecture, /`opensasa ingest`/);
  assert.match(hostedArchitecture, /does not persist accepted payloads yet/);
});

test("contribution ingestion endpoint docs explain the non-persistent boundary", async () => {
  const ingestionDoc = await readFile(path.join(root, "docs", "INGESTION_ENDPOINT.md"), "utf8");

  assert.match(ingestionDoc, /# Contribution Ingestion Endpoint/);
  assert.match(ingestionDoc, /opensasa ingest/);
  assert.match(ingestionDoc, /GET \/health/);
  assert.match(ingestionDoc, /POST \/api\/contributions/);
  assert.match(ingestionDoc, /does not persist accepted payloads/);
  assert.match(ingestionDoc, /database persistence/);
  assert.match(ingestionDoc, /automatic upload/);
  assert.match(ingestionDoc, /Binding to `0\.0\.0\.0` exposes an\s+unauthenticated HTTP intake endpoint/);
  assert.match(ingestionDoc, /invalid enum values/);
  assert.match(ingestionDoc, /SERVER_SIDE_VALIDATION\.md/);
});

test("server-side validation docs define issue codes and boundaries", async () => {
  const validationDoc = await readFile(path.join(root, "docs", "SERVER_SIDE_VALIDATION.md"), "utf8");

  assert.match(validationDoc, /# Server-Side Contribution Validation/);
  assert.match(validationDoc, /incoming HTTP payloads are untrusted/);
  assert.match(validationDoc, /`missing_required_field`/);
  assert.match(validationDoc, /`forbidden_field`/);
  assert.match(validationDoc, /`invalid_version`/);
  assert.match(validationDoc, /`private_marker`/);
  assert.match(validationDoc, /accepted payloads are still not persisted/);
});

test("public aggregate schema requires confidence and safe provenance", async () => {
  const aggregateSchema = await readFile(path.join(root, "docs", "PUBLIC_AGGREGATE_SCHEMA.md"), "utf8");

  assert.match(aggregateSchema, /# Public Aggregate Schema/);
  assert.match(aggregateSchema, /opensasa\.public-aggregate\.v0/);
  assert.match(aggregateSchema, /opensasa\.methodology\.v0/);
  assert.match(aggregateSchema, /accepted contribution payloads or seed data only/);
  assert.match(aggregateSchema, /never store raw local sessions as public view records/);
  assert.match(aggregateSchema, /sample size and confidence label on every metric/);
  assert.match(aggregateSchema, /`insufficient`, `early`, `moderate`, or `strong`/);
  assert.match(aggregateSchema, /calculatePublicAggregateQuality/);
  assert.match(aggregateSchema, /fewer than 30 accepted contribution records/);
  assert.match(aggregateSchema, /At least 500 records with at least 75% verification coverage/);
  assert.match(aggregateSchema, /`verification_share`/);
  assert.match(aggregateSchema, /"verification_share"/);
  assert.match(aggregateSchema, /`seed`, `test`, `community`, or `vendor`/);
  assert.match(aggregateSchema, /`data_source`/);
  assert.match(aggregateSchema, /`repo_size_bucket`/);
  assert.match(aggregateSchema, /under_1_usd/);
  assert.match(aggregateSchema, /5m_to_30m/);
  assert.match(aggregateSchema, /"zero"/);
  assert.match(aggregateSchema, /"tiny"/);
  assert.match(aggregateSchema, /source code, private prompts, model responses, exact paths, raw\s+terminal output/);
  assert.match(aggregateSchema, /Do not show a naked percentage without sample size/);
  assert.match(aggregateSchema, /Seed and test data must never be labeled as real community performance/);
  assert.match(aggregateSchema, /show rates without denominators/);
});

test("methodology docs define initial public aggregate confidence thresholds", async () => {
  const methodology = await readFile(path.join(root, "docs", "METHODOLOGY.md"), "utf8");

  assert.match(methodology, /## Confidence Model/);
  assert.match(methodology, /src\/public-aggregate\.ts/);
  assert.match(methodology, /fewer than 30 accepted contribution records/);
  assert.match(methodology, /At least 100 records, but fewer than 500 records/);
  assert.match(methodology, /Changing them should update the\s+methodology version and release notes/);
});

test("security and privacy FAQ covers v0.1 boundaries", async () => {
  const faq = await readFile(path.join(root, "docs", "SECURITY_PRIVACY_FAQ.md"), "utf8");

  assert.match(faq, /# Security And Privacy FAQ/);
  assert.match(faq, /local SQLite database/);
  assert.match(faq, /optional ingestion endpoint that validates safe payloads but does not\s+store them yet/);
  assert.match(faq, /If you override\s+`--host` to `0\.0\.0\.0`/);
  assert.match(faq, /does not collect or upload source code,\s+diffs, private prompts, model\s+responses, exact source or project paths, raw terminal output/);
  assert.match(faq, /records the output path you explicitly chose in\s+local contribution history/);
  assert.match(faq, /one-way SHA-256\s+identity hash/);
  assert.match(faq, /writes\s+only the resulting verification outcome back to the session record/);
  assert.match(faq, /VS Code extension is a local workflow wrapper around the CLI/);
  assert.match(faq, /dashboard is local-only/);
  assert.match(faq, /dashboard binds to `127\.0\.0\.1`/);
  assert.match(faq, /non-loopback address, you may expose local report,\s+contribution preview, and\s+contribution history endpoints/);
  assert.match(faq, /Manual export is the current sharing boundary/);
  assert.match(faq, /payload hash, byte size, export timestamp, and validation status/);
  assert.match(faq, /HMAC-SHA256 signature/);
  assert.match(faq, /cannot recall an exported file that already\s+left your machine/);
  assert.match(faq, /do not paste secrets, source code, private prompts,\s+model responses, exact paths, or raw terminal output into a public issue/);
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
  assert.match(installDoc, /there is no automatic upload or account sync to configure/);
});

test("README links to the first release checklist", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/FIRST_RELEASE_CHECKLIST\.md\]\(\.\/docs\/FIRST_RELEASE_CHECKLIST\.md\)/);
});

test("README links to the launch case study", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/LAUNCH_CASE_STUDY\.md\]\(\.\/docs\/LAUNCH_CASE_STUDY\.md\)/);
});

test("README links to the hosted architecture decision", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/HOSTED_ARCHITECTURE\.md\]\(\.\/docs\/HOSTED_ARCHITECTURE\.md\)/);
});

test("README links to the contribution ingestion endpoint docs", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/INGESTION_ENDPOINT\.md\]\(\.\/docs\/INGESTION_ENDPOINT\.md\)/);
  assert.match(readme, /\[docs\/SERVER_SIDE_VALIDATION\.md\]\(\.\/docs\/SERVER_SIDE_VALIDATION\.md\)/);
  assert.match(readme, /\[docs\/PUBLIC_DASHBOARD\.md\]\(\.\/docs\/PUBLIC_DASHBOARD\.md\)/);
  assert.match(readme, /validates safe payloads but does not\s+store them yet/);
});

test("public dashboard docs define seed-only public aggregate boundary", async () => {
  const publicDashboard = await readFile(path.join(root, "docs", "PUBLIC_DASHBOARD.md"), "utf8");
  const hostedArchitecture = await readFile(path.join(root, "docs", "HOSTED_ARCHITECTURE.md"), "utf8");

  assert.match(publicDashboard, /# Seed-Only Public Dashboard/);
  assert.match(publicDashboard, /\/public/);
  assert.match(publicDashboard, /\/api\/public\/aggregates/);
  assert.match(publicDashboard, /Do not expose this local dashboard server as the hosted public service/);
  assert.match(publicDashboard, /private local endpoints such as `\/api\/report`/);
  assert.match(publicDashboard, /illustrative seed aggregate records only/);
  assert.match(publicDashboard, /`data_provenance: "seed"`/);
  assert.match(publicDashboard, /`quality\.confidence_label: "insufficient"`/);
  assert.match(hostedArchitecture, /docs\/PUBLIC_DASHBOARD\.md/);
  assert.match(hostedArchitecture, /every returned\s+record is labeled as seed data with insufficient confidence/);
});

test("README links to the demo walkthrough", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /\[docs\/DEMO_WALKTHROUGH\.md\]\(\.\/docs\/DEMO_WALKTHROUGH\.md\)/);
});

test("README points readers to the dashboard preview walkthrough", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");

  assert.match(readme, /## Dashboard Preview/);
  assert.match(readme, /\[docs\/DEMO_WALKTHROUGH\.md\]\(\.\/docs\/DEMO_WALKTHROUGH\.md\)/);
  assert.match(readme, /does not upload\s+session data/);
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

test("demo walkthrough embeds the dashboard preview image", async () => {
  const walkthrough = await readFile(path.join(root, "docs", "DEMO_WALKTHROUGH.md"), "utf8");

  assert.match(walkthrough, /!\[OpenSasa dashboard preview\]\(\.\/images\/dashboard-preview\.svg\)/);
  assert.match(walkthrough, /Preview image of the seeded local dashboard/);
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
  assert.match(checklist, /docs\/LAUNCH_CASE_STUDY\.md/);
  assert.match(checklist, /## 5\. Release Notes Draft/);
  assert.match(checklist, /## 6\. Packaging And Tagging Readiness/);
  assert.match(checklist, /## 7\. Not Ready Means Do Not Tag/);
  assert.match(checklist, /Do not create the beta tag yet/);
});

test("launch case study covers the public beta boundaries", async () => {
  const launchPost = await readFile(path.join(root, "docs", "LAUNCH_CASE_STUDY.md"), "utf8");

  assert.match(launchPost, /OpenSasa v0\.1 Beta Launch Case Study/);
  assert.match(launchPost, /v0\.1\.0-beta\.1/);
  assert.match(launchPost, /opensasa demo-seed/);
  assert.match(launchPost, /opensasa dashboard/);
  assert.match(launchPost, /VS Code extension/);
  assert.match(launchPost, /manual export contribution bundle/);
  assert.match(launchPost, /No source code uploaded by default/);
  assert.match(launchPost, /there is no upload destination\s+or submission workflow/);
  assert.match(launchPost, /public aggregate model rankings/);
});

test("launch post draft points to the superseding case study", async () => {
  const launchPostDraft = await readFile(path.join(root, "docs", "LAUNCH_POST.md"), "utf8");
  const roadmap = await readFile(path.join(root, "docs", "ROADMAP.md"), "utf8");

  assert.match(launchPostDraft, /superseded by the published/);
  assert.match(launchPostDraft, /\[.*launch case study\]\(\.\/LAUNCH_CASE_STUDY\.md\)/);
  assert.match(roadmap, /first public launch post draft, now superseded by the beta launch case study/);
});

test("dashboard preview asset mirrors shipped dashboard sections", async () => {
  const previewSvg = await readFile(
    path.join(root, "docs", "images", "dashboard-preview.svg"),
    "utf8",
  );

  assert.match(previewSvg, /<svg[\s\S]*OpenSasa dashboard preview/);
  assert.match(previewSvg, /OpenSasa Dashboard/);
  assert.match(previewSvg, /No data is uploaded/);
  assert.match(previewSvg, /Models/);
  assert.match(previewSvg, /Tools/);
  assert.match(previewSvg, /Daily trend/);
  assert.match(previewSvg, /Cost summary/);
  assert.match(previewSvg, /Outcomes/);
  assert.match(previewSvg, /Verification/);
  assert.match(previewSvg, /Contribution bundle preview/);
  assert.match(previewSvg, /Contribution history/);
});
