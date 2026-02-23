/**
 * Video Transitions Module for Video Editor
 * Handles transitions between video clips
 */

// Available transition types
const TRANSITION_TYPES = {
  // Fade transitions
  CROSSFADE: {
    id: 'crossfade',
    name: 'Crossfade',
    icon: '✨',
    category: 'fade',
    description: 'Smooth fade between clips',
    defaultDuration: 1.0,
    parameters: ['duration']
  },
  FADE_TO_BLACK: {
    id: 'fadeToBlack',
    name: 'Fade to Black',
    icon: '⬛',
    category: 'fade',
    description: 'Fade through black',
    defaultDuration: 1.0,
    parameters: ['duration']
  },
  FADE_TO_WHITE: {
    id: 'fadeToWhite',
    name: 'Fade to White',
    icon: '⬜',
    category: 'fade',
    description: 'Fade through white',
    defaultDuration: 1.0,
    parameters: ['duration']
  },
  
  // Wipe transitions
  WIPE_LEFT: {
    id: 'wipeLeft',
    name: 'Wipe Left',
    icon: '⬅️',
    category: 'wipe',
    description: 'Wipe from right to left',
    defaultDuration: 0.8,
    parameters: ['duration', 'softness']
  },
  WIPE_RIGHT: {
    id: 'wipeRight',
    name: 'Wipe Right',
    icon: '➡️',
    category: 'wipe',
    description: 'Wipe from left to right',
    defaultDuration: 0.8,
    parameters: ['duration', 'softness']
  },
  WIPE_UP: {
    id: 'wipeUp',
    name: 'Wipe Up',
    icon: '⬆️',
    category: 'wipe',
    description: 'Wipe from bottom to top',
    defaultDuration: 0.8,
    parameters: ['duration', 'softness']
  },
  WIPE_DOWN: {
    id: 'wipeDown',
    name: 'Wipe Down',
    icon: '⬇️',
    category: 'wipe',
    description: 'Wipe from top to bottom',
    defaultDuration: 0.8,
    parameters: ['duration', 'softness']
  },
  
  // Slide transitions
  SLIDE_LEFT: {
    id: 'slideLeft',
    name: 'Slide Left',
    icon: '🔄',
    category: 'slide',
    description: 'Slide out left, slide in right',
    defaultDuration: 0.7,
    parameters: ['duration']
  },
  SLIDE_RIGHT: {
    id: 'slideRight',
    name: 'Slide Right',
    icon: '🔃',
    category: 'slide',
    description: 'Slide out right, slide in left',
    defaultDuration: 0.7,
    parameters: ['duration']
  },
  SLIDE_UP: {
    id: 'slideUp',
    name: 'Slide Up',
    icon: '🔼',
    category: 'slide',
    description: 'Slide out up, slide in down',
    defaultDuration: 0.7,
    parameters: ['duration']
  },
  SLIDE_DOWN: {
    id: 'slideDown',
    name: 'Slide Down',
    icon: '🔽',
    category: 'slide',
    description: 'Slide out down, slide in up',
    defaultDuration: 0.7,
    parameters: ['duration']
  },
  
  // Zoom transitions
  ZOOM_IN: {
    id: 'zoomIn',
    name: 'Zoom In',
    icon: '🔍',
    category: 'zoom',
    description: 'Zoom into next clip',
    defaultDuration: 0.8,
    parameters: ['duration']
  },
  ZOOM_OUT: {
    id: 'zoomOut',
    name: 'Zoom Out',
    icon: '🔎',
    category: 'zoom',
    description: 'Zoom out to next clip',
    defaultDuration: 0.8,
    parameters: ['duration']
  },
  
  // Effect transitions
  PIXELATE: {
    id: 'pixelate',
    name: 'Pixelate',
    icon: '👾',
    category: 'effect',
    description: 'Pixelate transition',
    defaultDuration: 0.6,
    parameters: ['duration', 'pixelSize']
  },
  BLUR: {
    id: 'blur',
    name: 'Blur',
    icon: '💫',
    category: 'effect',
    description: 'Blur transition',
    defaultDuration: 0.8,
    parameters: ['duration', 'blurAmount']
  },
  MIRROR: {
    id: 'mirror',
    name: 'Mirror',
    icon: '🪞',
    category: 'effect',
    description: 'Mirror flip transition',
    defaultDuration: 0.7,
    parameters: ['duration']
  },
  
  // Shape transitions
  CIRCLE_OPEN: {
    id: 'circleOpen',
    name: 'Circle Open',
    icon: '⭕',
    category: 'shape',
    description: 'Circular iris open',
    defaultDuration: 1.0,
    parameters: ['duration']
  },
  CIRCLE_CLOSE: {
    id: 'circleClose',
    name: 'Circle Close',
    icon: '🔴',
    category: 'shape',
    description: 'Circular iris close',
    defaultDuration: 1.0,
    parameters: ['duration']
  },
  DIAMOND: {
    id: 'diamond',
    name: 'Diamond',
    icon: '💎',
    category: 'shape',
    description: 'Diamond shape transition',
    defaultDuration: 0.8,
    parameters: ['duration']
  }
};

