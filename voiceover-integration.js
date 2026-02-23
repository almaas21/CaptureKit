/**
 * Voice Over Integration for Video Editor
 * Integrates the voice over module with the existing editor
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoiceOverIntegration);
  } else {
    initVoiceOverIntegration();
  }

  function initVoiceOverIntegration() {
    console.log('[VoiceOver] Initializing voice over integration...');
    
    // Create voice over container
    const container = document.createElement('div');
    container.id = 'voiceOverContainer';
    container.style.display = 'none';
    document.body.appendChild(container);

    // Initialize voice over UI
    let voiceOverInstance = null;

    // Function to handle recording completion
    async function handleRecordingComplete(result) {
      console.log('[VoiceOver] Recording completed:', result);
      
      // Generate unique name for the recording
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
      minute: '2-digit',
        second: '2-digit'
      });
      const name = `Voice Over ${timestamp}`;
      
      // Create media item
      const mediaItem = {
        id: crypto.randomUUID(),
        name: name,
        type: 'audio',
        blob: result.blob,
        duration: result.duration,
        source: 'voiceover',
        createdAt: new Date().toISOString(),
        mimeType: result.mimeType
      };

      // Save to IndexedDB
      try {
        await saveMediaToIndexedDB(mediaItem);
        console.log('[VoiceOver] Media saved to IndexedDB:', mediaItem.id);
        
        // Try to add directly to the media store or reload
        let reloaded = false;
        try {
          // Method 1: Use exposed global function to add to store
          if (typeof window.addMediaToStore === 'function') {
            await window.addMediaToStore(mediaItem);
            console.log('[VoiceOver] Media added via window.addMediaToStore');
            reloaded = true;
          } 
          // Method 2: Use exposed global function to reload
          else if (typeof window.reloadMediaStore === 'function') {
            await window.reloadMediaStore();
            console.log('[VoiceOver] Media reloaded via window.reloadMediaStore');
            reloaded = true;
          }
          // Method 3: Use exposed global function to get store
          else if (typeof window.useMediaStore === 'function') {
            const mediaStore = window.useMediaStore();
            if (mediaStore && typeof mediaStore.addItem === 'function') {
              await mediaStore.addItem(mediaItem);
              console.log('[VoiceOver] Media added via window.useMediaStore');
              reloaded = true;
            } else if (mediaStore && typeof mediaStore.load === 'function') {
              await mediaStore.load();
              console.log('[VoiceOver] Media reloaded via window.useMediaStore');
              reloaded = true;
            }
          }
        } catch (storeError) {
          console.log('[VoiceOver] Store error:', storeError.message);
        }
        
        // If store reload didn't work, try dispatching events
        if (!reloaded) {
          window.dispatchEvent(new CustomEvent('media:added', { detail: mediaItem }));
          window.dispatchEvent(new CustomEvent('media:reload'));
          console.log('[VoiceOver] Dispatched media events');
          
          // Wait a bit for events to process, then reload page as fallback
          setTimeout(() => {
            // Double-check if reloaded
            const mediaPanel = document.querySelector('.media-panel, [class*="media"]');
            const hasMedia = mediaPanel && mediaPanel.querySelector('[class*="item"], [class*="card"]');
            if (!hasMedia) {
              console.log('[VoiceOver] Reloading page to show new recording');
              window.location.reload();
            }
          }, 1500);
        }
        
        // Show success notification
        showNotification('Voice over recorded successfully!', 'success');
        
        // Ask user if they want to add to timeline
        if (confirm('Add this voice over to the timeline?')) {
          addToTimeline(mediaItem);
        }
      } catch (error) {
        console.error('[VoiceOver] Failed to save media:', error);
        showNotification('Failed to save recording. Please try again.', 'error');
      }
    }

    // Save media to IndexedDB
    async function saveMediaToIndexedDB(mediaItem) {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('ScreenRecorderDB', 2);
        
        request.onerror = () => reject(request.error);
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          const transaction = db.transaction(['media'], 'readwrite');
          const store = transaction.objectStore('media');
          
          const putRequest = store.put(mediaItem);
          
          putRequest.onsuccess = () => resolve(putRequest.result);
          putRequest.onerror = () => reject(putRequest.error);
          
          transaction.oncomplete = () => db.close();
        };
      });
    }

    // Add media to timeline
    function addToTimeline(mediaItem) {
      console.log('[VoiceOver] Adding to timeline:', mediaItem);
      
      // Dispatch custom event for the store monitor to handle
      const event = new CustomEvent('voiceover:addToTimeline', {
        detail: { mediaItem }
      });
      window.dispatchEvent(event);
      
      showNotification('Voice over added to timeline!', 'success');
    }

    // Create audio clip object
    function createAudioClip(mediaItem, track) {
      const now = Date.now();
      // Get current playhead time from editor store if available, otherwise default to 0
      let startTime = 0;
      const editorStore = window.editorStore || window.useEditorStore?.();
      if (editorStore && typeof editorStore.currentTime !== 'undefined') {
        startTime = editorStore.currentTime;
      }
      
      return {
        id: crypto.randomUUID(),
        mediaId: mediaItem.id,
        type: 'audio',
        name: mediaItem.name,
        startTime: startTime, // Start at current playhead position
        duration: mediaItem.duration,
        trimStart: 0,
        trimEnd: mediaItem.duration,
        volume: 1,
        muted: false,
        trackId: track.id,
        createdAt: now
      };
    }

    // Show notification
    function showNotification(message, type = 'info') {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `voice-over-notification voice-over-notification-${type}`;
      notification.textContent = message;
      
      // Style the notification
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
      
      // Set background based on type
      const colors = {
        success: '#22c55e',
        error: '#ef4444',
        info: '#3b82f6',
        warning: '#f59e0b'
      };
      notification.style.background = colors[type] || colors.info;
      notification.style.color = 'white';
      
      document.body.appendChild(notification);
      
      // Remove after 3 seconds
      setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
      }, 3000);
    }

    // Add voice over button to toolbar
    function addVoiceOverButton() {
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
        btn.className = 'voice-over-toolbar-btn';
        btn.innerHTML = '<span class="icon">🎙️</span><span>Voice Over</span>';
        btn.title = 'Record voice over';
        btn.onclick = () => {
          if (!voiceOverInstance) {
            voiceOverInstance = initVoiceOver({
              container: document.getElementById('voiceOverContainer'),
              onRecordingComplete: handleRecordingComplete
            });
          }
          voiceOverInstance.show();
        };
        
        toolbar.appendChild(btn);
        console.log('[VoiceOver] Button added to toolbar');
      } else {
        // Try to create a toolbar row near the timeline
        const timelineContainer = document.querySelector('.timeline, [class*="timeline"], #app > div');
        if (timelineContainer) {
          // Check if button bar already exists (created by transitions)
          let buttonBar = document.querySelector('.feature-buttons-row');
          
          if (!buttonBar) {
            // Create a button bar container
            buttonBar = document.createElement('div');
            buttonBar.className = 'feature-buttons-row';
            buttonBar.style.cssText = 'display:flex;gap:8px;padding:8px;background:rgba(0,0,0,0.3);border-radius:8px;margin:8px;align-items:center;';
            timelineContainer.insertBefore(buttonBar, timelineContainer.firstChild);
          }
          
          const btn = document.createElement('button');
          btn.className = 'voice-over-toolbar-btn';
          btn.innerHTML = '<span class="icon">🎙️</span><span>Voice Over</span>';
          btn.title = 'Record voice over';
          btn.onclick = () => {
            if (!voiceOverInstance) {
              voiceOverInstance = initVoiceOver({
                container: document.getElementById('voiceOverContainer'),
                onRecordingComplete: handleRecordingComplete
              });
            }
            voiceOverInstance.show();
          };
          
          buttonBar.appendChild(btn);
          console.log('[VoiceOver] Button added to button bar');
        } else {
          // Last resort: create floating button
          createFloatingVoiceOverButton();
        }
      }
    }

    // Create floating button as fallback
    function createFloatingVoiceOverButton() {
      const floatingBtn = document.createElement('button');
      floatingBtn.className = 'voice-over-floating-btn';
      floatingBtn.innerHTML = '🎙️';
      floatingBtn.title = 'Record voice over';
      Object.assign(floatingBtn.style, {
        position: 'fixed',
        bottom: '20px',
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
        zIndex: '9999',
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
        if (!voiceOverInstance) {
          voiceOverInstance = initVoiceOver({
            container: document.getElementById('voiceOverContainer'),
            onRecordingComplete: handleRecordingComplete
          });
        }
        voiceOverInstance.show();
      };
      
      document.body.appendChild(floatingBtn);
      console.log('[VoiceOver] Floating button added');
    }

    // Add CSS animations
    function addAnimations() {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideOutRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(100px);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Initialize
    addAnimations();
    
    // Wait a bit for the editor to fully load before adding the button
    setTimeout(addVoiceOverButton, 1000);
    
    // Also try again after a longer delay in case of slow loading
    setTimeout(addVoiceOverButton, 3000);
    
    // Listen for editor store availability
    const checkStoreInterval = setInterval(() => {
      if (window.editorStore || window.useEditorStore) {
        clearInterval(checkStoreInterval);
        console.log('[VoiceOver] Editor store detected');
      }
    }, 500);
    
    // Listen for editor loaded event
    window.addEventListener('editor:loaded', () => {
      console.log('[VoiceOver] Editor loaded event received');
    });
    
    // Listen for custom event when voice over should be added to timeline
    window.addEventListener('voiceover:addToTimeline', (e) => {
      const { mediaItem } = e.detail;
      addToTimeline(mediaItem);
    });
    
    console.log('[VoiceOver] Integration initialized');
  }

  // Expose API for external use
  window.VoiceOverIntegration = {
    init: initVoiceOverIntegration,
    show: function() {
      const container = document.getElementById('voiceOverContainer');
      if (container && window.initVoiceOver) {
        const instance = initVoiceOver({ container });
        instance.show();
        return instance;
      }
    },
    addToTimeline: function(mediaItem) {
      addToTimeline(mediaItem);
    }
  };
})();
