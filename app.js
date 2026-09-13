// ---------- Date & greeting ----------
const today = new Date();
const todayKey = today.toISOString().slice(0, 10); // YYYY-MM-DD

document.getElementById('dateLine').textContent = today.toLocaleDateString(undefined, {
  weekday: 'long', month: 'long', day: 'numeric'
});

const hour = today.getHours();
const greeting = hour < 5 ? 'Still up?' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
document.getElementById('greeting').textContent = greeting;

// ---------- Storage helpers ----------
function loadDay(key, fallback) {
  try {
    const raw = localStorage.getItem(`anchor:${todayKey}:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveDay(key, value) {
  localStorage.setItem(`anchor:${todayKey}:${key}`, JSON.stringify(value));
}

// ---------- Prayer / reflection ----------
const prayerInput = document.getElementById('prayerInput');
const prayerSaveState = document.getElementById('prayerSaveState');
prayerInput.value = loadDay('prayer', '');

let prayerTimer;
prayerInput.addEventListener('input', () => {
  clearTimeout(prayerTimer);
  prayerSaveState.textContent = 'Saving…';
  prayerTimer = setTimeout(() => {
    saveDay('prayer', prayerInput.value);
    prayerSaveState.textContent = 'Saved';
    setTimeout(() => { prayerSaveState.textContent = ' '; }, 1200);
  }, 500);
});

// ---------- Top 3 tasks ----------
const taskList = document.getElementById('taskList');
let tasks = loadDay('tasks', [
  { text: '', done: false },
  { text: '', done: false },
  { text: '', done: false }
]);

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
    });

    li.appendChild(check);
    li.appendChild(input);
    taskList.appendChild(li);
  });
}
renderTasks();

// ---------- Weather ----------
const weatherBody = document.getElementById('weatherBody');
const weatherBtn = document.getElementById('weatherBtn');

const WEATHER_CODES = {
  0: ['☀️', 'Clear sky'], 1: ['🌤️', 'Mostly clear'], 2: ['⛅', 'Partly cloudy'], 3: ['☁️', 'Overcast'],
  45: ['🌫️', 'Fog'], 48: ['🌫️', 'Fog'],
  51: ['🌦️', 'Light drizzle'], 53: ['🌦️', 'Drizzle'], 55: ['🌦️', 'Heavy drizzle'],
  61: ['🌧️', 'Light rain'], 63: ['🌧️', 'Rain'], 65: ['🌧️', 'Heavy rain'],
  71: ['🌨️', 'Light snow'], 73: ['🌨️', 'Snow'], 75: ['❄️', 'Heavy snow'],
  80: ['🌦️', 'Rain showers'], 81: ['🌦️', 'Rain showers'], 82: ['⛈️', 'Violent showers'],
  95: ['⛈️', 'Thunderstorm'], 96: ['⛈️', 'Thunderstorm'], 99: ['⛈️', 'Thunderstorm']
};

function renderWeather(temp, code, place) {
  const [emoji, desc] = WEATHER_CODES[code] || ['🌡️', 'Weather'];
  weatherBody.innerHTML = `
    <div class="weather-now">
      <div class="weather-emoji">${emoji}</div>
      <div>
        <div class="weather-temp">${Math.round(temp)}°</div>
        <div class="weather-desc">${desc}</div>
      </div>
    </div>
    ${place ? `<div class="weather-place">${place}</div>` : ''}
  `;
}

async function fetchWeather(lat, lon) {
  weatherBody.innerHTML = '<p class="card-hint">Checking the sky…</p>';
  try {
    const [weatherRes, placeRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`),
      fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`).catch(() => null)
    ]);
    const weather = await weatherRes.json();
    let place = '';
    if (placeRes) {
      const geo = await placeRes.json();
      if (geo?.results?.[0]) place = `${geo.results[0].name}`;
    }
    const { temperature_2m, weather_code } = weather.current;
    localStorage.setItem('anchor:lastWeather', JSON.stringify({ lat, lon, temp: temperature_2m, code: weather_code, place, ts: Date.now() }));
    renderWeather(temperature_2m, weather_code, place);
  } catch (err) {
    weatherBody.innerHTML = `<p class="card-hint">Couldn't reach the sky right now. <button class="btn" id="weatherRetry">Try again</button></p>`;
    document.getElementById('weatherRetry')?.addEventListener('click', requestWeather);
  }
}

function requestWeather() {
  if (!navigator.geolocation) {
    weatherBody.innerHTML = '<p class="card-hint">Location isn\'t available on this browser.</p>';
    return;
  }
  weatherBody.innerHTML = '<p class="card-hint">Finding you…</p>';
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
    () => {
      weatherBody.innerHTML = `
        <p class="card-hint">Location access was denied.</p>
        <button class="btn" id="weatherBtn2">Try again</button>
      `;
      document.getElementById('weatherBtn2')?.addEventListener('click', requestWeather);
    }
  );
}

weatherBtn.addEventListener('click', requestWeather);

// Restore cached weather if it's from today
const cached = JSON.parse(localStorage.getItem('anchor:lastWeather') || 'null');
if (cached && new Date(cached.ts).toISOString().slice(0, 10) === todayKey) {
  renderWeather(cached.temp, cached.code, cached.place);
}

