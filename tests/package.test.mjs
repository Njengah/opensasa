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
  assert.match(architectureDoc, /docs\/ACCOUNT_SYSTEM_DECISION\.md/);
  assert.match(architectureDoc, /hosted\s+accounts remain disabled until a separate identity-dependent feature is\s+approved/);
  assert.match(architectureDoc, /docs\/OPTIONAL_SYNC_DECISION\.md/);
  assert.match(architectureDoc, /background sync\s+and automatic upload remain disabled until a separate sync-specific consent/);
  assert.match(architectureDoc, /docs\/TEAM_PRIVATE_DASHBOARD_DESIGN\.md/);
  assert.match(architectureDoc, /hosted private dashboards remain disabled until account, membership,\s+access-control, sync or upload, private storage, and audit requirements are\s+approved separately/);
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
  assert.match(hostedArchitecture, /Accepted payloads may be stored as contribution records only after a\s+separate persistence PR is approved/);
  assert.match(hostedArchitecture, /append-only accepted contribution store after a separate persistence decision/);
  assert.match(hostedArchitecture, /sample size and confidence labels/);
  assert.match(hostedArchitecture, /source code/);
  assert.match(hostedArchitecture, /private prompts/);
  assert.match(hostedArchitecture, /raw terminal output/);
  assert.match(hostedArchitecture, /seed data only/);
  assert.match(hostedArchitecture, /automatic upload/);
  assert.match(hostedArchitecture, /background sync/);
  assert.match(hostedArchitecture, /docs\/ACCOUNT_SYSTEM_DECISION\.md/);
  assert.match(hostedArchitecture, /accounts stay\s+disabled until a separate feature needs identity/);
  assert.match(hostedArchitecture, /docs\/OPTIONAL_SYNC_DECISION\.md/);
  assert.match(hostedArchitecture, /sync stays\s+disabled until a separate feature needs background data movement/);
  assert.match(hostedArchitecture, /docs\/TEAM_PRIVATE_DASHBOARD_DESIGN\.md/);
  assert.match(hostedArchitecture, /private hosted dashboards stay disabled until account, membership,\s+access-control, sync or upload, private storage, and audit requirements are\s+approved separately/);
  assert.match(hostedArchitecture, /docs\/ABUSE_AND_ANTI_GAMING\.md/);
  assert.match(hostedArchitecture, /public aggregate\s+rankings stay disabled until sample-size, confidence, provenance, verification,\s+and abuse-flag rules are visible/);
  assert.match(hostedArchitecture, /docs\/METHODOLOGY_CHANGELOG\.md/);
  assert.match(hostedArchitecture, /methodology\s+changes that affect public aggregate interpretation must be recorded there/);
  assert.match(hostedArchitecture, /## Current Phase 7 Sequence/);
  assert.match(hostedArchitecture, /account-system decision gate/);
  assert.match(hostedArchitecture, /optional-sync decision gate/);
  assert.match(hostedArchitecture, /organization\/team private dashboard design gate/);
  assert.match(hostedArchitecture, /abuse and anti-gaming rules/);
  assert.match(hostedArchitecture, /public methodology changelog/);
  assert.match(hostedArchitecture, /The initial Phase 7 planning sequence is complete after these decision gates/);
  assert.match(hostedArchitecture, /docs\/PUBLIC_AGGREGATE_SCHEMA\.md/);
  assert.match(hostedArchitecture, /`opensasa ingest`/);
  assert.match(hostedArchitecture, /does not persist accepted payloads yet/);
});

