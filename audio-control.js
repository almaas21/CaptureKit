/**
 * Audio Control Module for Video Editor
 * Adds functionality to lower or detach audio from video clips
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAudioControl);
  } else {
    initAudioControl();
  }

  function initAudioControl() {
    console.log('[AudioControl] Initializing audio control features...');
    
    // Add CSS for audio control buttons
    addAudioControlStyles();
    
    // Listen for clip selection events
    window.addEventListener('editor:clipSelected', (e) => {
      // Add audio control buttons to properties panel when a clip is selected
      setTimeout(addAudioControlButtons, 100); // Small delay to ensure UI is ready
    });
    
    // Listen for general UI updates
    window.addEventListener('editor:updateUI', () => {
      addAudioControlButtons();
    });
    
    console.log('[AudioControl] Initialization complete');
  }

  function addAudioControlStyles() {
    const styleId = 'audio-control-styles';
    if (document.getElementById(styleId)) return; // Already added
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Audio control buttons in clip properties */
      .audio-control-buttons {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #3f3f46;
      }
      
      .audio-control-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      
      .audio-lower-btn {
        background: #f59e0b;
        color: #18181b;
      }
      
      .audio-lower-btn:hover {
        background: #d97706;
      }
      
      .audio-detach-btn {
        background: #ef4444;
        color: white;
      }
      
      .audio-detach-btn:hover {
        background: #dc2626;
      }
      
      .audio-attach-btn {
        background: #10b981;
        color: white;
      }
      
      .audio-attach-btn:hover {
        background: #059669;
      }
      
      .audio-control-section {
        margin-top: 8px;
        padding: 8px;
        background: #18181b;
        border-radius: 6px;
        border: 1px solid #3f3f46;
      }
      
      .audio-control-label {
        font-size: 12px;
        font-weight: 500;
        color: #a1a1aa;
        margin-bottom: 4px;
        display: block;
      }
      
      .audio-volume-slider {
        width: 100%;
        height: 6px;
        background: #3f3f46;
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;
      }
      
      .audio-volume-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 14px;
        height: 14px;
        background: #7c3aed;
        border-radius: 50%;
        cursor: pointer;
      }
      
      .audio-volume-value {
        font-size: 11px;
        color: #a1a1aa;
        text-align: center;
        margin-top: 2px;
      }
    `;
    
    document.head.appendChild(style);
  }

  function addAudioControlButtons() {
    // Find the properties panel - look for common class names
    const propertiesPanels = document.querySelectorAll(`
      .properties-panel,
      .clip-properties,
      .properties,
      [class*="properties"],
      .sidebar-panel,
      .panel,
      [class*="property"],
      .settings-panel,
      .inspector-panel
    `);
    
    if (propertiesPanels.length === 0) {
      // If no properties panel found, try again later
      setTimeout(addAudioControlButtons, 500);
      return;
    }
    
    // Find the selected clip
    const selectedClipId = findSelectedClipId();
    if (!selectedClipId) {
      // No clip selected, remove any existing controls
      removeAudioControls();
      return;
    }
    
    // Find the clip in the project to check its type
    const clipData = findClipInProject(selectedClipId);
    if (!clipData || clipData.clip.type === 'audio') {
      // Don't show audio controls for audio clips
      removeAudioControls();
      return;
    }
    
    // Add controls to the first matching properties panel
    const panel = propertiesPanels[0];
    
    // Check if controls already exist
    if (panel.querySelector('.audio-control-buttons')) {
      updateAudioControls(selectedClipId, clipData.clip);
      return;
    }
    
    // Create audio control section
    const audioControlDiv = document.createElement('div');
    audioControlDiv.className = 'audio-control-section';
    audioControlDiv.innerHTML = `
      <label class="audio-control-label">Audio Controls</label>
      <div class="audio-control-buttons">
        <button class="audio-control-btn audio-lower-btn" title="Lower audio volume">
          🔉 <span>Lower Audio</span>
        </button>
        <button class="audio-control-btn audio-detach-btn" title="Detach audio from video">
          ✂️ <span>Detach Audio</span>
        </button>
      </div>
      <div class="audio-volume-control" style="display: none; margin-top: 8px;">
        <label class="audio-control-label">Audio Volume</label>
        <input type="range" min="0" max="100" value="100" class="audio-volume-slider" id="audioVolumeSlider">
        <div class="audio-volume-value"><span id="audioVolumeValue">100%</span></div>
      </div>
    `;
    
    // Add to properties panel
    panel.appendChild(audioControlDiv);
    
    // Add event listeners
    const lowerBtn = panel.querySelector('.audio-lower-btn');
    const detachBtn = panel.querySelector('.audio-detach-btn');
    const volumeSlider = panel.querySelector('#audioVolumeSlider');
    const volumeValue = panel.querySelector('#audioVolumeValue');
    
    lowerBtn.addEventListener('click', () => lowerAudioVolume(selectedClipId));
    detachBtn.addEventListener('click', () => detachAudioFromClip(selectedClipId));
    volumeSlider.addEventListener('input', (e) => {
      const volume = e.target.value / 100;
      updateAudioVolume(selectedClipId, volume);
      volumeValue.textContent = `${e.target.value}%`;
    });
    
    // Initialize volume display
    updateAudioControls(selectedClipId, clipData.clip);
  }

  function updateAudioControls(clipId, clip) {
    const volumeSlider = document.querySelector('#audioVolumeSlider');
    const volumeValue = document.querySelector('#audioVolumeValue');
    
    if (volumeSlider && volumeValue) {
      // Use the clip's volume property if it exists, otherwise default to 1
      const volume = typeof clip.volume !== 'undefined' ? clip.volume : 1;
      const volumePercent = Math.round(volume * 100);
      volumeSlider.value = volumePercent;
      volumeValue.textContent = `${volumePercent}%`;
    }
  }

  function removeAudioControls() {
    const controls = document.querySelectorAll('.audio-control-section');
    controls.forEach(control => control.remove());
  }

  function findSelectedClipId() {
    // Try different methods to find the selected clip ID
    // Method 1: Check for data attributes on selected elements
    const selectedElements = document.querySelectorAll('.selected, [data-selected="true"], .active');
    for (const el of selectedElements) {
      const clipId = el.dataset.clipId || el.dataset.id;
      if (clipId) return clipId;
    }
    
    // Method 2: Check for global state
    const editorStore = window.editorStore || window.useEditorStore?.();
    if (editorStore && editorStore.selectedClipId) {
      return editorStore.selectedClipId;
    }
    
    // Method 3: Check for a global variable that might hold selection
    if (window.selectedClipId) {
      return window.selectedClipId;
    }
    
    return null;
  }

  function findClipInProject(clipId) {
    const editorStore = window.editorStore || window.useEditorStore?.();
    
    if (!editorStore || !editorStore.project?.tracks) {
      return null;
    }
    
    // Search in all tracks for the clip
    for (const track of editorStore.project.tracks) {
      if (track.clips) {
        const clipIndex = track.clips.findIndex(c => c.id === clipId);
        if (clipIndex !== -1) {
          return {
            clip: track.clips[clipIndex],
            track: track,
            clipIndex: clipIndex
          };
        }
      }
    }
    
    return null;
  }

  function lowerAudioVolume(clipId) {
    console.log('[AudioControl] Lowering audio volume for clip:', clipId);
    
    const clipData = findClipInProject(clipId);
    if (!clipData) {
      showNotification('Could not find selected clip', 'error');
      return;
    }
    
    const { clip, track, clipIndex } = clipData;
    
    // Lower the volume by 50% (or to 0.3 if already lowered)
    const newVolume = clip.audioVolume !== undefined ? 
      Math.max(0, clip.audioVolume - 0.3) : 
      Math.max(0, (clip.volume || 1) - 0.3);
      
    // Store the original volume if not already stored
    if (clip.originalVolume === undefined) {
      clip.originalVolume = clip.volume || 1;
    }
    
    // Set the audio-specific volume
    clip.audioVolume = Math.max(0, Math.min(1, newVolume));
    
    // Update the project
    const editorStore = window.editorStore || window.useEditorStore?.();
    if (editorStore) {
      if (typeof editorStore.pushSnapshot === 'function') {
        editorStore.pushSnapshot();
      }
      if (typeof editorStore.saveNow === 'function') {
        editorStore.saveNow();
      }
    }
    
    showNotification(`Audio volume lowered to ${(clip.audioVolume * 100).toFixed(0)}%`, 'success');
    
    // Update UI
    updateAudioControls(clipId, clip);
  }

  function detachAudioFromClip(clipId) {
    console.log('[AudioControl] Detaching audio from clip:', clipId);
    
    const clipData = findClipInProject(clipId);
    if (!clipData) {
      showNotification('Could not find selected clip', 'error');
      return;
    }
    
    const { clip, track } = clipData;
    
    // Find an available audio track
    const editorStore = window.editorStore || window.useEditorStore?.();
    if (!editorStore) {
      showNotification('Editor store not available', 'error');
      return;
    }
    
    // Look for audio tracks
    let audioTrack = editorStore.project.tracks.find(t => t.type === 'audio');
    
    // If no audio track exists, create one
    if (!audioTrack) {
      if (typeof editorStore.addTrack === 'function') {
        editorStore.addTrack('audio');
        audioTrack = editorStore.project.tracks.find(t => t.type === 'audio');
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
        editorStore.project.tracks.push(audioTrack);
      }
    }
    
    if (!audioTrack) {
      showNotification('Could not create audio track', 'error');
      return;
    }
    
    // Create a new audio-only clip from the video clip
    const audioClip = {
      id: crypto.randomUUID(),
      mediaId: clip.mediaId,
      type: 'audio',
      name: `${clip.name || 'Clip'} Audio`,
      startTime: clip.startTime,
      duration: clip.duration,
      trimStart: clip.trimStart || 0,
      trimEnd: clip.trimEnd || clip.duration,
      volume: clip.audioVolume !== undefined ? clip.audioVolume : (clip.volume || 1),
      muted: clip.muted || false,
      trackId: audioTrack.id,
      createdAt: Date.now(),
      isDetachedAudio: true,  // Flag to indicate this is detached audio
      sourceClipId: clipId    // Reference back to original clip
    };
    
    // Add the audio clip to the audio track
    audioTrack.clips.push(audioClip);
    
    // Mark the original clip as having detached audio
    clip.hasDetachedAudio = true;
    clip.audioDetached = true;
    
    // Update the project
    if (typeof editorStore.pushSnapshot === 'function') {
      editorStore.pushSnapshot();
    }
    if (typeof editorStore.saveNow === 'function') {
      editorStore.saveNow();
    }
    
    showNotification('Audio detached to new audio track', 'success');
    
    // Update UI
    addAudioControlButtons(); // Refresh the buttons to show "attach" option
  }

  function attachAudioToClip(clipId) {
    console.log('[AudioControl] Attaching audio back to clip:', clipId);
    
    const clipData = findClipInProject(clipId);
    if (!clipData) {
      showNotification('Could not find selected clip', 'error');
      return;
    }
    
    const { clip, track } = clipData;
    
    // Find the detached audio clip
    const editorStore = window.editorStore || window.useEditorStore?.();
    if (!editorStore) {
      showNotification('Editor store not available', 'error');
      return;
    }
    
    // Look for detached audio clips that reference this source clip
    let audioClip = null;
    let audioTrack = null;
    let audioClipIndex = -1;
    
    for (const t of editorStore.project.tracks) {
      if (t.type === 'audio') {
        for (let i = 0; i < t.clips.length; i++) {
          const c = t.clips[i];
          if (c.sourceClipId === clipId && c.isDetachedAudio) {
            audioClip = c;
            audioTrack = t;
            audioClipIndex = i;
            break;
          }
        }
      }
      if (audioClip) break;
    }
    
    if (!audioClip || !audioTrack) {
      showNotification('No detached audio found for this clip', 'warning');
      return;
    }
    
    // Restore the audio to the original clip
    clip.audioVolume = audioClip.volume;
    clip.hasDetachedAudio = false;
    clip.audioDetached = false;
    
    // Remove the detached audio clip
    audioTrack.clips.splice(audioClipIndex, 1);
    
    // Update the project
    if (typeof editorStore.pushSnapshot === 'function') {
      editorStore.pushSnapshot();
    }
    if (typeof editorStore.saveNow === 'function') {
      editorStore.saveNow();
    }
    
    showNotification('Audio reattached to video clip', 'success');
    
    // Update UI
    addAudioControlButtons(); // Refresh the buttons
  }

  function updateAudioVolume(clipId, volume) {
    const clipData = findClipInProject(clipId);
    if (!clipData) return;
    
    const { clip } = clipData;
    
    // Store the audio-specific volume
    clip.audioVolume = Math.max(0, Math.min(1, volume));
    
    // Update the project
    const editorStore = window.editorStore || window.useEditorStore?.();
    if (editorStore) {
      if (typeof editorStore.pushSnapshot === 'function') {
        editorStore.pushSnapshot();
      }
      if (typeof editorStore.saveNow === 'function') {
        editorStore.saveNow();
      }
    }
  }

  function showNotification(message, type = 'info') {
    // Remove existing notification if any
    const existing = document.querySelector('.audio-control-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `audio-control-notification`;
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

  // Expose functions globally
  window.AudioControl = {
    lowerAudioVolume,
    detachAudioFromClip,
    attachAudioToClip,
    init: initAudioControl
  };
})();