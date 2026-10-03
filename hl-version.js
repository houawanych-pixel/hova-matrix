// Homelancer test beta: show the live game's version on every "Play test beta" button.
// The game page (same site) carries <meta name="hl-version" content="v1.2x">; it changes with every game update,
// so this page never needs editing. If it cannot be read, the text already in the page stays.
(() => {
  const GAME = 'https://houawanych-pixel.github.io/homelancer-digital/';
  const spots = document.querySelectorAll('[data-hl-version]');
  if (!spots.length) return;
  fetch(GAME + 'index.html?t=' + Date.now(), { cache: 'no-store' })
    .then(r => (r.ok ? r.text() : Promise.reject()))
    .then(html => {
      const m = html.match(/name="hl-version"\s+content="([^"]{1,16})"/);
      if (!m) return;
      spots.forEach(el => { el.textContent = m[1]; });
      // a fresh link per version, so phones do not show an old cached build
      document.querySelectorAll('[data-hl-play]').forEach(a => { a.href = GAME + '?v=' + encodeURIComponent(m[1]); });
    })
    .catch(() => {});
})();
