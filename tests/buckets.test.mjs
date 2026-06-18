import assert from "node:assert/strict";
import { test } from "node:test";
import { costBucket, countBucket, durationBucket } from "../dist/buckets.js";

test("buckets counts with explicit boundaries", () => {
  assert.equal(countBucket(undefined), "unknown");
  assert.equal(countBucket(0), "zero");
  assert.equal(countBucket(10), "tiny");
  assert.equal(countBucket(11), "small");
  assert.equal(countBucket(100), "small");
  assert.equal(countBucket(101), "medium");
  assert.equal(countBucket(1000), "medium");
  assert.equal(countBucket(1001), "large");
  assert.equal(countBucket(10000), "large");
  assert.equal(countBucket(10001), "very_large");
});

test("buckets durations with explicit boundaries", () => {
  assert.equal(durationBucket(undefined), "unknown");
  assert.equal(durationBucket(60), "under_1m");
  assert.equal(durationBucket(61), "1m_to_5m");
  assert.equal(durationBucket(300), "1m_to_5m");
  assert.equal(durationBucket(301), "5m_to_30m");
  assert.equal(durationBucket(1800), "5m_to_30m");
  assert.equal(durationBucket(1801), "30m_to_2h");
  assert.equal(durationBucket(7200), "30m_to_2h");
  assert.equal(durationBucket(7201), "over_2h");
});

test("buckets costs with explicit boundaries", () => {
  assert.equal(costBucket(undefined), "unknown");
  assert.equal(costBucket(0), "free");
  assert.equal(costBucket(0.009), "under_1_cent");
  assert.equal(costBucket(0.01), "under_10_cents");
  assert.equal(costBucket(0.099), "under_10_cents");
  assert.equal(costBucket(0.1), "under_1_usd");
  assert.equal(costBucket(0.99), "under_1_usd");
  assert.equal(costBucket(1), "under_10_usd");
  assert.equal(costBucket(9.99), "under_10_usd");
  assert.equal(costBucket(10), "over_10_usd");
});
