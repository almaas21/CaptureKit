/**
 * Voice Over Module for Video Editor
 * Handles microphone recording and audio clip creation
 */

class VoiceOverRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.startTime = null;
    this.onStateChange = null;
    this.onLevelUpdate = null;
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.levelInterval = null;
  }

  /**
   * Initialize audio context for level monitoring
   */
  async initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Start recording from microphone
   */
  async startRecording() {
    try {
      await this.initAudioContext();
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
          channelCount: 2
        }
      });

      // Set up audio analysis for level monitoring
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      
      // Start level monitoring
      this.startLevelMonitoring();

      // Set up media recorder
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        this.startTime = Date.now();
        this.notifyStateChange('recording');
      };

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        this.stopLevelMonitoring();
        this.cleanupStream();
        this.notifyStateChange('stopped');
      };

      this.mediaRecorder.onerror = (error) => {
        console.error('MediaRecorder error:', error);
        this.isRecording = false;
        this.stopLevelMonitoring();
        this.cleanupStream();
        this.notifyStateChange('error', error);
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.notifyStateChange('error', error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stopRecording() {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Not currently recording'));
        return;
      }

      const duration = Date.now() - this.startTime;
      
      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        this.stopLevelMonitoring();
        
        const mimeType = this.mediaRecorder.mimeType;
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        
        this.cleanupStream();
        this.notifyStateChange('stopped');
        
        resolve({
          blob: audioBlob,
          duration: Math.round(duration / 1000),
          mimeType: mimeType
        });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Start audio level monitoring
   */
  startLevelMonitoring() {
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
    }
    
    this.levelInterval = setInterval(() => {
      if (this.analyser && this.dataArray) {
        this.analyser.getByteFrequencyData(this.dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
          sum += this.dataArray[i];
        }
        const average = sum / this.dataArray.length;
        const level = Math.min(100, (average / 128) * 100);
        
        if (this.onLevelUpdate) {
          this.onLevelUpdate(level);
        }
      }
    }, 50);
  }

  /**
   * Stop level monitoring
   */
  stopLevelMonitoring() {
    if (this.levelInterval) {
      clearInterval(this.levelInterval);
      this.levelInterval = null;
    }
  }

  /**
   * Clean up media stream
   */
  cleanupStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Get supported MIME type for recording
   */
  getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm';
  }

  /**
   * Notify state change callback
   */
  notifyStateChange(state, error = null) {
    if (this.onStateChange) {
      this.onStateChange(state, error);
    }
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingDuration() {
    if (!this.isRecording || !this.startTime) {
      return 0;
    }
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Destroy recorder instance
   */
  destroy() {
    this.stopLevelMonitoring();
    this.cleanupStream();
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.onStateChange = null;
    this.onLevelUpdate = null;
  }
}

/**
 * Voice Over UI Manager
 */
class VoiceOverUI {
  constructor(container, onRecordingComplete) {
    this.container = container;
    this.onRecordingComplete = onRecordingComplete;
    this.recorder = new VoiceOverRecorder();
    this.elements = {};
    this.init();
  }

  init() {
    this.createUI();
    this.attachEvents();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="voice-over-panel">
        <div class="voice-over-header">
          <h3>🎙️ Voice Over</h3>
          <button class="voice-over-close" title="Close">×</button>
        </div>
        
        <div class="voice-over-content">
          <div class="voice-over-status">
            <div class="recording-indicator" id="recordingIndicator">
              <span class="record-dot"></span>
              <span class="record-text">Ready to record</span>
            </div>
            <div class="recording-timer" id="recordingTimer">00:00</div>
          </div>
          
          <div class="voice-over-visualizer">
            <canvas id="audioVisualizer" width="280" height="60"></canvas>
          </div>
          
          <div class="voice-over-level">
            <div class="level-bar-container">
              <div class="level-bar" id="levelBar"></div>
            </div>
            <div class="level-labels">
              <span>Low</span>
              <span>Good</span>
              <span>High</span>
            </div>
          </div>
          
          <div class="voice-over-controls">
            <button class="voice-btn voice-btn-record" id="recordBtn">
              <span class="btn-icon">🔴</span>
              <span class="btn-text">Record</span>
            </button>
            <button class="voice-btn voice-btn-stop" id="stopBtn" disabled>
              <span class="btn-icon">⏹️</span>
              <span class="btn-text">Stop</span>
            </button>
          </div>
          
          <div class="voice-over-tips">
            <p>💡 Tips for best results:</p>
            <ul>
              <li>Use a quiet environment</li>
              <li>Keep microphone 6-12 inches away</li>
              <li>Speak clearly and at a consistent volume</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Cache element references
    this.elements = {
      panel: this.container.querySelector('.voice-over-panel'),
      closeBtn: this.container.querySelector('.voice-over-close'),
      recordBtn: this.container.querySelector('#recordBtn'),
      stopBtn: this.container.querySelector('#stopBtn'),
      indicator: this.container.querySelector('#recordingIndicator'),
      recordText: this.container.querySelector('.record-text'),
      timer: this.container.querySelector('#recordingTimer'),
      levelBar: this.container.querySelector('#levelBar'),
      canvas: this.container.querySelector('#audioVisualizer')
    };

    this.canvasContext = this.elements.canvas.getContext('2d');
  }

  attachEvents() {
    // Close button
    this.elements.closeBtn.addEventListener('click', () => {
      this.hide();
    });

    // Record button
    this.elements.recordBtn.addEventListener('click', async () => {
      try {
        await this.startRecording();
      } catch (error) {
        this.showError('Could not access microphone. Please check permissions.');
      }
    });

    // Stop button
    this.elements.stopBtn.addEventListener('click', async () => {
      await this.stopRecording();
    });

    // Recorder state change
    this.recorder.onStateChange = (state, error) => {
      this.handleStateChange(state, error);
    };

    // Level update
    this.recorder.onLevelUpdate = (level) => {
      this.updateLevelBar(level);
      this.drawVisualizer(level);
    };
  }

  async startRecording() {
    await this.recorder.startRecording();
    this.startTimer();
    
    this.elements.recordBtn.disabled = true;
    this.elements.stopBtn.disabled = false;
    this.elements.indicator.classList.add('recording');
    this.elements.recordText.textContent = 'Recording...';
  }

  async stopRecording() {
    try {
      const result = await this.recorder.stopRecording();
      this.stopTimer();
      
      this.elements.recordBtn.disabled = false;
      this.elements.stopBtn.disabled = true;
      this.elements.indicator.classList.remove('recording');
      this.elements.recordText.textContent = 'Ready to record';
      this.elements.timer.textContent = '00:00';
      
      // Reset visualizer
      this.updateLevelBar(0);
      this.clearVisualizer();
      
      // Call completion callback
      if (this.onRecordingComplete) {
        this.onRecordingComplete(result);
      }
    } catch (error) {
      this.showError('Failed to stop recording.');
    }
  }

  handleStateChange(state, error) {
    switch (state) {
      case 'recording':
        console.log('Voice over recording started');
        break;
      case 'stopped':
        console.log('Voice over recording stopped');
        break;
      case 'error':
        console.error('Recording error:', error);
        this.showError('Recording error occurred.');
        this.resetUI();
        break;
    }
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      const duration = this.recorder.getRecordingDuration();
      const minutes = Math.floor(duration / 60).toString().padStart(2, '0');
      const seconds = (duration % 60).toString().padStart(2, '0');
      this.elements.timer.textContent = `${minutes}:${seconds}`;
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateLevelBar(level) {
    this.elements.levelBar.style.width = `${level}%`;
    
    // Color coding based on level
    this.elements.levelBar.className = 'level-bar';
    if (level < 20) {
      this.elements.levelBar.classList.add('level-low');
    } else if (level < 80) {
      this.elements.levelBar.classList.add('level-good');
    } else {
      this.elements.levelBar.classList.add('level-high');
    }
  }

  drawVisualizer(level) {
    const ctx = this.canvasContext;
    const canvas = this.elements.canvas;
    const width = canvas.width;
    const height = canvas.height;
    
    // Fade effect
    ctx.fillStyle = 'rgba(24, 24, 27, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw bars
    const barCount = 30;
    const barWidth = width / barCount - 2;
    const barHeight = (level / 100) * height;
    
    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + 2);
      const randomHeight = Math.random() * barHeight;
      const y = height - randomHeight;
      
      // Gradient color
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#22c55e');
      gradient.addColorStop(0.5, '#eab308');
      gradient.addColorStop(1, '#ef4444');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, randomHeight);
    }
  }

  clearVisualizer() {
    const ctx = this.canvasContext;
    const canvas = this.elements.canvas;
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  resetUI() {
    this.stopTimer();
    this.elements.recordBtn.disabled = false;
    this.elements.stopBtn.disabled = true;
    this.elements.indicator.classList.remove('recording');
    this.elements.recordText.textContent = 'Ready to record';
    this.elements.timer.textContent = '00:00';
    this.updateLevelBar(0);
    this.clearVisualizer();
  }

  showError(message) {
    // Create temporary error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'voice-over-error';
    errorDiv.textContent = message;
    this.elements.panel.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  show() {
    this.container.style.display = 'block';
    this.clearVisualizer();
  }

  hide() {
    if (this.recorder.isRecording) {
      this.stopRecording();
    }
    this.container.style.display = 'none';
  }

  destroy() {
    this.stopTimer();
    this.recorder.destroy();
    this.container.innerHTML = '';
  }
}

/**
 * Initialize voice over functionality
 */
function initVoiceOver(options = {}) {
  const { onRecordingComplete, container } = options;
  
  // Create container if not provided
  let voiceOverContainer = container;
  if (!voiceOverContainer) {
    voiceOverContainer = document.createElement('div');
    voiceOverContainer.id = 'voiceOverContainer';
    voiceOverContainer.style.display = 'none';
    document.body.appendChild(voiceOverContainer);
  }
  
  const voiceOverUI = new VoiceOverUI(voiceOverContainer, onRecordingComplete);
  
  return {
    ui: voiceOverUI,
    show: () => voiceOverUI.show(),
    hide: () => voiceOverUI.hide(),
    destroy: () => voiceOverUI.destroy()
  };
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VoiceOverRecorder, VoiceOverUI, initVoiceOver };
}

// Make available globally for script tag usage
window.VoiceOverRecorder = VoiceOverRecorder;
window.VoiceOverUI = VoiceOverUI;
window.initVoiceOver = initVoiceOver;
