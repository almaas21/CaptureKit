/**
 * Transitions Integration for Video Editor
 * Integrates the transitions module with the existing editor
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTransitionsIntegration);
  } else {
    initTransitionsIntegration();
  }

  function initTransitionsIntegration() {
    console.log('[Transitions] Initializing transitions integration...');

    // Create transitions container
    const container = document.createElement('div');
    container.id = 'transitionsContainer';
    container.style.display = 'none';
    document.body.appendChild(container);

    // Initialize transitions manager and UI
    const manager = new TransitionManager();
    let transitionsUI = null;

    // Track selected clip
    let selectedClipId = null;

    // Listen for clip selection events
    window.addEventListener('editor:clipSelected', (e) => {
      selectedClipId = e.detail?.clipId || null;
      if (transitionsUI) {
        transitionsUI.setSelectedClip(selectedClipId);
      }
    });

    // Listen for timeline click events
    document.addEventListener('click', (e) => {
      const clipElement = e.target.closest('[data-clip-id], .clip, .timeline-clip');
      if (clipElement) {
        selectedClipId = clipElement.dataset.clipId || clipElement.dataset.id;
        if (transitionsUI) {
          transitionsUI.setSelectedClip(selectedClipId);
        }
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('editor:clipSelected', {
          detail: { clipId: selectedClipId }
        }));
      }
    });

    // Handle transition selection
    function handleTransitionSelect(clipId, transitionType, options) {
      console.log('[Transitions] Adding transition:', transitionType, 'to clip:', clipId);

      // Find the clip and next clip in timeline
      const clipData = findClipInProject(clipId);
      if (!clipData) {
        showNotification('Clip not found in timeline', 'error');
        return;
      }

      const { clip, track, nextClip } = clipData;
      
      if (!nextClip) {
        showNotification('Add another clip after this one to create a transition', 'warning');
        return;
      }

      // Validate transition duration
      const maxDuration = Math.min(clip.duration, nextClip.duration) / 2;
      const duration = Math.min(options.duration || 1.0, maxDuration);

      // Add transition
      const transition = manager.addTransition(clipId, nextClip.id, transitionType, {
        ...options,
        duration
      });

      // Save to project
      saveTransitionToProject(clipId, transition);

      // Update UI
      updateClipTransitionIndicator(clipId, true);
      
      showNotification(`${TRANSITION_TYPES[transitionType.toUpperCase()]?.name || transitionType} transition added!`, 'success');
    }

    // Handle transition removal
    function handleTransitionRemove(clipId) {
      console.log('[Transitions] Removing transition from clip:', clipId);
      
      removeTransitionFromProject(clipId);
      updateClipTransitionIndicator(clipId, false);
      
      showNotification('Transition removed', 'info');
    }

    // Handle transition update
    function handleTransitionUpdate(clipId, updates) {
      const editorStore = getEditorStoreFromWindow();
      const transition = editorStore ? manager.getTransition(clipId) : null;
      if (!transition) return;

      // Update duration
      if (updates.duration !== undefined) {
        const clipData = findClipInProject(clipId);
        if (clipData && clipData.nextClip) {
          const maxDuration = Math.min(clipData.clip.duration, clipData.nextClip.duration) / 2;
          transition.duration = Math.min(updates.duration, maxDuration);
        }
      }

      // Save updated transition
      saveTransitionToProject(clipId, transition);
    }

    // Find clip in project - improved method
    function findClipInProject(clipId) {
      // Use the same method as TransitionsStoreMonitor
      const editorStore = getEditorStoreFromWindow();
      
      if (!editorStore || !editorStore.project?.tracks) {
        // Fallback: search in DOM
        return findClipInDOM(clipId);
      }

      // Search in store
      for (const track of editorStore.project.tracks) {
        if (track.clips) {
          const clipIndex = track.clips.findIndex(c => c.id === clipId);
          if (clipIndex !== -1) {
            return {
              clip: track.clips[clipIndex],
              track: track,
              nextClip: track.clips[clipIndex + 1] || null
            };
          }
        }
      }

      return null;
    }

    // Get editor store from window - same as TransitionsStoreMonitor
    function getEditorStoreFromWindow() {
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

    // Find clip in DOM (fallback)
    function findClipInDOM(clipId) {
      const clipElement = document.querySelector(`[data-clip-id="${clipId}"], [data-id="${clipId}"]`);
      if (!clipElement) return null;

      // Try to extract clip data from element
      const startTime = parseFloat(clipElement.dataset.startTime || 0);
      const duration = parseFloat(clipElement.dataset.duration || 0);

      return {
        clip: { id: clipId, startTime, duration },
        track: null,
        nextClip: null // Would need to find next sibling
      };
    }

    // Save transition to project
    function saveTransitionToProject(clipId, transition) {
      const editorStore = getEditorStoreFromWindow();
      if (!editorStore) return;

      // Add transitions array to project if not exists
      if (!editorStore.project.transitions) {
        editorStore.project.transitions = [];
      }

      // Remove existing transition for this clip
      editorStore.project.transitions = editorStore.project.transitions.filter(
        t => t.fromClipId !== clipId && t.toClipId !== clipId
      );

      // Add new transition
      editorStore.project.transitions.push(transition);

      // Trigger save
      if (typeof editorStore.saveNow === 'function') {
        editorStore.saveNow();
      }

      console.log('[Transitions] Saved to project:', transition);
    }

    // Remove transition from project
    function removeTransitionFromProject(clipId) {
      const editorStore = getEditorStoreFromWindow();
      if (!editorStore || !editorStore.project?.transitions) return;

      editorStore.project.transitions = editorStore.project.transitions.filter(
        t => t.fromClipId !== clipId && t.toClipId !== clipId
      );

      if (typeof editorStore.saveNow === 'function') {
        editorStore.saveNow();
      }
    }

    // Update clip transition indicator
    function updateClipTransitionIndicator(clipId, hasTransition) {
      const clipElement = document.querySelector(`[data-clip-id="${clipId}"], [data-id="${clipId}"]`);
      if (!clipElement) return;

      if (hasTransition) {
        // Add transition indicator
        if (!clipElement.querySelector('.transition-badge')) {
          const badge = document.createElement('div');
          badge.className = 'transition-badge';
          badge.innerHTML = '✨';
          clipElement.appendChild(badge);
        }
        clipElement.classList.add('has-transition');
      } else {
        // Remove transition indicator
        const badge = clipElement.querySelector('.transition-badge');
        if (badge) badge.remove();
        clipElement.classList.remove('has-transition');
      }
    }

    // Show notification
    function showNotification(message, type = 'info') {
      const notification = document.createElement('div');
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

    // Add transitions button to toolbar
    function addTransitionsButton() {
      // Try multiple selectors to find the toolbar
      let toolbar = document.querySelector('.editor-toolbar, .toolbar, [class*="toolbar"], .track-controls, [class*="track-control"], .timeline-header, [class*="timeline-header"]');
      
      // If no toolbar found, try to find the media panel header
      if (!toolbar) {
        const mediaPanel = document.querySelector('.media-panel, [class*="media"]');
        if (mediaPanel) {
          const header = mediaPanel.querySelector('header, .header, [class*="header"]');
          if (header) toolbar = header;
        }
      }

      // Try to find the track buttons container
      if (!toolbar) {
        // Look for any container that has track-related buttons
        const trackBtns = document.querySelectorAll('button');
        for (const btn of trackBtns) {
          const btnText = btn.textContent.toLowerCase();
          if (btnText.includes('add track') || btnText.includes('video track') || btnText.includes('overlay')) {
            // Found a track button, try to get its parent container
            const parent = btn.closest('div[class*="flex"], div[class*="toolbar"], div[class*="header"], div[class*="panel"]');
            if (parent) {
              toolbar = parent;
              break;
            }
          }
        }
      }

      if (toolbar) {
        const btn = document.createElement('button');
        btn.className = 'transitions-toolbar-btn';
        btn.innerHTML = '<span class="icon">✨</span><span>Transitions</span>';
        btn.title = 'Add video transitions';
        btn.onclick = () => {
          if (!transitionsUI) {
            transitionsUI = new TransitionsUI(
              document.getElementById('transitionsContainer'),
              {
                manager,
                onTransitionSelect: handleTransitionSelect,
                onTransitionRemove: handleTransitionRemove,
                onTransitionUpdate: handleTransitionUpdate
              }
            );
          }
          transitionsUI.show();
          transitionsUI.setSelectedClip(selectedClipId);
        };

        toolbar.appendChild(btn);
        console.log('[Transitions] Button added to toolbar');
      } else {
        // Try to create a toolbar row near the timeline
        const timelineContainer = document.querySelector('.timeline, [class*="timeline"], #app > div');
        if (timelineContainer) {
          // Create a button bar container
          const buttonBar = document.createElement('div');
          buttonBar.className = 'feature-buttons-row';
          buttonBar.style.cssText = 'display:flex;gap:8px;padding:8px;background:rgba(0,0,0,0.3);border-radius:8px;margin:8px;align-items:center;';
          
          const btn = document.createElement('button');
          btn.className = 'transitions-toolbar-btn';
          btn.innerHTML = '<span class="icon">✨</span><span>Transitions</span>';
          btn.title = 'Add video transitions';
          btn.onclick = () => {
            if (!transitionsUI) {
              transitionsUI = new TransitionsUI(
                document.getElementById('transitionsContainer'),
                {
                  manager,
                  onTransitionSelect: handleTransitionSelect,
                  onTransitionRemove: handleTransitionRemove,
                  onTransitionUpdate: handleTransitionUpdate
                }
              );
            }
            transitionsUI.show();
            transitionsUI.setSelectedClip(selectedClipId);
          };
          
          buttonBar.appendChild(btn);
          timelineContainer.insertBefore(buttonBar, timelineContainer.firstChild);
          console.log('[Transitions] Button bar created');
        } else {
          // Last resort: create floating button
          createFloatingTransitionsButton();
        }
      }
    }

    // Create floating button as fallback
    function createFloatingTransitionsButton() {
      const floatingBtn = document.createElement('button');
      floatingBtn.className = 'transitions-floating-btn';
      floatingBtn.innerHTML = '✨';
      floatingBtn.title = 'Add video transitions';
      Object.assign(floatingBtn.style, {
        position: 'fixed',
        bottom: '84px',
        right: '20px',
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        background: '#7c3aed',
        color: 'white',
        border: 'none',
        fontSize: '24px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
        zIndex: '9998',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s'
      });

      floatingBtn.onmouseenter = () => {
        floatingBtn.style.transform = 'scale(1.1)';
        floatingBtn.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.5)';
      };

      floatingBtn.onmouseleave = () => {
        floatingBtn.style.transform = 'scale(1)';
        floatingBtn.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
      };

      floatingBtn.onclick = () => {
        if (!transitionsUI) {
          transitionsUI = new TransitionsUI(
            document.getElementById('transitionsContainer'),
            {
              manager,
              onTransitionSelect: handleTransitionSelect,
              onTransitionRemove: handleTransitionRemove,
              onTransitionUpdate: handleTransitionUpdate
            }
          );
        }
        transitionsUI.show();
        transitionsUI.setSelectedClip(selectedClipId);
      };

      document.body.appendChild(floatingBtn);
      console.log('[Transitions] Floating button added');
    }

    // Add CSS animations
    function addAnimations() {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutRight {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(100px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Load existing transitions from project
    function loadExistingTransitions() {
      const editorStore = getEditorStoreFromWindow();
      if (!editorStore || !editorStore.project?.transitions) return;

      editorStore.project.transitions.forEach(t => {
        manager.transitions.set(t.fromClipId, t);
        manager.transitions.set(t.toClipId, t);
      });

      console.log('[Transitions] Loaded existing transitions:', editorStore.project.transitions.length);
    }

    // Initialize
    addAnimations();
    setTimeout(addTransitionsButton, 1000);
    setTimeout(addTransitionsButton, 3000);
    
    // Load existing transitions after a delay
    setTimeout(loadExistingTransitions, 1500);

    console.log('[Transitions] Integration initialized');

    // Expose API
    window.TransitionsIntegration = {
      manager,
      show: () => {
        if (!transitionsUI) {
          transitionsUI = new TransitionsUI(
            document.getElementById('transitionsContainer'),
            {
              manager,
              onTransitionSelect: handleTransitionSelect,
              onTransitionRemove: handleTransitionRemove,
              onTransitionUpdate: handleTransitionUpdate
            }
          );
        }
        transitionsUI.show();
        transitionsUI.setSelectedClip(selectedClipId);
      },
      hide: () => transitionsUI?.hide(),
      setSelectedClip: (clipId) => {
        selectedClipId = clipId;
        transitionsUI?.setSelectedClip(clipId);
      }
    };
  }
})();
