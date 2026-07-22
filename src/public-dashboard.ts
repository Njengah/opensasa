import {
  aggregateMethodologyVersion,
  calculatePublicAggregateQuality,
  publicAggregateSchemaVersion,
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
  data_provenance: "seed";
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
};

const generatedAt = "2026-07-23T00:00:00.000Z";

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
  };
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
