/**
 * Fast Video Export Module for Video Editor
 * Optimizes the export process for faster rendering
 */

(function() {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFastExport);
  } else {
    initFastExport();
  }

  function initFastExport() {
    console.log('[FastExport] Initializing fast export optimization...');
    
    // Override the default export function with optimized settings
    if (window.Le && window.Le().exportProject) {
      const originalExport = window.Le().exportProject;
      window.Le().exportProject = createOptimizedExportFunction(originalExport);
    }
    
    // Also try to find the export function through other possible references
    const editorStore = window.editorStore || window.useEditorStore?.();
    if (editorStore && editorStore.exportProject) {
      const originalExport = editorStore.exportProject;
      editorStore.exportProject = createOptimizedExportFunction(originalExport);
    }
    
    console.log('[FastExport] Optimized export initialization complete');
  }

  function createOptimizedExportFunction(originalExport) {
    return async function() {
      console.log('[FastExport] Using optimized export settings');
      
      // Show optimization notification
      showOptimizationNotification();
      
      try {
        // Call the original export function (which will use our overridden v function)
        return await originalExport.apply(this, arguments);
      } catch (error) {
        console.error('[FastExport] Export failed:', error);
        throw error;
      }
    };
  }

  // Override the v function (encoding options) to use faster settings
  window.fastExportOptions = function(y) {
    // Original fast settings with additional optimizations
    if (y === "webm") {
      return [
        "-c:v", "libvpx-vp9",
        "-crf", "38",           // Slightly higher CRF for faster encoding
        "-b:v", "0",            // Use CRF instead of bitrate
        "-cpu-used", "5",       // Balance between speed and quality
        "-deadline", "good",    // Good quality-speed tradeoff (was "realtime")
        "-row-mt", "1",         // Enable row-based multithreading
        "-c:a", "libopus", 
        "-b:a", "96k"
      ];
    } else { // mp4
      return [
        "-c:v", "libx264",
        "-preset", "veryfast",  // Changed from "ultrafast" to "veryfast" for better compression-speed balance
        "-crf", "28",           // Slightly higher CRF for faster encoding
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", 
        "-b:a", "128k"
      ];
    }
  };

  // Also create an even faster option for users who prioritize speed over quality
  window.fastestExportOptions = function(y) {
    if (y === "webm") {
      return [
        "-c:v", "libvpx-vp9",
        "-crf", "42",           // Much higher CRF for maximum speed
        "-b:v", "0",
        "-cpu-used", "8",       // Maximum speed setting
        "-deadline", "realtime", // Keep realtime for fastest processing
        "-row-mt", "1",
        "-c:a", "libopus", 
        "-b:a", "64k"           // Lower audio bitrate for speed
      ];
    } else { // mp4
      return [
        "-c:v", "libx264",
        "-preset", "superfast", // Fastest preset
        "-crf", "30",           // Lower quality for maximum speed
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", 
        "-b:a", "96k"          // Lower audio bitrate
      ];
    }
  };

  // Override the original v function if it exists in the global scope
  if (typeof window.v === 'undefined') {
    window.v = window.fastExportOptions;
  } else {
    // Store original function and override
    window.originalExportOptions = window.v;
    window.v = window.fastExportOptions;
  }

  // Override the p function (audio-only export options) as well
  if (typeof window.p === 'undefined') {
    window.p = function(y) {
      if (y === "webm") {
        return [
          "-c:v", "libvpx-vp9",
          "-crf", "38",
          "-b:v", "0",
          "-cpu-used", "5",
          "-deadline", "good",
          "-row-mt", "1",
          "-c:a", "libopus",
          "-b:a", "96k"
        ];
      } else {
        return [
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "28",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "128k"
        ];
      }
    };
  } else {
    window.originalAudioOptions = window.p;
    window.p = function(y) {
      if (y === "webm") {
        return [
          "-c:v", "libvpx-vp9",
          "-crf", "38",
          "-b:v", "0",
          "-cpu-used", "5",
          "-deadline", "good",
          "-row-mt", "1",
          "-c:a", "libopus",
          "-b:a", "96k"
        ];
      } else {
        return [
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "28",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "128k"
        ];
      }
    };
  }

  function showOptimizationNotification() {
    // Remove existing notification if any
    const existing = document.querySelector('.fast-export-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `fast-export-notification`;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>⚡</span>
        <div>
          <div style="font-weight: 500; font-size: 13px;">Fast Export Active</div>
          <div style="font-size: 11px; opacity: 0.8;">Using optimized settings for faster rendering</div>
        </div>
      </div>
    `;
    
    Object.assign(notification.style, {
      position: 'fixed',
      bottom: '70px',  // Position above the regular notifications
      right: '20px',
      padding: '10px 16px',
      borderRadius: '8px',
      fontSize: '12px',
      zIndex: '10003',  // Higher than regular notifications
      animation: 'slideInRight 0.3s ease-out',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      color: 'white'
    });
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
          }
        }, 300);
      }
    }, 4000);
  }

  // Add CSS for animations
  function addFastExportStyles() {
    const styleId = 'fast-export-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
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

  // Add styles when initializing
  addFastExportStyles();

  // Expose functions globally for manual control
  window.FastExport = {
    enable: () => {
      window.v = window.fastExportOptions;
      window.p = function(y) {
        if (y === "webm") {
          return ["-c:v", "libvpx-vp9", "-crf", "38", "-b:v", "0", "-cpu-used", "5", "-deadline", "good", "-row-mt", "1", "-c:a", "libopus", "-b:a", "96k"];
        } else {
          return ["-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k"];
        }
      };
      console.log('[FastExport] Fast export settings enabled');
    },
    enableExtreme: () => {
      window.v = window.fastestExportOptions;
      window.p = function(y) {
        if (y === "webm") {
          return ["-c:v", "libvpx-vp9", "-crf", "42", "-b:v", "0", "-cpu-used", "8", "-deadline", "realtime", "-row-mt", "1", "-c:a", "libopus", "-b:a", "64k"];
        } else {
          return ["-c:v", "libx264", "-preset", "superfast", "-crf", "30", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k"];
        }
      };
      console.log('[FastExport] Extreme fast export settings enabled');
    },
    disable: () => {
      if (window.originalExportOptions) window.v = window.originalExportOptions;
      if (window.originalAudioOptions) window.p = window.originalAudioOptions;
      console.log('[FastExport] Original export settings restored');
    }
  };

  console.log('[FastExport] Module loaded and ready');
})();