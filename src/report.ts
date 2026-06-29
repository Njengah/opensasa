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

export type LocalReport = {
  totalSessions: number;
  sessionsByModel: CountMap;
  sessionsByTaskType: CountMap;
  acceptedOrPartiallyAcceptedCount: number;
  rejectedCount: number;
  unknownOutcomeCount: number;
  estimatedTotalCostUsd: number | null;
  costByModelUsd: Record<string, number>;
  costPerUsefulTaskUsd: number | null;
  failureCostUsd: number | null;
  speedToUsefulOutputSeconds: number | null;
  retrySummary: RetrySummary;
  failureRetrySummary: FailureRetrySummary;
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

  return {
    totalSessions: sessions.length,
    sessionsByModel: countBy(sessions, modelKey),
    sessionsByTaskType: countBy(sessions, (session) => session.task_type),
    acceptedOrPartiallyAcceptedCount: usefulSessions.length,
    rejectedCount: rejectedSessions.length,
    unknownOutcomeCount: unknownOutcomeSessions.length,
    estimatedTotalCostUsd,
    costByModelUsd: sumByModel(estimatedCostSessions),
    costPerUsefulTaskUsd:
      estimatedTotalCostUsd === null ? null : calculateRate(estimatedTotalCostUsd, usefulSessions.length),
    failureCostUsd,
    speedToUsefulOutputSeconds: calculateMedianDuration(usefulSessions),
    retrySummary: calculateRetrySummary(usefulSessions),
    failureRetrySummary: calculateFailureRetrySummary(rejectedSessions),
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
    "",
    "Sessions by model:",
    ...formatCountMap(report.sessionsByModel),
    "",
    "Sessions by task type:",
    ...formatCountMap(report.sessionsByTaskType),
    "",
    "Outcome summary:",
    `Accepted or partially accepted: ${report.acceptedOrPartiallyAcceptedCount}`,
    `Rejected: ${report.rejectedCount}`,
    `Unknown outcome: ${report.unknownOutcomeCount}`,
    "",
    "Cost summary:",
    `Estimated total cost: ${formatCurrencyOrUnknown(report.estimatedTotalCostUsd)}`,
    `Cost per useful task: ${formatCurrencyOrUnknown(report.costPerUsefulTaskUsd)}`,
    `Failure cost: ${formatCurrencyOrUnknown(report.failureCostUsd)}`,
    ...formatCostByModel(report.costByModelUsd),
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
    "Verification outcome summary:",
    ...formatVerificationSummary(report.verificationOutcomeSummary),
    "",
    "Rates:",
    `Useful outcome rate: ${formatRate(report.usefulOutcomeRate)}`,
    `Unknown outcome rate: ${formatRate(report.unknownOutcomeRate)}`,
    `Verified success rate: ${formatRate(report.verifiedSuccessRate)}`,
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
  return sessions.reduce<Record<string, number>>((costs, session) => {
    const key = modelKey(session);
    costs[key] = (costs[key] ?? 0) + (session.estimated_cost_usd ?? 0);
    return costs;
  }, {});
}

function modelKey(session: LocalSession): string {
  return `${session.provider}/${session.model_id}`;
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
    ? ["- unknown"]
    : entries.map(([key, count]) => `- ${key}: ${count}`);
}

function formatCostByModel(costs: Record<string, number>): string[] {
  const entries = Object.entries(costs).sort(([left], [right]) => left.localeCompare(right));
  return entries.length === 0
    ? ["Cost by model: unknown"]
    : ["Cost by model:", ...entries.map(([key, cost]) => `- ${key}: ${formatCurrency(cost)}`)];
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

function formatSecondsOrUnknown(value: number | null): string {
  return value === null ? "unknown" : `${value.toFixed(1)}s`;
}
