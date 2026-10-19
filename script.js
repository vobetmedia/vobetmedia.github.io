// Home page: always land at the very top on load (no restored/anchored scroll offset on mobile)
if (document.querySelector('.hero') && !location.hash) {
  try { history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
  const toTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  toTop();
  window.addEventListener('load', toTop);
  window.addEventListener('pageshow', (e) => { if (e.persisted) toTop(); });
}

// Ad attribution: remember where the visitor came from (first touch, this tab)
// so book.html can pass it to the CRM even after a training.html → book.html hop.
try {
  const params = new URLSearchParams(location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
  if (keys.some((k) => params.get(k)) && !sessionStorage.getItem('vm_attr')) {
    const attr = { landing_page: location.pathname };
    keys.forEach((k) => { if (params.get(k)) attr[k] = params.get(k).slice(0, 200); });
    sessionStorage.setItem('vm_attr', JSON.stringify(attr));
  }
} catch (e) { /* storage blocked — attribution is best effort */ }

// Mobile nav
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
if (burger && navLinks) {
  burger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => navLinks.classList.remove('open'))
  );
}

// URL fields: accept "aimax.work" without forcing the user to type "https://"
const urlInputs = [...document.querySelectorAll('input[type="url"]')];
if (urlInputs.length) {
  const hasScheme = (value) => /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
  const normalize = (input) => {
    const value = input.value.trim();
    if (value && !hasScheme(value)) input.value = 'https://' + value;
  };
  urlInputs.forEach((input) => {
    input.addEventListener('blur', () => normalize(input));
    // fix up on paste too, once the pasted text has landed
    input.addEventListener('paste', () => setTimeout(() => normalize(input), 0));
  });
  // Safety net: browsers validate on the submit button's default action, which
  // fires after "click" — normalizing on pointerdown (before that) means a field
  // that was never blurred still passes native validation.
  urlInputs.forEach((input) => {
    const form = input.closest('form');
    if (!form) return;
    form.querySelectorAll('button[type="submit"], input[type="submit"]').forEach((btn) => {
      btn.addEventListener('pointerdown', () => urlInputs.forEach(normalize));
    });
  });
}

// Page-load appear animation — values extracted from the Framer "Conversion"
// template's rendered site (its appear JSON + the Web Animations it schedules):
//   nav      : y -150px -> 0 + fade, spring(320, 60), delay 0
//   words    : every word of the hero H1 + subheading: opacity 0.001 -> 1,
//              blur 10px -> 0, y 10px -> 0, spring(400, 100) over 2.8s,
//              starting at 0.8s and staggered 50ms per word
//   kicker / buttons / trust : fade, spring(400, 100), delay 1s, 1.46s
//   glow     : fade, spring(100, 100), delay 1s, 5.26s
// Springs are sampled into keyframes and run through element.animate(),
// which is exactly how Framer plays them.
(() => {
  if (!document.documentElement.classList.contains('js')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('[data-appear]').forEach((el) => el.removeAttribute('data-appear'));
    return;
  }

  const spring = (k, c, m = 1) => {
    const w0 = Math.sqrt(k / m);
    const z = c / (2 * Math.sqrt(k * m));
    const wd = w0 * Math.sqrt(Math.abs(z * z - 1));
    if (z < 1) return (t) => 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    if (z === 1) return (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    return (t) => 1 - Math.exp(-z * w0 * t) * (Math.cosh(wd * t) + ((z * w0) / wd) * Math.sinh(wd * t));
  };

  // Sample a spring into WAAPI keyframes; `frame(p)` maps progress -> style
  const play = (el, frame, { k, c, duration, delay }) => {
    const fn = spring(k, c);
    const frames = [];
    for (let t = 0; t <= duration; t += 10) frames.push(frame(Math.min(fn(t / 1000), 1)));
    frames.push(frame(1));
    const anim = el.animate(frames, { duration, delay, fill: 'both', easing: 'linear' });
    anim.onfinish = () => { anim.commitStyles(); anim.cancel(); el.style.willChange = 'auto'; };
    return anim;
  };

  const fade = { k: 400, c: 100, duration: 1460, delay: 1000 };

  // nav drops in from above
  const nav = document.querySelector('.nav[data-appear], .vsl-header__inner[data-appear]');
  if (nav) {
    play(nav, (p) => ({ opacity: 0.001 + p * 0.999, transform: `translateY(${-150 * (1 - p)}px)` }), { k: 320, c: 60, duration: 1000, delay: 0 });
  }

  // per-word reveal on the hero headline + subheading
  const wrapWords = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
    const spans = [];
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      const text = node.nodeValue;
      if (/^\s/.test(text)) frag.appendChild(document.createTextNode(' '));
      text.split(/\s+/).filter(Boolean).forEach((word, i, arr) => {
        const s = document.createElement('span');
        s.className = 'appear-word';
        s.textContent = word;
        frag.appendChild(s);
        spans.push(s);
        if (i < arr.length - 1) frag.appendChild(document.createTextNode(' '));
      });
      if (/\s$/.test(text)) frag.appendChild(document.createTextNode(' '));
      node.parentNode.replaceChild(frag, node);
    });
    return spans;
  };
  document.querySelectorAll('[data-appear-words]').forEach((root) => {
    wrapWords(root).forEach((span, i) => {
      play(
        span,
        (p) => ({ opacity: 0.001 + p * 0.999, filter: `blur(${10 * (1 - p)}px)`, transform: `translateY(${10 * (1 - p)}px)` }),
        { k: 400, c: 100, duration: 2800, delay: 800 + i * 50 }
      );
    });
    root.removeAttribute('data-appear-words');
  });

  // simple fades: kicker, buttons, trust line
  document.querySelectorAll('[data-appear="fade"]').forEach((el) => {
    play(el, (p) => ({ opacity: 0.001 + p * 0.999 }), fade);
  });

  // glow: long, slow fade
  document.querySelectorAll('[data-appear="glow"]').forEach((el) => {
    play(el, (p) => ({ opacity: 0.001 + p * 0.999 }), { k: 100, c: 100, duration: 5260, delay: 1000 });
  });
})();


