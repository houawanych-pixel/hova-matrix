/* Chronicle Clash world site: parallax, scroll storytelling, panorama viewer and atlas explorer.
   Data comes from world-data.js (window.CC). No dependencies. */
(() => {
'use strict';
const D = window.CC;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => 1 - Math.pow(1 - t, 3);
const el = (tag, props = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); for (const k of kids) n.append(k); return n; };
const tier = id => D.tiers[id] || { label: 'Location', color: '#d8b25c' };
const regionById = id => D.regions[id];
const contById = id => D.continents.find(c => c.id === id);

/* ---------- reveal on scroll ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
const watchReveal = () => $$('[data-reveal]:not(.in),.cc-wipe:not(.in)').forEach(n => io.observe(n));

/* ---------- parallax layers (hero + story) ---------- */
const layers = $$('[data-speed]');
function parallax() {
  const vh = innerHeight;
  for (const n of layers) {
    const sec = n.closest('section'); const r = sec.getBoundingClientRect();
    if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) continue;
    const off = -r.top; // px scrolled into the section
    const sp = parseFloat(n.dataset.speed);
    let t = `translate3d(${n.dataset.drift ? (-off * 0.06).toFixed(1) : 0}px,${(off * sp).toFixed(1)}px,0)`;
    if (n.dataset.rotate) t += ` rotate(${(off * 0.012).toFixed(2)}deg) scale(${(1 + off / vh * 0.18).toFixed(3)})`;
    n.style.transform = t;
    if (n.dataset.fade) n.style.opacity = clamp(1 - off / (vh * 0.65), 0, 1).toFixed(3);
  }
}

/* ---------- 2. continents with sticky world map ---------- */
function buildContinents() {
  const legend = $('#tier-legend');
  for (const [id, t] of Object.entries(D.tiers)) legend.append(el('span', { style: `--c:${t.color}` }, el('i'), t.label));
  const inner = $('#world-inner');
  for (const r of Object.values(D.regions)) {
    const b = el('button', { className: 'cc-dot', title: `${r.name} · ${tier(r.tier).label}`, ariaLabel: `${r.name}, ${contById(r.continent).name}` });
    b.style.cssText = `left:${r.world[0]}%;top:${r.world[1]}%;--c:${tier(r.tier).color}`;
    b.dataset.cont = r.continent; b.addEventListener('click', () => Atlas.open({ level: 'region', id: r.id }));
    inner.append(b);
  }
  const steps = $('#continent-steps');
  D.continents.forEach((c, i) => {
    const nations = el('div', { className: 'nations' });
    c.nations.forEach(n => nations.append(el('div', { className: 'nation' }, el('span', { className: 'swatch', style: `--c:${n.color}` }), el('div', {}, el('b', {}, n.name), el('small', {}, n.traits)))));
    const chips = el('div', { className: 'chips' });
    c.regions.forEach(id => { const r = regionById(id); const b = el('button', { className: 'chip', style: `--c:${tier(r.tier).color}` }, el('i'), r.name); b.addEventListener('click', () => Atlas.open({ level: 'region', id })); chips.append(b); });
    steps.append(el('article', { className: 'cc-step' }, el('span', { className: 'num' }, `CONTINENT ${String(i + 1).padStart(2, '0')} / 06`), el('h3', {}, c.name), el('p', {}, c.note), nations, chips));
    steps.lastChild.dataset.cont = c.id;
  });
  const label = $('#world-label');
  const show = cont => {
    $$('.cc-dot', inner).forEach(d => cont === 'all' || d.dataset.cont === cont ? d.removeAttribute('data-dim') : d.setAttribute('data-dim', ''));
    if (cont === 'all') { inner.style.transform = 'none'; label.textContent = 'THE WORLD'; return; }
    const pts = Object.values(D.regions).filter(r => r.continent === cont).map(r => r.world);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    let x0 = Math.min(...xs) - 14, x1 = Math.max(...xs) + 14, y0 = Math.min(...ys) - 16, y1 = Math.max(...ys) + 16;
    const s = clamp(Math.min(100 / (x1 - x0), 100 / (y1 - y0)), 1, 2.6);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const tx = clamp(50 - cx * s, 100 - 100 * s, 0), ty = clamp(50 - cy * s, 100 - 100 * s, 0);
    inner.style.transform = `translate(${tx}%,${ty}%) scale(${s})`;
    label.textContent = contById(cont).name.toUpperCase();
  };
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    $$('.cc-step', steps).forEach(s => s.classList.toggle('active', s === e.target));
    show(e.target.dataset.cont);
  }), { rootMargin: '-45% 0px -45% 0px' });
  $$('.cc-step', steps).forEach(s => so.observe(s));
}

