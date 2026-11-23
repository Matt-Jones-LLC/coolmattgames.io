# AWS deployment preparation

The hosting stack and migration runbook live in [Matt-Jones-LLC/matt-jones.org](https://github.com/Matt-Jones-LLC/matt-jones.org), on branch `codex/aws-migration-monitoring`, at `infra/sites.cloudformation.json` and `docs/aws-migration.md`.

This repository owns only its own `infra/site.json`, public asset packager, deploy script and gated AWS workflow. The workflow is disabled until `AWS_DEPLOY_ENABLED=true` and the site-specific bucket, distribution ID and OIDC role variables are configured. Existing Pages deployment is retained during validation. No DNS change is made by these files.

Run `node scripts/package-aws.cjs` and `bash -n scripts/deploy-aws.sh` before release. Review the `_aws_site/` artifact, including the homepage, game routes, assets and 404 page. Never upload the entire repository root.

Workflow activation: `infra/aws-workflow.yml` is a template. Copy it to `.github/workflows/aws.yml` through an account authorized to write workflows before expecting any AWS deployments. The current CLI token lacks that scope; no workflow permission was broadened.
