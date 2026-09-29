// Hova Matrix landing page motion: scroll reveals, parallax layers, marquee, header state.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const header = document.querySelector('header');

  // Reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  $$('.rv, .rv-mask, [data-reveal]').forEach(el => io.observe(el));
  // Hero text reveals right away
  requestAnimationFrame(() => $$('.lx-hero .rv, .lx-hero .rv-mask').forEach(el => el.classList.add('in')));

  const hero = document.querySelector('.lx-hero');
  const heroLayer = hero?.querySelector('.layer');
  const heroCopy = hero?.querySelector('.copy');
  const track = document.querySelector('.lx-marquee .track');
  const chapters = $$('.chapter').map(c => ({ c, img: c.querySelector('.bg img'), big: c.querySelector('.big'), map: c.querySelector('.cc-map') }));
  const glows = $$('.lx-horizon .glow');

  let ticking = false;
  function frame() {
    ticking = false;
    const y = scrollY, vh = innerHeight;
    header?.classList.toggle('solid', y > vh * 0.6);
    if (reduce) return;
    if (hero && y < vh * 1.2) {
      heroLayer.style.transform = `translate3d(0,${(y * 0.35).toFixed(1)}px,0) scale(${(1.06 + y / vh * 0.08).toFixed(3)})`;
      heroCopy.style.transform = `translate3d(0,${(y * 0.18).toFixed(1)}px,0)`;
      heroCopy.style.opacity = Math.max(0, 1 - y / (vh * 0.75)).toFixed(3);
    }
    if (track) {
      const r = track.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) track.style.transform = `translate3d(${(-(y * 0.45) % (track.scrollWidth / 2)).toFixed(1)}px,0,0)`;
    }
    for (const { c, img, big, map } of chapters) {
      const r = c.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = (vh - r.top) / (vh + r.height); // 0 entering .. 1 leaving
      if (img) img.style.transform = `translate3d(0,${((p - 0.5) * -18).toFixed(2)}%,0) scale(${(1.12 - p * 0.1).toFixed(3)})`;
      if (big) big.style.transform = `translate3d(0,${((p - 0.5) * 140).toFixed(1)}px,0)`;
      if (map) {
        const mr = map.getBoundingClientRect();
        const q = Math.min(1, Math.max(0, (vh - mr.top) / (vh * 0.8)));
        map.style.transform = `perspective(1400px) rotateX(${((1 - q) * 16).toFixed(2)}deg) scale(${(0.92 + q * 0.08).toFixed(3)})`;
      }
    }
    for (const g of glows) {
      const r = g.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      g.style.transform = `translate3d(0,${((r.top / vh) * 120).toFixed(1)}px,0)`;
    }
  }
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  frame();
})();
