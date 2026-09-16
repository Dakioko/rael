/* ══════════════════════════════════════
   MODULAR FIREBASE IMPORTS
   ══════════════════════════════════════ */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getCountFromServer
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-check.js';

/* ══════════════════════════════════════
   CONFIG
   ══════════════════════════════════════ */
const RECAPTCHA_SITE_KEY = '6Le2v7otAAAAADWcrqSoPo1tHX3b5KRQ0EgEB7Bi';
const CANDLES_COLLECTION = 'candles';
const CANDLES_PAGE_SIZE = 48;
const SERVICE_END = new Date('2026-09-19T13:00:00+03:00');

/* ══════════════════════════════════════
   THEME TOGGLE
   (theme is applied by the inline <head> script; this just wires the button)
   ══════════════════════════════════════ */
(function themeToggle() {
  const toggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  const themeColorMeta = document.getElementById('themeColorMeta');
  if (!toggle) return;

  const LIGHT_THEME_COLOR = '#FAF6EF';
  const DARK_THEME_COLOR = '#14110D';

  function applyLabel(theme) {
    const isDark = theme === 'dark';
    toggle.setAttribute('aria-pressed', String(isDark));
    toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }
  }

  applyLabel(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  toggle.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    applyLabel(next);
    try { localStorage.setItem('rael-theme', next); } catch (e) {}
  });
})();

/* ══════════════════════════════════════
   RISING EMBERS
   ══════════════════════════════════════ */
function createEmbers() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.innerWidth < 680) return;
  const container = document.getElementById('petals');
  if (!container) return;
  container.innerHTML = '';

  const count = 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'petal';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (10 + Math.random() * 14) + 's';
    p.style.animationDelay = (Math.random() * 16) + 's';
    const size = 3 + Math.random() * 5;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    container.appendChild(p);
  }
}
createEmbers();

let petalResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(petalResizeTimer);
  petalResizeTimer = setTimeout(createEmbers, 300);
}, { passive: true });

/* ══════════════════════════════════════
   SCROLL: PROGRESS, RING, BACK-TO-TOP
   ══════════════════════════════════════ */
(function scrollHandlers() {
  const progressBar = document.getElementById('progressBar');
  const backToTop = document.getElementById('backToTop');
  const scrollRing = document.getElementById('scrollRing');

  const RING_RADIUS = 23;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  if (scrollRing) {
    scrollRing.style.strokeDasharray = RING_CIRCUMFERENCE;
    scrollRing.style.strokeDashoffset = RING_CIRCUMFERENCE;
  }

  let ticking = false;

  function update() {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = height > 0 ? Math.min(winScroll / height, 1) : 0;

    progressBar.style.width = (progress * 100) + '%';

    if (scrollRing) {
      scrollRing.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);
    }

    backToTop.classList.toggle('visible', winScroll > 400);
    backToTop.classList.toggle('complete', progress > 0.985);

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  window.addEventListener('resize', update, { passive: true });
  update();
})();

(function revealSections() {
  const sections = document.querySelectorAll('.section-card');
  if (!('IntersectionObserver' in window)) {
    sections.forEach(s => s.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  sections.forEach(s => io.observe(s));
})();

(function highlightNav() {
  const links = Array.from(document.querySelectorAll('.nav-bar a'));
  const sections = links
    .map(l => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);
  if (!('IntersectionObserver' in window) || !sections.length) return;

  const visible = new Set();

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) visible.add(e.target.id);
      else visible.delete(e.target.id);
    });

    links.forEach(l => l.removeAttribute('aria-current'));
    if (!visible.size) return;

    const firstId = sections.find(s => visible.has(s.id))?.id;
    const link = links.find(l => l.getAttribute('href') === '#' + firstId);
    if (link) link.setAttribute('aria-current', 'location');
  }, { threshold: 0.2, rootMargin: '-20% 0px -50% 0px' });

  sections.forEach(s => io.observe(s));
})();

