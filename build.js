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
const DIST = path.join(ROOT, 'dist');
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
  var links = team.map(function (p) {
    return '      <a href="' + p.slug + '/" class="team-card">\n'
      + '        <img src="assets/' + p.photo + '" alt="" width="64" height="64">\n'
      + '        <div>\n'
      + '          <strong>' + escapeHtml(p.name) + '</strong>\n'
      + '          <span>' + escapeHtml(p.title) + '</span>\n'
      + '        </div>\n'
      + '      </a>';
  }).join('\n');

  return '<!DOCTYPE html>\n'
    + '<html lang="en">\n'
    + '<head>\n'
    + '  <meta charset="UTF-8">\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    + '  <title>Book a meeting · Sector Growth</title>\n'
    + '  <meta name="theme-color" content="#0A1628">\n'
    + '  <link rel="icon" type="image/png" href="assets/favicon.png">\n'
    + '  <link rel="preconnect" href="https://fonts.googleapis.com">\n'
    + '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    + '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">\n'
    + '  <style>\n'
    + '    :root { --bg: #0A1628; --text: #F5F7FA; --muted: #94A3B8; --border: rgba(255,255,255,0.08); }\n'
    + '    * { box-sizing: border-box; margin: 0; padding: 0; }\n'
    + '    body { font-family: "Inter", system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; }\n'
    + '    h1 { font-family: "Space Grotesk", system-ui, sans-serif; font-size: 28px; margin-bottom: 32px; }\n'
    + '    .team { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 480px; }\n'
    + '    .team-card { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border: 1px solid var(--border); border-radius: 14px; text-decoration: none; color: inherit; transition: border-color 200ms, background 200ms, transform 200ms; }\n'
    + '    .team-card:hover { border-color: rgba(107,207,238,0.4); background: rgba(107,207,238,0.04); transform: translateY(-2px); }\n'
    + '    .team-card img { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; }\n'
    + '    .team-card strong { display: block; font-size: 16px; }\n'
    + '    .team-card span { font-size: 13px; color: var(--muted); }\n'
    + '  </style>\n'
    + '</head>\n'
    + '<body>\n'
    + '  <h1>Book a meeting</h1>\n'
    + '  <div class="team">\n'
    + links + '\n'
    + '  </div>\n'
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
      '{{photo}}': person.photo,
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