// ── Analytics events (vendor-neutral) ───────────────────────────────────────
// Pushes to window.dataLayer and forwards to gtag / fbq only if the site owner has
// installed them. No third-party tag is loaded here.
window.vobetTrack = function (name, params) {
  try {
    const payload = Object.assign({ event: name, page_path: location.pathname }, params || {});
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  } catch (e) { /* analytics must never break the page */ }
};

// Primary CTA clicks: any link to the booking page, or anything tagged data-cta.
document.addEventListener('click', (ev) => {
  const el = ev.target.closest && ev.target.closest('a[data-cta], a[href$="book.html"]');
  if (!el) return;
  window.vobetTrack('cta_click', {
    cta_id: el.getAttribute('data-cta') || 'book_link',
    cta_text: (el.textContent || '').trim().slice(0, 60),
    destination: el.getAttribute('href'),
  });
});

// Booking page visit (a visit is not a booking).
if (/\/book\.html$/.test(location.pathname)) window.vobetTrack('booking_page_view');

// Dropdown navigation: click/tap toggles, outside click or Escape closes.
document.querySelectorAll('.nav__dd').forEach((dd) => {
  const btn = dd.querySelector('.nav__dd-btn');
  btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const open = !dd.classList.contains('open');
    document.querySelectorAll('.nav__dd.open').forEach((o) => { o.classList.remove('open'); o.querySelector('.nav__dd-btn').setAttribute('aria-expanded', 'false'); });
    if (open) { dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  });
});
document.addEventListener('click', () => document.querySelectorAll('.nav__dd.open').forEach((o) => { o.classList.remove('open'); o.querySelector('.nav__dd-btn').setAttribute('aria-expanded', 'false'); }));
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') document.querySelectorAll('.nav__dd.open').forEach((o) => { o.classList.remove('open'); o.querySelector('.nav__dd-btn').setAttribute('aria-expanded', 'false'); }); });

// Form submissions (the booking quiz reports its own submit in vsl.js).
document.addEventListener('submit', (ev) => {
  const f = ev.target;
  if (f && f.id !== 'quizForm' && window.vobetTrack) window.vobetTrack('form_submit', { form_id: f.id || f.getAttribute('name') || 'form' });
});
