import assert from "node:assert/strict";
import { test } from "node:test";
import { buildSeedPublicDashboard } from "../dist/public-dashboard.js";

test("builds a seed-only public dashboard payload", () => {
  const dashboard = buildSeedPublicDashboard();

  assert.equal(dashboard.status, "seed only");
  assert.equal(dashboard.upload_enabled, false);
  assert.equal(dashboard.real_data_enabled, false);
  assert.equal(dashboard.schema_version, "opensasa.public-aggregate.v0");
  assert.equal(dashboard.methodology_version, "opensasa.methodology.v0");
  assert.match(dashboard.no_real_data_notice, /Seed data is illustrative only/);
  assert.ok(dashboard.records.length >= 4);
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
