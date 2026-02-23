/**
 * Transitions Integration v2 - Fixed
 * Injects + buttons between adjacent video clips in the timeline
 * and provides an inline popup to pick/remove transitions.
 */

(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 0);
  }

  function init() {
    console.log('[Transitions] v2 – initializing...');

    // Uses the global TransitionManager defined in transitions.js
    const manager = new TransitionManager();
    let activePopup = null;

    // ── Store helpers ──────────────────────────────────────────────────────────
    function getStore() {
      if (window.editorStore) return window.editorStore;
      if (window.$pinia) {
        const s = window.$pinia._s || {};
        for (const [k, v] of Object.entries(s)) {
          if (/editor|project/i.test(k)) return v._store || v;
        }
      }
      if (window.useEditorStore) {
        try { return window.useEditorStore(); } catch (_) {}
      }
      return null;
    }

    function getStoredTransitions() {
      return getStore()?.project?.transitions || [];
    }

    function getTransitionBetween(aId, bId) {
      return getStoredTransitions().find(
        t => t.fromClipId === aId && t.toClipId === bId
      ) || null;
    }

    function saveTransitionToStore(fromId, toId, type, duration) {
      const store = getStore();
      if (!store) {
        console.warn('[Transitions] Editor store not found – retrying in 500 ms');
        // Queue and retry
        setTimeout(() => saveTransitionToStore(fromId, toId, type, duration), 500);
        return null;
      }

      if (!store.project.transitions) store.project.transitions = [];

      // Remove existing transition for this clip pair
      store.project.transitions = store.project.transitions.filter(
        t => !(
          (t.fromClipId === fromId && t.toClipId === toId) ||
          (t.fromClipId === toId   && t.toClipId === fromId)
        )
      );

      const t = {
        id: crypto.randomUUID(),
        fromClipId: fromId,
        toClipId: toId,
        type,
        duration: duration || 1.0,
        createdAt: Date.now()
      };

      store.project.transitions.push(t);
      manager.transitions.set(fromId, t);
      manager.transitions.set(toId, t);

      if (typeof store.saveNow      === 'function') store.saveNow();
      if (typeof store.pushSnapshot === 'function') store.pushSnapshot();

      console.log('[Transitions] Saved:', t);
      return t;
    }

    function removeTransitionFromStore(fromId, toId) {
      const store = getStore();
      if (!store?.project?.transitions) return;

      store.project.transitions = store.project.transitions.filter(
        t => !(
          (t.fromClipId === fromId && t.toClipId === toId) ||
          (t.fromClipId === toId   && t.toClipId === fromId)
        )
      );
      manager.transitions.delete(fromId);
      manager.transitions.delete(toId);

      if (typeof store.saveNow      === 'function') store.saveNow();
      if (typeof store.pushSnapshot === 'function') store.pushSnapshot();

      console.log('[Transitions] Removed transition between', fromId, '->', toId);
    }

    // ── Notifications ──────────────────────────────────────────────────────────
    function notify(msg, type = 'info') {
      document.querySelector('.ck-t-note')?.remove();
      const el = document.createElement('div');
      el.className = 'ck-t-note';
      Object.assign(el.style, {
        position: 'fixed', bottom: '24px', right: '24px',
        padding: '10px 18px', borderRadius: '8px',
        fontSize: '13px', fontWeight: '500', zIndex: '10010',
        color: '#fff',
        background: { success: '#22c55e', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' }[type] || '#3b82f6',
        boxShadow: '0 8px 20px rgba(0,0,0,.35)',
        animation: 'ckTIn .3s ease-out',
        pointerEvents: 'none'
      });
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3500);
    }

    // ── Popup ──────────────────────────────────────────────────────────────────
    function closePopup() {
      activePopup?.remove();
      activePopup = null;
    }

    function buildCards(cat, curType) {
      const list = cat === 'all'
        ? Object.values(TRANSITION_TYPES)
        : Object.values(TRANSITION_TYPES).filter(t => t.category === cat);

      return list.map(t => `
        <div class="ck-tp-card${t.id === curType ? ' active' : ''}" data-t="${t.id}" title="${t.description}">
          <span>${t.icon}</span><em>${t.name}</em>
        </div>
      `).join('');
    }

    function openPicker(triggerBtn, fromId, toId) {
      closePopup();
      const existing = getTransitionBetween(fromId, toId);

      const popup = document.createElement('div');
      popup.className = 'ck-tp-popup';
      activePopup = popup;

      popup.innerHTML = `
        <div class="ck-tp-hdr">
          <span>⚡ Add Transition</span>
          <button class="ck-tp-x" title="Close">×</button>
        </div>
        ${existing ? `
          <div class="ck-tp-cur">
            <span>${TRANSITION_TYPES[existing.type.toUpperCase()]?.icon || '✨'}</span>
            <b>${TRANSITION_TYPES[existing.type.toUpperCase()]?.name || existing.type}</b>
            <button class="ck-tp-del" title="Remove transition">✕ Remove</button>
          </div>
          <div class="ck-tp-dur">
            <label>Duration <span class="ck-tp-durval">${(existing.duration || 1.0).toFixed(1)}s</span></label>
            <input type="range" class="ck-tp-slider" min="0.1" max="3" step="0.1" value="${existing.duration || 1}">
          </div>
        ` : ''}
        <div class="ck-tp-cats">
          <button class="ck-tp-cat active" data-c="all">All</button>
          <button class="ck-tp-cat" data-c="fade">Fade</button>
          <button class="ck-tp-cat" data-c="wipe">Wipe</button>
          <button class="ck-tp-cat" data-c="slide">Slide</button>
          <button class="ck-tp-cat" data-c="zoom">Zoom</button>
          <button class="ck-tp-cat" data-c="effect">FX</button>
          <button class="ck-tp-cat" data-c="shape">Shape</button>
        </div>
        <div class="ck-tp-grid">${buildCards('all', existing?.type)}</div>
      `;

      document.body.appendChild(popup);

      // Position popup below the trigger button, keeping it on-screen
      const r = triggerBtn.getBoundingClientRect();
      const popupW = 290;
      let left = r.left + r.width / 2 - popupW / 2;
      left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));
      popup.style.left = left + 'px';
      popup.style.top  = (r.bottom + 6) + 'px';

      // Events ─────────────────────────────────────────────────────────────────
      popup.querySelector('.ck-tp-x').onclick = closePopup;

      popup.querySelector('.ck-tp-del')?.addEventListener('click', () => {
        removeTransitionFromStore(fromId, toId);
        refreshBtn(triggerBtn, fromId, toId);
        closePopup();
        notify('Transition removed', 'info');
      });

      // Category filter
      popup.querySelector('.ck-tp-cats').addEventListener('click', e => {
        const btn = e.target.closest('.ck-tp-cat');
        if (!btn) return;
        popup.querySelectorAll('.ck-tp-cat').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        popup.querySelector('.ck-tp-grid').innerHTML = buildCards(btn.dataset.c, getTransitionBetween(fromId, toId)?.type);
        bindCards();
      });

      // Duration slider
      popup.querySelector('.ck-tp-slider')?.addEventListener('input', e => {
        const val = parseFloat(e.target.value);
        popup.querySelector('.ck-tp-durval').textContent = val.toFixed(1) + 's';
        const cur = getTransitionBetween(fromId, toId);
        if (cur) {
          cur.duration = val;
          const store = getStore();
          if (typeof store?.saveNow === 'function') store.saveNow();
        }
      });

      bindCards();

      // Close on outside click
      setTimeout(() => {
        document.addEventListener('click', onOutside);
      }, 10);

      function onOutside(e) {
        if (!popup.contains(e.target) && !triggerBtn.contains(e.target)) {
          closePopup();
          document.removeEventListener('click', onOutside);
        }
      }

      function bindCards() {
        popup.querySelectorAll('.ck-tp-card').forEach(card => {
          card.onclick = () => {
            const tId   = card.dataset.t;
            const tInfo = Object.values(TRANSITION_TYPES).find(t => t.id === tId);
            const dur   = tInfo?.defaultDuration || 1.0;

            saveTransitionToStore(fromId, toId, tId, dur);
            refreshBtn(triggerBtn, fromId, toId);

            // Refresh popup to show current state
            closePopup();
            openPicker(triggerBtn, fromId, toId);

            notify(`${tInfo?.name || tId} transition added!`, 'success');
          };
        });
      }
    }

    // ── + button state ─────────────────────────────────────────────────────────
    function refreshBtn(btn, fromId, toId) {
      const t = getTransitionBetween(fromId, toId);
      if (t) {
        const tInfo = Object.values(TRANSITION_TYPES).find(x => x.id === t.type);
        btn.classList.add('ck-has-t');
        btn.innerHTML = `<span>${tInfo?.icon || '✨'}</span>`;
        btn.title = `Transition: ${tInfo?.name || t.type} (click to change)`;
      } else {
        btn.classList.remove('ck-has-t');
        btn.innerHTML = '<span>+</span>';
        btn.title = 'Add transition between clips';
      }
    }

    // ── Create + button ────────────────────────────────────────────────────────
    function makePlusBtn(fromEl, toEl) {
      const fromId = fromEl.dataset.clipId || fromEl.dataset.id;
      const toId   = toEl.dataset.clipId   || toEl.dataset.id;
      if (!fromId || !toId || fromId === toId) return;

      // Avoid duplicates
      if (document.querySelector(`.ck-plus-btn[data-from="${fromId}"][data-to="${toId}"]`)) return;

      const btn = document.createElement('button');
      btn.className = 'ck-plus-btn';
      btn.dataset.from = fromId;
      btn.dataset.to   = toId;
      refreshBtn(btn, fromId, toId);

      btn.addEventListener('click', e => {
        e.stopPropagation();
        openPicker(btn, fromId, toId);
      });

      const parent = fromEl.parentElement;
      if (!parent) return;
      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }
      parent.appendChild(btn);
      positionBtn(btn, fromEl);
    }

    function positionBtn(btn, fromEl) {
      const parent = fromEl.parentElement;
      if (!parent) return;
      const pr = parent.getBoundingClientRect();
      const fr = fromEl.getBoundingClientRect();
      // Horizontally: right edge of fromEl minus half button width
      const left = fr.right - pr.left - 10;
      // Vertically: center of fromEl
      const top  = fr.top - pr.top + fr.height / 2 - 10;
      btn.style.left = `${left}px`;
      btn.style.top  = `${top}px`;
    }

    // ── Inject buttons into timeline ───────────────────────────────────────────
    // Broad set of selectors to cover different Vue component output patterns
    const CLIP_SELECTORS = [
      '[data-clip-id]',
      '.clip-item',
      '[class*="clipItem"]',
      '[class*="TimelineClip"]',
      '[class*="timeline-clip"]',
      '[class*="timelineClip"]',
    ].join(', ');

    function inject() {
      const allClips = Array.from(document.querySelectorAll(CLIP_SELECTORS))
        .filter(el =>
          !el.classList.contains('ck-plus-btn') &&
          !el.closest('.ck-tp-popup') &&
          (el.dataset.clipId || el.dataset.id)
        );

      if (allClips.length === 0) return;

      // Group clips by direct parent (= one timeline track row)
      const byParent = new Map();
      allClips.forEach(el => {
        const p = el.parentElement;
        if (!p) return;
        if (!byParent.has(p)) byParent.set(p, []);
        byParent.get(p).push(el);
      });

      byParent.forEach((clips, _parent) => {
        if (clips.length < 2) return;
        // Sort left→right so we pair correctly
        const sorted = clips.slice().sort((a, b) => a.offsetLeft - b.offsetLeft);
        for (let i = 0; i < sorted.length - 1; i++) {
          makePlusBtn(sorted[i], sorted[i + 1]);
        }
      });
    }

    function refreshAllBtns() {
      document.querySelectorAll('.ck-plus-btn').forEach(btn => {
        const fromId = btn.dataset.from;
        const toId   = btn.dataset.to;
        const fromEl = document.querySelector(
          `[data-clip-id="${fromId}"], [data-id="${fromId}"]`
        );
        if (!fromEl || !fromEl.parentElement?.contains(btn)) {
          btn.remove(); // clip was removed from timeline
        } else {
          positionBtn(btn, fromEl);
          refreshBtn(btn, fromId, toId);
        }
      });
    }

    // ── MutationObserver – reacts to Vue re-renders ────────────────────────────
    let debounce = null;
    function scheduleInject() {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        inject();
        refreshAllBtns();
      }, 150);
    }

    function watchTimeline() {
      // Prefer the narrowest stable ancestor we can find
      const target =
        document.querySelector('#app, .timeline, [class*="Timeline"], [class*="timeline"]') ||
        document.body;

      new MutationObserver(scheduleInject)
        .observe(target, { childList: true, subtree: true });

      console.log('[Transitions] MutationObserver watching:', target.id || target.className?.split(' ')[0] || target.tagName);
    }

    // ── Load existing transitions from project store into manager ──────────────
    function syncFromStore() {
      const store = getStore();
      if (!store?.project?.transitions) return;
      store.project.transitions.forEach(t => {
        manager.transitions.set(t.fromClipId, t);
        manager.transitions.set(t.toClipId,   t);
      });
      console.log('[Transitions] Synced', store.project.transitions.length, 'transitions from store');
      refreshAllBtns();
    }

    // ── Inject global CSS ──────────────────────────────────────────────────────
    function injectStyles() {
      if (document.querySelector('#ck-trans-styles')) return;
      const s = document.createElement('style');
      s.id = 'ck-trans-styles';
      s.textContent = `
        @keyframes ckTIn {
          from { opacity:0; transform:translateX(40px); }
          to   { opacity:1; transform:translateX(0); }
        }

        /* ── + button sitting on the boundary between two clips ── */
        .ck-plus-btn {
          position: absolute;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: rgba(124,58,237,.9);
          border: 2px solid rgba(255,255,255,.9);
          color: #fff;
          font-size: 15px;
          font-weight: 700;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          transition: transform .15s ease, background .15s ease, box-shadow .15s ease;
          padding: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,.5);
          pointer-events: all;
        }
        .ck-plus-btn:hover {
          transform: scale(1.3);
          background: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,.35);
        }
        /* Green = transition already applied */
        .ck-plus-btn.ck-has-t {
          background: rgba(34,197,94,.95);
          border-color: rgba(255,255,255,.9);
        }
        .ck-plus-btn.ck-has-t:hover {
          background: #16a34a;
          box-shadow: 0 0 0 3px rgba(34,197,94,.35);
        }

        /* ── Transition picker popup ── */
        .ck-tp-popup {
          position: fixed;
          width: 290px;
          background: #1e1e22;
          border: 1px solid #3f3f46;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(0,0,0,.65);
          z-index: 10010;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
          animation: ckTPopIn .2s ease-out;
        }
        @keyframes ckTPopIn {
          from { opacity:0; transform:translateY(-6px) scale(.97); }
          to   { opacity:1; transform:translateY(0)   scale(1); }
        }

        .ck-tp-hdr {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #18181b;
          border-bottom: 1px solid #3f3f46;
          font-size: 13px;
          font-weight: 600;
          color: #e4e4e7;
        }
        .ck-tp-x {
          background: none;
          border: none;
          color: #a1a1aa;
          font-size: 20px;
          cursor: pointer;
          line-height: 1;
          padding: 0 2px;
        }
        .ck-tp-x:hover { color:#fff; }

        .ck-tp-cur {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: rgba(34,197,94,.1);
          border-bottom: 1px solid #3f3f46;
          font-size: 12px;
          color: #e4e4e7;
        }
        .ck-tp-cur b { flex:1; }
        .ck-tp-del {
          background: none;
          border: 1px solid #ef4444;
          border-radius: 5px;
          color: #ef4444;
          cursor: pointer;
          font-size: 11px;
          padding: 2px 8px;
        }
        .ck-tp-del:hover { background: rgba(239,68,68,.15); }

        .ck-tp-dur {
          padding: 8px 14px;
          border-bottom: 1px solid #3f3f46;
        }
        .ck-tp-dur label {
          font-size: 11px;
          color: #a1a1aa;
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .ck-tp-durval { color:#e4e4e7; font-weight:600; }
        .ck-tp-slider {
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          background: #3f3f46;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        .ck-tp-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width:14px; height:14px;
          background: #7c3aed;
          border-radius: 50%;
          cursor: pointer;
        }

        .ck-tp-cats {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          padding: 8px 10px;
          border-bottom: 1px solid #3f3f46;
        }
        .ck-tp-cat {
          padding: 3px 9px;
          border: 1px solid #3f3f46;
          border-radius: 99px;
          background: transparent;
          color: #a1a1aa;
          font-size: 11px;
          cursor: pointer;
          transition: all .15s;
        }
        .ck-tp-cat:hover  { background:#3f3f46; color:#fff; }
        .ck-tp-cat.active { background:#7c3aed; border-color:#7c3aed; color:#fff; }

        .ck-tp-grid {
          display: grid;
          grid-template-columns: repeat(4,1fr);
          gap: 4px;
          padding: 8px 10px;
          max-height: 210px;
          overflow-y: auto;
        }
        .ck-tp-grid::-webkit-scrollbar { width:4px; }
        .ck-tp-grid::-webkit-scrollbar-track { background:#18181b; }
        .ck-tp-grid::-webkit-scrollbar-thumb { background:#3f3f46; border-radius:2px; }

        .ck-tp-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 4px;
          border: 1px solid #3f3f46;
          border-radius: 8px;
          background: #27272a;
          cursor: pointer;
          transition: all .15s;
          text-align: center;
          user-select: none;
        }
        .ck-tp-card:hover  { border-color:#7c3aed; background:#2d2d35; transform:translateY(-1px); }
        .ck-tp-card.active { border-color:#22c55e; background:rgba(34,197,94,.1); }
        .ck-tp-card span   { font-size:18px; }
        .ck-tp-card em     {
          font-size:9px; color:#a1a1aa; font-style:normal;
          white-space:nowrap; overflow:hidden; text-overflow:ellipsis; width:100%;
        }

        /* notification toast */
        .ck-t-note {
          pointer-events: none;
        }
      `;
      document.head.appendChild(s);
    }

    // ── Bootstrap ──────────────────────────────────────────────────────────────
    injectStyles();

    // Give Vue time to finish its first render
    setTimeout(() => {
      inject();
      watchTimeline();
    }, 1200);

    // Retry injections for lazy-loaded clip data
    setTimeout(() => { inject(); syncFromStore(); }, 3000);
    setTimeout(() => { inject(); syncFromStore(); }, 6000);

    window.addEventListener('resize', refreshAllBtns);

    // Listen for external clip-selection events from other integration modules
    window.addEventListener('editor:clipSelected', () => {
      refreshAllBtns();
    });

    // Public API
    window.TransitionsIntegration = {
      manager,
      inject,
      refreshAllBtns,
      syncFromStore
    };

    console.log('[Transitions] v2 ready');
  }
})();