/* ---------- 3. zoom-through, World → Objective ---------- */
const ZCAPS = [
  ['WORLD', 'The whole world', 'Six continents and twenty-four regions. Every journey starts here.'],
  ['CONTINENT', 'Elindor', 'The eastern continent, Valcrest territory — and where the festival story begins.'],
  ['REGION', 'Mistfen', 'A travel and threat zone with its own painted overworld, usually six to eight Locations.'],
  ['LOCATION', 'Crownfen Marsh', 'A marsh village of the Mistfen region, with eight numbered Areas to enter.'],
  ['AREA', 'Crownfen Keep', 'A first-person panorama that loops all the way around — with exactly six Objectives.'],
  ['OBJECTIVE', 'Village Chief', 'The point you choose: a person to talk to, a puzzle, a clue, an enemy, or a road onward.'],
];
function zoomThrough() {
  const sec = $('#journey'); if (!sec) return () => {};
  const L = $$('.cc-zlayer', sec), cap = $('#z-cap'), crumbs = $$('#z-crumbs span'), bars = $$('#z-bar i');
  L.forEach(l => { const [fx, fy] = [l.dataset.fx, l.dataset.fy]; l.querySelector('img').style.transformOrigin = `${fx}% ${fy}%`; });
  let last = -1;
  return () => {
    const r = sec.getBoundingClientRect(); const total = r.height - innerHeight;
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = clamp(-r.top / total, 0, 1) * (L.length - 1); // 0..5
    L.forEach((l, i) => {
      const t = p - i; const img = l.firstElementChild;
      let op = 0, sc = 1;
      // each level holds still for the first third of its scroll, then dives into its focus point
      if (t >= -1 && t < 0) { const u = t + 1; op = reduce ? (u > .5 ? 1 : 0) : clamp((u - .62) / .38, 0, 1); sc = reduce ? 1 : .78 + .22 * ease(clamp((u - .6) / .4, 0, 1)); }
      else if (t >= 0 && t < 1) { const z = clamp((t - .32) / .68, 0, 1); op = i === L.length - 1 ? 1 : (reduce ? (t < .5 ? 1 : 0) : clamp(1 - (t - .62) / .38, 0, 1)); sc = reduce || i === L.length - 1 ? 1 : 1 + 2.6 * z * z; }
      else if (i === L.length - 1 && t >= 1) { op = 1; }
      l.style.opacity = op.toFixed(3); l.style.visibility = op > .001 ? 'visible' : 'hidden';
      img.style.transform = `scale(${sc.toFixed(3)})`;
    });
    const idx = clamp(Math.round(p), 0, L.length - 1);
    if (idx !== last) { last = idx; const [lvl, h, d] = ZCAPS[idx]; cap.innerHTML = ''; cap.append(el('span', { className: 'lvl' }, lvl), el('h3', {}, h), el('p', {}, d)); crumbs.forEach((c, i) => c.classList.toggle('on', i <= idx)); }
    bars.forEach((b, i) => b.style.setProperty('--p', clamp(p - i + .5, 0, 1).toFixed(3)));
  };
}

/* ---------- 4. nations ---------- */
function buildNations() {
  const g = $('#nation-grid');
  D.continents.forEach(c => c.nations.forEach(n => g.append(el('article', { className: 'cc-nation', style: `--c:${n.color}` }, el('div', { className: 'bar' }), el('small', {}, c.name), el('h3', {}, n.name), el('p', {}, n.traits)))));
  $$('.cc-nation', g).forEach((n, i) => { n.dataset.reveal = ''; n.style.transitionDelay = `${(i % 3) * 90}ms`; });
}

