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
      retry_count: 1,
      duration_seconds: 600,
      tests_outcome: "passed",
      estimated_cost_usd: 0.5,
    }),
    session({
      provider: "Anthropic",
      model_id: "claude-sonnet-4.5",
      task_type: "feature",
      final_outcome: "partially_accepted",
      retry_count: 2,
      duration_seconds: 120,
      manual_review_outcome: "accepted",
      estimated_cost_usd: 1.25,
    }),
    session({
      provider: "OpenAI",
      model_id: "gpt-5",
      task_type: "bug_fix",
      final_outcome: "rejected",
      retry_count: 3,
      tests_outcome: "failed",
      estimated_cost_usd: 0.75,
    }),
    session({
      provider: "Google",
      model_id: "gemini-cli",
      task_type: "documentation",
      final_outcome: "unknown",
    }),
  ]);

  assert.equal(report.totalSessions, 4);
  assert.deepEqual(report.sessionsByModel, {
    "Anthropic/claude-sonnet-4.5": 1,
    "Google/gemini-cli": 1,
    "OpenAI/gpt-5": 2,
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
  assert.deepEqual(report.costByModelUsd, {
    "Anthropic/claude-sonnet-4.5": 1.25,
    "OpenAI/gpt-5": 1.25,
  });
  assert.equal(report.costPerUsefulTaskUsd, 1.25);
  assert.equal(report.failureCostUsd, 0.75);
  assert.equal(report.speedToUsefulOutputSeconds, 360);
  assert.deepEqual(report.retrySummary, {
    totalRetries: 3,
    usefulSessionCount: 2,
    retryBurden: 1.5,
  });
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
  assert.deepEqual(report.costByModelUsd, {});
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
});

test("formats a readable local report", () => {
  const report = calculateLocalReport([
    session({
      final_outcome: "accepted",
      tests_outcome: "passed",
      duration_seconds: 300,
      estimated_cost_usd: 0.5,
    }),
  ]);
  const output = formatLocalReport(report);

  assert.match(output, /OpenSasa Local Report/);
  assert.match(output, /Total sessions: 1/);
  assert.match(output, /OpenAI\/gpt-5: 1/);
  assert.match(output, /Estimated total cost: \$0\.5000/);
  assert.match(output, /Cost per useful task: \$0\.5000/);
  assert.match(output, /Failure cost: \$0\.0000/);
  assert.match(output, /Speed to useful output: 300\.0s/);
  assert.match(output, /Useful outcome rate: 100\.0% \(1\/1\)/);
  assert.match(output, /Unknown outcome rate: 0\.0% \(0\/1\)/);
  assert.match(output, /Verified success rate: 100\.0% \(1\/1\)/);
});

test("formats a local report as JSON", () => {
  const report = calculateLocalReport([
    session({
      final_outcome: "accepted",
      tests_outcome: "passed",
      duration_seconds: 300,
      estimated_cost_usd: 0.5,
    }),
  ]);
  const parsed = JSON.parse(formatLocalReportJson(report));

  assert.equal(parsed.totalSessions, 1);
  assert.equal(parsed.estimatedTotalCostUsd, 0.5);
  assert.equal(parsed.costPerUsefulTaskUsd, 0.5);
  assert.equal(parsed.failureCostUsd, 0);
  assert.equal(parsed.speedToUsefulOutputSeconds, 300);
  assert.equal(parsed.usefulOutcomeRate.rate, 1);
  assert.equal(parsed.unknownOutcomeRate.rate, 0);
  assert.equal(parsed.verifiedSuccessRate.rate, 1);
});
