    /* ══════════════════════════════════════
       FLOATING PETALS
       ══════════════════════════════════════ */
    function createPetals() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const container = document.getElementById('petals');
      if (!container) return;
      container.innerHTML = '';

      const count = window.innerWidth < 680 ? 8 : 14;
      const petalSVG = `
        <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 1 C 14 5, 16 10, 14 15 C 12 18, 8 18, 6 15 C 4 10, 6 5, 10 1 Z"
                fill="rgba(232, 213, 163, 0.45)"
                stroke="rgba(227, 173, 110, 0.35)"
                stroke-width="0.5"/>
          <path d="M10 3 L 10 16" stroke="rgba(227, 173, 110, 0.25)" stroke-width="0.4" fill="none"/>
        </svg>
      `;

      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'petal';
        p.innerHTML = petalSVG;
        p.style.left = Math.random() * 100 + '%';
        p.style.animationDuration = (14 + Math.random() * 16) + 's';
        p.style.animationDelay = (Math.random() * 18) + 's';
        const size = 12 + Math.random() * 10;
        p.style.width = size + 'px';
        p.style.height = size + 'px';
        container.appendChild(p);
      }
    }
    createPetals();

    let petalResizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(petalResizeTimer);
      petalResizeTimer = setTimeout(createPetals, 300);
    }, { passive: true });

    /* ══════════════════════════════════════
       NAV MENU TOGGLE (medium screens)
       ══════════════════════════════════════ */
    (function navMenuToggle() {
      const toggle = document.getElementById('navMenuToggle');
      const links = document.getElementById('navLinks');
      if (!toggle || !links) return;

      function closeMenu() {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }

      function openMenu() {
        links.classList.add('open');
        toggle.setAttribute('aria-expanded', 'true');
      }

      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (links.classList.contains('open')) {
          closeMenu();
        } else {
          openMenu();
        }
      });

      links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', closeMenu);
      });

      document.addEventListener('click', (e) => {
        if (!links.contains(e.target) && e.target !== toggle) closeMenu();
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('open')) {
          closeMenu();
          toggle.focus();
        }
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth > 1099 || window.innerWidth <= 720) closeMenu();
      }, { passive: true });
    })();

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
       LYRICS ACCORDION
       ══════════════════════════════════════ */
    function toggleLyrics(id, btn) {
      const content = document.getElementById(id);
      const isOpen = content.classList.contains('open');
      if (isOpen) {
        content.classList.remove('open');
        btn.textContent = 'Show Full Lyrics ▼';
        btn.setAttribute('aria-expanded', 'false');
      } else {
        content.classList.add('open');
        btn.textContent = 'Hide Lyrics ▲';
        btn.setAttribute('aria-expanded', 'true');
      }
    }

    /* ══════════════════════════════════════
       CANDLE WALL — device-local
       ══════════════════════════════════════ */
    const CANDLE_STORAGE_KEY = 'rael-ndeve-memorial-candles-v1';
    const MAX_CANDLES_DISPLAY = 24;

    function getStoredCandles() {
      try {
        const raw = localStorage.getItem(CANDLE_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) { return []; }
    }

    function storeCandles(candles) {
      try { localStorage.setItem(CANDLE_STORAGE_KEY, JSON.stringify(candles)); }
      catch (e) { /* silent */ }
    }

    function formatRelativeTime(timestamp) {
      const diff = Date.now() - timestamp;
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + 'm ago';
      const hours = Math.floor(mins / 60);
      if (hours < 24) return hours + 'h ago';
      const days = Math.floor(hours / 24);
      if (days < 30) return days + 'd ago';
      return Math.floor(days / 30) + 'mo ago';
    }

    const candleSVG = `
      <svg class="candle-entry-svg" viewBox="0 0 40 60" aria-hidden="true">
        <rect x="14" y="26" width="12" height="32" rx="2" fill="#EFE7DA"/>
        <rect x="14" y="26" width="12" height="32" rx="2" fill="url(#waxShade)"/>
        <line x1="20" y1="26" x2="20" y2="20" stroke="#3a3228" stroke-width="1"/>
        <path d="M 20 6 C 16 16, 16 22, 20 24 C 24 22, 24 16, 20 6 Z" fill="#FFD07B" opacity="0.9"/>
        <path d="M 20 8 C 18 15, 18 20, 20 22 C 22 20, 22 15, 20 8 Z" fill="#FFB03A"/>
      </svg>
    `;

    function escapeHTML(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function renderCandles() {
      const wall = document.getElementById('candleWall');
      const summary = document.getElementById('candleSummary');
      const printList = document.getElementById('candlePrintList');
      const candles = getStoredCandles();

      wall.innerHTML = '';
      if (printList) printList.innerHTML = '';

      if (!candles.length) {
        const empty = document.createElement('p');
        empty.className = 'candle-wall-empty';
        empty.textContent = 'No candles lit yet — be the first to leave a light.';
        wall.appendChild(empty);
        summary.textContent = '';
        return;
      }

      const newestFirst = candles.slice().reverse();
      const displayed = newestFirst.slice(0, MAX_CANDLES_DISPLAY);

      displayed.forEach((candle) => {
        const entry = document.createElement('div');
        entry.className = 'candle-entry';

        const iso = new Date(candle.timestamp).toISOString();

        entry.innerHTML = `
          ${candleSVG}
          <div class="candle-entry-name">${escapeHTML(candle.name)}</div>
          ${candle.message ? `<div class="candle-entry-message">“${escapeHTML(candle.message)}”</div>` : ''}
          <div class="candle-entry-time"><time datetime="${iso}">${formatRelativeTime(candle.timestamp)}</time></div>
          <button type="button" class="candle-entry-remove" data-id="${candle.id}" aria-label="Remove this candle">Remove</button>
        `;
        wall.appendChild(entry);
      });

      const total = candles.length;
      summary.textContent = total === 1 ? '1 candle lit' : `${total} candles lit`;

      wall.querySelectorAll('.candle-entry-remove').forEach(btn => {
        btn.addEventListener('click', () => removeCandle(btn.getAttribute('data-id')));
      });

      if (printList) {
        const h3 = document.createElement('h3');
        h3.textContent = total === 1 ? '1 candle lit' : `${total} candles lit`;
        printList.appendChild(h3);

        const ul = document.createElement('ul');
        newestFirst.forEach(c => {
          const li = document.createElement('li');
          const strong = document.createElement('strong');
          strong.textContent = c.name;
          li.appendChild(strong);
          if (c.message) {
            li.appendChild(document.createTextNode(' — “' + c.message + '”'));
          }
          ul.appendChild(li);
        });
        printList.appendChild(ul);
      }
    }

    function submitCandle(event) {
      event.preventDefault();
      const nameInput = document.getElementById('candleName');
      const messageInput = document.getElementById('candleMessage');
      const hint = document.getElementById('candleHint');

      const name = nameInput.value.trim();
      const message = messageInput.value.trim();

      if (!name) {
        hint.textContent = 'Please enter your name to light a candle.';
        hint.classList.add('error');
        nameInput.focus();
        return;
      }

      const candles = getStoredCandles();
      candles.push({
        id: 'c-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        name: name,
        message: message,
        timestamp: Date.now()
      });
      storeCandles(candles);

      nameInput.value = '';
      messageInput.value = '';
      hint.textContent = 'Your candle is kept on this device only.';
      hint.classList.remove('error');

      renderCandles();
    }

    function removeCandle(id) {
      if (!window.confirm('Remove this candle from the wall?')) return;
      const candles = getStoredCandles().filter(c => c.id !== id);
      storeCandles(candles);
      renderCandles();
    }

    renderCandles();

    let candleTick = null;
    function startCandleTicker() {
      if (candleTick) return;
      candleTick = setInterval(() => {
        const candles = getStoredCandles();
        if (!candles.length) return;
        const newestFirst = candles.slice().reverse();
        document.querySelectorAll('.candle-entry-time time').forEach((el, i) => {
          const c = newestFirst[i];
          if (c) el.textContent = formatRelativeTime(c.timestamp);
        });
      }, 60000);
    }
    startCandleTicker();

    /* ══════════════════════════════════════
       GALLERY & LIGHTBOX
       ══════════════════════════════════════ */
    const galleryData = {
      memories: [
        // { src: 'photos/rael-01.jpg', caption: 'Childhood in Makueni' },
        // { src: 'photos/rael-02.jpg', caption: 'Wedding day' },
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
          <img src="${p.src}" alt="${escapeHTML(p.caption)}" loading="lazy">
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