/* ---------- 5. panorama viewer (used on the page and in the atlas) ---------- */
function Panorama(host, railHost) {
  let area, W = 0, x = 0, vx = 0, dragging = false, lastX = 0, lastT = 0, idle = true, raf = 0, inView = false;
  const view = el('div', { className: 'pano-view', tabIndex: 0, ariaLabel: 'Panorama. Drag or use the arrow keys to look around.' });
  const track = el('div', { className: 'pano-track' });
  const hint = el('span', { className: 'pano-hint' }, '⟷ Drag to look around');
  const ui = el('div', { className: 'pano-ui' });
  const prev = el('button', { ariaLabel: 'Look left' }, '‹'), next = el('button', { ariaLabel: 'Look right' }, '›');
  ui.append(prev, next); view.append(track, hint); host.innerHTML = ''; host.append(view, ui);
  const copies = [];
  let hots = [];
  function set(a) {
    area = a; track.innerHTML = ''; copies.length = 0; hots = [];
    for (let k = 0; k < 3; k++) {
      const c = el('div', { className: 'pano-copy' }); const img = el('img', { src: a.strip, alt: k === 1 ? `${a.name} panorama` : '', draggable: false });
      if (k !== 1) img.setAttribute('aria-hidden', 'true');
      c.append(img);
      a.objectives.forEach(o => {
        const h = el('button', { className: 'hot', ariaLabel: `${o.n}. ${o.name}`, tabIndex: k === 1 ? 0 : -1 }, el('span', {}, `${o.n} · ${o.name}`));
        h.style.left = o.x + '%'; h.style.top = o.y + '%'; h.addEventListener('click', e => { e.stopPropagation(); focusObj(o.n, true); });
        c.append(h); hots.push({ h, o });
      });
      track.append(c); copies.push(c);
    }
    const img = copies[0].firstChild;
    const ready = () => { measure(); x = -W - (area.objectives[0].x / 100) * W + view.clientWidth * .35; apply(); };
    img.complete ? ready() : img.addEventListener('load', ready, { once: true });
    if (railHost) {
      railHost.innerHTML = '';
      a.objectives.forEach(o => { const b = el('button', { className: 'obj' }, el('img', { src: o.img, alt: '', loading: 'lazy' }), el('div', {}, el('b', {}, o.n), o.name)); b.addEventListener('click', () => focusObj(o.n, true)); b.dataset.n = o.n; railHost.append(b); });
    }
  }
  function measure() { const h = view.clientHeight; W = Math.round(h * area.size[0] / area.size[1]); copies.forEach(c => c.style.width = W + 'px'); }
  function wrap() { if (x > -W * .5) x -= W; if (x < -W * 1.5) x += W; }
  function apply() {
    wrap(); track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;
    const cx = view.getBoundingClientRect().left + view.clientWidth / 2; let best = null, bd = 1e9;
    for (const { h, o } of hots) { const r = h.getBoundingClientRect(); const d = Math.abs(r.left + r.width / 2 - cx); const g = clamp(1 - d / (view.clientWidth * .28), 0, 1); h.style.setProperty('--glow', g.toFixed(3)); if (d < bd) { bd = d; best = o.n; } }
    if (railHost) $$('.obj', railHost).forEach(b => b.setAttribute('aria-current', String(Number(b.dataset.n) === best && bd < view.clientWidth * .12)));
  }
  let anim = null;
  function focusObj(n, flash) {
    const o = area.objectives[n - 1]; const target = -W - (o.x / 100) * W + view.clientWidth / 2;
    let d = target - x; d -= Math.round(d / W) * W; const from = x, to = x + d, t0 = performance.now(), dur = reduce ? 0 : 700;
    idle = false; vx = 0; cancelAnimationFrame(anim);
    const step = now => { const t = dur ? clamp((now - t0) / dur, 0, 1) : 1; x = from + (to - from) * ease(t); apply(); if (t < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
    if (flash) hots.filter(h => h.o.n === n).forEach(({ h }) => h.animate?.([{ transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 700 }));
  }
  view.addEventListener('pointerdown', e => { dragging = true; idle = false; vx = 0; lastX = e.clientX; lastT = e.timeStamp; view.classList.add('drag'); cancelAnimationFrame(anim); hint.style.opacity = 0; try { view.setPointerCapture(e.pointerId); } catch (_) {} });
  view.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; const dt = Math.max(1, e.timeStamp - lastT); x += dx; vx = dx / dt * 16; lastX = e.clientX; lastT = e.timeStamp; apply(); });
  const end = () => { if (!dragging) return; dragging = false; view.classList.remove('drag'); if (!reduce) coast(); };
  view.addEventListener('pointerup', end); view.addEventListener('pointercancel', end);
  function coast() { const step = () => { vx *= .94; x += vx; apply(); if (Math.abs(vx) > .2 && !dragging) anim = requestAnimationFrame(step); }; anim = requestAnimationFrame(step); }
  view.addEventListener('wheel', e => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); idle = false; x -= e.deltaX; apply(); } }, { passive: false });
  view.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); idle = false; nudge(e.key === 'ArrowLeft' ? 1 : -1); } });
  function nudge(dir) { const from = x, to = x + dir * view.clientWidth * .5, t0 = performance.now(); cancelAnimationFrame(anim); const step = now => { const t = reduce ? 1 : clamp((now - t0) / 450, 0, 1); x = from + (to - from) * ease(t); apply(); if (t < 1) anim = requestAnimationFrame(step); }; anim = requestAnimationFrame(step); }
  prev.addEventListener('click', () => { idle = false; nudge(1); }); next.addEventListener('click', () => { idle = false; nudge(-1); });
  new IntersectionObserver(es => { inView = es[0].isIntersecting; }).observe(view);
  addEventListener('resize', () => { if (!area) return; const f = (-x - W) / W; measure(); x = -W - f * W; apply(); });
  // slow drift until the viewer is touched
  const drift = () => { if (idle && inView && !reduce && area && W) { x -= .25; apply(); } raf = requestAnimationFrame(drift); };
  raf = requestAnimationFrame(drift);
  return { set, focusObj, apply };
}
function buildArea() {
  const tabs = $('#area-tabs'); const p = Panorama($('#pano-main'), $('#objectives'));
  D.areas.forEach((a, i) => { const b = el('button', { ariaPressed: String(i === 0) }, `${a.n} · ${a.name}`); b.addEventListener('click', () => { $$('button', tabs).forEach(t => t.setAttribute('aria-pressed', String(t === b))); p.set(a); }); tabs.append(b); });
  p.set(D.areas[0]);
}

