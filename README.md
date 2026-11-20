# Cool Matt Games Lab

The experimental arcade for **coolmattgames.io**, by Matt Jones, LLC.

This is a separate release surface from [coolmatt.games](https://coolmatt.games). Try alternate backgrounds, CSS versus Canvas rendering, and future game experiments here. The initial game builds are copied from production commit `3bcc6c9`; unfinished local production work was not imported.

## Preview

```bash
python3 -m http.server 4174 --directory site
```

The homepage offers three backgrounds and CSS-grid, Canvas-starfield, or plain rendering. Canvas is static and redraws only on resize. No animation loop runs in the background.

## Release

Only `site/` is published from the `pages` branch. After committing source changes on `main`, run `bash scripts/deploy-pages.sh`. This preserves Pages branch history without force pushes.

Live preview: https://matt-jones-llc.github.io/coolmattgames.io/

The .io custom domain remains pending until GoDaddy forwarding is removed and DNS points to Pages. See [domain cutover](docs/domain-cutover.md).

## Promotion

Port selected changes to production through review and testing. Browser saves are isolated by domain. The copied game code retains its Apache 2.0 license; see LICENSE.

## Optional Datadog diagnostics

Performance, error, and game-start monitoring is configured through the shared Matt Jones LLC Websites RUM application. Visitors opt in through the diagnostics control; replay is off and browser privacy signals are respected. API/application keys never belong in browser code.
