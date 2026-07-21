# Contribution Ingestion Endpoint

Status: first implementation slice for Phase 7.

OpenSasa now includes a contribution ingestion endpoint that can receive
privacy-safe contribution payloads over HTTP. This is not a production upload
system yet. It validates the intake boundary and returns an explicit response,
but it does not persist accepted payloads.

## Start The Endpoint

```bash
opensasa ingest
```

By default, the endpoint binds to:

```text
http://127.0.0.1:3220
```

Use `--host` and `--port` to override the local bind address:

```bash
opensasa ingest --host 127.0.0.1 --port 3221
```

Keep the default `127.0.0.1` host unless you are intentionally testing from
another machine on a trusted network. Binding to `0.0.0.0` exposes an
unauthenticated HTTP intake endpoint. Even though accepted payloads are not
stored yet, exposed endpoints can still receive unwanted traffic.

## Health Check

```http
GET /health
```

Example response:

```json
{
  "status": "ok",
  "service": "opensasa-contribution-ingestion",
  "storage_enabled": false
}
```

## Submit A Payload

```http
POST /api/contributions
Content-Type: application/json
```

The body must be a contribution payload matching the safe contribution contract
documented in [`METADATA_SCHEMA.md`](./METADATA_SCHEMA.md).

The endpoint rejects payloads with missing required fields, forbidden private
fields, unknown fields, invalid enum values, invalid bucket values, invalid
boolean types, malformed contribution IDs, malformed timestamp buckets, or
private-looking text in normalized public fields.

Accepted payloads return `202`. Rejected payloads return `422` when validation
fails. Payloads that include forbidden fields such as `source_code`,
`terminal_output`, exact paths, repository names, or private notes are rejected
and not stored.

## Current Boundary

This endpoint deliberately does not add:

- database persistence for accepted contribution payloads;
- public aggregate materialization;
- real-data public dashboard views;
- user accounts;
- sync;
- automatic upload from local clients.

Those remain separate Phase 7 tasks. The next step is server-side validation
documentation and stricter tests around the accepted payload contract.