// Transition presets for quick selection
const TRANSITION_PRESETS = {
  smooth: ['crossfade', 'fadeToBlack'],
  dynamic: ['slideLeft', 'slideRight', 'zoomIn', 'zoomOut'],
  creative: ['pixelate', 'blur', 'mirror', 'circleOpen'],
  professional: ['crossfade', 'fadeToBlack', 'wipeLeft', 'wipeRight']
};

/**
 * Transition Manager Class
 */
class TransitionManager {
  constructor() {
    this.transitions = new Map(); // clipId -> transition data
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * Get all available transition types
   */
  getAllTransitions() {
    return Object.values(TRANSITION_TYPES);
  }

  /**
   * Get transitions by category
   */
  getTransitionsByCategory(category) {
    return Object.values(TRANSITION_TYPES).filter(t => t.category === category);
  }

  /**
   * Get transition categories
   */
  getCategories() {
    const categories = new Set();
    Object.values(TRANSITION_TYPES).forEach(t => categories.add(t.category));
    return Array.from(categories);
  }

  /**
   * Add a transition between two clips
   */
  addTransition(fromClipId, toClipId, transitionType, options = {}) {
    const transition = TRANSITION_TYPES[transitionType.toUpperCase()];
    if (!transition) {
      throw new Error(`Unknown transition type: ${transitionType}`);
    }

    const transitionData = {
      id: crypto.randomUUID(),
      fromClipId,
      toClipId,
      type: transitionType,
      duration: options.duration || transition.defaultDuration,
      parameters: { ...options },
      createdAt: Date.now()
    };

    this.transitions.set(fromClipId, transitionData);
    this.transitions.set(toClipId, transitionData);

    return transitionData;
  }

  /**
   * Remove a transition
   */
  removeTransition(clipId) {
    const transition = this.transitions.get(clipId);
    if (transition) {
      this.transitions.delete(transition.fromClipId);
      this.transitions.delete(transition.toClipId);
      return true;
    }
    return false;
  }

  /**
   * Get transition for a clip
   */
  getTransition(clipId) {
    return this.transitions.get(clipId);
  }

  /**
   * Check if clip has a transition
   */
  hasTransition(clipId) {
    return this.transitions.has(clipId);
  }

  /**
   * Get all transitions for a track
   */
  getTrackTransitions(track) {
    return track.clips
      .map(clip => ({
        clip,
        transition: this.transitions.get(clip.id)
      }))
      .filter(item => item.transition);
  }

  /**
   * Render transition preview on canvas
   */
  renderTransitionPreview(transitionType, progress, canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Create gradient backgrounds to simulate two clips
    const gradient1 = ctx.createLinearGradient(0, 0, width, height);
    gradient1.addColorStop(0, '#3b82f6');
    gradient1.addColorStop(1, '#1d4ed8');

    const gradient2 = ctx.createLinearGradient(0, 0, width, height);
    gradient2.addColorStop(0, '#ef4444');
    gradient2.addColorStop(1, '#b91c1c');

    // Apply transition effect
    this.applyTransitionEffect(ctx, transitionType, progress, width, height, gradient1, gradient2);
  }

  /**
   * Apply transition effect to canvas context
   */
  applyTransitionEffect(ctx, type, progress, width, height, fromStyle, toStyle) {
    const p = Math.max(0, Math.min(1, progress));

    switch (type) {
      case 'crossfade':
        // Draw from clip
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        // Draw to clip with opacity
        ctx.globalAlpha = p;
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
        break;

      case 'fadeToBlack':
        if (p < 0.5) {
          ctx.fillStyle = fromStyle;
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = `rgba(0, 0, 0, ${p * 2})`;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.fillStyle = toStyle;
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = `rgba(0, 0, 0, ${(1 - p) * 2})`;
          ctx.fillRect(0, 0, width, height);
        }
        break;

      case 'fadeToWhite':
        if (p < 0.5) {
          ctx.fillStyle = fromStyle;
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = `rgba(255, 255, 255, ${p * 2})`;
          ctx.fillRect(0, 0, width, height);
        } else {
          ctx.fillStyle = toStyle;
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = `rgba(255, 255, 255, ${(1 - p) * 2})`;
          ctx.fillRect(0, 0, width, height);
        }
        break;

      case 'wipeLeft':
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = toStyle;
        ctx.fillRect(width * (1 - p), 0, width * p, height);
        break;

      case 'wipeRight':
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width * p, height);
        break;

      case 'wipeUp':
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, height * (1 - p), width, height * p);
        break;

      case 'wipeDown':
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height * p);
        break;

