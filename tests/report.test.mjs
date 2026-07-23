import assert from "node:assert/strict";
import { test } from "node:test";
import {
  calculateLocalReport,
  formatLocalReport,
  formatLocalReportCompact,
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
      error_count: 0,
      duration_seconds: 600,
      tests_outcome: "passed",
      input_tokens_estimate: 1000,
      output_tokens_estimate: 400,
      cached_tokens_estimate: 50,
      estimated_cost_usd: 0.5,
      cost_source: "provider_usage",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
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
      error_count: 2,
      duration_seconds: 120,
      manual_review_outcome: "accepted",
      input_tokens_estimate: 2000,
      output_tokens_estimate: 800,
      estimated_cost_usd: 1.25,
      cost_source: "tool_reported",
      repo_size_bucket: "medium",
      file_count_bucket: "large",
      changed_file_count_bucket: "small",
      lines_added_bucket: "medium",
      lines_removed_bucket: "small",
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
      error_count: 11,
      tests_outcome: "failed",
      estimated_cost_usd: 0.75,
      cost_source: "estimated",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
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
  assert.deepEqual(report.sessionsByRepoSizeBucket, {
    medium: 1,
    small: 2,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByFileCountBucket, {
    large: 1,
    medium: 2,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByChangedFileCountBucket, {
    small: 1,
    tiny: 2,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByLinesAddedBucket, {
    medium: 1,
    small: 2,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByLinesRemovedBucket, {
    small: 1,
    tiny: 2,
    unknown: 1,
  });
  assert.deepEqual(report.sessionsByDurationBucket, {
    "1m_to_5m": 1,
    "5m_to_30m": 1,
    unknown: 2,
  });
  assert.deepEqual(report.sessionsByErrorCountBucket, {
    small: 1,
    tiny: 1,
    unknown: 1,
    zero: 1,
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
  assert.deepEqual(report.costByRepoSizeBucketUsd, {
    medium: 1.25,
    small: 1.25,
  });
  assert.deepEqual(report.costByFileCountBucketUsd, {
    large: 1.25,
    medium: 1.25,
  });
  assert.deepEqual(report.costByChangedFileCountBucketUsd, {
    small: 1.25,
    tiny: 1.25,
  });
  assert.deepEqual(report.costByLinesAddedBucketUsd, {
    medium: 1.25,
    small: 1.25,
  });
  assert.deepEqual(report.costByLinesRemovedBucketUsd, {
    small: 1.25,
    tiny: 1.25,
  });
  assert.deepEqual(report.costByDurationBucketUsd, {
    "1m_to_5m": 1.25,
    "5m_to_30m": 0.5,
    unknown: 0.75,
  });
  assert.deepEqual(report.costByErrorCountBucketUsd, {
    small: 0.75,
    tiny: 1.25,
    zero: 0.5,
  });
  assert.deepEqual(report.tokenEstimateSummary, {
    sessionsWithTokenEstimates: 2,
    inputTokensEstimateTotal: 3000,
    outputTokensEstimateTotal: 1200,
    cachedTokensEstimateTotal: 50,
    totalTokensEstimate: 4250,
  });
  assert.deepEqual(report.errorCountSummary, {
    sessionsWithErrorCounts: 3,
    totalErrorCount: 13,
    averageErrorsPerRecordedSession: 13 / 3,
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
  assert.deepEqual(report.costByRepoSizeBucketUsd, {});
  assert.deepEqual(report.costByFileCountBucketUsd, {});
  assert.deepEqual(report.costByChangedFileCountBucketUsd, {});
  assert.deepEqual(report.costByLinesAddedBucketUsd, {});
  assert.deepEqual(report.costByLinesRemovedBucketUsd, {});
  assert.deepEqual(report.costByDurationBucketUsd, {});
  assert.deepEqual(report.costByErrorCountBucketUsd, {});
  assert.deepEqual(report.tokenEstimateSummary, {
    sessionsWithTokenEstimates: 0,
    inputTokensEstimateTotal: null,
    outputTokensEstimateTotal: null,
    cachedTokensEstimateTotal: null,
    totalTokensEstimate: null,
  });
  assert.deepEqual(report.errorCountSummary, {
    sessionsWithErrorCounts: 0,
    totalErrorCount: null,
    averageErrorsPerRecordedSession: null,
  });
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

test("formats empty report sections clearly", () => {
  const output = formatLocalReport(calculateLocalReport([]));

  assert.match(output, /Total sessions: 0/);
  assert.match(output, /No local sessions matched this report/);
  assert.match(output, /Sessions by provider:\n- none recorded/);
  assert.match(output, /Cost by provider: none recorded/);
  assert.match(output, /tests_outcome:\n- none recorded/);
});

test("formats a compact report for terminal readability", () => {
  const report = calculateLocalReport([
    session({
      final_outcome: "accepted",
      tests_outcome: "passed",
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      estimated_cost_usd: 0.5,
      retry_count: 1,
    }),
  ]);

  const output = formatLocalReportCompact(report);

  assert.match(output, /^OpenSasa: 1 session\n/);
  assert.match(output, /Useful 100\.0% \(1\/1\)/);
  assert.match(output, /Cost \$0\.5000/);
  assert.match(output, /Tokens 1700/);
  assert.match(output, /Confidence insufficient/);
  assert.doesNotMatch(output, /Sessions by provider/);
});

test("formats an empty compact report clearly", () => {
  const output = formatLocalReportCompact(calculateLocalReport([]));

  assert.match(output, /^OpenSasa: 0 sessions/);
  assert.match(output, /No matching sessions/);
});

test("keeps full report text output stable", () => {
  const report = calculateLocalReport([
    session({
      final_outcome: "accepted",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      tests_outcome: "passed",
      error_count: 2,
      duration_seconds: 300,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "estimated",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
    }),
  ]);

  assert.equal(
    formatLocalReport(report),
    `OpenSasa Local Report

Total sessions: 1

Outcome summary:
Accepted or partially accepted: 1
Rejected: 0
Unknown outcome: 0

Rates:
Useful outcome rate: 100.0% (1/1)
Unknown outcome rate: 0.0% (0/1)
Verified success rate: 100.0% (1/1)

Cost summary:
Estimated total cost: $0.5000
Cost per useful task: $0.5000
Failure cost: $0.0000

Token estimate summary:
Sessions with token estimates: 1
Input tokens estimate: 1200
Output tokens estimate: 500
Cached tokens estimate: 100
Total tokens estimate: 1800

Error count summary:
Sessions with error counts: 1
Total error count: 2
Average errors per recorded session: 2.00

Speed summary:
Speed to useful output: 300.0s

Retry summary:
Total retries on useful sessions: 0
Retry burden: 0.00
Total retries on rejected sessions: 0
Failure retry burden: unknown

Confidence summary:
Confidence level: insufficient
Known outcome sessions: 1
Verified sessions: 1
Verification share: 100.0% (1/1)
Confidence note: Not enough known and verified local sessions for a reliable signal yet.

Verification outcome summary:
tests_outcome:
- passed: 1
build_outcome:
- unknown: 1
lint_outcome:
- unknown: 1
typecheck_outcome:
- unknown: 1
manual_review_outcome:
- unknown: 1

Session groupings:
Sessions by provider:
- OpenAI: 1

Sessions by model:
- OpenAI/gpt-5: 1

Sessions by tool:
- Codex: 1

Sessions by language:
- TypeScript: 1

Sessions by framework:
- Node.js: 1

Sessions by work mode:
- manual_log: 1

Sessions by cost source:
- estimated: 1

Sessions by repo size bucket:
- small: 1

Sessions by file count bucket:
- medium: 1

Sessions by changed file count bucket:
- tiny: 1

Sessions by lines added bucket:
- small: 1

Sessions by lines removed bucket:
- tiny: 1

Sessions by duration bucket:
- 1m_to_5m: 1

Sessions by error count bucket:
- tiny: 1

Sessions by task type:
- bug_fix: 1

Cost groupings:
Cost by provider:
- OpenAI: $0.5000
Cost by model:
- OpenAI/gpt-5: $0.5000
Cost by tool:
- Codex: $0.5000
Cost by language:
- TypeScript: $0.5000
Cost by framework:
- Node.js: $0.5000
Cost by work mode:
- manual_log: $0.5000
Cost by cost source:
- estimated: $0.5000
Cost by repo size bucket:
- small: $0.5000
Cost by file count bucket:
- medium: $0.5000
Cost by changed file count bucket:
- tiny: $0.5000
Cost by lines added bucket:
- small: $0.5000
Cost by lines removed bucket:
- tiny: $0.5000
Cost by duration bucket:
- 1m_to_5m: $0.5000
Cost by error count bucket:
- tiny: $0.5000`,
  );
});

test("keeps compact report text output stable", () => {
  const report = calculateLocalReport([
    session({
      final_outcome: "accepted",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      tests_outcome: "passed",
      error_count: 2,
      duration_seconds: 300,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "estimated",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
    }),
  ]);

  assert.equal(
    formatLocalReportCompact(report),
    `OpenSasa: 1 session
Useful 100.0% (1/1) | Verified 100.0% (1/1) | Unknown 0.0% (0/1)
Cost $0.5000 | Useful task $0.5000 | Retries 0.00
Tokens 1800 | Errors 2 | Confidence insufficient`,
  );
});

test("formats a readable local report", () => {
  const report = calculateLocalReport([
    session({
      final_outcome: "accepted",
      tool: "Codex",
      language: "TypeScript",
      framework: "Node.js",
      tests_outcome: "passed",
      error_count: 2,
      duration_seconds: 300,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "estimated",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
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
  assert.match(output, /Sessions by repo size bucket:\n- small: 1/);
  assert.match(output, /Sessions by file count bucket:\n- medium: 1/);
  assert.match(output, /Sessions by changed file count bucket:\n- tiny: 1/);
  assert.match(output, /Sessions by lines added bucket:\n- small: 1/);
  assert.match(output, /Sessions by lines removed bucket:\n- tiny: 1/);
  assert.match(output, /Sessions by duration bucket:\n- 1m_to_5m: 1/);
  assert.match(output, /Sessions by error count bucket:\n- tiny: 1/);
  assert.match(output, /Estimated total cost: \$0\.5000/);
  assert.match(output, /Cost per useful task: \$0\.5000/);
  assert.match(output, /Failure cost: \$0\.0000/);
  assert.match(output, /Cost by provider:\n- OpenAI: \$0\.5000/);
  assert.match(output, /Cost by tool:\n- Codex: \$0\.5000/);
  assert.match(output, /Cost by language:\n- TypeScript: \$0\.5000/);
  assert.match(output, /Cost by framework:\n- Node\.js: \$0\.5000/);
  assert.match(output, /Cost by work mode:\n- manual_log: \$0\.5000/);
  assert.match(output, /Cost by cost source:\n- estimated: \$0\.5000/);
  assert.match(output, /Cost by repo size bucket:\n- small: \$0\.5000/);
  assert.match(output, /Cost by file count bucket:\n- medium: \$0\.5000/);
  assert.match(output, /Cost by changed file count bucket:\n- tiny: \$0\.5000/);
  assert.match(output, /Cost by lines added bucket:\n- small: \$0\.5000/);
  assert.match(output, /Cost by lines removed bucket:\n- tiny: \$0\.5000/);
  assert.match(output, /Cost by duration bucket:\n- 1m_to_5m: \$0\.5000/);
  assert.match(output, /Cost by error count bucket:\n- tiny: \$0\.5000/);
  assert.match(output, /Token estimate summary:/);
  assert.match(output, /Sessions with token estimates: 1/);
  assert.match(output, /Input tokens estimate: 1200/);
  assert.match(output, /Output tokens estimate: 500/);
  assert.match(output, /Cached tokens estimate: 100/);
  assert.match(output, /Total tokens estimate: 1800/);
  assert.match(output, /Error count summary:/);
  assert.match(output, /Sessions with error counts: 1/);
  assert.match(output, /Total error count: 2/);
  assert.match(output, /Average errors per recorded session: 2\.00/);
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
      error_count: 2,
      duration_seconds: 300,
      input_tokens_estimate: 1200,
      output_tokens_estimate: 500,
      cached_tokens_estimate: 100,
      estimated_cost_usd: 0.5,
      cost_source: "estimated",
      repo_size_bucket: "small",
      file_count_bucket: "medium",
      changed_file_count_bucket: "tiny",
      lines_added_bucket: "small",
      lines_removed_bucket: "tiny",
    }),
  ]);
  const parsed = JSON.parse(formatLocalReportJson(report));

  assert.equal(parsed.reportSchemaVersion, "opensasa.report.v0");
  assert.equal(parsed.metadataSchemaVersion, "opensasa.metadata.v0");
  assert.equal(parsed.totalSessions, 1);
  assert.equal(parsed.sessionsByProvider.OpenAI, 1);
  assert.equal(parsed.sessionsByTool.Codex, 1);
  assert.equal(parsed.sessionsByLanguage.TypeScript, 1);
  assert.equal(parsed.sessionsByFramework["Node.js"], 1);
  assert.equal(parsed.sessionsByWorkMode.manual_log, 1);
  assert.equal(parsed.sessionsByCostSource.estimated, 1);
  assert.equal(parsed.sessionsByRepoSizeBucket.small, 1);
  assert.equal(parsed.sessionsByFileCountBucket.medium, 1);
  assert.equal(parsed.sessionsByChangedFileCountBucket.tiny, 1);
  assert.equal(parsed.sessionsByLinesAddedBucket.small, 1);
  assert.equal(parsed.sessionsByLinesRemovedBucket.tiny, 1);
  assert.equal(parsed.sessionsByDurationBucket["1m_to_5m"], 1);
  assert.equal(parsed.sessionsByErrorCountBucket.tiny, 1);
  assert.equal(parsed.estimatedTotalCostUsd, 0.5);
  assert.equal(parsed.costByProviderUsd.OpenAI, 0.5);
  assert.equal(parsed.costByToolUsd.Codex, 0.5);
  assert.equal(parsed.costByLanguageUsd.TypeScript, 0.5);
  assert.equal(parsed.costByFrameworkUsd["Node.js"], 0.5);
  assert.equal(parsed.costByWorkModeUsd.manual_log, 0.5);
  assert.equal(parsed.costByCostSourceUsd.estimated, 0.5);
  assert.equal(parsed.costByRepoSizeBucketUsd.small, 0.5);
  assert.equal(parsed.costByFileCountBucketUsd.medium, 0.5);
  assert.equal(parsed.costByChangedFileCountBucketUsd.tiny, 0.5);
  assert.equal(parsed.costByLinesAddedBucketUsd.small, 0.5);
  assert.equal(parsed.costByLinesRemovedBucketUsd.tiny, 0.5);
  assert.equal(parsed.costByDurationBucketUsd["1m_to_5m"], 0.5);
  assert.equal(parsed.costByErrorCountBucketUsd.tiny, 0.5);
  assert.deepEqual(parsed.tokenEstimateSummary, {
    sessionsWithTokenEstimates: 1,
    inputTokensEstimateTotal: 1200,
    outputTokensEstimateTotal: 500,
    cachedTokensEstimateTotal: 100,
    totalTokensEstimate: 1800,
  });
  assert.deepEqual(parsed.errorCountSummary, {
    sessionsWithErrorCounts: 1,
    totalErrorCount: 2,
    averageErrorsPerRecordedSession: 2,
  });
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
