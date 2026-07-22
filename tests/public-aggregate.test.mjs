import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateMethodologyVersion,
  calculatePublicAggregateQuality,
  publicAggregateSchemaVersion,
} from "../dist/public-aggregate.js";

test("exports public aggregate schema and methodology versions", () => {
  assert.equal(publicAggregateSchemaVersion, "opensasa.public-aggregate.v0");
  assert.equal(aggregateMethodologyVersion, "opensasa.methodology.v0");
});

test("labels seed and test aggregates as insufficient regardless of sample size", () => {
  const seed = calculatePublicAggregateQuality({
    sampleSize: 1000,
    verifiedSuccessCount: 900,
    verificationUnknownCount: 0,
    dataProvenance: "seed",
  });
  const testData = calculatePublicAggregateQuality({
    sampleSize: 1000,
    verifiedSuccessCount: 900,
    verificationUnknownCount: 0,
    dataProvenance: "test",
  });

  assert.equal(seed.confidence_label, "insufficient");
  assert.equal(seed.data_quality_label, "seed");
  assert.match(seed.notes.join("\n"), /Seed data is illustrative/);
  assert.equal(testData.confidence_label, "insufficient");
  assert.equal(testData.data_quality_label, "test");
  assert.match(testData.notes.join("\n"), /Test data is for validation only/);
});

test("requires minimum public sample size", () => {
  const quality = calculatePublicAggregateQuality({
    sampleSize: 29,
    verifiedSuccessCount: 29,
    verificationUnknownCount: 0,
    dataProvenance: "community",
  });

  assert.equal(quality.confidence_label, "insufficient");
  assert.equal(quality.minimum_sample_size_met, false);
  assert.equal(quality.verification_share.rate, 1);
  assert.match(quality.notes.join("\n"), /at least 30 accepted contribution records/);
});

test("requires explicit verification counts", () => {
  assert.throws(
    () =>
      calculatePublicAggregateQuality({
        sampleSize: 600,
        dataProvenance: "community",
      }),
    /verifiedSuccessCount must be a non-negative integer/,
  );
});

test("rejects impossible count inputs", () => {
  assert.throws(
    () =>
      calculatePublicAggregateQuality({
        sampleSize: 600,
        verifiedSuccessCount: 601,
        verificationUnknownCount: 0,
        dataProvenance: "community",
      }),
    /verifiedSuccessCount must not exceed sampleSize/,
  );
  assert.throws(
    () =>
      calculatePublicAggregateQuality({
        sampleSize: 600,
        verifiedSuccessCount: 500,
        verificationUnknownCount: 101,
        dataProvenance: "community",
      }),
    /plus verificationUnknownCount must not exceed sampleSize/,
  );
  assert.throws(
    () =>
      calculatePublicAggregateQuality({
        sampleSize: 1.5,
        verifiedSuccessCount: 1,
        verificationUnknownCount: 0,
        dataProvenance: "community",
      }),
    /sampleSize must be a non-negative integer/,
  );
});

test("labels community aggregates by sample size and verification coverage", () => {
  const early = calculatePublicAggregateQuality({
    sampleSize: 50,
    verifiedSuccessCount: 30,
    verificationUnknownCount: 10,
    dataProvenance: "community",
  });
  const moderate = calculatePublicAggregateQuality({
    sampleSize: 250,
    verifiedSuccessCount: 180,
    verificationUnknownCount: 25,
    dataProvenance: "community",
  });
  const strong = calculatePublicAggregateQuality({
    sampleSize: 600,
    verifiedSuccessCount: 520,
    verificationUnknownCount: 20,
    dataProvenance: "community",
  });

  assert.equal(early.confidence_label, "early");
  assert.equal(early.data_quality_label, "early");
  assert.equal(early.verification_share.numerator, 40);
  assert.equal(early.verification_share.denominator, 50);
  assert.equal(moderate.confidence_label, "moderate");
  assert.equal(moderate.data_quality_label, "reviewed");
  assert.equal(strong.confidence_label, "strong");
  assert.equal(strong.data_quality_label, "reviewed");
  assert.match(strong.notes.join("\n"), /stronger aggregate signal/);
});

test("downgrades low verification coverage", () => {
  const insufficient = calculatePublicAggregateQuality({
    sampleSize: 200,
    verifiedSuccessCount: 20,
    verificationUnknownCount: 180,
    dataProvenance: "community",
  });
  const early = calculatePublicAggregateQuality({
    sampleSize: 200,
    verifiedSuccessCount: 40,
    verificationUnknownCount: 110,
    dataProvenance: "community",
  });

  assert.equal(insufficient.confidence_label, "insufficient");
  assert.match(insufficient.notes.join("\n"), /Verification coverage is limited/);
  assert.equal(early.confidence_label, "early");
});

test("keeps exact threshold boundaries stable", () => {
  assert.equal(
    calculatePublicAggregateQuality({
      sampleSize: 30,
      verifiedSuccessCount: 8,
      verificationUnknownCount: 22,
      dataProvenance: "community",
    }).confidence_label,
    "early",
  );
  assert.equal(
    calculatePublicAggregateQuality({
      sampleSize: 100,
      verifiedSuccessCount: 50,
      verificationUnknownCount: 50,
      dataProvenance: "community",
    }).confidence_label,
    "moderate",
  );
  assert.equal(
    calculatePublicAggregateQuality({
      sampleSize: 500,
      verifiedSuccessCount: 375,
      verificationUnknownCount: 125,
      dataProvenance: "community",
    }).confidence_label,
    "strong",
  );
});

test("labels vendor aggregates as mixed quality", () => {
  const quality = calculatePublicAggregateQuality({
    sampleSize: 600,
    verifiedSuccessCount: 500,
    verificationUnknownCount: 0,
    dataProvenance: "vendor",
  });

  assert.equal(quality.confidence_label, "strong");
  assert.equal(quality.data_quality_label, "mixed");
});