      case 'slideLeft':
        ctx.save();
        ctx.translate(-width * p, 0);
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        ctx.save();
        ctx.translate(width * (1 - p), 0);
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        break;

      case 'slideRight':
        ctx.save();
        ctx.translate(width * p, 0);
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        ctx.save();
        ctx.translate(-width * (1 - p), 0);
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        break;

      case 'zoomIn':
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(0.1 + 0.9 * p, 0.1 + 0.9 * p);
        ctx.translate(-width / 2, -height / 2);
        ctx.globalAlpha = p;
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        ctx.globalAlpha = 1;
        break;

      case 'zoomOut':
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.scale(1 - 0.9 * p, 1 - 0.9 * p);
        ctx.translate(-width / 2, -height / 2);
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
        break;

      case 'circleOpen':
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.max(width, height) * p, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'circleClose':
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, Math.max(width, height) * (1 - p), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        break;

      default:
        // Default to crossfade
        ctx.fillStyle = fromStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = p;
        ctx.fillStyle = toStyle;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1;
    }
  }

  /**
   * Get FFmpeg filter string for a transition
   */
  getFFmpegFilter(transition, duration1, duration2) {
    const { type, duration } = transition;
    
    switch (type) {
      case 'crossfade':
        return `xfade=transition=fade:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'fadeToBlack':
        return `xfade=transition=fadeblack:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'fadeToWhite':
        return `xfade=transition=fadewhite:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'wipeLeft':
        return `xfade=transition=wipeleft:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'wipeRight':
        return `xfade=transition=wiperight:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'wipeUp':
        return `xfade=transition=wipeup:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'wipeDown':
        return `xfade=transition=wipedown:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'slideLeft':
        return `xfade=transition=slideleft:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'slideRight':
        return `xfade=transition=slideright:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'slideUp':
        return `xfade=transition=slideup:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'slideDown':
        return `xfade=transition=slidedown:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'circleOpen':
        return `xfade=transition=circleopen:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'circleClose':
        return `xfade=transition=circleclose:duration=${duration}:offset=${duration1 - duration}`;
      
      case 'zoomIn':
      case 'zoomOut':
        // Use custom geq filter for zoom
        return `xfade=transition=fade:duration=${duration}:offset=${duration1 - duration}`;
      
      default:
        return `xfade=transition=fade:duration=${duration}:offset=${duration1 - duration}`;
    }
  }

  /**
   * Validate transition duration between two clips
   */
  validateTransitionDuration(fromClip, toClip, duration) {
    // Transition duration cannot be longer than half of either clip
    const maxDuration = Math.min(fromClip.duration, toClip.duration) / 2;
    return Math.min(duration, maxDuration);
  }

  /**
   * Clear all transitions
   */
  clearAll() {
    this.transitions.clear();
  }

  /**
   * Export transitions to JSON
   */
  exportTransitions() {
    return Array.from(this.transitions.values());
  }

  /**
   * Import transitions from JSON
   */
  importTransitions(data) {
    this.transitions.clear();
    data.forEach(t => {
      this.transitions.set(t.fromClipId, t);
      this.transitions.set(t.toClipId, t);
    });
  }
}

/**
 * Transitions UI Class
 */
class TransitionsUI {
  constructor(container, options = {}) {
    this.container = container;
    this.manager = options.manager || new TransitionManager();
    this.onTransitionSelect = options.onTransitionSelect || (() => {});
    this.onTransitionRemove = options.onTransitionRemove || (() => {});
    this.onTransitionUpdate = options.onTransitionUpdate || (() => {});
    this.currentClipId = null;
    this.previewAnimation = null;
    
    this.init();
  }

