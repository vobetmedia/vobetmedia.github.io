// Service detail modal
const modal = document.getElementById('serviceModal');
if (modal) {
  const panels = [...modal.querySelectorAll('.modal__panel')];

  const openModal = (service) => {
    panels.forEach((p) =>
      p.classList.toggle('active', p.dataset.servicePanel === service)
    );
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal__card').scrollTop = 0;
  };

  const closeModal = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.service-card--clickable').forEach((card) => {
    card.addEventListener('click', () => openModal(card.dataset.service));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(card.dataset.service);
      }
    });
  });

  modal.querySelectorAll('[data-close]').forEach((el) =>
    el.addEventListener('click', closeModal)
  );
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// Header: full-width bar at top → floating pill on scroll
const navWrap = document.querySelector('.nav-wrap');
if (navWrap) {
  const onScroll = () =>
    navWrap.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Mobile nav
const burger = document.getElementById('navBurger');
const navLinks = document.getElementById('navLinks');
if (burger && navLinks) {
  burger.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach((a) =>
    a.addEventListener('click', () => navLinks.classList.remove('open'))
  );
}

// Process stepper
const stepper = document.getElementById('stepper');
if (stepper) {
  const tabs = [...stepper.querySelectorAll('.stepper__tab')];
  const panels = [...stepper.querySelectorAll('.stepper__panel')];
  const progress = document.getElementById('stepperProgress');
  let current = 0;
  let timer = null;

  const animateCounters = (panel) => {
    panel.querySelectorAll('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 1200;
      if (el._raf) cancelAnimationFrame(el._raf);
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        const val = Math.round(target * eased);
        el.textContent = val.toLocaleString('en-GB') + suffix;
        if (t < 1) el._raf = requestAnimationFrame(tick);
      };
      el._raf = requestAnimationFrame(tick);
    });
  };

  const go = (i) => {
    current = i;
    tabs.forEach((t, idx) => {
      t.classList.toggle('active', idx === i);
      t.classList.toggle('done', idx < i);
    });
    panels.forEach((p, idx) => p.classList.toggle('active', idx === i));
    progress.style.width = (i / (tabs.length - 1)) * 100 + '%';
    animateCounters(panels[i]);
  };

  const startAuto = () => {
    stopAuto();
    timer = setInterval(() => go((current + 1) % tabs.length), 5000);
  };
  const stopAuto = () => { if (timer) clearInterval(timer); timer = null; };

  tabs.forEach((tab, i) =>
    tab.addEventListener('click', () => { go(i); startAuto(); })
  );

  stepper.addEventListener('mouseenter', stopAuto);
  stepper.addEventListener('mouseleave', startAuto);

  // start auto-play only once the stepper is on screen
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { startAuto(); obs.disconnect(); }
  }, { threshold: 0.3 }).observe(stepper);
}

// Reveal on scroll
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);
document.querySelectorAll('.reveal').forEach((el) => {
  // Reveal above-the-fold content immediately; observe the rest
  if (el.getBoundingClientRect().top < window.innerHeight) {
    el.classList.add('visible');
  } else {
    observer.observe(el);
  }
});
