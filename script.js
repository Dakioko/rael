/* ══════════════════════════════════════
   FIREBASE — CANDLE WALL
   ══════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const app = initializeApp(window.FIREBASE_CONFIG);
const db  = getFirestore(app);

const PAGE_SIZE = 60; // candles shown per "page"

const wall         = document.getElementById('candleWall');
const summaryEl    = document.getElementById('candleSummary');
const statusEl     = document.getElementById('candleStatus');
const form         = document.getElementById('candleForm');
const nameInput    = document.getElementById('candleName');
const messageInput = document.getElementById('candleMessage');
const submitBtn    = document.getElementById('candleSubmitBtn');
const hintEl       = document.getElementById('candleHint');
const printList    = document.getElementById('candlePrintList');

let shownCount  = PAGE_SIZE;
let unsubscribe = null;
let renderToken = 0;
let pendingFirst = true;
let lastEntries  = [];

/* ── SVG candle ── */
function candleSVG(size = 30) {
  return `
    <svg class="candle-entry-svg" style="--flame-size:${size}px"
         viewBox="0 0 40 59" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="glow-${Math.random().toString(36).slice(2)}" cx="50%" cy="38%" r="60%">
          <stop offset="0%"   stop-color="#FFD07B" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#FFD07B" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="20" cy="22" rx="16" ry="20" fill="url(#glow)"/>
      <path class="flame-outer" fill="#FFB03A"
            d="M20 6c-4 6-8 9-8 14a8 8 0 0 0 16 0c0-5-4-8-8-14z"/>
      <path class="flame-inner" fill="#FFD07B"
            d="M20 12c-2 3-4 5-4 8a4 4 0 0 0 8 0c0-3-2-5-4-8z"/>
      <rect x="14" y="32" width="12" height="22" rx="1.2" fill="#E8D5A3"/>
      <rect x="14" y="32" width="12" height="22" rx="1.2" fill="url(#waxShade)"/>
      <rect x="19" y="28" width="2" height="5" fill="#5C3814"/>
      <ellipse cx="20" cy="55" rx="9" ry="1.6" fill="rgba(0,0,0,0.25)"/>
    </svg>`;
}

/* ── Time formatting ── */
function formatTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60)     return 'Just now';
  if (diff < 3600)   return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Build one entry ── */
function buildEntry(data, id) {
  const entry = document.createElement('article');
  entry.className = 'candle-entry';
  entry.dataset.id = id || '';

  const name    = (data.name || '').trim();
  const message = (data.message || '').trim();

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'candle-entry-toggle';
  toggle.dataset.truncated = 'false';

  toggle.innerHTML = candleSVG(30)
    + `<span class="candle-entry-name"></span>`
    + (message ? `<span class="candle-entry-snippet"></span>` : '');

  toggle.querySelector('.candle-entry-name').textContent = name;
  if (message) {
    toggle.querySelector('.candle-entry-snippet').textContent = message;
  }

  entry.appendChild(toggle);

  const time = document.createElement('time');
  time.className = 'candle-entry-time';
  if (data.timestamp) {
    const d = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
    time.dateTime = d.toISOString();
    time.textContent = formatTime(data.timestamp);
  }
  entry.appendChild(time);

  return entry;
}

/* ── Swap button ↔ div without losing children ── */
function setEntryInteractive(entry, interactive) {
  const current = entry.querySelector('.candle-entry-toggle, .candle-entry-body');
  if (!current) return;
  const isButton = current.classList.contains('candle-entry-toggle');
  if (interactive === isButton) return;

  const next = document.createElement(interactive ? 'button' : 'div');
  next.className = interactive ? 'candle-entry-toggle' : 'candle-entry-body';
  if (interactive) {
    next.type = 'button';
    next.setAttribute('aria-expanded', 'false');
    next.dataset.truncated = 'true';
  }
  while (current.firstChild) next.appendChild(current.firstChild);
  current.replaceWith(next);
}

/* ── Measure one entry: is the snippet actually clamped? ── */
function measureEntry(entry) {
  const snippet = entry.querySelector('.candle-entry-snippet');
  if (!snippet) {
    setEntryInteractive(entry, false);
    entry.classList.remove('is-truncated');
    return;
  }
  const toggle = entry.querySelector('.candle-entry-toggle');
  if (toggle && toggle.getAttribute('aria-expanded') === 'true') return;

  const truncated = snippet.scrollHeight > snippet.clientHeight + 1;
  entry.classList.toggle('is-truncated', truncated);
  setEntryInteractive(entry, truncated);
}

/* ── Measure every entry on the wall ── */
function measureAll() {
  wall.querySelectorAll('.candle-entry').forEach(measureEntry);
}