/* ---------- 6. gallery of continents and regions ---------- */
function buildGallery() {
  const g = $('#gallery');
  D.continents.forEach(c => {
    const grid = el('div', { className: 'cc-grid' });
    const cm = D.continentMaps[c.id];
    if (cm) { const b = el('button', { className: 'cc-card wide' }, el('img', { src: cm.sm, alt: `${c.name} continent map`, loading: 'lazy' }), el('span', { className: 'tag' }, 'Continent map'), el('span', { className: 'cap' }, el('b', {}, c.name), el('small', {}, 'Open the continent map'))); b.addEventListener('click', () => Atlas.open({ level: 'continent', id: c.id })); grid.append(b); }
    c.regions.forEach(id => {
      const r = regionById(id); const t = tier(r.tier); const deep = r.locations.some(l => l.map);
      const b = el('button', { className: 'cc-card' }, el('img', { src: r.sm, alt: `${r.name} region map`, loading: 'lazy' }), deep ? el('span', { className: 'tag' }, 'Explorable') : '', el('span', { className: 'cap' }, el('b', {}, r.name), el('small', { style: `--c:${t.color}` }, el('i'), `${t.label} threat`)));
      b.addEventListener('click', () => Atlas.open({ level: 'region', id })); grid.append(b);
    });
    const sec = el('div', { className: 'cc-cont' }, el('h3', {}, c.name, el('small', {}, `${c.regions.length} region${c.regions.length > 1 ? 's' : ''} · ${c.nations.map(n => n.name).join(' · ')}`)), grid);
    sec.dataset.reveal = ''; g.append(sec);
  });
  $$('[data-atlas]').forEach(b => b.addEventListener('click', () => Atlas.open({ level: 'world' })));
}

