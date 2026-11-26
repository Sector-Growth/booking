/*
 * Sector Growth · Booking Platform
 *
 * Shared JavaScript for all booking pages. Reads a per-page BOOKING_CONFIG
 * object (inlined by the build script) and delegates card clicks to the
 * appropriate provider (Google Calendar or HubSpot).
 *
 * Google Calendar: mounts hidden scheduling buttons, delegates clicks to them.
 * HubSpot: opens a custom modal overlay containing the HubSpot iframe embed.
 *
 * Also wires page-wide ambient hover effects — each card and the email panel
 * trigger a "mood" shift on the background layers.
 */

/* ===== Provider registry ===== */

var providers = {
  google: {
    /**
     * Mount Google's scheduling buttons into hidden containers.
     * Google's script appends rendered buttons to <body> with class `qxCTlb`,
     * not into the target containers we pass. We find them by label text.
     */
    mount: function (bookings) {
      if (!window.calendar || !window.calendar.schedulingButton) return false;
      for (var i = 0; i < bookings.length; i++) {
        var b = bookings[i];
        if (b.provider !== 'google') continue;
        var target = document.getElementById('g-' + b.duration);
        if (!target || target.dataset.mounted === '1') continue;
        try {
          window.calendar.schedulingButton.load({
            url: b.url,
            color: b.buttonColor,
            label: b.buttonLabel,
            target: target,
          });
          target.dataset.mounted = '1';
        } catch (e) {
          console.warn('[booking] Failed to mount Google button for', b.duration, e);
        }
      }
      return true;
    },

    /**
     * Find the Google-rendered button by its label text and click it.
     * Falls back to opening the URL in a new tab.
     */
    delegate: function (booking) {
      var buttons = document.querySelectorAll('button.qxCTlb');
      for (var i = 0; i < buttons.length; i++) {
        if ((buttons[i].textContent || '').trim() === booking.buttonLabel) {
          buttons[i].click();
          return;
        }
      }
      window.open(booking.url, '_blank', 'noopener,noreferrer');
    },
  },

  hubspot: {
    mount: function () {
      // No-op — HubSpot's MeetingsEmbedCode.js auto-mounts the iframe.
    },

    /**
     * Open the modal overlay for this HubSpot booking.
     */
    delegate: function (booking) {
      openModal('modal-' + booking.duration);
    },
  },
};

/* ===== Modal logic ===== */

function openModal(id) {
  var modal = document.getElementById(id);
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeModal(id) {
  var modal = document.getElementById(id);
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function closeAllModals() {
  document.querySelectorAll('.modal[aria-hidden="false"]').forEach(function (modal) {
    modal.setAttribute('aria-hidden', 'true');
  });
  document.body.classList.remove('modal-open');
}

function wireModals() {
  // Close on backdrop click
  document.querySelectorAll('.modal__backdrop').forEach(function (backdrop) {
    backdrop.addEventListener('click', function () {
      closeModal(backdrop.closest('.modal').id);
    });
  });

  // Close on close button
  document.querySelectorAll('.modal__close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      closeModal(btn.closest('.modal').id);
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAllModals();
  });
}

/* ===== Google button mounting ===== */

function ensureGoogleMounted(bookings) {
  var googleBookings = bookings.filter(function (b) { return b.provider === 'google'; });
  if (googleBookings.length === 0) return;
  if (providers.google.mount(bookings)) return;
  var attempts = 0;
  var max = 30;
  var interval = setInterval(function () {
    attempts += 1;
    if (providers.google.mount(bookings) || attempts >= max) {
      clearInterval(interval);
    }
  }, 200);
}

/* ===== Card click delegation ===== */

function wireCardDelegation(bookings) {
  document.querySelectorAll('[data-booking-id]').forEach(function (card) {
    card.addEventListener('click', function () {
      var id = card.dataset.bookingId;
      var booking = bookings.find(function (b) { return b.duration === id; });
      if (!booking) return;
      var provider = providers[booking.provider];
      if (provider) {
        provider.delegate(booking);
      } else {
        window.open(booking.url, '_blank', 'noopener,noreferrer');
      }
    });
  });
}

/* ===== Hover ambience ===== */

function wireHoverAmbience() {
  var body = document.body;
  document.querySelectorAll('[data-hover-class]').forEach(function (el) {
    var cls = el.dataset.hoverClass;
    var activate = function () { body.classList.add(cls); };
    var deactivate = function () { body.classList.remove(cls); };
    el.addEventListener('mouseenter', activate);
    el.addEventListener('mouseleave', deactivate);
    el.addEventListener('focusin', activate);
    el.addEventListener('focusout', deactivate);
  });
}

/* ===== Sector Agents band: the rosette opens when it comes into view ===== */

function wireRosetteReveal() {
  var band = document.querySelector('.next');
  if (!band || !('IntersectionObserver' in window)) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // Fold it only while it is still below the screen, so nobody watches it close; already on screen, it stays open.
  if (band.getBoundingClientRect().top < window.innerHeight) return;
  band.classList.add('is-waiting');
  var io = new IntersectionObserver(function (entries) {
    if (!entries.some(function (e) { return e.isIntersecting; })) return;
    io.disconnect();
    requestAnimationFrame(function () { band.classList.remove('is-waiting'); });
  }, { threshold: 0.4 });
  io.observe(band);
}

/* While the band is pointed at, the background orbits move from the avatar to ring the rosette. They are fixed to
   the screen, centred at their CSS top; the offset to the rosette's centre goes in --orbit-dx / --orbit-dy. */
function wireOrbitFollow() {
  var band = document.querySelector('.next');
  var rosette = band && band.querySelector('.rosette');
  var orbits = document.querySelector('.ambient__orbits');
  if (!band || !rosette || !orbits) return;
  var root = document.documentElement;
  var place = function () {
    var r = rosette.getBoundingClientRect();
    var top = parseFloat(getComputedStyle(orbits).top) || 0;
    root.style.setProperty('--orbit-dx', Math.round(r.left + r.width / 2 - root.clientWidth / 2) + 'px');
    root.style.setProperty('--orbit-dy', Math.round(r.top + r.height / 2 - top) + 'px');
  };
  band.addEventListener('mouseenter', place);
  band.addEventListener('focusin', place);
  window.addEventListener('scroll', function () {
    if (document.body.classList.contains('is-hovering-next')) place();
  }, { passive: true });
}

/* ===== Init ===== */

// The rosette's fold runs as soon as the page is parsed (this script is deferred), before the booking scripts load.
// The orbit listeners go on first too, so they measure before the hover class (wired at load) changes the page.
wireRosetteReveal();
wireOrbitFollow();

window.addEventListener('load', function () {
  var config = window.BOOKING_CONFIG || {};
  var bookings = config.bookings || [];
  ensureGoogleMounted(bookings);
  wireCardDelegation(bookings);
  wireModals();
  wireHoverAmbience();
});
