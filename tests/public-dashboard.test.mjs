import assert from "node:assert/strict";
import { test } from "node:test";
import { calculatePublicAggregateQuality } from "../dist/public-aggregate.js";
import {
  buildRealDataDashboardGate,
  buildSeedPublicDashboard,
  isRealDataDashboardRecordEligible,
} from "../dist/public-dashboard.js";

test("builds a seed-only public dashboard payload", () => {
  const dashboard = buildSeedPublicDashboard();

  assert.equal(dashboard.status, "seed only");
  assert.equal(dashboard.upload_enabled, false);
  assert.equal(dashboard.real_data_enabled, false);
  assert.equal(dashboard.schema_version, "opensasa.public-aggregate.v0");
  assert.equal(dashboard.methodology_version, "opensasa.methodology.v0");
  assert.match(dashboard.no_real_data_notice, /Seed data is illustrative only/);
  assert.ok(dashboard.records.length >= 4);
  assert.equal(dashboard.real_data_gate.status, "blocked_no_real_records");
  assert.equal(dashboard.real_data_gate.real_data_enabled, false);
  assert.match(dashboard.real_data_gate.notes.join("\n"), /disabled because there are no community or vendor aggregate records/);
});

test("all seed public dashboard records are labeled as seed and insufficient", () => {
  const dashboard = buildSeedPublicDashboard();

  for (const record of dashboard.records) {
    assert.equal(record.data_provenance, "seed");
    assert.equal(record.filters.data_provenance, "seed");
    assert.equal(record.quality.confidence_label, "insufficient");
    assert.equal(record.quality.data_quality_label, "seed");
    assert.match(record.quality.notes.join("\n"), /Seed data is illustrative/);
    assert.equal(record.schema_version, dashboard.schema_version);
    assert.equal(record.methodology_version, dashboard.methodology_version);
    assert.equal(typeof record.metrics.task_count, "number");
    assert.equal(typeof record.quality.verification_share.numerator, "number");
  }
});

test("blocks real-data public dashboard records until contribution thresholds are met", () => {
  const insufficientCommunityRecord = {
    ...buildSeedPublicDashboard().records[0],
    aggregate_id: "community_model_tiny",
    data_provenance: "community",
    filters: {
      data_provenance: "community",
    },
    quality: calculatePublicAggregateQuality({
      sampleSize: 29,
      verifiedSuccessCount: 20,
      verificationUnknownCount: 0,
      dataProvenance: "community",
    }),
  };

  const gate = buildRealDataDashboardGate([insufficientCommunityRecord]);

  assert.equal(isRealDataDashboardRecordEligible(insufficientCommunityRecord), false);
  assert.equal(gate.status, "blocked_insufficient_contributions");
  assert.equal(gate.real_data_enabled, false);
  assert.equal(gate.eligible_record_count, 0);
  assert.equal(gate.blocked_record_count, 1);
  assert.deepEqual(gate.required_confidence_labels, ["early", "moderate", "strong"]);
  assert.match(gate.notes.join("\n"), /sample-size and confidence thresholds/);
});

test("enables real-data public dashboard only for eligible real aggregate records", () => {
  const eligibleCommunityRecord = {
    ...buildSeedPublicDashboard().records[0],
    aggregate_id: "community_model_ready",
    data_provenance: "community",
    filters: {
      data_provenance: "community",
    },
    metrics: {
      ...buildSeedPublicDashboard().records[0].metrics,
      task_count: 100,
    },
    quality: calculatePublicAggregateQuality({
      sampleSize: 100,
      verifiedSuccessCount: 80,
      verificationUnknownCount: 0,
      dataProvenance: "community",
    }),
  };

  const gate = buildRealDataDashboardGate([eligibleCommunityRecord]);

  assert.equal(isRealDataDashboardRecordEligible(eligibleCommunityRecord), true);
  assert.equal(gate.status, "eligible_after_thresholds");
  assert.equal(gate.real_data_enabled, true);
  assert.equal(gate.eligible_record_count, 1);
  assert.equal(gate.blocked_record_count, 0);
  assert.match(gate.notes.join("\n"), /meets the public dashboard threshold/);
});

test("blocks real-data public dashboard records with stale quality or unsupported confidence labels", () => {
  const seedRecord = buildSeedPublicDashboard().records[0];
  const staleQualityRecord = {
    ...seedRecord,
    aggregate_id: "community_model_stale_quality",
    data_provenance: "community",
    filters: {
      data_provenance: "community",
    },
    quality: calculatePublicAggregateQuality({
      sampleSize: 100,
      verifiedSuccessCount: 80,
      verificationUnknownCount: 0,
      dataProvenance: "community",
    }),
  };
  const unsupportedConfidenceRecord = {
    ...staleQualityRecord,
    aggregate_id: "community_model_future_confidence",
    metrics: {
      ...staleQualityRecord.metrics,
      task_count: 100,
    },
    quality: {
      ...staleQualityRecord.quality,
      confidence_label: "unknown",
    },
  };

  const gate = buildRealDataDashboardGate([staleQualityRecord, unsupportedConfidenceRecord]);

  assert.equal(isRealDataDashboardRecordEligible(staleQualityRecord), false);
  assert.equal(isRealDataDashboardRecordEligible(unsupportedConfidenceRecord), false);
  assert.equal(gate.status, "blocked_insufficient_contributions");
  assert.equal(gate.real_data_enabled, false);
  assert.equal(gate.eligible_record_count, 0);
  assert.equal(gate.blocked_record_count, 2);
});