(function buildProgrammeList() {
  const list = document.getElementById('programmeList');
  if (!list) return;
  const rows = document.querySelectorAll('.programme-table tbody tr');
  rows.forEach(tr => {
    const timeEl = tr.querySelector('.col-time');
    const activityEl = tr.querySelector('.col-activity');
    const time = timeEl ? timeEl.textContent.trim() : '';
    const activity = activityEl ? activityEl.textContent.trim() : '';

    const li = document.createElement('li');
    if (tr.classList.contains('sub-row')) li.classList.add('sub');

    if (time) {
      const t = document.createElement('span');
      t.className = 'time';
      t.textContent = time;
      li.appendChild(t);
    }
    const a = document.createElement('span');
    a.className = 'activity';
    a.textContent = activity;
    li.appendChild(a);

    list.appendChild(li);
  });
})();

/* ══════════════════════════════════════
   SHARE
   ══════════════════════════════════════ */
function showToast(message) {
  const toast = document.getElementById('shareToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

async function shareThis() {
  const shareData = {
    title: 'In Loving Memory of Rael Ndeve',
    text: 'A memorial programme celebrating the life of Rael Ndeve.',
    url: window.location.href
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Link copied to clipboard');
    } else if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
      const ta = document.createElement('textarea');
      ta.value = window.location.href;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Link copied to clipboard');
    } else {
      showToast('Copy this link: ' + window.location.href);
    }
  } catch (err) {
    showToast('Sharing not available on this device');
  }
}

/* ══════════════════════════════════════
   SERVICE-PAST STATE
   ══════════════════════════════════════ */
function applyServiceState() {
  const actions = document.querySelector('.hero-actions');
  if (!actions) return;

  const forced = new URLSearchParams(location.search).get('after') === '1';
  const passed = Date.now() > SERVICE_END.getTime();
  if (!passed && !forced) return;

  document.body.setAttribute('data-service', 'past');

  const prog = actions.querySelector('a[href="#service"]');
  if (prog) {
    const candle = document.createElement('a');
    candle.href = '#tribute';
    candle.className = 'btn-pill btn-pill-ghost';
    candle.innerHTML = `
      <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 3 C 9 8, 9 11, 12 13 C 15 11, 15 8, 12 3 Z"/>
        <rect x="10" y="14" width="4" height="7" rx="1"/>
      </svg>
      Light a candle`;
    prog.replaceWith(candle);
  }

  const serviceTime = document.querySelector('.hero-service time');
  if (serviceTime) {
    serviceTime.textContent = 'Saturday, September 19, 2026';
    const label = serviceTime.closest('.hero-service-item');
    if (label && !label.querySelector('.service-past-note')) {
      const note = document.createElement('span');
      note.className = 'service-past-note';
      note.textContent = 'Service held';
      label.insertBefore(note, label.firstChild);
    }
  }
}
applyServiceState();

/* ══════════════════════════════════════
   CANDLE WALL — shared, real-time (Firebase Firestore, modular SDK)
   ══════════════════════════════════════ */
let db = null;
let firebaseReady = false;

let latestCandles = [];
let maxSeenTime = 0;
let hasLoadedOnce = false;
let unsubscribeCandles = null;
let candleLimit = CANDLES_PAGE_SIZE;
let candleTick = null;
let pendingScrollCandleId = null;
let expandedMessageIds = new Set(); // which candle messages the visitor has tapped open

// The wall only ever loads `candleLimit` candles at a time (see
// subscribeToCandles), but the "N candles lit" summary should reflect the
// true total for the whole memorial, not just what's currently paginated
// in. getCountFromServer is a lightweight aggregate query — it doesn't fetch
// the documents themselves, just a count — so this stays cheap even as the
// wall grows well past one page.
let totalCandleCount = null;

function updateCandleSummary() {
  const summary = document.getElementById('candleSummary');
  if (!summary) return;
  // Until the aggregate count has loaded (or if it ever fails), fall back
  // to what's actually rendered so the line is never blank.
  const total = totalCandleCount !== null ? totalCandleCount : latestCandles.length;
  summary.textContent = total === 1 ? '1 candle lit' : `${total} candles lit`;
}

