export function countBucket(value: number | undefined): string {
  if (value === undefined) {
    return "unknown";
  }
  if (value === 0) {
    return "zero";
  }
  if (value <= 10) {
    return "tiny";
  }
  if (value <= 100) {
    return "small";
  }
  if (value <= 1000) {
    return "medium";
  }
  if (value <= 10000) {
    return "large";
  }
  return "very_large";
}

export function durationBucket(value: number | undefined): string {
  if (value === undefined) {
    return "unknown";
  }
  if (value <= 60) {
    return "under_1m";
  }
  if (value <= 300) {
    return "1m_to_5m";
  }
  if (value <= 1800) {
    return "5m_to_30m";
  }
  if (value <= 7200) {
    return "30m_to_2h";
  }
  return "over_2h";
}

export function costBucket(value: number | undefined): string {
  if (value === undefined) {
    return "unknown";
  }
  if (value === 0) {
    return "free";
  }
  if (value < 0.01) {
    return "under_1_cent";
  }
  if (value < 0.1) {
    return "under_10_cents";
  }
  if (value < 1) {
    return "under_1_usd";
  }
  if (value < 10) {
    return "under_10_usd";
  }
  return "over_10_usd";
}
