# booking

Config-driven booking pages for Sector Growth team members. Each person gets their own branded page with support for Google Calendar or HubSpot meeting links.

Live: https://book.sectorgrowth.com

## Stack

Static site — vanilla HTML, CSS, and JavaScript. A zero-dependency Node.js build script generates per-person pages from shared templates and a `team.json` config.

## Quick Start

```bash
npm run build          # Generates docs/ from team.json + templates
```

Serve locally for testing:

```bash
cd docs && ruby -run -ehttpd . -p8766
# Then open http://localhost:8766/prash/ or /sean/
```

## The root page assigns the call

https://book.sectorgrowth.com/ does not ask visitors to choose. Everyone in `team.json` with a `scoping` scheduler (`provider`, `url`) is in the rotation: a visitor is assigned at random, which splits calls evenly, and keeps the same person for 30 days (localStorage), and that person's calendar is embedded on the page. Add or remove someone from the rotation by adding or removing their `scoping` entry. The per-person pages (`/prash/`, `/sean/`) are unchanged. A HubSpot round-robin meeting link would replace this with availability-aware assignment; put it in as the only `scoping` entry when it exists.

## Adding a New Person

1. Add an entry to `team.json` (see existing entries for the schema)
2. Drop their profile photo (256x256px) into `assets/photos/` and set `photo`, or leave `photo` out: the page then shows a person glyph on the brand gradient
3. Run `npm run build`
4. Commit and push (the `docs/` directory is committed)
5. Add a Cloudflare DNS CNAME + redirect rule for their vanity subdomain

## Files

- `team.json` — per-person config (name, title, photo, accent color, bookings, email)
- `build.js` — build script (Node.js, zero dependencies)
- `template/index.html` — shared HTML template with `{{placeholders}}`
- `template/styles.css` — shared CSS (ambient effects, layout, modal, responsive)
- `template/app.js` — shared JS (provider registry, click delegation, hover moods, modal)
- `assets/` — shared static assets (logo, favicon, photos)
- `docs/` — build output, deployed via GitHub Pages

## Booking Providers

### Google Calendar
Uses Google's official scheduling button script. Renders a hidden button, delegates custom card clicks to it, which opens Google's native in-page modal.

### HubSpot
Uses HubSpot's MeetingsEmbed script inside a custom modal overlay. The iframe loads on page load; clicking the booking card shows the modal.

## Deploy

GitHub Pages from the `main` branch `/docs` folder. Custom domain: `book.sectorgrowth.com`.

### DNS (Cloudflare)

| Type  | Host   | Value                     | Proxy    |
|-------|--------|---------------------------|----------|
| CNAME | `book` | `sector-growth.github.io` | DNS only |

Vanity subdomains use Cloudflare redirect rules:

| Subdomain | Redirects to |
|-----------|-------------|
| `prash.sectorgrowth.com` | `book.sectorgrowth.com/prash` |
| `sean.sectorgrowth.com`  | `book.sectorgrowth.com/sean`  |
