import { countBucket, durationBucket } from "./buckets.js";
import { deriveVerifiedSuccess, isUsefulOutcome, type LocalSession } from "./schema.js";

export type CountMap = Record<string, number>;

export type RetrySummary = {
  totalRetries: number;
  usefulSessionCount: number;
  retryBurden: number | null;
};

export type FailureRetrySummary = {
  totalRetries: number;
  rejectedSessionCount: number;
  failureRetryBurden: number | null;
};

export type RateMetric = {
  numerator: number;
  denominator: number;
  rate: number | null;
};

export type ConfidenceLevel = "insufficient" | "early" | "reasonable";

export type ConfidenceSummary = {
  level: ConfidenceLevel;
  knownOutcomeCount: number;
  verifiedSessionCount: number;
  verificationShare: RateMetric;
  note: string;
};

export type TokenEstimateSummary = {
  sessionsWithTokenEstimates: number;
  inputTokensEstimateTotal: number | null;
  outputTokensEstimateTotal: number | null;
  cachedTokensEstimateTotal: number | null;
  totalTokensEstimate: number | null;
};

export type ErrorCountSummary = {
  sessionsWithErrorCounts: number;
  totalErrorCount: number | null;
  averageErrorsPerRecordedSession: number | null;
};

export type LocalReport = {
  totalSessions: number;
  sessionsByProvider: CountMap;
  sessionsByModel: CountMap;
  sessionsByTool: CountMap;
  sessionsByLanguage: CountMap;
  sessionsByFramework: CountMap;
  sessionsByWorkMode: CountMap;
  sessionsByCostSource: CountMap;
  sessionsByRepoSizeBucket: CountMap;
  sessionsByFileCountBucket: CountMap;
  sessionsByChangedFileCountBucket: CountMap;
  sessionsByLinesAddedBucket: CountMap;
  sessionsByLinesRemovedBucket: CountMap;
  sessionsByDurationBucket: CountMap;
  sessionsByErrorCountBucket: CountMap;
  sessionsByTaskType: CountMap;
  acceptedOrPartiallyAcceptedCount: number;
  rejectedCount: number;
  unknownOutcomeCount: number;
  estimatedTotalCostUsd: number | null;
  costByProviderUsd: Record<string, number>;
  costByModelUsd: Record<string, number>;
  costByToolUsd: Record<string, number>;
  costByLanguageUsd: Record<string, number>;
  costByFrameworkUsd: Record<string, number>;
  costByWorkModeUsd: Record<string, number>;
  costByCostSourceUsd: Record<string, number>;
  costByRepoSizeBucketUsd: Record<string, number>;
  costByFileCountBucketUsd: Record<string, number>;
  costByChangedFileCountBucketUsd: Record<string, number>;
  costByLinesAddedBucketUsd: Record<string, number>;
  costByLinesRemovedBucketUsd: Record<string, number>;
  costByDurationBucketUsd: Record<string, number>;
  costByErrorCountBucketUsd: Record<string, number>;
  tokenEstimateSummary: TokenEstimateSummary;
  errorCountSummary: ErrorCountSummary;
  costPerUsefulTaskUsd: number | null;
  failureCostUsd: number | null;
  speedToUsefulOutputSeconds: number | null;
  retrySummary: RetrySummary;
  failureRetrySummary: FailureRetrySummary;
  confidenceSummary: ConfidenceSummary;
  verificationOutcomeSummary: Record<string, CountMap>;
  usefulOutcomeRate: RateMetric;
  unknownOutcomeRate: RateMetric;
  verifiedSuccessRate: RateMetric;
};

const verificationFields = [
  "tests_outcome",
  "build_outcome",
  "lint_outcome",
  "typecheck_outcome",
  "manual_review_outcome",
] as const;

