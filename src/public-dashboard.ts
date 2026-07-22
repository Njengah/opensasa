import {
  aggregateMethodologyVersion,
  calculatePublicAggregateQuality,
  publicAggregateSchemaVersion,
  type PublicAggregateProvenance,
  type PublicAggregateConfidenceLabel,
  type PublicAggregateQuality,
} from "./public-aggregate.js";

export type PublicAggregateViewType =
  | "model_summary"
  | "tool_summary"
  | "task_type_summary"
  | "verification_summary";

export type PublicAggregateRecord = {
  schema_version: typeof publicAggregateSchemaVersion;
  methodology_version: typeof aggregateMethodologyVersion;
  aggregate_id: string;
  generated_at: string;
  data_provenance: PublicAggregateProvenance;
  view_type: PublicAggregateViewType;
  filters: Record<string, string>;
  group: {
    dimension: string;
    value: string;
  };
  metrics: {
    task_count: number;
    accepted_count: number;
    partially_accepted_count: number;
    rejected_count: number;
    unknown_outcome_count: number;
    verified_success_count: number;
    verification_unknown_count: number;
    estimated_cost_bucket_counts: Record<string, number>;
    duration_bucket_counts: Record<string, number>;
    retry_bucket_counts: Record<string, number>;
    error_bucket_counts: Record<string, number>;
  };
  quality: PublicAggregateQuality;
};

export type SeedPublicDashboard = {
  status: "seed only";
  upload_enabled: false;
  real_data_enabled: false;
  schema_version: typeof publicAggregateSchemaVersion;
  methodology_version: typeof aggregateMethodologyVersion;
  generated_at: string;
  no_real_data_notice: string;
  records: PublicAggregateRecord[];
  real_data_gate: RealDataDashboardGate;
};

const generatedAt = "2026-07-23T00:00:00.000Z";
const realDataEligibleConfidenceLabels: PublicAggregateConfidenceLabel[] = ["early", "moderate", "strong"];

export type RealDataDashboardGateStatus =
  | "blocked_no_real_records"
  | "blocked_insufficient_contributions"
  | "eligible_after_thresholds";

export type RealDataDashboardGate = {
  status: RealDataDashboardGateStatus;
  real_data_enabled: boolean;
  eligible_record_count: number;
  blocked_record_count: number;
  required_confidence_labels: typeof realDataEligibleConfidenceLabels;
  notes: string[];
};

export function buildSeedPublicDashboard(): SeedPublicDashboard {
  const records = [
    seedAggregateRecord({
      aggregateId: "seed_model_codex_gpt5",
      viewType: "model_summary",
      groupDimension: "model_id",
      groupValue: "gpt-5",
      taskCount: 24,
      acceptedCount: 12,
      partiallyAcceptedCount: 6,
      rejectedCount: 4,
      unknownOutcomeCount: 2,
      verifiedSuccessCount: 10,
      verificationUnknownCount: 5,
    }),
    seedAggregateRecord({
      aggregateId: "seed_model_claude_sonnet",
      viewType: "model_summary",
      groupDimension: "model_id",
      groupValue: "claude-sonnet-4.5",
      taskCount: 18,
      acceptedCount: 8,
      partiallyAcceptedCount: 5,
      rejectedCount: 3,
      unknownOutcomeCount: 2,
      verifiedSuccessCount: 7,
      verificationUnknownCount: 4,
    }),
    seedAggregateRecord({
      aggregateId: "seed_tool_codex",
      viewType: "tool_summary",
      groupDimension: "tool",
      groupValue: "Codex",
      taskCount: 30,
      acceptedCount: 15,
      partiallyAcceptedCount: 8,
      rejectedCount: 4,
      unknownOutcomeCount: 3,
      verifiedSuccessCount: 13,
      verificationUnknownCount: 6,
    }),
    seedAggregateRecord({
      aggregateId: "seed_task_bug_fix",
      viewType: "task_type_summary",
      groupDimension: "task_type",
      groupValue: "bug_fix",
      taskCount: 21,
      acceptedCount: 11,
      partiallyAcceptedCount: 5,
      rejectedCount: 3,
      unknownOutcomeCount: 2,
      verifiedSuccessCount: 9,
      verificationUnknownCount: 5,
    }),
  ];

  return {
    status: "seed only",
    upload_enabled: false,
    real_data_enabled: false,
    schema_version: publicAggregateSchemaVersion,
    methodology_version: aggregateMethodologyVersion,
    generated_at: generatedAt,
    no_real_data_notice: "Seed data is illustrative only. No real contribution data is shown.",
    records,
    real_data_gate: buildRealDataDashboardGate(records),
  };
}

