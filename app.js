// ---------- Date & greeting ----------
const today = new Date();
const todayKey = today.toISOString().slice(0, 10);

function dateKey(offsetDays) {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

document.getElementById('dateLine').textContent = today.toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric'
});

const hour = today.getHours();
const greeting = hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
document.getElementById('greeting').textContent = greeting;

// ---------- Storage helpers ----------
function loadDay(key, fallback, forKey = todayKey) {
  try {
    const raw = localStorage.getItem(`anchor:${forKey}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveDay(key, value, forKey = todayKey) {
  localStorage.setItem(`anchor:${forKey}:${key}`, JSON.stringify(value));
}

// ---------- Settings ----------
const DEFAULT_SETTINGS = {
  sparkCategories: [],
  sparkContent: { design: true, quote: true },
  quoteSources: ['bible', 'stoic', 'affirmations'],
  moodCheckin: true,
  promptChips: true,
  top3CarryOver: true,
  top3ProgressStyle: 'ring',
  showTemp: true,
  tempUnit: 'F'
};

function loadSettings() {
  try {
    const raw = localStorage.getItem('anchor:settings');
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
function saveSettings(settings) {
  localStorage.setItem('anchor:settings', JSON.stringify(settings));
}

let settings = loadSettings();

// ---------- View navigation (swipe between Today and Settings) ----------
const swipeTrack = document.getElementById('swipeTrack');
const pageDots = document.getElementById('pageDots').children;
let onSettings = false;

function goToSettings() {
  onSettings = true;
  swipeTrack.classList.add('on-settings');
  pageDots[0].classList.remove('active');
  pageDots[1].classList.add('active');
}
function goToToday() {
  onSettings = false;
  swipeTrack.classList.remove('on-settings');
  pageDots[1].classList.remove('active');
  pageDots[0].classList.add('active');
  renderSpark();
  renderTasks();
}
document.getElementById('backBtn').addEventListener('click', goToToday);

let touchStartX = null;
let touchStartY = null;
document.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (touchStartX === null) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  touchStartX = null;
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
  if (dx < 0 && !onSettings) goToSettings();
  else if (dx > 0 && onSettings) goToToday();
});

// ---------- Mood check-in ----------
const MOODS = [
  { emoji: '🙏', label: 'Grateful' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😔', label: 'Heavy' },
  { emoji: '💪', label: 'Determined' },
  { emoji: '😴', label: 'Tired' }
];
const moodRow = document.getElementById('moodRow');

function renderMoodRow() {
  moodRow.innerHTML = '';
  moodRow.hidden = !settings.moodCheckin;
  if (!settings.moodCheckin) return;
  const selected = loadDay('mood', null);
  MOODS.forEach((m) => {
    const btn = document.createElement('button');
    btn.className = 'mood-btn' + (selected === m.label ? ' selected' : '');
    btn.textContent = m.emoji;
    btn.setAttribute('aria-label', m.label);
    btn.addEventListener('click', () => {
      saveDay('mood', selected === m.label ? null : m.label);
      renderMoodRow();
    });
    moodRow.appendChild(btn);
  });
}

// ---------- Prompt chips ----------
const PROMPT_STARTERS = [
  'Grateful for…', 'Today I want to focus on…', 'Letting go of…',
  'Praying for…', 'Worried about…', 'Hoping for…'
];
const promptRow = document.getElementById('promptRow');
const prayerInput = document.getElementById('prayerInput');

function renderPromptRow() {
  promptRow.innerHTML = '';
  promptRow.hidden = !settings.promptChips;
  if (!settings.promptChips) return;
  PROMPT_STARTERS.forEach((text) => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      prayerInput.value = prayerInput.value ? `${prayerInput.value}\n${text} ` : `${text} `;
      prayerInput.focus();
      prayerInput.dispatchEvent(new Event('input'));
    });
    promptRow.appendChild(chip);
  });
}

// ---------- Prayer / reflection ----------
const prayerSaveState = document.getElementById('prayerSaveState');
prayerInput.value = loadDay('prayer', '');

let prayerTimer;
prayerInput.addEventListener('input', () => {
  clearTimeout(prayerTimer);
  prayerSaveState.textContent = 'Saving…';
  prayerTimer = setTimeout(() => {
    saveDay('prayer', prayerInput.value);
    prayerSaveState.textContent = 'Saved';
    setTimeout(() => { prayerSaveState.textContent = ' '; }, 1200);
  }, 500);
});

// ---------- Top 3 tasks ----------
const taskList = document.getElementById('taskList');
const carryOverBtn = document.getElementById('carryOverBtn');
const progressRing = document.getElementById('progressRing');
const streakStrip = document.getElementById('streakStrip');

function emptyTasks() {
  return [{ text: '', done: false }, { text: '', done: false }, { text: '', done: false }];
}
let tasks = loadDay('tasks', emptyTasks());

function dayCompletion(key) {
  const t = loadDay('tasks', null, key);
  if (!t) return null;
  const filled = t.filter((x) => x.text.trim());
  if (!filled.length) return null;
  return filled.every((x) => x.done);
}

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach((task, i) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');

    const check = document.createElement('button');
    check.className = 'task-check' + (task.done ? ' checked' : '');
    check.setAttribute('aria-label', 'Mark done');
    check.textContent = task.done ? '✓' : '';
    check.addEventListener('click', () => {
      tasks[i].done = !tasks[i].done;
      saveDay('tasks', tasks);
      renderTasks();
    });

    const input = document.createElement('input');
    input.className = 'task-input';
    input.type = 'text';
    input.placeholder = `Thing #${i + 1}`;
    input.value = task.text;
    input.addEventListener('input', () => {
      tasks[i].text = input.value;
      saveDay('tasks', tasks);
      renderProgress();
    });

    li.appendChild(check);
    li.appendChild(input);
    taskList.appendChild(li);
  });

  const hasContent = tasks.some((t) => t.text.trim());
  const yesterdayFilled = loadDay('tasks', null, dateKey(-1))?.some((t) => t.text.trim());
  carryOverBtn.hidden = !(settings.top3CarryOver && !hasContent && yesterdayFilled);

  renderProgress();
}