export function calculateLocalReport(sessions: LocalSession[]): LocalReport {
  const usefulSessions = sessions.filter((session) => isUsefulOutcome(session.final_outcome));
  const knownOutcomeSessions = sessions.filter((session) => session.final_outcome !== "unknown");
  const estimatedCostSessions = sessions.filter(
    (session) => session.estimated_cost_usd !== undefined,
  );
  const estimatedTotalCostUsd =
    estimatedCostSessions.length === 0
      ? null
      : sum(estimatedCostSessions.map((session) => session.estimated_cost_usd ?? 0));
  const unknownOutcomeSessions = sessions.filter((session) => session.final_outcome === "unknown");
  const rejectedSessions = sessions.filter((session) => session.final_outcome === "rejected");
  const rejectedCostSessions = estimatedCostSessions.filter(
    (session) => session.final_outcome === "rejected",
  );
  const failureCostUsd =
    rejectedSessions.length === 0
      ? 0
      : rejectedCostSessions.length === 0
        ? null
        : sum(rejectedCostSessions.map((session) => session.estimated_cost_usd ?? 0));
  const verifiedSuccessCount = sessions.filter(deriveVerifiedSuccess).length;
  const verifiedSessionCount = sessions.filter(hasAnyVerificationSignal).length;

  return {
    totalSessions: sessions.length,
    sessionsByProvider: countBy(sessions, (session) => session.provider),
    sessionsByModel: countBy(sessions, modelKey),
    sessionsByTool: countBy(sessions, toolKey),
    sessionsByLanguage: countBy(sessions, languageKey),
    sessionsByFramework: countBy(sessions, frameworkKey),
    sessionsByWorkMode: countBy(sessions, (session) => session.work_mode),
    sessionsByCostSource: countBy(sessions, costSourceKey),
    sessionsByRepoSizeBucket: countBy(sessions, repoSizeBucketKey),
    sessionsByFileCountBucket: countBy(sessions, fileCountBucketKey),
    sessionsByChangedFileCountBucket: countBy(sessions, changedFileCountBucketKey),
    sessionsByLinesAddedBucket: countBy(sessions, linesAddedBucketKey),
    sessionsByLinesRemovedBucket: countBy(sessions, linesRemovedBucketKey),
    sessionsByDurationBucket: countBy(sessions, durationBucketKey),
    sessionsByErrorCountBucket: countBy(sessions, errorCountBucketKey),
    sessionsByTaskType: countBy(sessions, (session) => session.task_type),
    acceptedOrPartiallyAcceptedCount: usefulSessions.length,
    rejectedCount: rejectedSessions.length,
    unknownOutcomeCount: unknownOutcomeSessions.length,
    estimatedTotalCostUsd,
    costByProviderUsd: sumBy(estimatedCostSessions, (session) => session.provider),
    costByModelUsd: sumByModel(estimatedCostSessions),
    costByToolUsd: sumBy(estimatedCostSessions, toolKey),
    costByLanguageUsd: sumBy(estimatedCostSessions, languageKey),
    costByFrameworkUsd: sumBy(estimatedCostSessions, frameworkKey),
    costByWorkModeUsd: sumBy(estimatedCostSessions, (session) => session.work_mode),
    costByCostSourceUsd: sumBy(estimatedCostSessions, costSourceKey),
    costByRepoSizeBucketUsd: sumBy(estimatedCostSessions, repoSizeBucketKey),
    costByFileCountBucketUsd: sumBy(estimatedCostSessions, fileCountBucketKey),
    costByChangedFileCountBucketUsd: sumBy(estimatedCostSessions, changedFileCountBucketKey),
    costByLinesAddedBucketUsd: sumBy(estimatedCostSessions, linesAddedBucketKey),
    costByLinesRemovedBucketUsd: sumBy(estimatedCostSessions, linesRemovedBucketKey),
    costByDurationBucketUsd: sumBy(estimatedCostSessions, durationBucketKey),
    costByErrorCountBucketUsd: sumBy(estimatedCostSessions, errorCountBucketKey),
    tokenEstimateSummary: calculateTokenEstimateSummary(sessions),
    errorCountSummary: calculateErrorCountSummary(sessions),
    costPerUsefulTaskUsd:
      estimatedTotalCostUsd === null ? null : calculateRate(estimatedTotalCostUsd, usefulSessions.length),
    failureCostUsd,
    speedToUsefulOutputSeconds: calculateMedianDuration(usefulSessions),
    retrySummary: calculateRetrySummary(usefulSessions),
    failureRetrySummary: calculateFailureRetrySummary(rejectedSessions),
    confidenceSummary: calculateConfidenceSummary(knownOutcomeSessions.length, verifiedSessionCount),
    verificationOutcomeSummary: calculateVerificationOutcomeSummary(sessions),
    usefulOutcomeRate: {
      numerator: usefulSessions.length,
      denominator: knownOutcomeSessions.length,
      rate: calculateRate(usefulSessions.length, knownOutcomeSessions.length),
    },
    unknownOutcomeRate: {
      numerator: unknownOutcomeSessions.length,
      denominator: sessions.length,
      rate: calculateRate(unknownOutcomeSessions.length, sessions.length),
    },
    verifiedSuccessRate: {
      numerator: verifiedSuccessCount,
      denominator: knownOutcomeSessions.length,
      rate: calculateRate(verifiedSuccessCount, knownOutcomeSessions.length),
    },
  };
}

