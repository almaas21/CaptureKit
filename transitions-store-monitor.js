/**
 * Transitions Integration Helper
 * Monitors for editor store availability and manages transitions
 */

class TransitionsStoreMonitor {
  constructor() {
    this.manager = new TransitionManager();
    this.storeCheckInterval = null;
    this.pendingTransitions = [];
    this.init();
  }

  init() {
    // Listen for transition events
    window.addEventListener('transitions:add', (e) => {
      const { clipId, transitionType, options } = e.detail;
      this.handleTransition(clipId, transitionType, options);
    });

    // Start monitoring for store availability
    this.startMonitoring();
  }

  handleTransition(clipId, transitionType, options) {
    const editorStore = this.getEditorStore();
    
    if (editorStore) {
      this.addTransitionToProject(clipId, transitionType, options, editorStore);
    } else {
      // Store not available yet, queue for later
      this.pendingTransitions.push({ clipId, transitionType, options });
      console.log('[Transitions] Editor store not ready, queuing transition');
    }
  }

  addTransitionToProject(clipId, transitionType, options, editorStore) {
    try {
      // Find the clip and next clip in the project
      const clipData = this.findClipInProject(clipId, editorStore);
      if (!clipData) {
        console.error('[Transitions] Could not find clip in project');
        this.showNotification('Could not find selected clip in project', 'error');
        return;
      }

      if (!clipData.nextClip) {
        console.warn('[Transitions] No next clip found for transition');
        this.showNotification('Add another clip after this one to create a transition', 'warning');
        return;
      }

      const { clip, nextClip } = clipData;

      // Validate transition duration
      const maxDuration = Math.min(clip.duration, nextClip.duration) / 2;
      const duration = Math.min(options?.duration || 1.0, maxDuration);

      // Create transition object
      const transition = {
        id: crypto.randomUUID(),
        fromClipId: clipId,
        toClipId: nextClip.id,
        type: transitionType,
        duration: duration,
        parameters: options || {},
        createdAt: Date.now()
      };

      // Add to project
      if (!editorStore.project.transitions) {
        editorStore.project.transitions = [];
      }

      // Remove existing transition for these clips
      editorStore.project.transitions = editorStore.project.transitions.filter(
        t => !(t.fromClipId === clipId || t.toClipId === clipId)
      );

      // Add new transition
      editorStore.project.transitions.push(transition);

      // Save the project
      if (typeof editorStore.saveNow === 'function') {
        editorStore.saveNow();
      }

      // Trigger UI update
      if (typeof editorStore.pushSnapshot === 'function') {
        editorStore.pushSnapshot();
      }

      console.log('[Transitions] Added to project:', transition);
      this.showNotification(`${TRANSITION_TYPES[transitionType.toUpperCase()]?.name || transitionType} transition added!`, 'success');
    } catch (error) {
      console.error('[Transitions] Error adding transition:', error);
      this.showNotification('Error adding transition to project', 'error');
    }
  }

  findClipInProject(clipId, editorStore) {
    if (!editorStore || !editorStore.project?.tracks) return null;

    // Search in all tracks for the clip
    for (const track of editorStore.project.tracks) {
      if (track.clips) {
        const clipIndex = track.clips.findIndex(c => c.id === clipId);
        if (clipIndex !== -1) {
          return {
            clip: track.clips[clipIndex],
            track: track,
            nextClip: track.clips[clipIndex + 1] || null // Next clip in the same track
          };
        }
      }
    }

    return null; // Clip not found
  }

  getEditorStore() {
    // Try multiple methods to get the editor store
    
    // Method 1: Direct store reference
    if (window.editorStore) return window.editorStore;
    
    // Method 2: Pinia store
    if (window.$pinia) {
      const stores = window.$pinia._s || window.$pinia.state?.value || {};
      for (const [name, store] of Object.entries(stores)) {
        if (name.includes('editor') || name.includes('project')) {
          return store._store || store;
        }
      }
    }
    
    // Method 3: Function to get store
    if (window.useEditorStore) {
      try {
        return window.useEditorStore();
      } catch (e) {
        // Function might not be ready yet
      }
    }
    
    // Method 4: Check window object for store-like objects
    const possibleNames = ['editorStore', 'projectStore', 'timelineStore'];
    for (const name of possibleNames) {
      if (window[name] && typeof window[name] === 'object' && 
          (window[name].project || window[name].currentTime || window[name].tracks)) {
        return window[name];
      }
    }
    
    return null;
  }

  startMonitoring() {
    // Check for store every 500ms
    this.storeCheckInterval = setInterval(() => {
      const store = this.getEditorStore();
      
      if (store) {
        // Process pending transitions
        while (this.pendingTransitions.length > 0) {
          const { clipId, transitionType, options } = this.pendingTransitions.shift();
          this.addTransitionToProject(clipId, transitionType, options, store);
        }
      }
    }, 500);
  }

  showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.transitions-notification');
    if (notification) {
      notification.remove();
    }
    
    notification = document.createElement('div');
    notification.className = `transitions-notification transitions-notification-${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10002',
      animation: 'slideInRight 0.3s ease-out',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
    });
    
    const colors = {
      success: '#22c55e',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b'
    };
    notification.style.background = colors[type] || colors.info;
    notification.style.color = 'white';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => notification.remove(), 3000);
    }, 3000);
  }

  destroy() {
    if (this.storeCheckInterval) {
      clearInterval(this.storeCheckInterval);
    }
  }
}

// Initialize the monitor when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.transitionsStoreMonitor = new TransitionsStoreMonitor();
  });
} else {
  window.transitionsStoreMonitor = new TransitionsStoreMonitor();
}