export function buildRealDataDashboardGate(records: PublicAggregateRecord[]): RealDataDashboardGate {
  const realRecords = records.filter((record) => record.data_provenance !== "seed" && record.data_provenance !== "test");

  if (realRecords.length === 0) {
    return {
      status: "blocked_no_real_records",
      real_data_enabled: false,
      eligible_record_count: 0,
      blocked_record_count: 0,
      required_confidence_labels: realDataEligibleConfidenceLabels,
      notes: [
        "Real-data public dashboard is disabled because there are no community or vendor aggregate records.",
        "Keep showing the seed-only preview until accepted contribution aggregates meet public confidence thresholds.",
      ],
    };
  }

  const eligibleRecordCount = realRecords.filter(isRealDataDashboardRecordEligible).length;
  const blockedRecordCount = realRecords.length - eligibleRecordCount;

  if (eligibleRecordCount === 0) {
    return {
      status: "blocked_insufficient_contributions",
      real_data_enabled: false,
      eligible_record_count: 0,
      blocked_record_count: blockedRecordCount,
      required_confidence_labels: realDataEligibleConfidenceLabels,
      notes: [
        "Real-data public dashboard is disabled because no real aggregate record meets sample-size and confidence thresholds.",
        "Public records need non-seed provenance, minimum sample size, and at least early confidence before display.",
      ],
    };
  }

  return {
    status: "eligible_after_thresholds",
    real_data_enabled: true,
    eligible_record_count: eligibleRecordCount,
    blocked_record_count: blockedRecordCount,
    required_confidence_labels: realDataEligibleConfidenceLabels,
    notes: [
      "At least one real aggregate record meets the public dashboard threshold.",
      "Only eligible records should be displayed; blocked records must remain hidden or clearly disabled.",
    ],
  };
}

export function isRealDataDashboardRecordEligible(record: PublicAggregateRecord): boolean {
  return (
    record.data_provenance !== "seed"
    && record.data_provenance !== "test"
    && record.quality.sample_size === record.metrics.task_count
    && record.quality.minimum_sample_size_met
    && realDataEligibleConfidenceLabels.includes(record.quality.confidence_label)
  );
}

function seedAggregateRecord(input: {
  aggregateId: string;
  viewType: PublicAggregateViewType;
  groupDimension: string;
  groupValue: string;
  taskCount: number;
  acceptedCount: number;
  partiallyAcceptedCount: number;
  rejectedCount: number;
  unknownOutcomeCount: number;
  verifiedSuccessCount: number;
  verificationUnknownCount: number;
}): PublicAggregateRecord {
  return {
    schema_version: publicAggregateSchemaVersion,
    methodology_version: aggregateMethodologyVersion,
    aggregate_id: input.aggregateId,
    generated_at: generatedAt,
    data_provenance: "seed",
    view_type: input.viewType,
    filters: {
      data_provenance: "seed",
    },
    group: {
      dimension: input.groupDimension,
      value: input.groupValue,
    },
    metrics: {
      task_count: input.taskCount,
      accepted_count: input.acceptedCount,
      partially_accepted_count: input.partiallyAcceptedCount,
      rejected_count: input.rejectedCount,
      unknown_outcome_count: input.unknownOutcomeCount,
      verified_success_count: input.verifiedSuccessCount,
      verification_unknown_count: input.verificationUnknownCount,
      estimated_cost_bucket_counts: {
        under_1_usd: Math.max(0, input.taskCount - 6),
        under_10_usd: 6,
      },
      duration_bucket_counts: {
        "1m_to_5m": Math.floor(input.taskCount / 3),
        "5m_to_30m": input.taskCount - Math.floor(input.taskCount / 3),
      },
      retry_bucket_counts: {
        zero: Math.floor(input.taskCount / 2),
        tiny: input.taskCount - Math.floor(input.taskCount / 2),
      },
      error_bucket_counts: {
        zero: Math.max(0, input.taskCount - 4),
        tiny: 4,
      },
    },
    quality: calculatePublicAggregateQuality({
      sampleSize: input.taskCount,
      verifiedSuccessCount: input.verifiedSuccessCount,
      verificationUnknownCount: input.verificationUnknownCount,
      dataProvenance: "seed",
    }),
  };
}