export function formatLocalReport(report: LocalReport): string {
  return [
    "OpenSasa Local Report",
    "",
    `Total sessions: ${report.totalSessions}`,
    ...(report.totalSessions === 0
      ? [
          "No local sessions matched this report. Log sessions with `opensasa log` or broaden filters.",
        ]
      : []),
    "",
    "Outcome summary:",
    `Accepted or partially accepted: ${report.acceptedOrPartiallyAcceptedCount}`,
    `Rejected: ${report.rejectedCount}`,
    `Unknown outcome: ${report.unknownOutcomeCount}`,
    "",
    "Rates:",
    `Useful outcome rate: ${formatRate(report.usefulOutcomeRate)}`,
    `Unknown outcome rate: ${formatRate(report.unknownOutcomeRate)}`,
    `Verified success rate: ${formatRate(report.verifiedSuccessRate)}`,
    "",
    "Cost summary:",
    `Estimated total cost: ${formatCurrencyOrUnknown(report.estimatedTotalCostUsd)}`,
    `Cost per useful task: ${formatCurrencyOrUnknown(report.costPerUsefulTaskUsd)}`,
    `Failure cost: ${formatCurrencyOrUnknown(report.failureCostUsd)}`,
    "",
    "Token estimate summary:",
    `Sessions with token estimates: ${report.tokenEstimateSummary.sessionsWithTokenEstimates}`,
    `Input tokens estimate: ${formatIntegerOrUnknown(report.tokenEstimateSummary.inputTokensEstimateTotal)}`,
    `Output tokens estimate: ${formatIntegerOrUnknown(report.tokenEstimateSummary.outputTokensEstimateTotal)}`,
    `Cached tokens estimate: ${formatIntegerOrUnknown(report.tokenEstimateSummary.cachedTokensEstimateTotal)}`,
    `Total tokens estimate: ${formatIntegerOrUnknown(report.tokenEstimateSummary.totalTokensEstimate)}`,
    "",
    "Error count summary:",
    `Sessions with error counts: ${report.errorCountSummary.sessionsWithErrorCounts}`,
    `Total error count: ${formatIntegerOrUnknown(report.errorCountSummary.totalErrorCount)}`,
    `Average errors per recorded session: ${formatNumberOrUnknown(report.errorCountSummary.averageErrorsPerRecordedSession)}`,
    "",
    "Speed summary:",
    `Speed to useful output: ${formatSecondsOrUnknown(report.speedToUsefulOutputSeconds)}`,
    "",
    "Retry summary:",
    `Total retries on useful sessions: ${report.retrySummary.totalRetries}`,
    `Retry burden: ${formatNumberOrUnknown(report.retrySummary.retryBurden)}`,
    `Total retries on rejected sessions: ${report.failureRetrySummary.totalRetries}`,
    `Failure retry burden: ${formatNumberOrUnknown(report.failureRetrySummary.failureRetryBurden)}`,
    "",
    "Confidence summary:",
    `Confidence level: ${report.confidenceSummary.level}`,
    `Known outcome sessions: ${report.confidenceSummary.knownOutcomeCount}`,
    `Verified sessions: ${report.confidenceSummary.verifiedSessionCount}`,
    `Verification share: ${formatRate(report.confidenceSummary.verificationShare)}`,
    `Confidence note: ${report.confidenceSummary.note}`,
    "",
    "Verification outcome summary:",
    ...formatVerificationSummary(report.verificationOutcomeSummary),
    "",
    "Session groupings:",
    "Sessions by provider:",
    ...formatCountMap(report.sessionsByProvider),
    "",
    "Sessions by model:",
    ...formatCountMap(report.sessionsByModel),
    "",
    "Sessions by tool:",
    ...formatCountMap(report.sessionsByTool),
    "",
    "Sessions by language:",
    ...formatCountMap(report.sessionsByLanguage),
    "",
    "Sessions by framework:",
    ...formatCountMap(report.sessionsByFramework),
    "",
    "Sessions by work mode:",
    ...formatCountMap(report.sessionsByWorkMode),
    "",
    "Sessions by cost source:",
    ...formatCountMap(report.sessionsByCostSource),
    "",
    "Sessions by repo size bucket:",
    ...formatCountMap(report.sessionsByRepoSizeBucket),
    "",
    "Sessions by file count bucket:",
    ...formatCountMap(report.sessionsByFileCountBucket),
    "",
    "Sessions by changed file count bucket:",
    ...formatCountMap(report.sessionsByChangedFileCountBucket),
    "",
    "Sessions by lines added bucket:",
    ...formatCountMap(report.sessionsByLinesAddedBucket),
    "",
    "Sessions by lines removed bucket:",
    ...formatCountMap(report.sessionsByLinesRemovedBucket),
    "",
    "Sessions by duration bucket:",
    ...formatCountMap(report.sessionsByDurationBucket),
    "",
    "Sessions by error count bucket:",
    ...formatCountMap(report.sessionsByErrorCountBucket),
    "",
    "Sessions by task type:",
    ...formatCountMap(report.sessionsByTaskType),
    "",
    "Cost groupings:",
    ...formatCostMap("Cost by provider", report.costByProviderUsd),
    ...formatCostByModel(report.costByModelUsd),
    ...formatCostMap("Cost by tool", report.costByToolUsd),
    ...formatCostMap("Cost by language", report.costByLanguageUsd),
    ...formatCostMap("Cost by framework", report.costByFrameworkUsd),
    ...formatCostMap("Cost by work mode", report.costByWorkModeUsd),
    ...formatCostMap("Cost by cost source", report.costByCostSourceUsd),
    ...formatCostMap("Cost by repo size bucket", report.costByRepoSizeBucketUsd),
    ...formatCostMap("Cost by file count bucket", report.costByFileCountBucketUsd),
    ...formatCostMap("Cost by changed file count bucket", report.costByChangedFileCountBucketUsd),
    ...formatCostMap("Cost by lines added bucket", report.costByLinesAddedBucketUsd),
    ...formatCostMap("Cost by lines removed bucket", report.costByLinesRemovedBucketUsd),
    ...formatCostMap("Cost by duration bucket", report.costByDurationBucketUsd),
    ...formatCostMap("Cost by error count bucket", report.costByErrorCountBucketUsd),
  ].join("\n");
}