async function refreshCandleCount() {
  if (!firebaseReady) return;
  try {
    const snap = await getCountFromServer(collection(db, CANDLES_COLLECTION));
    totalCandleCount = snap.data().count;
    updateCandleSummary();
  } catch (e) {
    console.error('Candle count fetch failed:', e);
    // Leave totalCandleCount as-is; the summary already has a sensible
    // fallback via updateCandleSummary().
  }
}

/* One candle per browser is now a soft nudge, not a hard gate. It still
   flags a repeat visit via localStorage (so we can show a friendly note),
   but it never hides the form or blocks a second submission — a shared
   device (a family tablet passed around at the service, say) needs to let
   more than one person light a candle. */
const CANDLE_LIT_KEY = 'rael-candle-lit';

function hasAlreadyLitCandle() {
  try { return !!localStorage.getItem(CANDLE_LIT_KEY); } catch (e) { return false; }
}

function markCandleLit() {
  try { localStorage.setItem(CANDLE_LIT_KEY, '1'); } catch (e) {}
}

function showReturningVisitorNote() {
  if (document.getElementById('candleReturningNote')) return; // already shown
  const form = document.getElementById('candleForm');
  if (!form) return;

  const note = document.createElement('p');
  note.className = 'candle-returning-note';
  note.id = 'candleReturningNote';
  note.innerHTML = '🕯️ You\u2019ve lit a candle here before — thank you. Sharing this device with someone else? They\u2019re welcome to light one too.';
  form.after(note);
}

try {
  if (window.FIREBASE_CONFIG) {
    const app = initializeApp(window.FIREBASE_CONFIG);

    const isLocalHost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (isLocalHost) {
      let debugToken = null;
      try { debugToken = localStorage.getItem('appcheck-debug-token'); } catch (e) {}
      if (!debugToken) {
        debugToken = crypto.randomUUID();
        try { localStorage.setItem('appcheck-debug-token', debugToken); } catch (e) {}
      }
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
      console.info('App Check debug token (register once in Firebase Console → App Check → Manage debug tokens):', debugToken);
    }

    if (RECAPTCHA_SITE_KEY && RECAPTCHA_SITE_KEY.indexOf('PASTE_') !== 0) {
      try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
          isTokenAutoRefreshEnabled: true
        });
      } catch (e) {
        console.warn('App Check init failed (continuing without):', e);
      }
    }

    db = getFirestore(app);
    firebaseReady = true;
  }
} catch (e) {
  console.error('Firebase init failed:', e);
  firebaseReady = false;
}

function formatRelativeTime(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + 'h ago';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + 'd ago';
  return Math.floor(days / 30) + 'mo ago';
}

/* SVG candle: an asymmetric, slightly irregular flame (not a perfect
   teardrop) with a soft inner highlight for depth, sitting on a slim wax
   pillar with subtle satin shading, an understated wick, a small melted-wax
   drip, and a soft radial base shadow (no hard-edged oval). The `.flame-glow`
   group is what the CSS drop-shadow and flicker animation both target —
   scoped to just the flame shapes so the wax body and shadow stay crisp. */