carryOverBtn.addEventListener('click', () => {
  const yesterday = loadDay('tasks', null, dateKey(-1));
  if (!yesterday) return;
  tasks = yesterday.map((t) => ({ text: t.text, done: false }));
  saveDay('tasks', tasks);
  renderTasks();
});

function renderProgress() {
  const filled = tasks.filter((t) => t.text.trim());
  const done = filled.filter((t) => t.done).length;
  const pct = filled.length ? Math.round((done / filled.length) * 100) : 0;

  progressRing.hidden = settings.top3ProgressStyle !== 'ring';
  streakStrip.hidden = settings.top3ProgressStyle !== 'streak';

  if (settings.top3ProgressStyle === 'ring') {
    progressRing.style.setProperty('--pct', pct);
    progressRing.setAttribute('data-label', `${done}/${filled.length || 3}`);
  } else {
    streakStrip.innerHTML = '';
    for (let i = -6; i <= 0; i++) {
      const dot = document.createElement('div');
      const complete = dayCompletion(dateKey(i));
      dot.className = 'streak-dot' + (complete ? ' filled' : '');
      streakStrip.appendChild(dot);
    }
  }
}

// ---------- Weather (compact, in header) ----------
const dateLine = document.getElementById('dateLine');
const baseDateText = dateLine.textContent;

function renderHeaderTemp(temp) {
  if (!settings.showTemp || temp == null) {
    dateLine.textContent = baseDateText;
    return;
  }
  dateLine.textContent = `${baseDateText} · ${Math.round(temp)}°${settings.tempUnit}`;
}

