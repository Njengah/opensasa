export const publicAggregateSchemaVersion = "opensasa.public-aggregate.v0";
export const aggregateMethodologyVersion = "opensasa.methodology.v0";

export type PublicAggregateConfidenceLabel =
  | "insufficient"
  | "early"
  | "moderate"
  | "strong";

export type PublicAggregateDataQualityLabel =
  | "seed"
  | "test"
  | "early"
  | "mixed"
  | "reviewed";

export type PublicAggregateProvenance =
  | "seed"
  | "test"
  | "community"
  | "vendor";

export type PublicAggregateQualityInput = {
  sampleSize: number;
  verifiedSuccessCount: number;
  verificationUnknownCount: number;
  dataProvenance: PublicAggregateProvenance;
};

export type PublicAggregateQuality = {
  sample_size: number;
  confidence_label: PublicAggregateConfidenceLabel;
  data_quality_label: PublicAggregateDataQualityLabel;
  minimum_sample_size_met: boolean;
  verification_share: {
    numerator: number;
    denominator: number;
    rate: number | null;
  };
  notes: string[];
};

const minimumPublicSampleSize = 30;

export function calculatePublicAggregateQuality(
  input: PublicAggregateQualityInput,
): PublicAggregateQuality {
  assertValidQualityInput(input);
  const verifiedSuccessCount = input.verifiedSuccessCount;
  const verificationUnknownCount = input.verificationUnknownCount;
  const verifiedOrKnownCount = Math.max(0, input.sampleSize - verificationUnknownCount);
  const verificationShare = {
    numerator: verifiedOrKnownCount,
    denominator: input.sampleSize,
    rate: input.sampleSize === 0 ? null : verifiedOrKnownCount / input.sampleSize,
  };
  const confidenceLabel = confidenceLabelFor(
    input.sampleSize,
    verificationShare.rate,
    input.dataProvenance,
  );
  const minimumSampleSizeMet = input.sampleSize >= minimumPublicSampleSize;

  return {
    sample_size: input.sampleSize,
    confidence_label: confidenceLabel,
    data_quality_label: dataQualityLabelFor(input.dataProvenance, confidenceLabel),
    minimum_sample_size_met: minimumSampleSizeMet,
    verification_share: verificationShare,
    notes: qualityNotes({
      sampleSize: input.sampleSize,
      verifiedSuccessCount,
      verificationUnknownCount,
      dataProvenance: input.dataProvenance,
      confidenceLabel,
      minimumSampleSizeMet,
      verificationShareRate: verificationShare.rate,
    }),
  };
}

function assertValidQualityInput(input: PublicAggregateQualityInput): void {
  assertNonNegativeInteger("sampleSize", input.sampleSize);
  assertNonNegativeInteger("verifiedSuccessCount", input.verifiedSuccessCount);
  assertNonNegativeInteger("verificationUnknownCount", input.verificationUnknownCount);

  if (input.verifiedSuccessCount > input.sampleSize) {
    throw new Error("verifiedSuccessCount must not exceed sampleSize.");
  }
  if (input.verificationUnknownCount > input.sampleSize) {
    throw new Error("verificationUnknownCount must not exceed sampleSize.");
  }
  if (input.verifiedSuccessCount + input.verificationUnknownCount > input.sampleSize) {
    throw new Error("verifiedSuccessCount plus verificationUnknownCount must not exceed sampleSize.");
  }
}

function assertNonNegativeInteger(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer.`);
  }
}

function confidenceLabelFor(
  sampleSize: number,
  verificationShare: number | null,
  dataProvenance: PublicAggregateProvenance,
): PublicAggregateConfidenceLabel {
  if (dataProvenance === "seed" || dataProvenance === "test") {
    return "insufficient";
  }
  if (sampleSize < minimumPublicSampleSize || verificationShare === null || verificationShare < 0.25) {
    return "insufficient";
  }
  if (sampleSize < 100 || verificationShare < 0.5) {
    return "early";
  }
  if (sampleSize < 500 || verificationShare < 0.75) {
    return "moderate";
  }

  return "strong";
}

function dataQualityLabelFor(
  dataProvenance: PublicAggregateProvenance,
  confidenceLabel: PublicAggregateConfidenceLabel,
): PublicAggregateDataQualityLabel {
  if (dataProvenance === "seed") {
    return "seed";
  }
  if (dataProvenance === "test") {
    return "test";
  }
  if (dataProvenance === "vendor") {
    return "mixed";
  }
  if (confidenceLabel === "strong" || confidenceLabel === "moderate") {
    return "reviewed";
  }

  return "early";
}

function qualityNotes(input: {
  sampleSize: number;
  verifiedSuccessCount: number;
  verificationUnknownCount: number;
  dataProvenance: PublicAggregateProvenance;
  confidenceLabel: PublicAggregateConfidenceLabel;
  minimumSampleSizeMet: boolean;
  verificationShareRate: number | null;
}): string[] {
  const notes: string[] = [];

  if (input.dataProvenance === "seed") {
    notes.push("Seed data is illustrative and must not be interpreted as real model performance.");
  }
  if (input.dataProvenance === "test") {
    notes.push("Test data is for validation only and must not be interpreted as community performance.");
  }
  if (!input.minimumSampleSizeMet) {
    notes.push(`Public confidence requires at least ${minimumPublicSampleSize} accepted contribution records.`);
  }
  if (input.verificationShareRate === null || input.verificationShareRate < 0.5) {
    notes.push("Verification coverage is limited; show this metric as directional only.");
  }
  if (input.verificationUnknownCount > 0) {
    notes.push(`${input.verificationUnknownCount} records have unknown verification status.`);
  }
  if (input.confidenceLabel === "strong") {
    notes.push("Sample size and verification coverage support a stronger aggregate signal.");
  }

  return notes;
}
