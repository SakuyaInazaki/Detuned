# Independent static storage/maintenance review

Bound B freeze-v2 SHA 52130706a62113440eda223c05882a401ae2d2fcfd239331f47ab752b8441397; all 25 actual path hashes match. Read v1 source.diff plus observed_request_version v2 delta and affected SQL/ports/mappers/bootstrap/offline backup-restore-upgrade/generator/export/header/new tests. No actionable finding.

Four table FKs/uniqueness/CAS preserve frozen run identity; history has causal observed request version and descending-before-boundary helper. V5 profile derives exact frozen SQL; V6 derives canonical SQL via D generator receipts. Maintenance copies new private target, preserves old source/history, resets credentials/secret without deleting check bindings. Logical families remain excluded; only version allowance/header changes. Original fixture/case meaning stays intact. This is static review, no runtime success claim, no B edits or author checks.