/* ---------- Atlas: World → Continent → Region → Location → Area ---------- */
const ELINDOR_POINTS = [['mistfen', 21.8, 28.6], ['highmere', 49.6, 27.9], ['larkhollow', 33.9, 48.6], ['sunreach', 72.2, 81.6]];
const Atlas = (() => {
  const dlg = $('#atlas-dialog'); if (!dlg) return { open() {} };
  const stage = $('#atlas-stage'), map = $('#atlas-map'), img = $('#atlas-img'), crumbs = $('#atlas-crumbs');
  const side = $('#atlas-side'), list = $('#atlas-list'), listBtn = $('#atlas-list-btn'), toast = $('#atlas-toast'), panoBox = $('#atlas-pano');
  let cur = null, s = 1, tx = 0, ty = 0, iw = 1, ih = 1, markers = [], pano = null;
  const pointers = new Map(); let pinch = null, drag = null;
  const view = () => ({ w: stage.clientWidth, h: stage.clientHeight });
  function applyT() { map.style.transform = `translate(${tx}px,${ty}px) scale(${s})`; map.style.setProperty('--inv', (1 / s).toFixed(4)); glow(); }
  function fit() { const { w, h } = view(); s = Math.min(w / iw, (h - 70) / ih) * .96; tx = (w - iw * s) / 2; ty = 60 + (h - 60 - ih * s) / 2; applyT(); }
  function limit() { const { w, h } = view(); const minS = Math.min(w / iw, h / ih) * .5; s = clamp(s, minS, 6); tx = clamp(tx, w * .5 - iw * s, w * .5); ty = clamp(ty, h * .5 - ih * s, h * .5); }
  function zoomAt(f, cx, cy) { const ns = clamp(s * f, .05, 6); tx = cx - (cx - tx) * ns / s; ty = cy - (cy - ty) * ns / s; s = ns; limit(); applyT(); }
  let tst; function say(t) { toast.textContent = t; toast.classList.add('show'); clearTimeout(tst); tst = setTimeout(() => toast.classList.remove('show'), 2200); }
  stage.addEventListener('wheel', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('.ring')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { stage.setPointerCapture(e.pointerId); } catch (_) {}
    if (pointers.size === 1) { drag = { x: e.clientX, y: e.clientY, tx, ty }; stage.classList.add('drag'); }
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s }; drag = null; }
  });
  stage.addEventListener('pointermove', e => {
    lastPtr = { x: e.clientX, y: e.clientY };
    if (!pointers.has(e.pointerId)) { glow(); return; }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = stage.getBoundingClientRect(); zoomAt((pinch.s * d / pinch.d) / s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); }
    else if (drag) { tx = drag.tx + e.clientX - drag.x; ty = drag.ty + e.clientY - drag.y; limit(); applyT(); }
  });
  const up = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; if (!pointers.size) { drag = null; stage.classList.remove('drag'); } };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  $('#zoom-in').onclick = () => { const { w, h } = view(); zoomAt(1.4, w / 2, h / 2); };
  $('#zoom-out').onclick = () => { const { w, h } = view(); zoomAt(1 / 1.4, w / 2, h / 2); };
  $('#zoom-fit').onclick = fit;
  $('#atlas-close').onclick = () => dlg.close();
  dlg.addEventListener('close', () => { if (location.hash.startsWith('#atlas')) history.replaceState(null, '', location.pathname); document.body.style.overflow = ''; });
  listBtn.onclick = () => { const o = side.classList.toggle('open'); listBtn.setAttribute('aria-expanded', String(o)); };
  addEventListener('resize', () => dlg.open && cur && cur.level !== 'area' && fit());
  // proximity glow (desktop pointer); touch devices rely on the always-visible rings + list
  let lastPtr = null, gq = 0;
  function glow() { if (gq) return; gq = requestAnimationFrame(() => { gq = 0; for (const m of markers) { if (!lastPtr) { m.style.setProperty('--glow', 0); continue; } const r = m.firstChild.getBoundingClientRect(); const d = Math.hypot(r.left + r.width / 2 - lastPtr.x, r.top + r.height / 2 - lastPtr.y); m.style.setProperty('--glow', clamp(1 - d / 90, 0, 1).toFixed(3)); } }); }

  function nodes(st) {
    // returns {title, sub, src, size, points:[{n,label,x,y,fill,bare,go,soon}], crumbs:[...]}
    const world = { label: 'World', go: { level: 'world' } };
    if (st.level === 'world') return { title: 'The World', sub: '24 regions across six continents. Colour shows threat.', src: D.world.img, size: D.world.size, crumbs: [world],
      points: Object.values(D.regions).map(r => ({ label: r.name, x: r.world[0], y: r.world[1], fill: tier(r.tier).color, info: `${contById(r.continent).name} · ${tier(r.tier).label}`, go: { level: 'region', id: r.id } })) };
    if (st.level === 'continent') { const c = contById(st.id); const m = D.continentMaps[st.id];
      return { title: c.name, sub: c.note, src: m.img, size: m.size, crumbs: [world, { label: c.name, go: st }],
        points: ELINDOR_POINTS.map(([id, x, y]) => ({ label: D.regions[id].name, x, y, fill: tier(D.regions[id].tier).color, info: tier(D.regions[id].tier).label + ' threat', go: { level: 'region', id } })) }; }
    if (st.level === 'region') { const r = D.regions[st.id]; const c = contById(r.continent);
      const cc = D.continentMaps[c.id] ? { label: c.name, go: { level: 'continent', id: c.id } } : { label: c.name, go: { level: 'world' } };
      const pts = r.locations.map(l => ({ n: l.n, label: l.name, x: l.x, y: l.y, bare: true, soon: !l.map, info: l.map ? 'Location map' : 'Coming soon', go: l.map ? { level: 'location', id: l.map } : null }));
      if (r.id === 'mistfen') pts.push({ label: 'Crownfen Marsh', x: null, y: null, info: 'Marsh village · panoramas', go: { level: 'location', id: 'crownfen-marsh' } });
      return { title: r.name, sub: `${c.name} · ${tier(r.tier).label} threat${r.code ? ' · ' + r.code : ''}${pts.length ? '' : ' · locations are mapped in the art; interactive points are coming soon.'}`, src: r.img, size: r.size, crumbs: [world, cc, { label: r.name, go: st }], points: pts }; }
    if (st.level === 'location') { const l = D.locations[st.id]; const r = l.region && D.regions[l.region]; const c = contById(r ? r.continent : l.continent);
      const cr = [world, D.continentMaps[c.id] ? { label: c.name, go: { level: 'continent', id: c.id } } : { label: c.name, go: { level: 'world' } }];
      if (r) cr.push({ label: r.name, go: { level: 'region', id: r.id } }); cr.push({ label: l.name, go: st });
      const pts = (l.areas || []).map(a => { const ar = D.areas.find(x => x.n === a.n && x.location === l.id); return { n: a.n, label: ar ? ar.name : `Area ${a.n}`, x: a.x, y: a.y, bare: true, soon: !ar, info: ar ? 'Panorama' : 'Coming soon', go: ar ? { level: 'area', id: ar.id } : null }; });
      return { title: l.name, sub: l.note || `${r ? r.name + ' · ' : ''}Location ${l.n ?? ''} · eight Areas`, src: l.img, size: l.size, crumbs: cr, points: pts }; }
    if (st.level === 'area') { const a = D.areas.find(x => x.id === st.id); const l = D.locations[a.location]; const r = D.regions[l.region]; const c = contById(r.continent);
      return { title: a.name, sub: `Crownfen Marsh · Area ${a.n} · six Objectives`, crumbs: [world, { label: c.name, go: { level: 'continent', id: c.id } }, { label: r.name, go: { level: 'region', id: r.id } }, { label: l.name, go: { level: 'location', id: l.id } }, { label: a.name, go: st }], area: a, points: a.objectives.map(o => ({ n: o.n, label: o.name, go: { focus: o.n } })) }; }
  }
  function render(st, fromPoint) {
    const N = nodes(st); cur = st;
    history.replaceState(null, '', `#atlas=${st.level}${st.id ? ':' + st.id : ''}`);
    crumbs.innerHTML = '';
    N.crumbs.forEach((c, i) => { if (i) crumbs.append(el('i', {}, '›')); const b = el('button', {}, c.label); if (i === N.crumbs.length - 1) b.setAttribute('aria-current', 'page'); else b.onclick = () => go(c.go); crumbs.append(b); });
    $('#side-title').textContent = N.title; $('#side-sub').textContent = N.sub;
    list.innerHTML = '';
    const rows = [...N.points].sort((a, b) => (a.n ?? 99) - (b.n ?? 99) || a.label.localeCompare(b.label));
    rows.forEach(p => { const b = el('button', { style: p.fill ? `--fill:${p.fill}` : '' }, el('b', {}, p.n ?? ''), p.label, el('small', {}, p.info || '')); b.onclick = () => p.go ? (p.go.focus ? pano.focusObj(p.go.focus, true) : go(p.go, p)) : say(`${p.label} — coming soon`); list.append(b); });
    if (!rows.length) list.append(el('p', { className: 'atlas-empty' }, 'The numbered places are painted on the map. Clickable points for this map are coming soon; zoom in to read it.'));
    listBtn.hidden = false;
    if (N.area) {
      panoBox.hidden = false; stage.hidden = true; $('.atlas-bottom').hidden = true;
      panoBox.innerHTML = ''; const ph = el('div', { className: 'pano' }), rail = el('div', { className: 'objectives' });
      panoBox.append(el('div', { className: 'cc-head' }, el('span', { className: 'eyebrow' }, N.sub), el('h2', { style: 'font-size:clamp(28px,4vw,48px)' }, N.title)), el('div', { style: 'height:14px' }), ph, rail);
      pano = Panorama(ph, rail); pano.set(N.area); markers = []; return;
    }
    panoBox.hidden = true; stage.hidden = false; $('.atlas-bottom').hidden = false;
    map.classList.add('fade'); map.style.opacity = 0;
    const im = new Image(); im.src = N.src;
    const done = () => {
      img.src = N.src; img.alt = N.title; iw = N.size[0]; ih = N.size[1]; img.width = iw; img.height = ih;
      $$('.mk', map).forEach(m => m.remove()); markers = [];
      N.points.filter(p => p.x != null).forEach(p => {
        const m = el('div', { className: 'mk' + (p.bare ? ' bare' : '') + (p.soon ? ' soon' : '') });
        m.style.left = (p.x / 100 * iw) + 'px'; m.style.top = (p.y / 100 * ih) + 'px';
        const ring = el('button', { className: 'ring', ariaLabel: `${p.n ? p.n + '. ' : ''}${p.label}${p.soon ? ' (coming soon)' : ''}` }, el('b', {}, p.n ?? ''));
        if (p.fill) m.style.setProperty('--fill', p.fill);
        ring.addEventListener('click', e => { e.stopPropagation(); p.go ? go(p.go, p) : say(`${p.label} — coming soon`); });
        m.append(ring);
        if (!p.bare) m.append(el('span', { className: 'lbl' }, p.label));
        map.append(m); markers.push(m);
      });
      fit(); map.style.opacity = 1;
    };
    im.decode ? im.decode().then(done, done) : (im.onload = done);
  }
  function go(st, fromPoint) {
    if (st.level !== 'area' && fromPoint && fromPoint.x != null && !reduce && !stage.hidden) {
      // quick eased zoom toward the chosen marker, then swap maps
      const { w, h } = view(); const px = fromPoint.x / 100 * iw * s + tx, py = fromPoint.y / 100 * ih * s + ty;
      const s0 = s, tx0 = tx, ty0 = ty, t0 = performance.now();
      const step = now => { const t = clamp((now - t0) / 380, 0, 1), k = 1 + 1.6 * ease(t); s = s0 * k; tx = w / 2 - (px - tx0) * k - (w / 2 - px) * (1 - ease(t)); ty = h / 2 - (py - ty0) * k - (h / 2 - py) * (1 - ease(t)); applyT(); if (t < 1) requestAnimationFrame(step); else render(st, fromPoint); };
      requestAnimationFrame(step);
    } else render(st, fromPoint);
  }
  function open(st) { if (!dlg.open) { dlg.showModal(); document.body.style.overflow = 'hidden'; } side.classList.toggle('open', innerWidth > 900); listBtn.setAttribute('aria-expanded', String(side.classList.contains('open'))); render(st); }
  return { open, go };
})();
function fromHash() {
  const m = location.hash.match(/^#atlas=(\w+)(?::([\w-]+))?/); if (!m) return;
  const [_, level, id] = m; const ok = level === 'world' || (level === 'region' && D.regions[id]) || (level === 'continent' && D.continentMaps[id]) || (level === 'location' && D.locations[id]) || (level === 'area' && D.areas.find(a => a.id === id));
  if (ok) Atlas.open({ level, id });
}

/* ---------- boot ---------- */
buildContinents(); buildNations(); buildArea(); buildGallery(); watchReveal();
const zt = zoomThrough();
let ticking = false;
const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; if (!reduce) parallax(); zt(); }); };
addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
fromHash(); addEventListener('hashchange', fromHash);
})();
