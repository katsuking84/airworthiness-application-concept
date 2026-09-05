# Airworthy

Airworthy is a public concept workspace that guides an applicant through a source-backed airworthiness application flow. It identifies an application path, presents the applicable applicant sections of FAA Form 8130-6, accepts supporting documents, and records a concept submission that can be downloaded as a draft PDF.

This project is independent and is not an FAA service. It does not file an application with the FAA or determine airworthiness.

## Current capabilities

- ChatGPT sign-in and first-party email account creation
- Light and dark themes
- Guided original, recurrent, amendment, special flight permit, and replacement routing
- Digital Form 8130-6 applicant fields with source references
- Authenticated FAA N-number lookup with selective technical-field autofill
- Supporting PDF, PNG, and JPEG uploads up to 10 MB using chunked transfer
- Completeness review, concept acknowledgment, receipt, and draft PDF export
- A new application can be started after a concept is submitted

## Source documents

The guided flow was developed from the copies committed under `public/sources`:

- FAA Form 8130-6
- FAA Order 8130.2M
- Advisory Circular 21-12D

The aircraft lookup uses the FAA's daily releasable aircraft download. The mirror intentionally retains technical aircraft data only. Owner names, addresses, and other personal fields are discarded before publication.

## Local development

Requirements: Node.js 22.13 or newer and pnpm 11.19.

```bash
pnpm install
pnpm dev
```

The application expects a D1 database binding named `DB` and an R2 binding named `FILES`, which Sites provisions for the hosted project. Database changes are kept in `drizzle`.

Run the complete local quality gate with:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm audit --prod --audit-level high
```

## FAA registry mirror

`.github/workflows/registry-sync.yml` runs daily after the FAA's stated refresh window. It downloads the official ZIP, joins `MASTER`, `ACFTREF`, and `ENGINE`, removes personal fields, writes deterministic gzip shards, and publishes them through protected synchronization endpoints. A manifest pointer is updated only after every shard has been verified.

The workflow requires a `REGISTRY_SYNC_TOKEN` GitHub secret. The same high-entropy value must be configured as a Sites environment variable. To build a mirror locally without publishing:

```bash
python scripts/sync_faa_registry.py --zip path/to/ReleasableAircraft.zip --output path/to/output
```

## Data and security boundaries

- Registry results require an authenticated application account.
- Registry lookup results include no owner or address fields.
- Email passwords use PBKDF2-SHA256 at the hosting runtime's 100,000-iteration ceiling, with per-user salts.
- Failed account requests are throttled by email and network address for 15 minutes.
- Sessions use HTTP-only, same-site cookies and expire after 30 days.
- Uploads are type-checked from file signatures and restricted to the current user's editable application.
- The concept should be used with demonstration documents only.

See [SECURITY.md](SECURITY.md) for reporting and operational details and [docs/ROADMAP.md](docs/ROADMAP.md) for planned enhancements.
