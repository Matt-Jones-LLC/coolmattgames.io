# coolmattgames.io domain cutover

## Completed November 22, 2026

- GoDaddy forwarding from coolmattgames.io to coolmatt.games was removed.
- The apex now has four A records for GitHub Pages: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153.
- `www` is a CNAME to `matt-jones-llc.github.io`.
- The GoDaddy NS, SOA, `_domainconnect`, and `_dmarc` records were left as they were. The domain has no mail records.
- The Pages custom domain for this repository is `coolmattgames.io`, and `site/CNAME` holds the same value.

To go back: remove the Pages custom domain, delete `site/CNAME`, and add GoDaddy forwarding to `https://coolmatt.games` (permanent, 301) again.

The steps below are the original plan, kept as a record.

The lab is deployed at https://matt-jones-llc.github.io/coolmattgames.io/ while GoDaddy still forwards the custom domain to the main arcade.

1. In GoDaddy, open coolmattgames.io → DNS → Forwarding. Remove the existing forwarding to coolmatt.games. Preserve any unrelated records.
2. Replace forwarding's website apex A records with GitHub Pages addresses: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153. Each has host @.
3. Point www CNAME to matt-jones-llc.github.io. If existing AAAA records point elsewhere, remove or replace them with GitHub's documented IPv6 addresses.
4. In Matt-Jones-LLC/coolmattgames.io → Settings → Pages, set custom domain to coolmattgames.io. Add site/CNAME with the same domain in source so future releases preserve it.
5. After DNS validates and the certificate is issued, enable HTTPS. Verify apex and www show the lab rather than the production arcade. Open a test game and verify Datadog events carry service:cool-matt-games-lab and env:experimental.

No mail or nameserver changes were needed.
