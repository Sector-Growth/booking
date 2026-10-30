#!/usr/bin/env node

/**
 * Sector Growth · Booking Platform — Build Script
 *
 * Reads team.json and template files, generates per-person static pages
 * in dist/. Zero dependencies — uses only Node built-ins.
 *
 * Usage: node build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'docs');
const TEMPLATE_DIR = path.join(ROOT, 'template');
const ASSETS_DIR = path.join(ROOT, 'assets');

// ---------------------------------------------------------------------------
// Icon SVGs (used in booking cards)
// ---------------------------------------------------------------------------

const ICONS = {
  clock: '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20"/><path d="M24 12 V24 L32 28"/></svg>',
  layers: '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6 L42 16 L24 26 L6 16 Z"/><path d="M6 24 L24 34 L42 24"/><path d="M6 32 L24 42 L42 32"/></svg>',
  calendar: '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="10" width="36" height="32" rx="3"/><path d="M6 20 H42"/><path d="M16 6 V14"/><path d="M32 6 V14"/><circle cx="24" cy="32" r="4"/></svg>',
};

const ARROW_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12 H19 M13 6 L19 12 L13 18"/></svg>';

// A person glyph on the brand gradient, for anyone in team.json without a `photo` (never initials).
const GLYPH_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="38" r="17"/><path d="M16 100c2-24 17-36 34-36s32 12 34 36z"/></svg>';

const MAIL_SVG = '<svg viewBox="0 0 48 48" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="10" width="36" height="28" rx="3"/><path d="M6 14 L24 26 L42 14"/></svg>';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// Card HTML generation
// ---------------------------------------------------------------------------

function buildCardHtml(booking, index, total) {
  var cardClass = 'card';
  var hoverClass;

  if (total === 1) {
    cardClass += ' card--primary';
    hoverClass = 'is-hovering-primary';
  } else if (index === 0) {
    cardClass += ' card--30';
    hoverClass = 'is-hovering-30';
  } else {
    cardClass += ' card--60';
    hoverClass = 'is-hovering-60';
  }

  var iconSvg = ICONS[booking.icon] || ICONS.calendar;
  var eyebrow = booking.duration === '30' ? '30 MIN'
    : booking.duration === '60' ? '1 HOUR'
    : 'SESSION';

  return '      <button type="button" class="' + cardClass + '" data-booking-id="' + escapeHtml(booking.duration) + '" data-provider="' + escapeHtml(booking.provider) + '" data-hover-class="' + hoverClass + '">\n'
    + '        <span class="card__icon" aria-hidden="true">' + iconSvg + '</span>\n'
    + '        <span class="card__eyebrow">' + eyebrow + '</span>\n'
    + '        <span class="card__title">' + escapeHtml(booking.label) + '</span>\n'
    + '        <span class="card__sub">' + escapeHtml(booking.description) + '</span>\n'
    + '        <span class="card__cta">\n'
    + '          ' + escapeHtml(booking.ctaLabel) + '\n'
    + '          ' + ARROW_SVG + '\n'
    + '        </span>\n'
    + '      </button>';
}

// ---------------------------------------------------------------------------
// Email panel HTML
// ---------------------------------------------------------------------------

function buildEmailPanel(person) {
  if (!person.email) return '';

  var subject = encodeURIComponent('Hi ' + person.name + ' \u2014 Sector Growth inquiry');
  var href = 'mailto:' + person.email + '?subject=' + subject;

  return '\n    <a class="email-panel" href="' + href + '" data-hover-class="is-hovering-email">\n'
    + '      <span class="email-panel__icon" aria-hidden="true">' + MAIL_SVG + '</span>\n'
    + '      <span class="email-panel__body">\n'
    + '        <span class="email-panel__title">Prefer email?</span>\n'
    + '        <span class="email-panel__sub">Drop a note to <strong>' + escapeHtml(person.email) + '</strong> \u2014 I\'ll reply within a day.</span>\n'
    + '      </span>\n'
    + '      <span class="email-panel__cta" aria-hidden="true">\n'
    + '        Email instead\n'
    + '        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12 H19 M13 6 L19 12 L13 18"/></svg>\n'
    + '      </span>\n'
    + '    </a>';
}

// ---------------------------------------------------------------------------
// Provider-specific HTML
// ---------------------------------------------------------------------------

function buildProviderStyles(person) {
  var hasGoogle = person.bookings.some(function (b) { return b.provider === 'google'; });
  if (!hasGoogle) return '';
  return '  <!-- Google Calendar Scheduling Button -->\n'
    + '  <link href="https://calendar.google.com/calendar/scheduling-button-script.css" rel="stylesheet">';
}

function buildProviderScripts(person) {
  var lines = [];
  var hasGoogle = person.bookings.some(function (b) { return b.provider === 'google'; });
  var hasHubspot = person.bookings.some(function (b) { return b.provider === 'hubspot'; });

  if (hasGoogle) {
    lines.push('  <script src="https://calendar.google.com/calendar/scheduling-button-script.js" async><\/script>');
  }
  if (hasHubspot) {
    lines.push('  <script type="text/javascript" src="https://static.hsappstatic.net/MeetingsEmbed/ex/MeetingsEmbedCode.js"><\/script>');
  }
  return lines.join('\n');
}

function buildProviderMounts(person) {
  var blocks = [];

  // Google Calendar hidden mount divs
  person.bookings.forEach(function (b) {
    if (b.provider === 'google') {
      blocks.push('  <div id="g-' + escapeHtml(b.duration) + '" class="g-mount" aria-hidden="true"></div>');
    }
  });

  // HubSpot modal overlays
  person.bookings.forEach(function (b) {
    if (b.provider === 'hubspot' && b.embedUrl) {
      blocks.push(
        '  <div class="modal" id="modal-' + escapeHtml(b.duration) + '" aria-hidden="true">\n'
        + '    <div class="modal__backdrop"></div>\n'
        + '    <div class="modal__content">\n'
        + '      <button class="modal__close" aria-label="Close">&times;</button>\n'
        + '      <div class="meetings-iframe-container" data-src="' + escapeHtml(b.embedUrl) + '"></div>\n'
        + '    </div>\n'
        + '  </div>'
      );
    }
  });

  return blocks.join('\n');
}

function getFooterProvider(person) {
  var providerSet = new Set(person.bookings.map(function (b) { return b.provider; }));
  var names = [];
  if (providerSet.has('google')) names.push('Google Calendar');
  if (providerSet.has('hubspot')) names.push('HubSpot');
  return names.join(' &amp; ');
}

// ---------------------------------------------------------------------------
// Booking config for inline <script>
// ---------------------------------------------------------------------------

function buildBookingConfig(person) {
  return JSON.stringify({
    slug: person.slug,
    name: person.name,
    bookings: person.bookings,
  }, null, 2);
}

// ---------------------------------------------------------------------------
// Root directory page
// ---------------------------------------------------------------------------

function buildRootPage(team) {
  // The root page assigns the call automatically (owner, 2026-10-07: "rather than asking visitors to choose").
  // Everyone with a `scoping` scheduler is in the rotation; a visitor is assigned at random, which splits the calls
  // evenly, and keeps the same person for 30 days so a reload never swaps them. The per-person pages stay as they are.
  var pool = team.filter(function (p) { return p.scoping && p.scoping.url; }).map(function (p) {
    return { slug: p.slug, name: p.name, title: p.title, photo: p.photo ? 'assets/photos/' + path.basename(p.photo) : '', provider: p.scoping.provider, url: p.scoping.url };
  });
  var data = JSON.stringify(pool).replace(/</g, '\\u003c');
  var fallback = pool.map(function (p) {
    return '      <li><a href="' + escapeHtml(p.url.replace('?embed=true', '').replace('?gv=true', '')) + '">Book with ' + escapeHtml(p.name) + '</a></li>';
  }).join('\n');

  return '<!DOCTYPE html>\n'
    + '<html lang="en">\n'
    + '<head>\n'
    + '  <meta charset="UTF-8">\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '  <title>Book a scoping call · Sector Growth</title>\n'
    + '  <meta name="description" content="Book a scoping call with the Sector Growth team.">\n'
    + '  <meta name="theme-color" content="#0A1628">\n'
    + '  <link rel="icon" type="image/png" href="assets/favicon.png">\n'
    + '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
    + '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    + '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">\n'
    + '  <style>\n'
    + '    :root { --bg: #0A1628; --text: #F5F7FA; --muted: #A9B6C8; --border: rgba(255,255,255,0.1); --sky: #60D0F0; }\n'
    + '    * { box-sizing: border-box; margin: 0; padding: 0; }\n'
    + '    body { font-family: "Inter", system-ui, sans-serif; background: radial-gradient(1200px 600px at 50% -10%, #1050A0 0%, var(--bg) 60%); color: var(--text); min-height: 100vh; padding: 32px 16px 48px; }\n'
    + '    .wrap { max-width: 760px; margin: 0 auto; }\n'
    + '    .logo { display: block; width: 132px; height: auto; margin-bottom: 28px; }\n'
    + '    h1 { font-family: "Space Grotesk", system-ui, sans-serif; font-size: clamp(26px, 4vw, 34px); line-height: 1.15; }\n'
    + '    .lede { margin-top: 10px; color: var(--muted); font-size: 16px; line-height: 1.5; }\n'
    + '    .who { display: flex; align-items: center; gap: 14px; margin: 24px 0 18px; min-height: 56px; }\n'
    + '    .who img { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 2px rgba(96,208,240,0.35); }\n'
    + '    .who .glyph { flex: none; width: 56px; height: 56px; border-radius: 50%; overflow: hidden; background: radial-gradient(circle at 50% 36%, #1070B0, #0C4388 72%); box-shadow: 0 0 0 2px rgba(96,208,240,0.35); }\n'
    + '    .who .glyph svg { display: block; width: 100%; height: 100%; fill: rgba(160,224,240,0.55); }\n'
    + '    .who strong { display: block; font-size: 16px; }\n'
    + '    .who span { font-size: 13.5px; color: var(--muted); }\n'
    + '    .cal { background: #fff; border-radius: 18px; overflow: hidden; min-height: 680px; box-shadow: 0 30px 60px -30px rgba(0,0,0,0.6); }\n'
    + '    .cal iframe { display: block; width: 100%; height: 760px; border: 0; }\n'
    + '    noscript ul { margin-top: 20px; list-style: none; display: grid; gap: 10px; }\n'
    + '    noscript a { color: var(--sky); font-weight: 600; }\n'
    + '  </style>\n'
    + '</head>\n'
    + '<body>\n'
    + '  <main class="wrap">\n'
    + '    <img class="logo" src="assets/sector-logo-light.svg" alt="Sector Growth" width="132" height="36">\n'
    + '    <h1>Book a scoping call</h1>\n'
    + '    <p class="lede">Pick a time that suits. We match you with someone from the team.</p>\n'
    + '    <div class="who" id="who" aria-live="polite"></div>\n'
    + '    <div class="cal" id="cal"></div>\n'
    + '    <noscript><ul>\n' + fallback + '\n    </ul></noscript>\n'
    + '  </main>\n'
    + '  <script id="pool" type="application/json">' + data + '</script>\n'
    + '  <script>\n'
    + '  (function () {\n'
    + '    var pool = JSON.parse(document.getElementById("pool").textContent);\n'
    + '    if (!pool.length) return;\n'
    + '    var KEY = "sg-book-assignee", DAYS = 30, pick = null;\n'
    + '    try {\n'
    + '      var saved = JSON.parse(localStorage.getItem(KEY) || "null");\n'
    + '      if (saved && Date.now() - saved.at < DAYS * 864e5) pick = pool.filter(function (p) { return p.slug === saved.slug; })[0] || null;\n'
    + '    } catch (e) {}\n'
    + '    if (!pick) {\n'
    + '      var r = new Uint32Array(1); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : (r[0] = Math.floor(Math.random() * 4294967296));\n'
    + '      pick = pool[r[0] % pool.length];\n'
    + '      try { localStorage.setItem(KEY, JSON.stringify({ slug: pick.slug, at: Date.now() })); } catch (e) {}\n'
    + '    }\n'
    + '    var who = document.getElementById("who");\n'
    + '    var img;\n'
    + '    if (pick.photo) { img = document.createElement("img"); img.src = pick.photo; img.alt = ""; img.width = 56; img.height = 56; }\n'
    + '    else { img = document.createElement("span"); img.className = "glyph"; img.setAttribute("aria-hidden", "true"); img.innerHTML = ' + JSON.stringify(GLYPH_SVG) + '; }\n'
    + '    var box = document.createElement("div"); var b = document.createElement("strong"); b.textContent = "Your call is with " + pick.name;\n'
    + '    var s = document.createElement("span"); s.textContent = pick.title; box.appendChild(b); box.appendChild(s);\n'
    + '    who.appendChild(img); who.appendChild(box);\n'
    + '    var f = document.createElement("iframe"); f.src = pick.url; f.title = "Book a scoping call with " + pick.name; f.loading = "eager";\n'
    + '    document.getElementById("cal").appendChild(f);\n'
    + '  })();\n'
    + '  </script>\n'
    + '</body>\n'
    + '</html>\n';
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('[build] Reading team.json...');
  var team = JSON.parse(readFile(path.join(ROOT, 'team.json')));
  var template = readFile(path.join(TEMPLATE_DIR, 'index.html'));

  // Clean dist/
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST, { recursive: true });

  // Copy shared assets
  console.log('[build] Copying assets...');
  copyDir(ASSETS_DIR, path.join(DIST, 'assets'));

  // Copy template CSS and JS to dist/assets/
  fs.copyFileSync(path.join(TEMPLATE_DIR, 'styles.css'), path.join(DIST, 'assets', 'styles.css'));
  fs.copyFileSync(path.join(TEMPLATE_DIR, 'app.js'), path.join(DIST, 'assets', 'app.js'));

  // Copy CNAME
  var cnamePath = path.join(ROOT, 'CNAME');
  if (fs.existsSync(cnamePath)) {
    fs.copyFileSync(cnamePath, path.join(DIST, 'CNAME'));
  }

  // Generate per-person pages
  team.forEach(function (person) {
    console.log('[build] Generating page for', person.name, '(' + person.slug + ')...');

    var bookingCards = person.bookings.map(function (b, i) {
      return buildCardHtml(b, i, person.bookings.length);
    }).join('\n\n');

    var cardsClass = person.bookings.length === 1 ? 'cards--single' : '';

    var replacements = {
      '{{name}}': person.name,
      '{{title}}': escapeHtml(person.title),
      '{{titleUpper}}': escapeHtml(person.title).toUpperCase(),
      '{{tagline}}': escapeHtml(person.tagline),
      '{{photo}}': person.photo || '',
      '{{avatar}}': person.photo
        ? '<img src="../assets/' + person.photo + '" alt="" width="96" height="96" loading="eager" decoding="async">'
        : '<span class="hero__glyph">' + GLYPH_SVG + '</span>',
      '{{accentColor}}': person.accentColor,
      '{{slug}}': person.slug,
      '{{bookingCards}}': bookingCards,
      '{{cardsClass}}': cardsClass,
      '{{emailPanel}}': buildEmailPanel(person),
      '{{providerStyles}}': buildProviderStyles(person),
      '{{providerScripts}}': buildProviderScripts(person),
      '{{providerMounts}}': buildProviderMounts(person),
      '{{bookingConfig}}': buildBookingConfig(person),
      '{{footerProvider}}': getFooterProvider(person),
    };

    var html = template;
    for (var key in replacements) {
      html = html.split(key).join(replacements[key]);
    }

    writeFile(path.join(DIST, person.slug, 'index.html'), html);
  });

  // Generate root directory page
  console.log('[build] Generating root directory page...');
  writeFile(path.join(DIST, 'index.html'), buildRootPage(team));

  console.log('[build] Done! Output in dist/');
  console.log('[build] Pages:');
  team.forEach(function (p) {
    console.log('  - ' + p.slug + '/');
  });
}

main();