/* ── Render the whole wall from a snapshot ── */
function render(entries) {
  const token = ++renderToken;
  lastEntries = entries;
  wall.innerHTML = '';

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'candle-wall-empty';
    empty.textContent = 'Be the first to light a candle.';
    wall.appendChild(empty);
    summaryEl.textContent = '';
    printList.innerHTML = '';
    return;
  }

  const fragment = document.createDocumentFragment();
  entries.slice(0, shownCount).forEach(({ id, data }) => {
    fragment.appendChild(buildEntry(data, id));
  });
  wall.appendChild(fragment);

  if (entries.length > shownCount) {
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'btn-pill btn-pill-ghost candle-load-more';
    more.textContent = `Show ${entries.length - shownCount} more`;
    more.addEventListener('click', () => {
      shownCount += PAGE_SIZE;
      render(lastEntries);
    });
    wall.appendChild(more);
  }

  const total = entries.length;
  summaryEl.textContent = total === 1 ? '1 candle lit' : `${total} candles lit`;

  printList.innerHTML = '<h3>Candles lit in memory of Rael</h3><ul>'
    + entries.map(({ data }) => {
        const n = escapeHTML((data.name || '').trim());
        const m = escapeHTML((data.message || '').trim());
        return `<li><strong>${n}</strong>${m ? ' — ' + m : ''}</li>`;
      }).join('')
    + '</ul>';

  requestAnimationFrame(() => {
    if (token !== renderToken) return;
    measureAll();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (token === renderToken) measureAll();
      });
    }
  });
}

/* ── Tiny HTML escaper for the print list ── */
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ── Subscribe to Firestore ── */
function subscribe() {
  if (unsubscribe) unsubscribe();
  const q = query(
    collection(db, 'candles'),
    orderBy('timestamp', 'desc'),
    limit(500)
  );
  unsubscribe = onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map(d => ({ id: d.id, data: d.data() }));
      render(entries);

      if (pendingFirst) {
        pendingFirst = false;
        const first = wall.querySelector('.candle-entry');
        if (first) first.classList.add('is-mine');
      }
    },
    (err) => {
      console.error('Candle wall subscription failed:', err);
      wall.innerHTML = '';
      const msg = document.createElement('p');
      msg.className = 'candle-wall-empty is-error';
      msg.textContent = 'Candles could not be loaded right now.';
      wall.appendChild(msg);

      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn-pill btn-pill-ghost candle-retry';
      retry.textContent = 'Try again';
      retry.addEventListener('click', subscribe);
      wall.appendChild(retry);

      statusEl.textContent = 'Unable to load the candle wall.';
    }
  );
}

/* ── Delegated expand/collapse ── */
wall.addEventListener('click', (e) => {
  const btn = e.target.closest('.candle-entry-toggle');
  if (!btn || btn.dataset.truncated !== 'true') return;
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', open ? 'false' : 'true');
});

/* ── Re-measure on width changes ── */
let resizeTimer;
if ('ResizeObserver' in window) {
  new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureAll, 150);
  }).observe(wall);
} else {
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureAll, 150);
  });
}

/* ── Submit a candle ── */
async function submitCandle(event) {
  event.preventDefault();
  if (submitBtn.disabled) return;

  const name    = nameInput.value.trim();
  const message = messageInput.value.trim();

  if (!name) {
    hintEl.textContent = 'Please add your name.';
    hintEl.classList.add('error');
    nameInput.focus();
    return;
  }
  if (name.length > 40) {
    hintEl.textContent = 'Name is a little too long.';
    hintEl.classList.add('error');
    return;
  }
  if (message.length > 140) {
    hintEl.textContent = 'Message is a little too long.';
    hintEl.classList.add('error');
    return;
  }

  hintEl.classList.remove('error');
  hintEl.textContent = 'Lighting…';
  submitBtn.disabled = true;
  submitBtn.classList.add('is-lighting');

  try {
    const docRef = await addDoc(collection(db, 'candles'), {
      name,
      message,
      timestamp: serverTimestamp(),
    });

    form.reset();
    hintEl.textContent = 'Your candle is lit. Thank you.';
    statusEl.textContent = 'Your candle has been added to the wall.';

    requestAnimationFrame(() => {
      const fresh = wall.querySelector(`.candle-entry[data-id="${docRef.id}"]`);
      if (fresh) {
        fresh.classList.add('is-mine');
        fresh.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  } catch (err) {
    console.error('Failed to add candle:', err);
    hintEl.textContent = 'Something went wrong — please try again.';
    hintEl.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove('is-lighting');
  }
}

form.addEventListener('submit', submitCandle);

subscribe();


/* ══════════════════════════════════════
   THEME TOGGLE
   ══════════════════════════════════════ */
(function themeToggle() {
  const btn = document.getElementById('themeToggle');
  const meta = document.getElementById('themeColorMeta');
  if (!btn) return;

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#14110D' : '#FAF6EF');
    try { localStorage.setItem('rael-theme', theme); } catch (e) {}
  }

  const current = document.documentElement.getAttribute('data-theme') || 'light';
  btn.setAttribute('aria-pressed', current === 'dark' ? 'true' : 'false');
  btn.setAttribute('aria-label', current === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');

  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
  });
})();


/* ══════════════════════════════════════
   FLOATING PETALS
   ══════════════════════════════════════ */
(function petals() {
  const host = document.getElementById('petals');
  if (!host) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const count = window.innerWidth < 720 ? 8 : 16;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'petal';
    const size = 4 + Math.random() * 6;
    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDuration = (14 + Math.random() * 16) + 's';
    p.style.animationDelay = (-Math.random() * 20) + 's';
    p.style.opacity = 0.3 + Math.random() * 0.5;
    host.appendChild(p);
  }
})();


