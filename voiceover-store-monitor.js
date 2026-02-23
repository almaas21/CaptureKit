/**
 * Voice Over Integration Helper
 * Monitors for editor store availability and adds voice over clips when available
 */

class VoiceOverStoreMonitor {
  constructor() {
    this.pendingVoiceOvers = [];
    this.storeCheckInterval = null;
    this.init();
  }

  init() {
    // Listen for voice over completion events
    window.addEventListener('voiceover:addToTimeline', (e) => {
      const { mediaItem } = e.detail;
      this.handleVoiceOver(mediaItem);
    });

    // Start monitoring for store availability
    this.startMonitoring();
  }

  handleVoiceOver(mediaItem) {
    const editorStore = this.getEditorStore();
    
    if (editorStore) {
      this.addVoiceOverToTimeline(mediaItem, editorStore);
    } else {
      // Store not available yet, queue for later
      this.pendingVoiceOvers.push(mediaItem);
      console.log('[VoiceOver] Editor store not ready, queuing voice over');
    }
  }

  addVoiceOverToTimeline(mediaItem, editorStore) {
    try {
      // Find or create an audio track
      let audioTrack = null;
      
      // Look for existing audio tracks
      if (editorStore.project && editorStore.project.tracks) {
        audioTrack = editorStore.project.tracks.find(t => t.type === 'audio');
      } else if (editorStore.tracks) {
        audioTrack = editorStore.tracks.find(t => t.type === 'audio');
      }
      
      // If no audio track found, create one
      if (!audioTrack) {
        if (typeof editorStore.addTrack === 'function') {
          editorStore.addTrack('audio');
          // Get the newly created audio track
          audioTrack = (editorStore.project?.tracks || editorStore.tracks).find(t => t.type === 'audio');
        } else {
          // Create track manually
          const trackId = crypto.randomUUID();
          audioTrack = {
            id: trackId,
            type: 'audio',
            label: 'A1',
            clips: [],
            overlayClips: [],
            muted: false,
            volume: 1,
            zIndex: 0
          };
          
          if (editorStore.project && editorStore.project.tracks) {
            editorStore.project.tracks.push(audioTrack);
          } else if (editorStore.tracks) {
            editorStore.tracks.push(audioTrack);
          }
        }
      }
      
      if (audioTrack) {
        // Create the audio clip
        const clip = {
          id: crypto.randomUUID(),
          mediaId: mediaItem.id,
          type: 'audio',
          name: mediaItem.name,
          startTime: editorStore.currentTime || 0, // Start at current playhead position
          duration: mediaItem.duration,
          trimStart: 0,
          trimEnd: mediaItem.duration,
          volume: 1,
          muted: false,
          trackId: audioTrack.id,
          createdAt: Date.now()
        };
        
        // Add the clip to the track
        if (typeof editorStore.addClip === 'function') {
          editorStore.addClip(audioTrack.id, clip);
        } else {
          audioTrack.clips.push(clip);
          // Sort clips by start time
          audioTrack.clips.sort((a, b) => a.startTime - b.startTime);
        }
        
        // Save the project
        if (typeof editorStore.saveNow === 'function') {
          editorStore.saveNow();
        }
        
        // Trigger UI update
        if (typeof editorStore.pushSnapshot === 'function') {
          editorStore.pushSnapshot();
        }
        
        console.log('[VoiceOver] Added to timeline:', clip.id);
        this.showNotification('Voice over added to timeline!', 'success');
      }
    } catch (error) {
      console.error('[VoiceOver] Error adding to timeline:', error);
      this.showNotification('Error adding voice over to timeline', 'error');
    }
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
        // Process pending voice overs
        while (this.pendingVoiceOvers.length > 0) {
          const mediaItem = this.pendingVoiceOvers.shift();
          this.addVoiceOverToTimeline(mediaItem, store);
        }
      }
    }, 500);
  }

  showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.voice-over-notification');
    if (notification) {
      notification.remove();
    }
    
    notification = document.createElement('div');
    notification.className = `voice-over-notification voice-over-notification-${type}`;
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
      setTimeout(() => notification.remove(), 300);
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
    window.voiceOverStoreMonitor = new VoiceOverStoreMonitor();
  });
} else {
  window.voiceOverStoreMonitor = new VoiceOverStoreMonitor();
}