const candleSVG = `
  <svg class="candle-entry-svg" viewBox="0 0 20 58" aria-hidden="true">
    <defs>
      <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%"   stop-color="#A85C28"/>
        <stop offset="55%"  stop-color="#E4A055"/>
        <stop offset="100%" stop-color="#FFF6E4"/>
      </linearGradient>
      <linearGradient id="flameInner" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0%"   stop-color="#F4C077" stop-opacity="0"/>
        <stop offset="100%" stop-color="#FFF8E8" stop-opacity="0.65"/>
      </linearGradient>
      <linearGradient id="waxBody" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stop-color="#A88F66"/>
        <stop offset="45%"  stop-color="#EDE0C4"/>
        <stop offset="100%" stop-color="#9C8055"/>
      </linearGradient>
      <radialGradient id="baseShadow" cx="50%" cy="50%" r="50%">
        <stop offset="0%"   stop-color="rgba(20,14,6,0.22)"/>
        <stop offset="70%"  stop-color="rgba(20,14,6,0.08)"/>
        <stop offset="100%" stop-color="rgba(20,14,6,0)"/>
      </radialGradient>
    </defs>
    <g class="flame-glow">
      <path class="flame-outer" fill="url(#flameGrad)"
            d="M10.8 0
               C 13.2 5.8, 15.6 10.6, 14.6 16.4
               C 13.9 20.9, 11.6 24.6, 10.2 24.8
               C 8.6 25, 6.1 21.2, 5.5 16.2
               C 5 11, 7.8 6, 10.8 0 Z"/>
      <path class="flame-core" fill="url(#flameInner)" opacity="0.8"
            d="M10.3 5
               C 11.6 8.5, 12.6 11.3, 12.1 14.3
               C 11.7 16.6, 10.4 18.4, 9.6 18.3
               C 8.7 18.2, 7.6 16.2, 7.5 13.8
               C 7.4 11, 9 8, 10.3 5 Z"/>
    </g>
    <rect x="9.5" y="25" width="1" height="4" fill="#4A3520"/>
    <rect x="6.8" y="30" width="6.4" height="24" rx="2.4" fill="url(#waxBody)"/>
    <rect x="8" y="31" width="1" height="21" rx="0.5" fill="#FFFBEF" opacity="0.16"/>
    <ellipse cx="10" cy="30.4" rx="3.2" ry="1.1" fill="#F2E4C4" opacity="0.8"/>
    <path d="M 12.3 31.5 Q 13.1 34.5, 12.3 37 Q 11.6 34.5, 12.3 31.5 Z" fill="#EDDDB8" opacity="0.5"/>
    <ellipse cx="10" cy="55" rx="7" ry="2" fill="url(#baseShadow)"/>
  </svg>
`;

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

function removeLoadMore() {
  const existing = document.getElementById('candleLoadMore');
  if (existing) existing.remove();
}

function setWallState(state, message, showRetry) {
  const wall = document.getElementById('candleWall');
  const summary = document.getElementById('candleSummary');
  if (!wall) return;

  removeLoadMore();
  wall.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'candle-wall-empty' + (state === 'error' ? ' is-error' : '');
  p.textContent = message;
  wall.appendChild(p);

  if (showRetry) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-pill btn-pill-ghost candle-retry';
    btn.textContent = 'Try again';
    btn.addEventListener('click', () => {
      candleLimit = CANDLES_PAGE_SIZE;
      subscribeToCandles(true);
    });
    wall.appendChild(btn);
  }
  if (summary) summary.textContent = '';
}

function renderLoadMore(mayHaveMore) {
  removeLoadMore();
  if (!mayHaveMore) return;

  const wall = document.getElementById('candleWall');
  if (!wall) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'candleLoadMore';
  btn.className = 'btn-pill btn-pill-ghost candle-load-more';
  btn.textContent = 'Load older candles';
  btn.addEventListener('click', () => {
    candleLimit += CANDLES_PAGE_SIZE;
    btn.disabled = true;
    btn.textContent = 'Loading…';
    subscribeToCandles(false);
  });

  // Summary now sits above the wall, so anchor the button after the wall itself.
  wall.after(btn);
}

/* Decide which message candles are actually truncated. Runs after the wall
   has been populated and re-runs on resize. Sets data-truncated on the
   button so the CSS hover cue and the click handler both key off the same
   flag. Expanded candles are never re-collapsed. */
function measureCandleSnippets() {
  document.querySelectorAll('.candle-entry-toggle[data-has-message="true"]').forEach((toggle) => {
    const snippet = toggle.querySelector('.candle-entry-snippet');
    if (!snippet) return;

    // A visitor-expanded candle stays expanded regardless of measurement.
    if (toggle.getAttribute('aria-expanded') === 'true') {
      toggle.dataset.truncated = 'true';
      return;
    }

    // +1 tolerance absorbs sub-pixel rounding on perfect two-line snippets.
    const truncated = snippet.scrollHeight > snippet.clientHeight + 1;
    toggle.dataset.truncated = truncated ? 'true' : 'false';
  });
}

let snippetResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(snippetResizeTimer);
  snippetResizeTimer = setTimeout(measureCandleSnippets, 150);
}, { passive: true });