// ---------- Design Spark ----------
const SPARKS = [
  { category: 'Product Design', title: 'Dieter Rams’ ten principles are still the sharpest brief you’ll ever get.', blurb: 'Good design is as little design as possible — worth rereading once a year.', source: 'vitsoe.com', url: 'https://www.vitsoe.com/us/about/good-design' },
  { category: 'Architecture', title: 'Kengo Kuma builds with materials that age instead of decay.', blurb: 'Wood, paper, and stone that get more beautiful with wear — the opposite of planned obsolescence.', source: 'kkaa.co.jp', url: 'https://kkaa.co.jp/en/' },
  { category: 'Typography', title: 'Optical sizing exists because letters lie at different scales.', blurb: 'A typeface cut for 96pt display and one cut for 9pt caption are not the same shape, just scaled.', source: 'fonts.google.com', url: 'https://fonts.google.com/knowledge/glossary/optical_size' },
  { category: 'Fashion', title: 'Issey Miyake treated fabric folding as a manufacturing process, not a finish.', blurb: 'Pleats Please turned a technique into an entire design language.', source: 'isseymiyake.com', url: 'https://www.isseymiyake.com/en/brands/pleats_please' },
  { category: 'Industrial Design', title: 'The Anglepoise lamp is a four-bar linkage wearing a shade.', blurb: 'Pure mechanical logic, styled just enough to live on a desk.', source: 'anglepoise.com', url: 'https://www.anglepoise.com/pages/our-story' },
  { category: 'UX', title: 'Don Norman’s door handles are still the best onboarding lesson in the field.', blurb: 'If people push a pull door, the door is wrong, not the people.', source: 'jnd.org', url: 'https://jnd.org/' },
  { category: 'Graphic Design', title: 'Massimo Vignelli designed the NYC subway map to be argued about forever.', blurb: 'Diagrammatic clarity over geographic accuracy — still divides opinion decades later.', source: 'vignelli.com', url: 'http://www.vignelli.com/' },
  { category: 'Illustration', title: 'Saul Bass proved a title sequence could be the whole emotional argument.', blurb: 'Before the film starts, you already know how it feels.', source: 'moma.org', url: 'https://www.moma.org/artists/391' },
  { category: 'Architecture', title: 'Lina Bo Bardi designed for how a building gets used, not how it photographs.', blurb: 'SESC Pompeia is rough concrete that people actually love inhabiting.', source: 'archdaily.com', url: 'https://www.archdaily.com/tag/lina-bo-bardi' },
  { category: 'Product Design', title: 'The Rams-Jony Ive throughline is a straight line, not a coincidence.', blurb: 'Trace the calculator to the iPod and the argument makes itself.', source: 'core77.com', url: 'https://www.core77.com/' },
  { category: 'Typography', title: 'Swiss grid systems are just a way to make 100 decisions in advance.', blurb: 'Josef Müller-Brockmann’s grid isn’t a constraint, it’s a delegation of taste to a system.', source: 'design.google', url: 'https://design.google/' },
  { category: 'Fashion', title: 'Rei Kawakubo builds clothes around the idea of imperfection as intention.', blurb: 'Comme des Garçons treats asymmetry as a design decision, not an accident.', source: 'metmuseum.org', url: 'https://www.metmuseum.org/exhibitions/listings/2017/rei-kawakubo' },
  { category: 'UX', title: 'Progressive disclosure is just good manners applied to interfaces.', blurb: 'Show what’s needed now, reveal the rest when it’s earned.', source: 'nngroup.com', url: 'https://www.nngroup.com/articles/progressive-disclosure/' },
  { category: 'Industrial Design', title: 'The Eames molded plywood chair started as a leg splint for WWII.', blurb: 'Sometimes the most iconic form comes from the least glamorous brief.', source: 'eamesoffice.com', url: 'https://www.eamesoffice.com/' },
  { category: 'Graphic Design', title: 'Paula Scher repainted a whole identity system with hand lettering — for Citibank.', blurb: 'Proof that a "safe" client can still greenlight something bold if the logic holds.', source: 'pentagram.com', url: 'https://www.pentagram.com/about/paula-scher' }
];

const sparkBody = document.getElementById('sparkBody');
const shuffleBtn = document.getElementById('shuffleBtn');

function dayOfYear(d) {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d - start;
  return Math.floor(diff / 86400000);
}

function renderSpark(spark) {
  sparkBody.innerHTML = `
    <span class="spark-category">${spark.category}</span>
    <p class="spark-title">${spark.title}</p>
    <p class="spark-blurb">${spark.blurb}</p>
    <a class="spark-source" href="${spark.url}" target="_blank" rel="noopener">${spark.source} →</a>
  `;
}

let sparkIndex = dayOfYear(today) % SPARKS.length;
renderSpark(SPARKS[sparkIndex]);

shuffleBtn.addEventListener('click', () => {
  let next;
  do { next = Math.floor(Math.random() * SPARKS.length); } while (next === sparkIndex && SPARKS.length > 1);
  sparkIndex = next;
  renderSpark(SPARKS[sparkIndex]);
});

// ---------- Service worker (installability) ----------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
