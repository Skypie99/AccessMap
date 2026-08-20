/* ===========================================================================
   Flagstone — shared accessibility controls.
   ---------------------------------------------------------------------------
   Drop into any page with:
       <div id="a11y-mount"></div>
       <script src="assets/a11y.js" defer></script>
   (use ../assets/ from a subdirectory such as /privacy/).

   The panel is INJECTED rather than written into each page's HTML. That is
   deliberate: the controls only do anything with JavaScript running, so if JS
   is off no dead controls appear. The page is simply the page.

   Preferences are stored per-device in localStorage and applied on every
   Flagstone page, so a visitor sets their text size once and it holds as they
   move between Accessibility, Privacy, Terms and Support.
   =========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var KEY = 'flagstone-a11y-prefs';
  var defaults = { size: 100, dark: null, contrast: false, reading: false, motion: false };
  var prefs = Object.assign({}, defaults);

  /* ---- storage ------------------------------------------------------- */

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) prefs = Object.assign({}, defaults, JSON.parse(raw));
    } catch (e) { /* private mode or storage blocked — defaults are correct */ }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  function prefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  /* ---- apply --------------------------------------------------------- */

  // Applied as early as possible (see the inline bootstrap in each page's
  // <head>) so a returning visitor never sees a flash of the default theme.
  function applyTheme() {
    root.style.fontSize = prefs.size + '%';
    var dark = prefs.dark === null ? prefersDark() : prefs.dark;
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-contrast', prefs.contrast ? 'high' : 'normal');
    root.setAttribute('data-reading', prefs.reading ? 'on' : 'off');
    root.setAttribute('data-motion', prefs.motion ? 'reduced' : 'normal');
    return dark;
  }

  function syncControls(dark) {
    var slider = document.getElementById('a11y-size');
    var out = document.getElementById('a11y-size-out');
    if (slider) {
      slider.value = prefs.size;
      slider.setAttribute('aria-valuetext', prefs.size + ' percent');
    }
    if (out) out.textContent = prefs.size + '%';
    press('a11y-dark', dark);
    press('a11y-contrast', prefs.contrast);
    press('a11y-reading', prefs.reading);
    press('a11y-motion', prefs.motion);
  }

  function press(id, on) {
    var el = document.getElementById(id);
    if (el) el.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function say(msg) {
    var live = document.getElementById('a11y-live');
    if (live) live.textContent = msg;
  }

  /* ---- markup -------------------------------------------------------- */

  function panelHTML() {
    return '' +
      '<details class="a11y-panel" id="a11y-panel">' +
        '<summary><span class="a11y-icon" aria-hidden="true">◎</span> Display settings for this site</summary>' +
        '<div class="a11y-body">' +
          '<p class="a11y-note">These change how this website looks and are remembered on this device. ' +
            'They don’t affect the Flagstone app itself — the app follows your phone’s own accessibility settings.</p>' +

          '<div class="a11y-control">' +
            '<label class="a11y-label" for="a11y-size">Text size</label>' +
            '<div class="a11y-slider-row">' +
              '<input type="range" id="a11y-size" min="100" max="200" step="10" value="100" aria-describedby="a11y-size-out" />' +
              '<span class="a11y-readout" id="a11y-size-out" aria-hidden="true">100%</span>' +
            '</div>' +
          '</div>' +

          '<div class="a11y-control">' +
            '<span class="a11y-label" id="a11y-theme-label">Theme</span>' +
            '<div class="a11y-btn-row" role="group" aria-labelledby="a11y-theme-label">' +
              '<button type="button" class="a11y-toggle" id="a11y-dark" aria-pressed="false"><span class="tick" aria-hidden="true">✓</span> Dark</button>' +
              '<button type="button" class="a11y-toggle" id="a11y-contrast" aria-pressed="false"><span class="tick" aria-hidden="true">✓</span> High contrast</button>' +
            '</div>' +
          '</div>' +

          '<div class="a11y-control">' +
            '<span class="a11y-label" id="a11y-reading-label">Reading</span>' +
            '<div class="a11y-btn-row" role="group" aria-labelledby="a11y-reading-label">' +
              '<button type="button" class="a11y-toggle" id="a11y-reading" aria-pressed="false"><span class="tick" aria-hidden="true">✓</span> Spaced text</button>' +
              '<button type="button" class="a11y-toggle" id="a11y-motion" aria-pressed="false"><span class="tick" aria-hidden="true">✓</span> Reduce motion</button>' +
            '</div>' +
          '</div>' +

          '<div class="a11y-control">' +
            '<button type="button" class="a11y-reset" id="a11y-reset">Reset to defaults</button>' +
          '</div>' +
        '</div>' +
      '</details>' +
      '<p class="visually-hidden" role="status" aria-live="polite" id="a11y-live"></p>';
  }

  /* ---- wiring -------------------------------------------------------- */

  function bindToggle(id, key, label) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function () {
      if (key === 'dark') {
        var current = prefs.dark === null ? prefersDark() : prefs.dark;
        prefs.dark = !current;
      } else {
        prefs[key] = !prefs[key];
      }
      syncControls(applyTheme());
      save();
      say(label + (el.getAttribute('aria-pressed') === 'true' ? ' on' : ' off'));
    });
  }

  function init() {
    var mount = document.getElementById('a11y-mount');
    if (!mount) return;            // page opted out
    mount.innerHTML = panelHTML();

    syncControls(applyTheme());

    var slider = document.getElementById('a11y-size');
    if (slider) {
      slider.addEventListener('input', function () {
        prefs.size = parseInt(slider.value, 10) || 100;
        syncControls(applyTheme());
        save();
      });
      slider.addEventListener('change', function () {
        say('Text size ' + prefs.size + ' percent');
      });
    }

    bindToggle('a11y-dark', 'dark', 'Dark theme');
    bindToggle('a11y-contrast', 'contrast', 'High contrast');
    bindToggle('a11y-reading', 'reading', 'Spaced text');
    bindToggle('a11y-motion', 'motion', 'Reduce motion');

    var reset = document.getElementById('a11y-reset');
    if (reset) {
      reset.addEventListener('click', function () {
        prefs = Object.assign({}, defaults);
        syncControls(applyTheme());
        save();
        say('Display settings reset to defaults');
      });
    }

    // Follow the OS unless the visitor has overridden the theme themselves.
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { if (prefs.dark === null) syncControls(applyTheme()); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  load();
  applyTheme();   // paint before first render where possible

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