function renderCandles(candles) {
  const wall = document.getElementById('candleWall');
  const summary = document.getElementById('candleSummary');
  const printList = document.getElementById('candlePrintList');
  const status = document.getElementById('candleStatus');

  const previousMaxTime = maxSeenTime;
  latestCandles = candles;
  wall.innerHTML = '';
  if (printList) printList.innerHTML = '';

  if (!candles.length) {
    setWallState('empty', 'No candles lit yet — be the first to leave a light.', false);
    return;
  }

  candles.forEach((candle) => {
    const t = candle.date.getTime();
    // Only glow for candles newer than the newest we've previously rendered.
    // Loading older pages won't trip this because their timestamps are lower.
    const isNew = hasLoadedOnce && t > previousMaxTime;

    const entry = document.createElement('div');
    entry.className = 'candle-entry' + (isNew ? ' is-new' : '');
    entry.dataset.id = candle.id;

    const svgWrap = document.createElement('div');
    svgWrap.innerHTML = candleSVG;
    const svg = svgWrap.firstElementChild;

    const name = document.createElement('div');
    name.className = 'candle-entry-name';
    name.textContent = candle.name;

    const time = document.createElement('div');
    time.className = 'candle-entry-time';
    const timeEl = document.createElement('time');
    timeEl.dateTime = candle.date.toISOString();
    timeEl.textContent = formatRelativeTime(candle.date);
    time.appendChild(timeEl);

    if (candle.message) {
      // Candles with a message become tap-to-reveal. The snippet is the
      // message itself, clamped to two lines by CSS; expanding sets
      // aria-expanded="true" and the clamp is dropped. The button wraps the
      // flame, name, snippet, and time so the whole tile is a hit target.
      const isOpen = expandedMessageIds.has(candle.id);

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'candle-entry-toggle';
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.dataset.hasMessage = 'true';
      toggle.dataset.truncated = 'false'; // measureCandleSnippets will correct this

      const snippet = document.createElement('span');
      snippet.className = 'candle-entry-snippet';
      snippet.textContent = '\u201C' + candle.message + '\u201D';

      toggle.append(svg, name, snippet, time);

      toggle.addEventListener('click', () => {
        // Only truncated messages toggle — short ones stay static text.
        if (toggle.dataset.truncated !== 'true') return;
        const nowOpen = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(nowOpen));
        if (nowOpen) expandedMessageIds.add(candle.id);
        else expandedMessageIds.delete(candle.id);
      });

      entry.appendChild(toggle);
    } else {
      // No message — plain, non-interactive entry wrapped in a div so it
      // doesn't carry button semantics for screen readers.
      const body = document.createElement('div');
      body.className = 'candle-entry-body';
      body.append(svg, name, time);
      entry.appendChild(body);
    }

    wall.appendChild(entry);

    if (t > maxSeenTime) maxSeenTime = t;
  });

  // Drop tracked ids for candles no longer on the wall (keeps the set small
  // over a long-running session rather than growing forever).
  const visibleIds = new Set(candles.map(c => c.id));
  expandedMessageIds.forEach(id => { if (!visibleIds.has(id)) expandedMessageIds.delete(id); });

  // Measure after layout so snippet heights are final. Font loading can
  // re-flow the wall (Cormorant swaps in late), so we measure again when
  // fonts.ready resolves.
  requestAnimationFrame(() => {
    measureCandleSnippets();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measureCandleSnippets);
    }
  });

  if (hasLoadedOnce && status) {
    const fresh = candles.filter(c => c.date.getTime() > previousMaxTime);
    if (fresh.length === 1)      status.textContent = `A new candle was lit by ${fresh[0].name}.`;
    else if (fresh.length > 1)   status.textContent = `${fresh.length} new candles were lit.`;
  }
  hasLoadedOnce = true;

  updateCandleSummary();

  if (printList) {
    const h3 = document.createElement('h3');
    h3.textContent = summary.textContent;
    printList.appendChild(h3);
    const ul = document.createElement('ul');
    candles.forEach(c => {
      const li = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = c.name;
      li.appendChild(strong);
      if (c.message) li.appendChild(document.createTextNode(' — “' + c.message + '”'));
      ul.appendChild(li);
    });
    printList.appendChild(ul);
  }

  if (pendingScrollCandleId) {
    const target = wall.querySelector(`[data-id="${pendingScrollCandleId}"]`);
    if (target) {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      target.classList.add('is-mine');
      setTimeout(() => target.classList.remove('is-mine'), 2400);
    }
    pendingScrollCandleId = null;
  }
}

