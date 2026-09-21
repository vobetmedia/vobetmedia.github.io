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
