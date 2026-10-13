// ── VSL player simulation ──────────────────────────────
// Replace the whole .vsl-player block in vsl.html with a real
// Wistia/Vimeo/YouTube embed when you have your recorded VSL.
(() => {
  const poster = document.getElementById('vslPoster');
  const playBtn = document.getElementById('vslPlay');
  const toggle = document.getElementById('vslToggle');
  const progress = document.getElementById('vslProgress');
  const timeEl = document.getElementById('vslTime');
  const slides = [...document.querySelectorAll('.vsl-slide')];
  if (!poster || !slides.length) return;

  const TOTAL = 724; // 12:04
  const SLIDE_SECS = 8;
  let elapsed = 0;
  let timer = null;

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  };

  const render = () => {
    if (progress) progress.style.width = (elapsed / TOTAL) * 100 + '%';
    if (timeEl) timeEl.textContent = fmt(elapsed) + ' / ' + fmt(TOTAL);
    const idx = Math.floor(elapsed / SLIDE_SECS) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('active', i === idx));
  };

  const play = () => {
    poster.classList.add('hidden');
    if (toggle) toggle.textContent = '❚❚';
    if (timer) return;
    timer = setInterval(() => {
      elapsed = (elapsed + 0.25) % TOTAL;
      render();
    }, 250);
    render();
  };

  const pause = () => {
    clearInterval(timer);
    timer = null;
    if (toggle) toggle.textContent = '▶';
  };

  playBtn.addEventListener('click', play);
  playBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); }
  });
  if (toggle) toggle.addEventListener('click', () => (timer ? pause() : play()));
})();

// ── Qualifying flow → CRM lead → Cal.com calendar ─────
(() => {
  const quiz = document.getElementById('quiz');
  if (!quiz) return;

  const steps = [...quiz.querySelectorAll('.quiz__step')];
  const bar = document.getElementById('quizBar');
  const label = document.getElementById('quizLabel');
  const backBtn = document.getElementById('quizBack');
  const answers = {};
  const history = [];
  let current = 0;

  const QUESTION_STEPS = 5; // steps 0-4 are questions/contact
  const CAL_STEP = 5, SUCCESS_STEP = 6, DQ_STEP = 7;

  const show = (i) => {
    steps.forEach((s, idx) => s.classList.toggle('active', idx === i));
    quiz.classList.toggle('quiz--wide', i === CAL_STEP);
    current = i;

    if (i <= QUESTION_STEPS - 1) {
      bar.style.width = ((i + 1) / (QUESTION_STEPS + 1)) * 100 + '%';
      label.textContent = 'Step ' + (i + 1) + ' of ' + QUESTION_STEPS;
    } else if (i === CAL_STEP) {
      bar.style.width = (QUESTION_STEPS / (QUESTION_STEPS + 1)) * 100 + '%';
      label.textContent = 'Final step — pick your time';
    } else {
      bar.style.width = '100%';
      label.textContent = i === SUCCESS_STEP ? 'All done!' : 'Quick check';
    }

    backBtn.hidden = !(i >= 1 && i !== SUCCESS_STEP);
    quiz.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const goTo = (i) => {
    history.push(current);
    show(i);
  };

  backBtn.addEventListener('click', () => {
    if (history.length) show(history.pop());
  });

  // answer buttons
  quiz.querySelectorAll('.quiz__option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const stepEl = btn.closest('.quiz__step');
      const q = stepEl.querySelector('h3').textContent;
      answers[q] = btn.dataset.value;
      if (btn.dataset.disqualify) {
        goTo(DQ_STEP);
      } else {
        goTo(steps.indexOf(stepEl) + 1);
      }
    });
  });

  // contact form → CRM lead → Cal.com calendar
  const LEAD_URL = 'https://ejldizwnwlqobppycirk.supabase.co/functions/v1/lead-intake/website';
  const LEAD_KEY = 'pk_f8553d026a6acb6151db355f'; // publishable: only accepted from vobetmedia.com
  const CAL_LINK = 'vobetmedia/strategycall';
  const META_SOURCES = ['facebook', 'fb', 'instagram', 'ig', 'meta', 'an', 'msg'];

  const attribution = () => {
    try { return JSON.parse(sessionStorage.getItem('vm_attr') || '{}') || {}; } catch (e) { return {}; }
  };

  const sendLead = (attr) => {
    const quizAnswers = {};
    Object.keys(answers).forEach((k) => {
      if (!['name', 'email', 'website'].includes(k)) quizAnswers[k] = answers[k];
    });
    const body = Object.assign({}, attr, quizAnswers, {
      name: answers.name,
      email: answers.email,
      website: answers.website,
      form_name: 'Website quiz',
      page_url: location.href,
    });
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = ctrl && setTimeout(() => ctrl.abort(), 4000);
    return fetch(LEAD_URL + '?key=' + LEAD_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then((r) => r.json())
      .then((res) => (res && res.results && res.results[0] && res.results[0].lead_id) || '')
      .catch(() => '')
      .finally(() => timer && clearTimeout(timer));
  };

  const form = document.getElementById('quizForm');
  const submitBtn = form.querySelector('button[type="submit"]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    answers.name = document.getElementById('qName').value.trim();
    answers.email = document.getElementById('qEmail').value.trim();
    answers.website = document.getElementById('qSite').value.trim();
    const attr = attribution();
    const fromMeta = !!attr.fbclid || META_SOURCES.includes(String(attr.utm_source || '').toLowerCase());
    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = 'One moment…';
    sendLead(attr).then((leadId) => {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
      loadCalendar(leadId, fromMeta ? 'meta_ads' : 'website');
      goTo(CAL_STEP);
    });
  });

  // ── Cal.com inline embed (cal.com/vobetmedia/strategycall) ──
  let calLoaded = false;
  function loadCalendar(leadId, source) {
    if (calLoaded) return;
    calLoaded = true;
    (function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
    Cal("init", "strategycall", { origin: "https://app.cal.com" });

    const embed = document.getElementById('calEmbed');
    embed.innerHTML = '';
    const config = { layout: 'month_view', theme: 'dark', name: answers.name, email: answers.email, 'metadata[source]': source };
    if (leadId) config['metadata[leadId]'] = leadId;
    Cal.ns.strategycall("inline", { elementOrSelector: "#calEmbed", config: config, calLink: CAL_LINK });
    Cal.ns.strategycall("ui", { theme: 'dark', hideEventTypeDetails: false, layout: "month_view" });
    Cal.ns.strategycall("on", {
      action: "bookingSuccessfulV2",
      callback: (e) => {
        const data = (e && e.detail && e.detail.data) || {};
        const start = data.startTime ? new Date(data.startTime) : null;
        document.getElementById('successSummary').textContent = (start
          ? start.toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) + ' — '
          : '') + 'confirmation on its way to ' + answers.email + '.';
        goTo(SUCCESS_STEP);
      },
    });
  }

  show(0);
})();