test("account system decision keeps hosted accounts gated until needed", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const accountDecision = await readFile(path.join(root, "docs", "ACCOUNT_SYSTEM_DECISION.md"), "utf8");

  assert.match(readme, /\[docs\/ACCOUNT_SYSTEM_DECISION\.md\]\(\.\/docs\/ACCOUNT_SYSTEM_DECISION\.md\)/);
  assert.match(accountDecision, /# Account System Decision/);
  assert.match(accountDecision, /Status: not needed for the current Phase 7 slice/);
  assert.match(accountDecision, /without login, authentication sessions, billing identity/);
  assert.match(accountDecision, /Do not add an account system until a later feature has a concrete need/);
  assert.match(accountDecision, /local SQLite database remains the personal source of truth/);
  assert.match(accountDecision, /hosted intake can validate contribution-safe payloads without storing a user\s+profile/);
  assert.match(accountDecision, /public dashboards read aggregate records, not private local sessions/);
  assert.match(accountDecision, /private hosted dashboards for a signed-in developer/);
  assert.match(accountDecision, /team or organization dashboards with member access control/);
  assert.match(accountDecision, /cross-device sync that cannot be safely handled by explicit export\/import/);
  assert.match(accountDecision, /what identity fields are collected/);
  assert.match(accountDecision, /retention and deletion behavior/);
  assert.match(accountDecision, /access-control rules/);
  assert.match(accountDecision, /whether contribution records can be linked back to an account/);
  assert.match(accountDecision, /This decision does not add/);
  assert.match(accountDecision, /hosted user profiles/);
});

