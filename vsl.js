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

// ── Qualifying flow + embedded calendar ────────────────
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

  // contact form → calendar
  const form = document.getElementById('quizForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    answers.name = document.getElementById('qName').value.trim();
    answers.email = document.getElementById('qEmail').value.trim();
    answers.website = document.getElementById('qSite').value.trim();
    buildCalendar();
    goTo(CAL_STEP);
  });

  // ── embedded calendar ──
  const datesEl = document.getElementById('calDates');
  const slotsEl = document.getElementById('calSlots');
  const confirmBtn = document.getElementById('calConfirm');
  const SLOT_TIMES = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];
  let picked = { date: null, time: null };
  let calBuilt = false;

  function buildCalendar() {
    if (calBuilt) return;
    calBuilt = true;
    const d = new Date();
    let added = 0;
    while (added < 10) {
      d.setDate(d.getDate() + 1);
      const day = d.getDay();
      if (day === 0 || day === 6) continue; // weekdays only
      const labelTop = d.toLocaleDateString('en-GB', { weekday: 'long' });
      const labelSub = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
      const btn = document.createElement('button');
      btn.className = 'cal__date';
      btn.innerHTML = labelTop + '<small>' + labelSub + '</small>';
      btn.dataset.label = labelTop + ' ' + labelSub;
      btn.addEventListener('click', () => pickDate(btn));
      datesEl.appendChild(btn);
      added++;
    }
  }

  function pickDate(btn) {
    datesEl.querySelectorAll('.cal__date').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    picked = { date: btn.dataset.label, time: null };
    confirmBtn.disabled = true;

    slotsEl.innerHTML = '';
    SLOT_TIMES.forEach((t) => {
      const s = document.createElement('button');
      s.className = 'cal__slot';
      s.textContent = t;
      s.addEventListener('click', () => {
        slotsEl.querySelectorAll('.cal__slot').forEach((b) => b.classList.remove('selected'));
        s.classList.add('selected');
        picked.time = t;
        confirmBtn.disabled = false;
      });
      slotsEl.appendChild(s);
    });
  }

  confirmBtn.addEventListener('click', () => {
    if (!picked.date || !picked.time) return;
    document.getElementById('successSummary').textContent =
      picked.date + ' at ' + picked.time + ' — confirmation on its way to ' + answers.email + '.';
    goTo(SUCCESS_STEP);
  });

  show(0);
})();
