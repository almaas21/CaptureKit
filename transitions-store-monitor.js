/**
 * Transitions Store Monitor
 * Watches for editor store availability and syncs transitions.
 * Also re-injects + buttons whenever the project changes.
 */

class TransitionsStoreMonitor {
  constructor() {
    this.manager = new TransitionManager();
    this.storeCheckInterval = null;
    this.pendingTransitions = [];
    this.lastTrackSnapshot = null;
    this.init();
  }

  init() {
    // Listen for transition events dispatched by other code
    window.addEventListener('transitions:add', (e) => {
      const { clipId, transitionType, options } = e.detail;
      this.handleTransition(clipId, transitionType, options);
    });

    this.startMonitoring();
  }

  handleTransition(clipId, transitionType, options) {
    const editorStore = this.getEditorStore();
    if (editorStore) {
      this.addTransitionToProject(clipId, transitionType, options, editorStore);
    } else {
      this.pendingTransitions.push({ clipId, transitionType, options });
      console.log('[TransitionsMonitor] Store not ready, queued transition');
    }
  }

  addTransitionToProject(clipId, transitionType, options, editorStore) {
    try {
      const clipData = this.findClipInProject(clipId, editorStore);
      if (!clipData) {
        console.error('[TransitionsMonitor] Clip not found:', clipId);
        return;
      }
      if (!clipData.nextClip) {
        console.warn('[TransitionsMonitor] No next clip for transition');
        this.showNotification('Add another clip after this one to create a transition', 'warning');
        return;
      }

      const { clip, nextClip } = clipData;
      const maxDuration = Math.min(clip.duration, nextClip.duration) / 2;
      const duration    = Math.min(options?.duration || 1.0, maxDuration);

      if (!editorStore.project.transitions) editorStore.project.transitions = [];

      // Remove stale transitions for these clips
      editorStore.project.transitions = editorStore.project.transitions.filter(
        t => !(t.fromClipId === clipId || t.toClipId === clipId)
      );

      const transition = {
        id: crypto.randomUUID(),
        fromClipId: clipId,
        toClipId: nextClip.id,
        type: transitionType,
        duration,
        parameters: options || {},
        createdAt: Date.now()
      };

      editorStore.project.transitions.push(transition);

      if (typeof editorStore.saveNow      === 'function') editorStore.saveNow();
      if (typeof editorStore.pushSnapshot === 'function') editorStore.pushSnapshot();

      console.log('[TransitionsMonitor] Added:', transition);
      this.showNotification(
        `${TRANSITION_TYPES[transitionType.toUpperCase()]?.name || transitionType} transition added!`,
        'success'
      );

      // Refresh inline buttons
      setTimeout(() => window.TransitionsIntegration?.refreshAllBtns?.(), 100);
    } catch (err) {
      console.error('[TransitionsMonitor] Error adding transition:', err);
      this.showNotification('Error adding transition', 'error');
    }
  }

  findClipInProject(clipId, editorStore) {
    if (!editorStore?.project?.tracks) return null;
    for (const track of editorStore.project.tracks) {
      if (!track.clips) continue;
      const idx = track.clips.findIndex(c => c.id === clipId);
      if (idx !== -1) {
        return {
          clip:     track.clips[idx],
          track,
          nextClip: track.clips[idx + 1] || null
        };
      }
    }
    return null;
  }

  getEditorStore() {
    if (window.editorStore) return window.editorStore;
    if (window.$pinia) {
      const stores = window.$pinia._s || {};
      for (const [name, store] of Object.entries(stores)) {
        if (/editor|project/i.test(name)) return store._store || store;
      }
    }
    if (window.useEditorStore) {
      try { return window.useEditorStore(); } catch (_) {}
    }
    return null;
  }

  startMonitoring() {
    this.storeCheckInterval = setInterval(() => {
      const store = this.getEditorStore();
      if (!store) return;

      // Flush pending transitions
      while (this.pendingTransitions.length > 0) {
        const { clipId, transitionType, options } = this.pendingTransitions.shift();
        this.addTransitionToProject(clipId, transitionType, options, store);
      }

      // Detect track changes and re-inject + buttons
      const snapshot = JSON.stringify(
        (store.project?.tracks || []).map(t => (t.clips || []).map(c => c.id))
      );
      if (snapshot !== this.lastTrackSnapshot) {
        this.lastTrackSnapshot = snapshot;
        setTimeout(() => {
          window.TransitionsIntegration?.inject?.();
          window.TransitionsIntegration?.syncFromStore?.();
        }, 200);
      }
    }, 500);
  }

  showNotification(message, type = 'info') {
    let n = document.querySelector('.transitions-notification');
    if (n) n.remove();
    n = document.createElement('div');
    n.className = `transitions-notification transitions-notification-${type}`;
    n.textContent = message;
    Object.assign(n.style, {
      position: 'fixed', bottom: '20px', right: '20px',
      padding: '12px 20px', borderRadius: '8px',
      fontSize: '14px', fontWeight: '500',
      zIndex: '10002', color: '#fff',
      background: { success:'#22c55e', error:'#ef4444', info:'#3b82f6', warning:'#f59e0b' }[type] || '#3b82f6',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,.3)',
      animation: 'slideInRight .3s ease-out'
    });
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  }

  destroy() {
    if (this.storeCheckInterval) clearInterval(this.storeCheckInterval);
  }
}

// Init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.transitionsStoreMonitor = new TransitionsStoreMonitor();
  });
} else {
  window.transitionsStoreMonitor = new TransitionsStoreMonitor();
}
