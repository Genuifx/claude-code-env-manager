# Production Audit Suppressions

`pnpm audit:prod:high` is the CI gate for high and critical production dependency advisories. It reads `docs/security/production-audit-suppressions.json`, but an advisory can only be suppressed when the suppression is explicit and short lived.

## Current Status

No active high or critical production advisory suppressions are accepted.

The high advisories found at baseline `dcf1674` were remediated with root `pnpm.overrides` for these transitive production packages:

- `@xmldom/xmldom`
- `fast-uri`
- `hono`
- `js-cookie`
- `lodash`
- `lodash-es`
- `ws`

## Suppression Requirements

Only add a suppression when a high or critical production advisory is confirmed unreachable or cannot be safely fixed without a larger migration. Each suppression entry must include:

- `id`: GitHub advisory id, for example `GHSA-xxxx-yyyy-zzzz`
- `package`: vulnerable package name from `pnpm audit`
- `paths`: every affected production path accepted by the suppression
- `reason`: why the finding is unreachable or temporarily accepted
- `owner`: person or team responsible for clearing it
- `reviewCondition`: concrete event that reopens the decision
- `expires`: ISO date for forced re-review

The CI gate fails on missing fields, expired entries, stale entries, or a new vulnerable path that is not covered by the suppression.