function subscribeToCandles(showLoading = true) {
  if (!firebaseReady) {
    setWallState('error', 'The candle wall is temporarily unavailable.', false);
    return;
  }
  if (unsubscribeCandles) { unsubscribeCandles(); unsubscribeCandles = null; }
  if (showLoading) setWallState('loading', 'Loading candles…', false);

  const q = query(
    collection(db, CANDLES_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(candleLimit)
  );

  unsubscribeCandles = onSnapshot(
    q,
    (snapshot) => {
      // Firestore can fire an initial event from local cache before the
      // server responds — on a fresh visit that cache is often empty,
      // which would otherwise flash "No candles lit yet" for a moment.
      // Skip it and wait for a snapshot we can trust: either the first
      // one that isn't from cache, or any snapshot once we've already
      // shown real data (so genuine "went to zero" cases still render).
      if (snapshot.metadata.fromCache && snapshot.empty && !hasLoadedOnce) {
        return;
      }

      const candles = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          message: data.message || '',
          date: data.timestamp ? data.timestamp.toDate() : new Date()
        };
      });
      renderCandles(candles);
      renderLoadMore(snapshot.docs.length === candleLimit);
      refreshCandleCount();
    },
    (err) => {
      console.error('Firestore snapshot error:', err);
      setWallState('error', 'The candle wall could not be loaded.', true);
    }
  );
}
subscribeToCandles(true);

if (hasAlreadyLitCandle()) showReturningVisitorNote();

async function submitCandle(event) {
  event.preventDefault();
  const nameInput = document.getElementById('candleName');
  const messageInput = document.getElementById('candleMessage');
  const hint = document.getElementById('candleHint');
  const submitBtn = document.getElementById('candleSubmitBtn');

  const name = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!name) {
    hint.textContent = 'Please enter your name to light a candle.';
    hint.classList.add('error');
    nameInput.focus();
    return;
  }
  if (name.length > 40) {
    hint.textContent = 'Name is too long (40 characters max).';
    hint.classList.add('error');
    nameInput.focus();
    return;
  }
  if (message.length > 140) {
    hint.textContent = 'Message is too long (140 characters max).';
    hint.classList.add('error');
    messageInput.focus();
    return;
  }

  if (!firebaseReady) {
    hint.textContent = 'The candle wall is temporarily unavailable — please try again shortly.';
    hint.classList.add('error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add('is-lighting');
  hint.classList.remove('error');
  hint.textContent = 'Lighting your candle…';

  try {
    const payload = { name, timestamp: serverTimestamp() };
    if (message) payload.message = message;
    const docRef = await addDoc(collection(db, CANDLES_COLLECTION), payload);
    pendingScrollCandleId = docRef.id;

    nameInput.value = '';
    messageInput.value = '';
    hint.textContent = 'Your candle is now lit for everyone to see.';
    markCandleLit();
    showReturningVisitorNote();
  } catch (e) {
    console.error('Candle submit failed:', e);
    hint.textContent = 'Something went wrong — please try again.';
    hint.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('is-lighting');
  }
}

// Wire the form's submit event to the handler above. This is what actually
// makes the "Light a Candle" button (and Enter/requestSubmit) call
// submitCandle() instead of falling through to the browser's default
// form submission (a full page reload with the fields tacked onto the URL).
document.getElementById('candleForm')?.addEventListener('submit', submitCandle);

// Ctrl/Cmd+Enter submits the candle form from the textarea
document.getElementById('candleForm')?.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    e.currentTarget.requestSubmit();
  }
});

