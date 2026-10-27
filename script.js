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

// Page-load fade/blur animation removed: content shows immediately.

// Home page intake card: remember the ticked services, then hand off to the booking flow
// (book.html), which sends them to the CRM with the rest of the lead.
const intakeForm = document.getElementById('intakeForm');
if (intakeForm) {
  intakeForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const services = [...intakeForm.querySelectorAll('input[name="services"]:checked')].map((i) => i.value);
    try { sessionStorage.setItem('vm_services', JSON.stringify(services)); } catch (e) { /* best effort */ }
    location.href = 'book.html';
  });
}

// Header: transparent over the hero, solid once the page scrolls (npdigital.com style)
const navWrap = document.querySelector('.nav-wrap');
if (navWrap) {
  const onScroll = () => navWrap.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}
