# Security

Please report security issues privately to the repository owner instead of opening a public issue. Do not include applicant records, passwords, uploaded documents, registry synchronization tokens, or other sensitive data in a report.

The application is a concept and should be used only with non-sensitive demonstration material. It is not an FAA filing system.

## Operational controls

- Keep `REGISTRY_SYNC_TOKEN` only in Sites environment variables and GitHub Actions secrets.
- Rotate the synchronization token if it is exposed or a publishing request is unexplained.
- Review dependency audit results and failed registry synchronization runs before deployment.
- Do not add owner or address columns from the FAA registry release to the mirror.
- Retain the authenticated lookup boundary if registry functionality changes.

Password recovery, email verification, account deletion, document retention controls, malware scanning, and formal security monitoring are planned before any production use.