// Relative-time ticker, keyed by document id so order changes don't drift
function startCandleTicker() {
  if (candleTick) return;
  candleTick = setInterval(() => {
    document.querySelectorAll('.candle-entry').forEach((el) => {
      const c = latestCandles.find(x => x.id === el.dataset.id);
      const timeEl = el.querySelector('.candle-entry-time time');
      if (!c || !timeEl) return;
      timeEl.textContent = formatRelativeTime(c.date);
    });
  }, 60000);
}
startCandleTicker();
window.addEventListener('beforeunload', () => { if (candleTick) clearInterval(candleTick); });

/* ══════════════════════════════════════
   GALLERY & LIGHTBOX
   ══════════════════════════════════════ */
const galleryData = {
  memories: [
    { src: 'photos/rael-1.jpg', caption: '', focus: 'top' },
    { src: 'photos/rael-2.jpg', caption: '', focus: 'top' },
    { src: 'photos/rael-3.jpg', caption: '' },
    { src: 'photos/rael-4.jpg', caption: 'With family, March 2026' },
  ]
};

const allPhotos = galleryData.memories.filter(p => p && p.src);

(function buildGallery() {
  const section = document.getElementById('gallery');
  const navLink = document.querySelector('.nav-bar a[href="#gallery"]');
  const grid = document.querySelector('.gallery-grid');

  if (!allPhotos.length) {
    section.hidden = true;
    if (navLink) navLink.hidden = true;
    return;
  }

  section.hidden = false;
  if (navLink) navLink.hidden = false;

  allPhotos.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', `View photo: ${p.caption}`);
    item.innerHTML = `
      <img src="${p.src}" alt="${escapeHTML(p.caption)}" loading="lazy" style="${p.focus === 'top' ? 'object-position: center 10%;' : ''}">
      <span class="gallery-zoom" aria-hidden="true">⤢</span>
      <div class="gallery-caption">${escapeHTML(p.caption)}</div>
    `;
    item.addEventListener('click', () => openLightbox(idx));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(idx); }
    });
    grid.appendChild(item);
  });
})();

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
let currentPhoto = 0;
let lastFocusedElement = null;

function updateLightboxContent() {
  const p = allPhotos[currentPhoto];
  lightboxImg.src = p.src;
  lightboxImg.alt = p.caption;
  lightboxCaption.textContent = p.caption;
  lightboxCounter.textContent = `Photo ${currentPhoto + 1} of ${allPhotos.length}`;
  const multi = allPhotos.length > 1;
  lightboxPrev.hidden = !multi;
  lightboxNext.hidden = !multi;
  const hint = document.getElementById('lightboxHint');
  if (hint) hint.hidden = !multi;
}

function openLightbox(index) {
  if (!allPhotos.length) return;
  currentPhoto = index;
  lastFocusedElement = document.activeElement;
  updateLightboxContent();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
  document.getElementById('lightboxClose').focus();
}

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
  if (lastFocusedElement) lastFocusedElement.focus();
}

function navigateLightbox(dir) {
  if (allPhotos.length < 2) return;
  currentPhoto = (currentPhoto + dir + allPhotos.length) % allPhotos.length;
  updateLightboxContent();
}

document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
lightboxNext.addEventListener('click', () => navigateLightbox(1));

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('open')) return;

  if (e.key === 'Escape')     { closeLightbox(); return; }
  if (e.key === 'ArrowLeft')  { navigateLightbox(-1); return; }
  if (e.key === 'ArrowRight') { navigateLightbox(1);  return; }

  if (e.key === 'Tab') {
    const focusables = Array.from(lightbox.querySelectorAll('button:not([hidden])'));
    if (!focusables.length) return;
    const first = focusables[0];
    const last  = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
});

let touchStartX = 0;
lightbox.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
lightbox.addEventListener('touchend', (e) => {
  const touchEndX = e.changedTouches[0].screenX;
  if (touchEndX < touchStartX - 40) navigateLightbox(1);
  if (touchEndX > touchStartX + 40) navigateLightbox(-1);
}, { passive: true });

/* ══════════════════════════════════════
   EXPOSE INLINE-HANDLER FUNCTIONS
   Module scope is not global, so anything referenced
   from onclick="" in index.html must be re-exported here.
   ══════════════════════════════════════ */
window.shareThis = shareThis;