  init() {
    this.createUI();
    this.attachEvents();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="transitions-panel">
        <div class="transitions-header">
          <h3>✨ Transitions</h3>
          <button class="transitions-close" title="Close">×</button>
        </div>
        
        <div class="transitions-content">
          <!-- Preview Area -->
          <div class="transitions-preview">
            <canvas id="transitionPreview" width="240" height="135"></canvas>
            <div class="preview-controls">
              <button class="preview-btn" id="playPreview">▶️ Play</button>
              <div class="preview-time">00:00</div>
            </div>
          </div>
          
          <!-- Selected Clip Info -->
          <div class="selected-clip-info" id="clipInfo">
            <p>Select a clip to add transitions</p>
          </div>
          
          <!-- Current Transition -->
          <div class="current-transition" id="currentTransition" style="display: none;">
            <h4>Current Transition</h4>
            <div class="transition-item selected">
              <span class="transition-icon" id="currentIcon">✨</span>
              <span class="transition-name" id="currentName">Crossfade</span>
              <button class="remove-transition" id="removeTransition" title="Remove">🗑️</button>
            </div>
            <div class="transition-duration">
              <label>Duration: <span id="durationValue">1.0</span>s</label>
              <input type="range" id="durationSlider" min="0.1" max="3.0" step="0.1" value="1.0">
            </div>
          </div>
          
          <!-- Categories -->
          <div class="transitions-categories">
            <div class="category-tabs" id="categoryTabs">
              <button class="category-tab active" data-category="all">All</button>
              <button class="category-tab" data-category="fade">Fade</button>
              <button class="category-tab" data-category="wipe">Wipe</button>
              <button class="category-tab" data-category="slide">Slide</button>
              <button class="category-tab" data-category="zoom">Zoom</button>
              <button class="category-tab" data-category="effect">Effect</button>
              <button class="category-tab" data-category="shape">Shape</button>
            </div>
            
            <!-- Transitions Grid -->
            <div class="transitions-grid" id="transitionsGrid">
              <!-- Populated dynamically -->
            </div>
          </div>
          
          <!-- Presets -->
          <div class="transitions-presets">
            <h4>Quick Presets</h4>
            <div class="presets-list">
              <button class="preset-btn" data-preset="smooth">Smooth</button>
              <button class="preset-btn" data-preset="dynamic">Dynamic</button>
              <button class="preset-btn" data-preset="creative">Creative</button>
              <button class="preset-btn" data-preset="professional">Professional</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Cache elements
    this.elements = {
      panel: this.container.querySelector('.transitions-panel'),
      closeBtn: this.container.querySelector('.transitions-close'),
      previewCanvas: this.container.querySelector('#transitionPreview'),
      playBtn: this.container.querySelector('#playPreview'),
      previewTime: this.container.querySelector('.preview-time'),
      clipInfo: this.container.querySelector('#clipInfo'),
      currentTransition: this.container.querySelector('#currentTransition'),
      currentIcon: this.container.querySelector('#currentIcon'),
      currentName: this.container.querySelector('#currentName'),
      removeBtn: this.container.querySelector('#removeTransition'),
      durationSlider: this.container.querySelector('#durationSlider'),
      durationValue: this.container.querySelector('#durationValue'),
      categoryTabs: this.container.querySelector('#categoryTabs'),
      transitionsGrid: this.container.querySelector('#transitionsGrid')
    };

    // Populate transitions grid
    this.populateTransitions('all');
  }

  populateTransitions(category) {
    const transitions = category === 'all' 
      ? this.manager.getAllTransitions()
      : this.manager.getTransitionsByCategory(category);

    this.elements.transitionsGrid.innerHTML = transitions.map(t => `
      <div class="transition-card" data-transition="${t.id}" title="${t.description}">
        <div class="transition-preview-icon">${t.icon}</div>
        <div class="transition-card-name">${t.name}</div>
        <div class="transition-card-duration">${t.defaultDuration}s</div>
      </div>
    `).join('');
  }

