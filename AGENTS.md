# Cool Matt Games Lab: instructions for AI agents

This file is the rulebook for every AI tool that works here (Claude Code, Codex, ChatGPT).
`CLAUDE.md` imports it. Read `README.md` before making changes.

This repository is the experimental arcade at coolmattgames.io: test games, alternate
backgrounds, and different rendering and scripting methods. It is a separate release surface from
coolmatt.games, not a redirect or a second name for the same site.

## This repository

| Path | What it is |
| --- | --- |
| `site/` | The lab website. The only folder that is published. |
| `site/games/<name>/` | Game builds, first copied from the main arcade |
| `site/assets/` | Lab styles and scripts, and the optional diagnostics |
| `scripts/deploy-pages.sh` | Publishes `site/` to the `pages` branch |
| `docs/domain-cutover.md` | The record of how the lab was put on coolmattgames.io |

## Commands

```bash
python3 -m http.server 4174 --directory site      # preview the lab
```

There is no build step and nothing to install.

## Releasing

`bash scripts/deploy-pages.sh` pushes `main` and copies `site/` to the `pages` branch, which GitHub
Pages serves at https://coolmattgames.io. Run it only when Matt asks. It never force-pushes.

## Rules for this site

- Label the lab as experimental wherever a visitor lands. It must never look like the main arcade.
- This is the place to try things: backgrounds, renderers, and new games may change freely here.
  Moving one to the main arcade is a separate, reviewed pull request to the arcade repository.
- Do not point this repository's deployment or custom domain at coolmatt.games.
- `site/CNAME` holds the custom domain. Do not remove or change it, or the next release drops the
  domain.
- Browser saves are separate from the main arcade because the address is different. Do not try to
  share saves or visitor identity between the two sites.
- The game code copied from the main arcade is Apache 2.0. Keep `LICENSE` and attribution intact.

<!-- ecosystem:start
This block is identical in every Matt Jones, LLC repository. Edit the copy in
Matt-Jones-LLC/matt-jones.org first, then copy it unchanged to the other repositories
in the same piece of work.
-->
## The ecosystem

Matt Jones, LLC is the company. Cool Matt Games is its games brand. The three websites, their
repositories, and the services around them are one system: a change in one place often has a
counterpart somewhere else, so check this map before you start.

Status as of 2026-11-22.

| Address | Purpose | Repository | Publishes from | DNS at |
| --- | --- | --- | --- | --- |
| matt-jones.org | Company site | `Matt-Jones-LLC/matt-jones.org` | `pages` branch, a copy of `site/` | Squarespace |
| coolmatt.games | Main arcade: finished games | `Matt-Jones-LLC/cool-matt-games` | GitHub Actions on every push to `main` | GoDaddy |
| coolmattgames.io | Lab: experiments | `Matt-Jones-LLC/coolmattgames.io` | `pages` branch, a copy of `site/` | GoDaddy |

### Services

- **GitHub.** `Matt-Jones-LLC` is the organization, and all three site repositories live there.
  The arcade moved from Matt's personal account, `matt-jones-org`, on 2026-11-22; GitHub redirects
  its old address. New repositories go under `Matt-Jones-LLC` and start private.
- **Hosting.** All three sites are static files on GitHub Pages. There is no server.
  coolmattgames.io has served the lab since 2026-11-22; before that it forwarded to coolmatt.games.
- **Email.** Google Workspace on matt-jones.org. Website work never edits the MX, SPF, DKIM, DMARC,
  or verification records.
- **Datadog (US1, `datadoghq.com`).** One Browser RUM application, "Matt Jones LLC Websites",
  covers all three sites. They are told apart by tags:

  | Site | `service` | `env` |
  | --- | --- | --- |
  | matt-jones.org | `matt-jones-company` | `production` |
  | coolmatt.games | `cool-matt-games` | `production` |
  | coolmattgames.io | `cool-matt-games-lab` | `experimental` |

  Diagnostics stay off until a visitor turns them on, and stay off under Global Privacy Control or
  Do Not Track. There is no session replay. Only the application ID and the public client token
  (`pub…`) belong in a repository. Datadog's GitHub and AWS integrations are not connected.
- **AWS.** An account exists and is empty. No site depends on it. Do not create AWS resources or
  move DNS or hosting there unless Matt asks for that specific change: it costs money and nothing
  needs it yet.
- **AI tools.** Claude Code and Codex (ChatGPT) both work in these repositories. `AGENTS.md` is the
  single rulebook and `CLAUDE.md` imports it. Put a new rule in `AGENTS.md`, never only in
  `CLAUDE.md`, so both tools follow it.

### Rules that hold in every repository

- Work on a feature branch and open a pull request. Do not push to `main` or `pages`, and do not
  run a deploy script, unless Matt asks for that release.
- Never commit `.env` files, API keys, application keys, credentials, or local AI-tool sign-in
  state. Setup and startup scripts must never create repositories, commit, push, or deploy.
- Keep production and the lab separate. A lab release must never publish to coolmatt.games. An
  experiment reaches the main arcade only through a reviewed pull request to the arcade repository.
- The sites are plain HTML, CSS, and JavaScript with no build step. Add a framework, a build step,
  or a request to another server only when a real requirement calls for it.
- `assets/monitoring.js` has the same logic on all three sites, and each site has its own
  `assets/monitoring-config.js`. Change the logic on all three together, and keep it opt-in.
- Keep keyboard access, visible focus, reduced-motion support, and narrow-screen layouts working.
- Do not invent employees, customers, testimonials, traction, or services.
- DNS records, domain settings, repository transfers, billing, and third-party integrations are
  Matt's to change. Describe the exact change and ask; do not make it yourself.
- When you finish, say what changed, how you verified it, and what is still not done.
<!-- ecosystem:end -->