export function formatLocalReportJson(report: LocalReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

function countBy(sessions: LocalSession[], getKey: (session: LocalSession) => string): CountMap {
  return sessions.reduce<CountMap>((counts, session) => {
    const key = getKey(session);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function calculateRetrySummary(usefulSessions: LocalSession[]): RetrySummary {
  const totalRetries = sum(usefulSessions.map((session) => session.retry_count ?? 0));
  return {
    totalRetries,
    usefulSessionCount: usefulSessions.length,
    retryBurden: calculateRate(totalRetries, usefulSessions.length),
  };
}

function calculateFailureRetrySummary(rejectedSessions: LocalSession[]): FailureRetrySummary {
  const totalRetries = sum(rejectedSessions.map((session) => session.retry_count ?? 0));
  return {
    totalRetries,
    rejectedSessionCount: rejectedSessions.length,
    failureRetryBurden: calculateRate(totalRetries, rejectedSessions.length),
  };
}

function calculateTokenEstimateSummary(sessions: LocalSession[]): TokenEstimateSummary {
  const tokenSessions = sessions.filter(hasAnyTokenEstimate);

  if (tokenSessions.length === 0) {
    return {
      sessionsWithTokenEstimates: 0,
      inputTokensEstimateTotal: null,
      outputTokensEstimateTotal: null,
      cachedTokensEstimateTotal: null,
      totalTokensEstimate: null,
    };
  }

  const inputTokensEstimateTotal = sum(tokenSessions.map((session) => session.input_tokens_estimate ?? 0));
  const outputTokensEstimateTotal = sum(tokenSessions.map((session) => session.output_tokens_estimate ?? 0));
  const cachedTokensEstimateTotal = sum(tokenSessions.map((session) => session.cached_tokens_estimate ?? 0));

  return {
    sessionsWithTokenEstimates: tokenSessions.length,
    inputTokensEstimateTotal,
    outputTokensEstimateTotal,
    cachedTokensEstimateTotal,
    totalTokensEstimate: inputTokensEstimateTotal + outputTokensEstimateTotal + cachedTokensEstimateTotal,
  };
}

function hasAnyTokenEstimate(session: LocalSession): boolean {
  return (
    session.input_tokens_estimate !== undefined ||
    session.output_tokens_estimate !== undefined ||
    session.cached_tokens_estimate !== undefined
  );
}

function calculateErrorCountSummary(sessions: LocalSession[]): ErrorCountSummary {
  const errorCountSessions = sessions.filter(
    (session): session is LocalSession & { error_count: number } =>
      session.error_count !== undefined,
  );

  if (errorCountSessions.length === 0) {
    return {
      sessionsWithErrorCounts: 0,
      totalErrorCount: null,
      averageErrorsPerRecordedSession: null,
    };
  }

  const totalErrorCount = sum(errorCountSessions.map((session) => session.error_count));

  return {
    sessionsWithErrorCounts: errorCountSessions.length,
    totalErrorCount,
    averageErrorsPerRecordedSession: calculateRate(totalErrorCount, errorCountSessions.length),
  };
}

function calculateConfidenceSummary(
  knownOutcomeCount: number,
  verifiedSessionCount: number,
): ConfidenceSummary {
  const verificationShare = {
    numerator: verifiedSessionCount,
    denominator: knownOutcomeCount,
    rate: calculateRate(verifiedSessionCount, knownOutcomeCount),
  };
  const level = confidenceLevel(knownOutcomeCount, verificationShare.rate);

  return {
    level,
    knownOutcomeCount,
    verifiedSessionCount,
    verificationShare,
    note: confidenceNote(level),
  };
}

function confidenceLevel(
  knownOutcomeCount: number,
  verificationShare: number | null,
): ConfidenceLevel {
  if (knownOutcomeCount < 5 || verificationShare === null || verificationShare < 0.25) {
    return "insufficient";
  }

  if (knownOutcomeCount < 20 || verificationShare < 0.5) {
    return "early";
  }

  return "reasonable";
}

function confidenceNote(level: ConfidenceLevel): string {
  if (level === "reasonable") {
    return "Enough known and verified local sessions for a more stable personal signal.";
  }

  if (level === "early") {
    return "Useful for personal tracking, but sample size or verification depth is still limited.";
  }

  return "Not enough known and verified local sessions for a reliable signal yet.";
}

function calculateVerificationOutcomeSummary(
  sessions: LocalSession[],
): Record<string, CountMap> {
  return Object.fromEntries(
    verificationFields.map((field) => [
      field,
      sessions.reduce<CountMap>((counts, session) => {
        const outcome = session[field];
        counts[outcome] = (counts[outcome] ?? 0) + 1;
        return counts;
      }, {}),
    ]),
  );
}

function hasAnyVerificationSignal(session: LocalSession): boolean {
  return (
    session.tests_outcome !== "unknown" ||
    session.build_outcome !== "unknown" ||
    session.lint_outcome !== "unknown" ||
    session.typecheck_outcome !== "unknown" ||
    session.manual_review_outcome !== "unknown"
  );
}

function calculateMedianDuration(usefulSessions: LocalSession[]): number | null {
  const durations = usefulSessions
    .map((session) => session.duration_seconds)
    .filter((duration): duration is number => duration !== undefined)
    .sort((left, right) => left - right);

  if (durations.length === 0) {
    return null;
  }

  const middle = Math.floor(durations.length / 2);

  return durations.length % 2 === 1
    ? durations[middle]
    : (durations[middle - 1] + durations[middle]) / 2;
}

function sumByModel(sessions: LocalSession[]): Record<string, number> {
  return sumBy(sessions, modelKey);
}

function sumBy(
  sessions: LocalSession[],
  getKey: (session: LocalSession) => string,
): Record<string, number> {
  return sessions.reduce<Record<string, number>>((costs, session) => {
    const key = getKey(session);
    costs[key] = (costs[key] ?? 0) + (session.estimated_cost_usd ?? 0);
    return costs;
  }, {});
}

function modelKey(session: LocalSession): string {
  return `${session.provider}/${session.model_id}`;
}

function toolKey(session: LocalSession): string {
  return session.tool ?? "unknown";
}

function languageKey(session: LocalSession): string {
  return session.language ?? "unknown";
}

function frameworkKey(session: LocalSession): string {
  return session.framework ?? "unknown";
}

function costSourceKey(session: LocalSession): string {
  return session.cost_source ?? "unknown";
}

function repoSizeBucketKey(session: LocalSession): string {
  return session.repo_size_bucket ?? "unknown";
}

function fileCountBucketKey(session: LocalSession): string {
  return session.file_count_bucket ?? "unknown";
}

function changedFileCountBucketKey(session: LocalSession): string {
  return session.changed_file_count_bucket ?? "unknown";
}

function linesAddedBucketKey(session: LocalSession): string {
  return session.lines_added_bucket ?? "unknown";
}

function linesRemovedBucketKey(session: LocalSession): string {
  return session.lines_removed_bucket ?? "unknown";
}

function durationBucketKey(session: LocalSession): string {
  return durationBucket(session.duration_seconds);
}

function errorCountBucketKey(session: LocalSession): string {
  return countBucket(session.error_count);
}

function calculateRate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function formatCountMap(counts: CountMap): string[] {
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  return entries.length === 0
    ? ["- none recorded"]
    : entries.map(([key, count]) => `- ${key}: ${count}`);
}

function formatCostByModel(costs: Record<string, number>): string[] {
  return formatCostMap("Cost by model", costs);
}

function formatCostMap(label: string, costs: Record<string, number>): string[] {
  const entries = Object.entries(costs).sort(([left], [right]) => left.localeCompare(right));
  return entries.length === 0
    ? [`${label}: none recorded`]
    : [`${label}:`, ...entries.map(([key, cost]) => `- ${key}: ${formatCurrency(cost)}`)];
}

function formatVerificationSummary(summary: Record<string, CountMap>): string[] {
  return Object.entries(summary).flatMap(([field, counts]) => [
    `${field}:`,
    ...formatCountMap(counts),
  ]);
}

function formatRate(metric: RateMetric): string {
  return metric.rate === null
    ? `unknown (${metric.numerator}/${metric.denominator})`
    : `${(metric.rate * 100).toFixed(1)}% (${metric.numerator}/${metric.denominator})`;
}

function formatCurrencyOrUnknown(value: number | null): string {
  return value === null ? "unknown" : formatCurrency(value);
}

function formatCurrency(value: number): string {
  return `$${value.toFixed(4)}`;
}

function formatNumberOrUnknown(value: number | null): string {
  return value === null ? "unknown" : value.toFixed(2);
}

function formatIntegerOrUnknown(value: number | null): string {
  return value === null ? "unknown" : value.toString();
}

function formatSecondsOrUnknown(value: number | null): string {
  return value === null ? "unknown" : `${value.toFixed(1)}s`;
}