  attachEvents() {
    // Close button
    this.elements.closeBtn.addEventListener('click', () => this.hide());

    // Category tabs
    this.elements.categoryTabs.addEventListener('click', (e) => {
      if (e.target.classList.contains('category-tab')) {
        this.elements.categoryTabs.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.populateTransitions(e.target.dataset.category);
      }
    });

    // Transition cards
    this.elements.transitionsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.transition-card');
      if (card) {
        this.selectTransition(card.dataset.transition);
      }
    });

    // Duration slider
    this.elements.durationSlider.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      this.elements.durationValue.textContent = value.toFixed(1);
      if (this.currentClipId) {
        this.onTransitionUpdate(this.currentClipId, { duration: value });
      }
    });

    // Remove transition
    this.elements.removeBtn.addEventListener('click', () => {
      if (this.currentClipId) {
        this.manager.removeTransition(this.currentClipId);
        this.onTransitionRemove(this.currentClipId);
        this.updateCurrentTransitionUI();
      }
    });

    // Play preview
    this.elements.playBtn.addEventListener('click', () => this.playPreview());

    // Preset buttons
    this.container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        this.applyPreset(preset);
      });
    });
  }

  selectTransition(transitionId) {
    if (!this.currentClipId) {
      alert('Please select a clip first');
      return;
    }

    const transition = Object.values(TRANSITION_TYPES).find(t => t.id === transitionId);
    if (!transition) return;

    this.onTransitionSelect(this.currentClipId, transitionId, {
      duration: transition.defaultDuration
    });

    this.updateCurrentTransitionUI();
    this.playPreview();
  }

  applyPreset(presetName) {
    const preset = TRANSITION_PRESETS[presetName];
    if (!preset) return;

    // Randomly select from preset
    const randomTransition = preset[Math.floor(Math.random() * preset.length)];
    this.selectTransition(randomTransition);
  }

  setSelectedClip(clipId) {
    this.currentClipId = clipId;
    
    if (clipId) {
      this.elements.clipInfo.innerHTML = `
        <p><strong>Selected Clip:</strong> ${clipId.slice(0, 8)}...</p>
        <p>Choose a transition to apply</p>
      `;
    } else {
      this.elements.clipInfo.innerHTML = '<p>Select a clip to add transitions</p>';
    }

    this.updateCurrentTransitionUI();
  }

  updateCurrentTransitionUI() {
    const transition = this.currentClipId ? this.manager.getTransition(this.currentClipId) : null;

    if (transition) {
      const type = Object.values(TRANSITION_TYPES).find(t => t.id === transition.type);
      this.elements.currentTransition.style.display = 'block';
      this.elements.currentIcon.textContent = type?.icon || '✨';
      this.elements.currentName.textContent = type?.name || transition.type;
      this.elements.durationSlider.value = transition.duration;
      this.elements.durationValue.textContent = transition.duration.toFixed(1);
    } else {
      this.elements.currentTransition.style.display = 'none';
    }
  }

  playPreview() {
    if (this.previewAnimation) {
      cancelAnimationFrame(this.previewAnimation);
    }

    const transition = this.currentClipId ? this.manager.getTransition(this.currentClipId) : null;
    const transitionType = transition?.type || 'crossfade';
    
    const duration = 1000; // 1 second preview
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(1, elapsed / duration);

      // Update time display
      this.elements.previewTime.textContent = (elapsed / 1000).toFixed(2);

      // Render preview
      this.manager.renderTransitionPreview(transitionType, progress, this.elements.previewCanvas);

      if (progress < 1) {
        this.previewAnimation = requestAnimationFrame(animate);
      } else {
        this.elements.playBtn.textContent = '▶️ Play';
      }
    };

    this.elements.playBtn.textContent = '⏹️ Stop';
    this.previewAnimation = requestAnimationFrame(animate);
  }

  show() {
    this.container.style.display = 'block';
    this.updateCurrentTransitionUI();
  }

  hide() {
    this.container.style.display = 'none';
    if (this.previewAnimation) {
      cancelAnimationFrame(this.previewAnimation);
    }
  }

  destroy() {
    if (this.previewAnimation) {
      cancelAnimationFrame(this.previewAnimation);
    }
    this.container.innerHTML = '';
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TransitionManager,
    TransitionsUI,
    TRANSITION_TYPES,
    TRANSITION_PRESETS
  };
}

// Make available globally
window.TransitionManager = TransitionManager;
window.TransitionsUI = TransitionsUI;
window.TRANSITION_TYPES = TRANSITION_TYPES;
window.TRANSITION_PRESETS = TRANSITION_PRESETS;
