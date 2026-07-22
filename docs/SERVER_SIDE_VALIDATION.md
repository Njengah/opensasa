# Server-Side Contribution Validation

Status: implemented for the Phase 7 ingestion boundary.

OpenSasa validates contribution payloads on the server side before any future
persistence or aggregation step can trust them. This validation is stricter than
the local preview check because incoming HTTP payloads are untrusted.

## Validation Layers

Server-side contribution validation checks:

- required contribution fields;
- forbidden private fields;
- unknown fields outside the contribution contract;
- schema and payload version values;
- required and optional field types;
- task, outcome, and verification enums;
- count, duration, and cost bucket values;
- contribution ID format;
- timestamp bucket format;
- private-looking text in normalized public fields.

## Response Shape

The ingestion endpoint includes a `server_validation` object in accepted and
rejected responses:

```json
{
  "status": "failed",
  "issues": [
    {
      "code": "forbidden_field",
      "field": "source_code",
      "message": "source_code is forbidden in contribution payloads."
    }
  ],
  "summary": {
    "issue_count": 1,
    "missing_required_field_count": 0,
    "forbidden_field_count": 1,
    "unknown_field_count": 0,
    "invalid_type_count": 0,
    "invalid_version_count": 0,
    "invalid_enum_count": 0,
    "invalid_bucket_count": 0,
    "invalid_format_count": 0,
    "private_marker_count": 0
  }
}
```

Accepted payloads have `server_validation.status = "passed"` and an empty
`issues` array.

## Issue Codes

| Code | Meaning |
| --- | --- |
| `missing_required_field` | A required contribution field is absent. |
| `forbidden_field` | A private or explicitly excluded field is present. |
| `unknown_field` | A field is outside the contribution payload contract. |
| `invalid_type` | A field has the wrong JSON type or an empty string. |
| `invalid_version` | Schema or payload version does not match the current contract. |
| `invalid_enum` | A task, outcome, or verification value is undocumented. |
| `invalid_bucket` | A bucket value is not part of the documented bucket family. |
| `invalid_format` | An opaque ID or timestamp bucket has the wrong format. |
| `private_marker` | A normalized public text field contains private-looking text. |

## Current Boundary

Validation does not mean public publication. The current ingestion endpoint can
accept safe payloads, but accepted payloads are still not persisted. Future PRs
must add storage, aggregation, confidence labels, and public views separately.