/* ══════════════════════════════════════
   NAV HIGHLIGHT + PROGRESS + BACK TO TOP
   ══════════════════════════════════════ */
(function navAndProgress() {
  const navLinks = Array.from(document.querySelectorAll('.nav-bar a[href^="#"]'));
  const sections = navLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  const progressBar = document.getElementById('progressBar');
  const backToTop = document.getElementById('backToTop');
  const scrollRing = document.getElementById('scrollRing');

  if (scrollRing) {
    const r = 23;
    const c = 2 * Math.PI * r;
    scrollRing.style.strokeDasharray = c;
    scrollRing.style.strokeDashoffset = c;
  }

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = '#' + entry.target.id;
      navLinks.forEach(a => {
        if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'location');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

  sections.forEach(s => sectionObserver.observe(s));

  // Reveal section cards
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.section-card').forEach(c => revealObserver.observe(c));

  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) : 0;

    if (progressBar) progressBar.style.width = (pct * 100) + '%';

    if (scrollRing) {
      const r = 23;
      const c = 2 * Math.PI * r;
      scrollRing.style.strokeDashoffset = c * (1 - pct);
    }

    if (backToTop) {
      backToTop.classList.toggle('visible', h.scrollTop > 400);
      backToTop.classList.toggle('complete', pct > 0.985);
    }
  }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }, { passive: true });

  onScroll();
})();


/* ══════════════════════════════════════
   ORDER OF SERVICE — mobile list builder
   ══════════════════════════════════════ */
(function buildProgrammeList() {
  const list = document.getElementById('programmeList');
  const table = document.querySelector('.programme-table');
  if (!list || !table) return;

  const rows = table.querySelectorAll('tbody tr');
  rows.forEach((tr) => {
    const time = tr.querySelector('.col-time')?.textContent.trim() || '';
    const activity = tr.querySelector('.col-activity')?.textContent.trim() || '';
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
   GALLERY + LIGHTBOX
   ══════════════════════════════════════ */
(function galleryAndLightbox() {
  const galleries = document.querySelectorAll('[data-gallery]');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxClose = document.getElementById('lightboxClose');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');
  if (!lightbox) return;

  let items = [];
  let index = 0;

  function collect() {
    items = [];
    galleries.forEach((g) => {
      g.querySelectorAll('img').forEach((img) => {
        items.push({
          src: img.currentSrc || img.src,
          alt: img.alt || '',
          caption: img.dataset.caption || img.alt || '',
        });
      });
    });
  }

  function open(i) {
    index = i;
    update();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function update() {
    const it = items[index];
    if (!it) return;
    lightboxImg.src = it.src;
    lightboxImg.alt = it.alt;
    lightboxCaption.textContent = it.caption;
    lightboxCounter.textContent = `${index + 1} / ${items.length}`;
  }

  function prev() { index = (index - 1 + items.length) % items.length; update(); }
  function next() { index = (index + 1) % items.length; update(); }

  galleries.forEach((g) => {
    g.addEventListener('click', (e) => {
      const item = e.target.closest('.gallery-item');
      if (!item) return;
      collect();
      const img = item.querySelector('img');
      const i = items.findIndex(x => x.src === (img.currentSrc || img.src));
      open(i < 0 ? 0 : i);
    });
  });

  lightboxClose?.addEventListener('click', close);
  lightboxPrev?.addEventListener('click', prev);
  lightboxNext?.addEventListener('click', next);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) close();
  });

  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
  });
})();


/* ══════════════════════════════════════
   SHARE
   ══════════════════════════════════════ */
window.shareThis = async function shareThis() {
  const toast = document.getElementById('shareToast');
  const data = {
    title: 'In Loving Memory of Rael Ndeve',
    text: 'A memorial programme celebrating the life of Rael Ndeve (1926–2026).',
    url: window.location.href,
  };

  try {
    if (navigator.share) {
      await navigator.share(data);
      return;
    }
    await navigator.clipboard.writeText(data.url);
    if (toast) {
      toast.textContent = 'Link copied to clipboard';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2400);
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.error('Share failed:', err);
  }
};