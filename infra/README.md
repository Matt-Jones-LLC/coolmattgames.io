# Domain alias migration

`coolmattgames.io` and `www.coolmattgames.io` will redirect with HTTP 301 to `https://coolmatt.games`, preserving paths and query strings. Both aliases attach to the arcade CloudFront distribution and its ACM certificate. No separate S3 bucket, deployment role, workflow or Datadog monitor is needed for this repository.

The existing experimental source remains available in GitHub. Keep its current Pages deployment available during DNS validation and rollback; these changes do not alter DNS or Pages settings.

The shared stack and exact rollout are in [company migration PR #3](https://github.com/Matt-Jones-LLC/matt-jones.org/pull/3); the arcade deployment is in [arcade PR #16](https://github.com/Matt-Jones-LLC/cool-matt-games/pull/16). Validate HTTPS redirects for apex and www, nested paths and repeated query values before cutover. Preserve mail and unrelated DNS records.

Three logical sites: mattjonesllc.com (matt-jones.org alias), coolmatt.games (coolmattgames.io alias), and future flashisdead.com (no repo yet). Combined monthly allowance remains $50: up to $30 AWS and $20 additional Datadog. Flash resources are deferred; budget alerts are not hard spending caps.