test("optional sync decision keeps background sync gated until needed", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const syncDecision = await readFile(path.join(root, "docs", "OPTIONAL_SYNC_DECISION.md"), "utf8");

  assert.match(readme, /\[docs\/OPTIONAL_SYNC_DECISION\.md\]\(\.\/docs\/OPTIONAL_SYNC_DECISION\.md\)/);
  assert.match(syncDecision, /# Optional Sync Decision/);
  assert.match(syncDecision, /Status: not needed for the current Phase 7 slice/);
  assert.match(syncDecision, /OpenSasa should not add automatic sync yet/);
  assert.match(syncDecision, /local SQLite database remains the personal source of truth/);
  assert.match(syncDecision, /`opensasa export` writes inspected contribution-safe files only/);
  assert.match(syncDecision, /hosted intake can validate a submitted payload without continuously reading\s+local state/);
  assert.match(syncDecision, /public aggregate dashboards use accepted aggregate records, not a user's\s+private local database/);
  assert.match(syncDecision, /which records sync and which records never sync/);
  assert.match(syncDecision, /conflict resolution across devices/);
  assert.match(syncDecision, /deletion propagation and revocation behavior/);
  assert.match(syncDecision, /cross-device private dashboard continuity/);
  assert.match(syncDecision, /explicit user demand that cannot be satisfied by export\/import/);
  assert.match(syncDecision, /the exact synced record types and excluded fields/);
  assert.match(syncDecision, /the user consent flow and default disabled state/);
  assert.match(syncDecision, /how to inspect, pause, disable, and delete synced data/);
  assert.match(syncDecision, /This decision does not add:\s*\r?\n\r?\n- background sync;\s*\r?\n- automatic upload;/);
  assert.match(syncDecision, /OpenSasa should keep all\s+sync behavior disabled and continue using explicit local export\/import\s+boundaries/);
});

test("team private dashboard design stays gated behind account and sync decisions", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const teamDashboard = await readFile(path.join(root, "docs", "TEAM_PRIVATE_DASHBOARD_DESIGN.md"), "utf8");
  const productTimeline = await readFile(path.join(root, "docs", "PRODUCT_TIMELINE.md"), "utf8");

  assert.match(readme, /\[docs\/TEAM_PRIVATE_DASHBOARD_DESIGN\.md\]\(\.\/docs\/TEAM_PRIVATE_DASHBOARD_DESIGN\.md\)/);
  assert.match(teamDashboard, /# Organization And Team Private Dashboard Design/);
  assert.match(teamDashboard, /Status: design gate only/);
  assert.match(teamDashboard, /without adding accounts, sync, organization membership, hosted private storage,\s+or access-controlled dashboard code/);
  assert.match(teamDashboard, /Keep organization and team private dashboards as a separate future feature/);
  assert.match(teamDashboard, /This document is the first design gate/);
  assert.match(teamDashboard, /does\s+not approve implementation/);
  assert.match(teamDashboard, /A future implementation PR must come only after the\s+project has approved/);
  assert.match(teamDashboard, /an account system with identity, retention, deletion, recovery, and abuse\s+rules/);
  assert.match(teamDashboard, /organization or team membership and role-based access control/);
  assert.match(teamDashboard, /optional sync or explicit upload rules for the exact records shown/);
  assert.match(teamDashboard, /audit trail for who viewed, changed, exported, or deleted shared data/);
  assert.match(teamDashboard, /The current local dashboard remains personal and local-only/);
  assert.match(teamDashboard, /Public aggregate dashboards remain separate/);
  assert.match(teamDashboard, /personal local records that never leave the developer's machine/);
  assert.match(teamDashboard, /private workspace records shared under organization or team policy/);
  assert.match(teamDashboard, /who can invite, remove, or change members/);
  assert.match(teamDashboard, /which roles can view raw private records/);
  assert.match(teamDashboard, /how revoked members lose access/);
  assert.match(teamDashboard, /This decision does not add:\s*\r?\n\r?\n- hosted private dashboard routes;\s*\r?\n- organization or team membership;\s*\r?\n- role-based access control;/);
  assert.match(teamDashboard, /OpenSasa should keep the shipped\s+dashboard local-only and keep public dashboards aggregate-only/);
  assert.match(productTimeline, /- \[[ x]\] Add organization\/team private dashboard design\.(?: \(#\d+\))?/);
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
  assert.match(methodology, /ABUSE_AND_ANTI_GAMING\.md/);
  assert.match(methodology, /METHODOLOGY_CHANGELOG\.md/);
  assert.match(methodology, /src\/public-aggregate\.ts/);
  assert.match(methodology, /fewer than 30 accepted contribution records/);
  assert.match(methodology, /At least 100 records, but fewer than 500 records/);
  assert.match(methodology, /Changing them should update the\s+methodology version and \[`METHODOLOGY_CHANGELOG\.md`\]/);
});

test("abuse and anti-gaming rules keep public aggregate claims conservative", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const abuseRules = await readFile(path.join(root, "docs", "ABUSE_AND_ANTI_GAMING.md"), "utf8");
  const aggregateSchema = await readFile(path.join(root, "docs", "PUBLIC_AGGREGATE_SCHEMA.md"), "utf8");
  const productTimeline = await readFile(path.join(root, "docs", "PRODUCT_TIMELINE.md"), "utf8");

  assert.match(readme, /\[docs\/ABUSE_AND_ANTI_GAMING\.md\]\(\.\/docs\/ABUSE_AND_ANTI_GAMING\.md\)/);
  assert.match(abuseRules, /# Abuse And Anti-Gaming Rules/);
  assert.match(abuseRules, /Status: rulebook for Phase 7 public aggregate planning/);
  assert.match(abuseRules, /without adding moderation queues, account enforcement,\s+identity tracking, public rankings, or automated penalties/);
  assert.match(abuseRules, /prefer hiding, flagging, or lowering confidence over publishing\s+metrics that look precise but may be manipulated/);
  assert.match(abuseRules, /raw task volume without verification/);
  assert.match(abuseRules, /seed, synthetic, or test data presented as community data/);
  assert.match(abuseRules, /vendor-submitted data presented as independent community signal/);
  assert.match(abuseRules, /Every public aggregate record must keep visible labels/);
  assert.match(abuseRules, /Synthetic display data should use seed or test provenance in public\s+aggregate records/);
  assert.match(abuseRules, /one safe provenance, vendor, tool, or import-source bucket dominating a\s+result/);
  assert.match(abuseRules, /Contributor-level or team-level abuse detection requires a separate identity\s+and privacy decision/);
  assert.match(abuseRules, /must not be used to justify collecting\s+stable contributor, account, team, organization, repository, or customer\s+identity/);
  assert.match(abuseRules, /unusually high success rate with low verification coverage/);
  assert.match(abuseRules, /Flagged records should not raise confidence labels/);
  assert.match(abuseRules, /Vendor data must:/);
  assert.match(abuseRules, /never define thresholds, ranking formulas, or confidence labels by itself/);
  assert.match(abuseRules, /Public rankings must stay disabled until:/);
  assert.match(abuseRules, /abuse flags are handled/);
  assert.match(abuseRules, /Abuse prevention must not become a reason to collect private implementation\s+data/);
  assert.match(abuseRules, /This decision does not add:\s*\r?\n\r?\n- user accounts;\s*\r?\n- identity enforcement;\s*\r?\n- moderation queues;/);
  assert.match(abuseRules, /Future enforcement work must become a separate PR/);
  assert.match(aggregateSchema, /ABUSE_AND_ANTI_GAMING\.md/);
  assert.match(productTimeline, /- \[[ x]\] Add abuse and anti-gaming rules\.(?: \(#\d+\))?/);
});

test("public methodology changelog records public aggregate methodology history", async () => {
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  const methodologyChangelog = await readFile(path.join(root, "docs", "METHODOLOGY_CHANGELOG.md"), "utf8");
  const aggregateSchema = await readFile(path.join(root, "docs", "PUBLIC_AGGREGATE_SCHEMA.md"), "utf8");
  const productTimeline = await readFile(path.join(root, "docs", "PRODUCT_TIMELINE.md"), "utf8");

  assert.match(readme, /\[docs\/METHODOLOGY_CHANGELOG\.md\]\(\.\/docs\/METHODOLOGY_CHANGELOG\.md\)/);
  assert.match(methodologyChangelog, /# Public Methodology Changelog/);
  assert.match(methodologyChangelog, /Status: public methodology history for Phase 7/);
  assert.match(methodologyChangelog, /opensasa\.methodology\.v0/);
  assert.match(methodologyChangelog, /Update this changelog whenever a PR changes:/);
  assert.match(methodologyChangelog, /public aggregate formulas/);
  assert.match(methodologyChangelog, /confidence labels or thresholds/);
  assert.match(methodologyChangelog, /data provenance rules/);
  assert.match(methodologyChangelog, /abuse or anti-gaming rules/);
  assert.match(methodologyChangelog, /whether existing public aggregate records need regeneration/);
  assert.match(methodologyChangelog, /Changing public methodology behavior should also update the methodology version/);
  assert.match(methodologyChangelog, /## 2026-07-23 - opensasa\.methodology\.v0/);
  assert.match(methodologyChangelog, /Related schema version: `opensasa\.public-aggregate\.v0`/);
  assert.match(methodologyChangelog, /#121: defined the public aggregate schema/);
  assert.match(methodologyChangelog, /#124: added confidence labels for aggregate views/);
  assert.match(methodologyChangelog, /#130: added abuse and anti-gaming rules/);
  assert.match(methodologyChangelog, /Public aggregate records must include schema version and methodology version/);
  assert.match(methodologyChangelog, /Seed and test records are always `insufficient`/);
  assert.match(methodologyChangelog, /No persisted public aggregate records exist yet/);
  assert.match(aggregateSchema, /METHODOLOGY_CHANGELOG\.md/);
  assert.match(productTimeline, /- \[[ x]\] Add public methodology changelog\.(?: \(#\d+\))?/);
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
  assert.match(publicDashboard, /The API also returns `real_data_gate`/);
  assert.match(publicDashboard, /meets the minimum public sample size/);
  assert.match(publicDashboard, /has `early`, `moderate`, or `strong` confidence/);
  assert.match(publicDashboard, /`data_provenance: "seed"`/);
  assert.match(publicDashboard, /`quality\.confidence_label: "insufficient"`/);
  assert.match(hostedArchitecture, /docs\/PUBLIC_DASHBOARD\.md/);
  assert.match(hostedArchitecture, /every returned\s+record is labeled as seed data with insufficient confidence/);
  assert.match(hostedArchitecture, /real-data gate/);
  assert.match(hostedArchitecture, /non-seed aggregate record meets sample-size and confidence\s+thresholds/);
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
