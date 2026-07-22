# Seed-Only Public Dashboard

Status: first public aggregate dashboard slice.

OpenSasa includes a seed-only public aggregate preview at:

```text
http://127.0.0.1:3210/public
```

Start the local dashboard server first:

```bash
opensasa dashboard
```

Then open `/public`.

Do not expose this local dashboard server as the hosted public service. The same
process also serves private local endpoints such as `/api/report`,
`/api/contribution-bundle`, and `/api/contribution-history`; binding it to a
non-loopback host or placing it behind a public proxy can expose local dashboard
data.

## Boundary

This page shows illustrative seed aggregate records only. It does not:

- read real contribution submissions;
- upload local sessions;
- publish rankings;
- enable real-data public dashboards;
- create accounts or sync.

The seed API is:

```http
GET /api/public/aggregates
```

Every record is labeled with:

- `data_provenance: "seed"`;
- `quality.confidence_label: "insufficient"`;
- `quality.data_quality_label: "seed"`;
- schema and methodology versions.

Real contribution data should remain hidden until sample-size, confidence, and
validation thresholds are met.