async function fetchWeather(lat, lon) {
  try {
    const unit = settings.tempUnit === 'C' ? 'celsius' : 'fahrenheit';
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m&temperature_unit=${unit}`);
    const data = await res.json();
    const temp = data.current.temperature_2m;
    localStorage.setItem('anchor:lastWeather', JSON.stringify({ lat, lon, temp, ts: Date.now() }));
    renderHeaderTemp(temp);
  } catch {
    // silently skip — temperature is a nice-to-have, not core
  }
}

function initWeather() {
  if (!settings.showTemp) { renderHeaderTemp(null); return; }
  const cached = JSON.parse(localStorage.getItem('anchor:lastWeather') || 'null');
  if (cached && Date.now() - cached.ts < 1000 * 60 * 60) {
    renderHeaderTemp(cached.temp);
    fetchWeather(cached.lat, cached.lon);
    return;
  }
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
    () => {}
  );
}

// ---------- Today's Spark ----------
const SPARKS = [
  { category: 'Product Design', title: 'Dieter Rams’ ten principles are still the sharpest brief you’ll ever get.', blurb: 'Good design is as little design as possible — worth rereading once a year.', source: 'vitsoe.com', url: 'https://www.vitsoe.com/us/about/good-design' },
  { category: 'Architecture', title: 'Kengo Kuma builds with materials that age instead of decay.', blurb: 'Wood, paper, and stone that get more beautiful with wear — the opposite of planned obsolescence.', source: 'kkaa.co.jp', url: 'https://kkaa.co.jp/en/' },
  { category: 'Typography', title: 'Optical sizing exists because letters lie at different scales.', blurb: 'A typeface cut for 96pt display and one cut for 9pt caption are not the same shape, just scaled.', source: 'fonts.google.com', url: 'https://fonts.google.com/knowledge/glossary/optical_size' },
  { category: 'Fashion', title: 'Issey Miyake treated fabric folding as a manufacturing process, not a finish.', blurb: 'Pleats Please turned a technique into an entire design language.', source: 'isseymiyake.com', url: 'https://www.isseymiyake.com/en/brands/pleats_please' },
  { category: 'Furniture', title: 'The Anglepoise lamp is a four-bar linkage wearing a shade.', blurb: 'Pure mechanical logic, styled just enough to live on a desk.', source: 'anglepoise.com', url: 'https://www.anglepoise.com/pages/our-story' },
  { category: 'UX', title: 'Don Norman’s door handles are still the best onboarding lesson in the field.', blurb: 'If people push a pull door, the door is wrong, not the people.', source: 'jnd.org', url: 'https://jnd.org/' },
  { category: 'Graphic Design', title: 'Massimo Vignelli designed the NYC subway map to be argued about forever.', blurb: 'Diagrammatic clarity over geographic accuracy — still divides opinion decades later.', source: 'vignelli.com', url: 'http://www.vignelli.com/' },
  { category: 'AI Art', title: 'Refik Anadol turns data centers into material for public sculpture.', blurb: 'Machine-learning latent space as a medium, not just a tool — trained on real archives.', source: 'refikanadol.com', url: 'https://refikanadol.com/' },
  { category: 'Architecture', title: 'Lina Bo Bardi designed for how a building gets used, not how it photographs.', blurb: 'SESC Pompeia is rough concrete that people actually love inhabiting.', source: 'archdaily.com', url: 'https://www.archdaily.com/tag/lina-bo-bardi' },
  { category: 'Product Design', title: 'The Rams-Jony Ive throughline is a straight line, not a coincidence.', blurb: 'Trace the calculator to the iPod and the argument makes itself.', source: 'core77.com', url: 'https://www.core77.com/' },
  { category: 'Typography', title: 'Swiss grid systems are just a way to make 100 decisions in advance.', blurb: 'Josef Müller-Brockmann’s grid isn’t a constraint, it’s a delegation of taste to a system.', source: 'design.google', url: 'https://design.google/' },
  { category: 'Furniture', title: 'The Eames molded plywood chair started as a leg splint for WWII.', blurb: 'Sometimes the most iconic form comes from the least glamorous brief.', source: 'eamesoffice.com', url: 'https://www.eamesoffice.com/' },
  { category: 'Graphic Design', title: 'Paula Scher repainted a whole identity system with hand lettering — for Citibank.', blurb: 'Proof that a "safe" client can still greenlight something bold if the logic holds.', source: 'pentagram.com', url: 'https://www.pentagram.com/about/paula-scher' }
];

const QUOTES = {
  bible: [
    { text: 'Be still, and know that I am God.', ref: 'Psalm 46:10' },
    { text: 'Cast all your anxiety on him because he cares for you.', ref: '1 Peter 5:7' },
    { text: 'This is the day that the Lord has made; let us rejoice and be glad in it.', ref: 'Psalm 118:24' },
    { text: 'Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.', ref: 'Philippians 4:6' },
    { text: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1' }
  ],
  stoic: [
    { text: 'You have power over your mind — not outside events. Realize this, and you will find strength.', ref: 'Marcus Aurelius' },
    { text: 'We suffer more often in imagination than in reality.', ref: 'Seneca' },
    { text: 'It is not the man who has too little, but the man who craves more, that is poor.', ref: 'Seneca' },
    { text: 'First say to yourself what you would be; and then do what you have to do.', ref: 'Epictetus' },
    { text: 'Waste no more time arguing about what a good man should be. Be one.', ref: 'Marcus Aurelius' }
  ],
  affirmations: [
    { text: 'I don’t have to finish everything today. I just have to begin.', ref: '' },
    { text: 'One honest, unhurried thing today is enough.', ref: '' },
    { text: 'I can be steady even when the day isn’t.', ref: '' },
    { text: 'Small and consistent beats big and occasional.', ref: '' },
    { text: 'I’m allowed to move slowly through a fast day.', ref: '' }
  ]
};

const sparkTabs = document.getElementById('sparkTabs');
const sparkBody = document.getElementById('sparkBody');
const shuffleBtn = document.getElementById('shuffleBtn');
let sparkTab = 'design';
let sparkIndex = null;
let quoteIndex = null;

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

function filteredSparks() {
  if (!settings.sparkCategories.length) return SPARKS;
  return SPARKS.filter((s) => settings.sparkCategories.includes(s.category));
}
function filteredQuotes() {
  const pool = settings.quoteSources.flatMap((src) => QUOTES[src] || []);
  return pool.length ? pool : QUOTES.affirmations;
}

function renderSparkTabs() {
  sparkTabs.innerHTML = '';
  const showDesign = settings.sparkContent.design;
  const showQuote = settings.sparkContent.quote;
  if (showDesign && showQuote) {
    [['design', 'Design'], ['quote', 'Verse / Quote']].forEach(([val, label]) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.className = sparkTab === val ? 'active' : '';
      btn.addEventListener('click', () => { sparkTab = val; renderSpark(); });
      sparkTabs.appendChild(btn);
    });
  } else {
    sparkTab = showQuote ? 'quote' : 'design';
  }
  sparkTabs.hidden = !(showDesign && showQuote);
}

function renderSpark() {
  renderSparkTabs();
  if (sparkTab === 'design') {
    const list = filteredSparks();
    if (sparkIndex === null || sparkIndex >= list.length) sparkIndex = dayOfYear(today) % list.length;
    const spark = list[sparkIndex];
    sparkBody.innerHTML = `
      <span class="spark-category">${spark.category}</span>
      <p class="spark-title">${spark.title}</p>
      <p class="spark-blurb">${spark.blurb}</p>
      <a class="spark-source" href="${spark.url}" target="_blank" rel="noopener">${spark.source} →</a>
    `;
  } else {
    const list = filteredQuotes();
    if (quoteIndex === null || quoteIndex >= list.length) quoteIndex = dayOfYear(today) % list.length;
    const q = list[quoteIndex];
    sparkBody.innerHTML = `
      <p class="spark-title">${q.text}</p>
      ${q.ref ? `<p class="spark-blurb">${q.ref}</p>` : ''}
    `;
  }
}

shuffleBtn.addEventListener('click', () => {
  if (sparkTab === 'design') {
    const list = filteredSparks();
    let next;
    do { next = Math.floor(Math.random() * list.length); } while (next === sparkIndex && list.length > 1);
    sparkIndex = next;
  } else {
    const list = filteredQuotes();
    let next;
    do { next = Math.floor(Math.random() * list.length); } while (next === quoteIndex && list.length > 1);
    quoteIndex = next;
  }
  renderSpark();
});

// ---------- Settings screen ----------
function renderSettingsScreen() {
  const categoryList = document.getElementById('categoryList');
  const allCategories = [...new Set(SPARKS.map((s) => s.category))];
  categoryList.innerHTML = '';
  allCategories.forEach((cat) => {
    const label = document.createElement('label');
    const checked = settings.sparkCategories.includes(cat);
    label.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}> ${cat}`;
    label.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) settings.sparkCategories.push(cat);
      else settings.sparkCategories = settings.sparkCategories.filter((c) => c !== cat);
      saveSettings(settings);
    });
    categoryList.appendChild(label);
  });

  const quoteSourceList = document.getElementById('quoteSourceList');
  const sourceLabels = { bible: 'Bible verses', stoic: 'Stoic quotes', affirmations: 'Affirmations' };
  quoteSourceList.innerHTML = '';
  Object.entries(sourceLabels).forEach(([key, label]) => {
    const el = document.createElement('label');
    const checked = settings.quoteSources.includes(key);
    el.innerHTML = `<input type="checkbox" ${checked ? 'checked' : ''}> ${label}`;
    el.querySelector('input').addEventListener('change', (e) => {
      if (e.target.checked) settings.quoteSources.push(key);
      else settings.quoteSources = settings.quoteSources.filter((s) => s !== key);
      saveSettings(settings);
    });
    quoteSourceList.appendChild(el);
  });

  bindToggle('includeDesign', settings.sparkContent.design, (v) => { settings.sparkContent.design = v; });
  bindToggle('includeQuote', settings.sparkContent.quote, (v) => { settings.sparkContent.quote = v; });
  bindToggle('moodCheckin', settings.moodCheckin, (v) => { settings.moodCheckin = v; });
  bindToggle('promptChips', settings.promptChips, (v) => { settings.promptChips = v; });
  bindToggle('top3CarryOver', settings.top3CarryOver, (v) => { settings.top3CarryOver = v; });
  bindToggle('showTemp', settings.showTemp, (v) => { settings.showTemp = v; });

  bindSegmented('progressStyleSeg', settings.top3ProgressStyle, (v) => { settings.top3ProgressStyle = v; });
  bindSegmented('tempUnitSeg', settings.tempUnit, (v) => { settings.tempUnit = v; });
}

function bindToggle(id, value, onChange) {
  const el = document.getElementById(id);
  el.checked = value;
  el.addEventListener('change', (e) => {
    onChange(e.target.checked);
    saveSettings(settings);
    renderMoodRow();
    renderPromptRow();
    renderTasks();
    renderSpark();
    initWeather();
  });
}

function bindSegmented(containerId, value, onChange) {
  const container = document.getElementById(containerId);
  [...container.children].forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.value === value);
    btn.addEventListener('click', () => {
      onChange(btn.dataset.value);
      saveSettings(settings);
      [...container.children].forEach((b) => b.classList.toggle('active', b === btn));
      renderTasks();
      initWeather();
    });
  });
}

// ---------- Init ----------
renderMoodRow();
renderPromptRow();
renderTasks();
renderSpark();
renderSettingsScreen();
initWeather();

// ---------- Service worker (installability) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
