import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateLocalReport,
  formatLocalReport,
  formatLocalReportJson,
} from "../dist/report.js";
import { localSessionSchema } from "../dist/schema.js";

const baseSession = {
  timestamp: "2026-06-09T12:00:00.000Z",
  provider: "OpenAI",
  model_id: "gpt-5",
  task_type: "bug_fix",
  final_outcome: "accepted",
  work_mode: "manual_log",
};

function session(overrides = {}) {
  return localSessionSchema.parse({
    ...baseSession,
    ...overrides,
  });
}

test("calculates local report metrics from safe session metadata", () => {
  const report = calculateLocalReport([
    session({
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "accepted",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      retry_count: 1,
      duration_seconds: 600,
      tests_outcome: "passed",
      estimated_cost_usd: 0.5,
      cost_source: "provider_usage",
    }),
    session({
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      task_type: "feature",
      final_outcome: "partially_accepted",
      tool: "Claude Code",
      language: "Python",
      framework: "Django",
      retry_count: 2,
      duration_seconds: 120,
      manual_review_outcome: "accepted",
      estimated_cost_usd: 1.25,
      cost_source: "tool_reported",
    }),
    session({
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "rejected",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      retry_count: 3,
      tests_outcome: "failed",
      estimated_cost_usd: 0.75,
      cost_source: "estimated",
    }),
    session({
      provider: "Google",
      model_id: "gemini-cli",
      task_type: "documentation",
      final_outcome: "unknown",
    }),
  ]);

  assert.equal(report.totalSessions, 4);
  assert.deepEqual(report.sessionsByProvider, {
    Anthropic: 1,
    Google: 1,
    OpenAI: 2,
  });
  assert.deepEqual(report.sessionsByModel, {
    "Anthropic/claude-sonnet-4.5": 1,
    "Google/gemini-cli": 1,
    "OpenAI/gpt-5": 2,
  });
  assert.deepEqual(report.sessionsByTool, {
    "Claude Code": 1,
    Codex: 2,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByLanguage, {
    Python: 1,
    TypeScript: 2,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByFramework, {
    Django: 1,
    "Node.js": 2,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByWorkMode, {
    manual_log: 4,
  });
  assert.deepEqual(report.sessionsByCostSource, {
    estimated: 1,
    provider_usage: 1,
    tool_reported: 1,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByTaskType, {
    bug_fix: 2,
    documentation: 1,
    feature: 1,
  });
  assert.equal(report.acceptedOrPartiallyAcceptedCount, 2);
  assert.equal(report.rejectedCount, 1);
  assert.equal(report.unknownOutcomeCount, 1);
  assert.equal(report.estimatedTotalCostUsd, 2.5);
  assert.deepEqual(report.costByProviderUsd, {
    Anthropic: 1.25,
    OpenAI: 1.25,
  });
  assert.deepEqual(report.costByModelUsd, {
    "Anthropic/claude-sonnet-4.5": 1.25,
    "OpenAI/gpt-5": 1.25,
  });
  assert.deepEqual(report.costByToolUsd, {
    "Claude Code": 1.25,
    Codex: 1.25,
  });
  assert.deepEqual(report.costByLanguageUsd, {
    Python: 1.25,
    TypeScript: 1.25,
  });
  assert.deepEqual(report.costByFrameworkUsd, {
    Django: 1.25,
    "Node.js": 1.25,
  });
  assert.deepEqual(report.costByWorkModeUsd, {
    manual_log: 2.5,
  });
  assert.deepEqual(report.costByCostSourceUsd, {
    estimated: 0.75,
    provider_usage: 0.5,
    tool_reported: 1.25,
  });
  assert.equal(report.costPerUsefulTaskUsd, 1.25);
  assert.equal(report.failureCostUsd, 0.75);
  assert.equal(report.speedToUsefulOutputSeconds, 360);
  assert.deepEqual(report.retrySummary, {
    totalRetries: 3,
    usefulSessionCount: 2,
    retryBurden: 1.5,
  });
  assert.deepEqual(report.failureRetrySummary, {
    totalRetries: 3,
    rejectedSessionCount: 1,
    failureRetryBurden: 3,
  });
  assert.equal(report.confidenceSummary.level, "insufficient");
  assert.equal(report.confidenceSummary.knownOutcomeCount, 3);
  assert.equal(report.confidenceSummary.verifiedSessionCount, 3);
  assert.equal(report.confidenceSummary.verificationShare.rate, 1);
  assert.equal(report.verificationOutcomeSummary.tests_outcome.passed, 1);
  assert.equal(report.verificationOutcomeSummary.tests_outcome.failed, 1);
  assert.equal(report.verificationOutcomeSummary.tests_outcome.unknown, 2);
  assert.deepEqual(report.usefulOutcomeRate, {
    numerator: 2,
    denominator: 3,
    rate: 2 / 3,
  });
  assert.deepEqual(report.unknownOutcomeRate, {
    numerator: 1,
    denominator: 4,
    rate: 0.25,
  });
  assert.deepEqual(report.verifiedSuccessRate, {
    numerator: 2,
    denominator: 3,
    rate: 2 / 3,
  });
});

test("labels missing cost and unknown outcome rates clearly", () => {
  const report = calculateLocalReport([
    session({ final_outcome: "unknown" }),
    session({
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      final_outcome: "unknown",
    }),
  ]);

  assert.equal(report.estimatedTotalCostUsd, null);
  assert.deepEqual(report.costByProviderUsd, {});
  assert.deepEqual(report.costByModelUsd, {});
  assert.deepEqual(report.costByToolUsd, {});
  assert.deepEqual(report.costByLanguageUsd, {});
  assert.deepEqual(report.costByFrameworkUsd, {});
  assert.deepEqual(report.costByWorkModeUsd, {});
  assert.deepEqual(report.costByCostSourceUsd, {});
  assert.equal(report.costPerUsefulTaskUsd, null);
  assert.equal(report.failureCostUsd, 0);
  assert.equal(report.speedToUsefulOutputSeconds, null);
  assert.deepEqual(report.usefulOutcomeRate, {
    numerator: 0,
    denominator: 0,
    rate: null,
  });
  assert.deepEqual(report.unknownOutcomeRate, {
    numerator: 2,
    denominator: 2,
    rate: 1,
  });
  assert.deepEqual(report.verifiedSuccessRate, {
    numerator: 0,
    denominator: 0,
    rate: null,
  });
  assert.equal(report.retrySummary.retryBurden, null);
  assert.deepEqual(report.failureRetrySummary, {
    totalRetries: 0,
    rejectedSessionCount: 0,
    failureRetryBurden: null,
  });
  assert.equal(report.confidenceSummary.level, "insufficient");
  assert.equal(report.confidenceSummary.knownOutcomeCount, 0);
  assert.equal(report.confidenceSummary.verificationShare.rate, null);
});

test("formats a readable local report", () => {
  const report = calculateLocalReport([
    session({
      final_outcome: "accepted",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      tests_outcome: "passed",
      duration_seconds: 300,
      estimated_cost_usd: 0.5,
      cost_source: "estimated",
    }),
  ]);
  const output = formatLocalReport(report);

  assert.match(output, /OpenSasa Local Report/);
  assert.match(output, /Total sessions: 1/);
  assert.match(output, /Sessions by provider:\n- OpenAI: 1/);
  assert.match(output, /OpenAI\/gpt-5: 1/);
  assert.match(output, /Sessions by tool:\n- Codex: 1/);
  assert.match(output, /Sessions by language:\n- TypeScript: 1/);
  assert.match(output, /Sessions by framework:\n- Node\.js: 1/);
  assert.match(output, /Sessions by work mode:\n- manual_log: 1/);
  assert.match(output, /Sessions by cost source:\n- estimated: 1/);
  assert.match(output, /Estimated total cost: \$0\.5000/);
  assert.match(output, /Cost per useful task: \$0\.5000/);
  assert.match(output, /Failure cost: \$0\.0000/);
  assert.match(output, /Cost by provider:\n- OpenAI: \$0\.5000/);
  assert.match(output, /Cost by tool:\n- Codex: \$0\.5000/);
  assert.match(output, /Cost by language:\n- TypeScript: \$0\.5000/);
  assert.match(output, /Cost by framework:\n- Node\.js: \$0\.5000/);
  assert.match(output, /Cost by work mode:\n- manual_log: \$0\.5000/);
  assert.match(output, /Cost by cost source:\n- estimated: \$0\.5000/);
  assert.match(output, /Speed to useful output: 300\.0s/);
  assert.match(output, /Total retries on rejected sessions: 0/);
  assert.match(output, /Failure retry burden: unknown/);
  assert.match(output, /Confidence level: insufficient/);
  assert.match(output, /Known outcome sessions: 1/);
  assert.match(output, /Verified sessions: 1/);
  assert.match(output, /Verification share: 100\.0% \(1\/1\)/);
  assert.match(output, /Useful outcome rate: 100\.0% \(1\/1\)/);
  assert.match(output, /Unknown outcome rate: 0\.0% \(0\/1\)/);
  assert.match(output, /Verified success rate: 100\.0% \(1\/1\)/);
});

test("formats a local report as JSON", () => {
  const report = calculateLocalReport([
    session({
      final_outcome: "accepted",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      tests_outcome: "passed",
      duration_seconds: 300,
      estimated_cost_usd: 0.5,
      cost_source: "estimated",
    }),
  ]);
  const parsed = JSON.parse(formatLocalReportJson(report));

  assert.equal(parsed.totalSessions, 1);
  assert.equal(parsed.sessionsByProvider.OpenAI, 1);
  assert.equal(parsed.sessionsByTool.Codex, 1);
  assert.equal(parsed.sessionsByLanguage.TypeScript, 1);
  assert.equal(parsed.sessionsByFramework["Node.js"], 1);
  assert.equal(parsed.sessionsByWorkMode.manual_log, 1);
  assert.equal(parsed.sessionsByCostSource.estimated, 1);
  assert.equal(parsed.estimatedTotalCostUsd, 0.5);
  assert.equal(parsed.costByProviderUsd.OpenAI, 0.5);
  assert.equal(parsed.costByToolUsd.Codex, 0.5);
  assert.equal(parsed.costByLanguageUsd.TypeScript, 0.5);
  assert.equal(parsed.costByFrameworkUsd["Node.js"], 0.5);
  assert.equal(parsed.costByWorkModeUsd.manual_log, 0.5);
  assert.equal(parsed.costByCostSourceUsd.estimated, 0.5);
  assert.equal(parsed.costPerUsefulTaskUsd, 0.5);
  assert.equal(parsed.failureCostUsd, 0);
  assert.equal(parsed.speedToUsefulOutputSeconds, 300);
  assert.equal(parsed.failureRetrySummary.totalRetries, 0);
  assert.equal(parsed.failureRetrySummary.rejectedSessionCount, 0);
  assert.equal(parsed.failureRetrySummary.failureRetryBurden, null);
  assert.equal(parsed.confidenceSummary.level, "insufficient");
  assert.equal(parsed.confidenceSummary.knownOutcomeCount, 1);
  assert.equal(parsed.confidenceSummary.verifiedSessionCount, 1);
  assert.equal(parsed.confidenceSummary.verificationShare.rate, 1);
  assert.equal(parsed.usefulOutcomeRate.rate, 1);
  assert.equal(parsed.unknownOutcomeRate.rate, 0);
  assert.equal(parsed.verifiedSuccessRate.rate, 1);
});

test("labels reasonable confidence for larger verified local samples", () => {
  const sessions = Array.from({ length: 20 }, (_, index) =>
    session({
      session_id: `session-${index}`,
      final_outcome: index < 16 ? "accepted" : "rejected",
      tests_outcome: index < 16 ? "passed" : "failed",
    }),
  );
  const report = calculateLocalReport(sessions);

  assert.equal(report.confidenceSummary.level, "reasonable");
  assert.equal(report.confidenceSummary.knownOutcomeCount, 20);
  assert.equal(report.confidenceSummary.verifiedSessionCount, 20);
  assert.equal(report.confidenceSummary.verificationShare.rate, 1);
});
