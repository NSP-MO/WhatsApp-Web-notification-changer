/**
 * WhatsApp Web Notification Changer - Popup Controller
 */

(function () {
  'use strict';

  // DOM Elements
  const toggleEnabled = document.getElementById('toggle-enabled');
  const presetSelect = document.getElementById('preset-select');
  const fileInput = document.getElementById('file-input');
  const btnBrowse = document.getElementById('btn-browse');
  const dropZone = document.getElementById('drop-zone');
  const fileNameDisplay = document.getElementById('file-name-display');
  const payloadInfo = document.getElementById('payload-info');
  const sourceFormatBadge = document.getElementById('source-format-badge');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeReadout = document.getElementById('volume-readout');
  const btnPreview = document.getElementById('btn-preview');
  const previewBtnText = document.getElementById('preview-btn-text');
  const btnReset = document.getElementById('btn-reset');
  const filterKeywordInput = document.getElementById('filter-keyword');

  // Active state
  let currentAudio = null;
  let currentBase64 = '';
  let activePresetKey = 'windows_notify_email';
  let customFileName = '';

  // Default sound from presets if available
  function getDefaultSound() {
    if (typeof SOUND_PRESETS !== 'undefined' && SOUND_PRESETS.windows_notify_email) {
      return SOUND_PRESETS.windows_notify_email.data;
    }
    return '';
  }

  // Calculate format badge, readable size, and file label
  function updatePayloadMetrics(dataUri, fileName) {
    if (!dataUri) {
      payloadInfo.textContent = 'Size: 0 KB';
      sourceFormatBadge.textContent = 'NONE';
      if (fileNameDisplay) {
        fileNameDisplay.textContent = 'No audio loaded';
      }
      return;
    }

    const approxBytes = Math.round((dataUri.length * 3) / 4);
    const kb = (approxBytes / 1024).toFixed(1);
    payloadInfo.textContent = `Size: ${kb} KB`;

    if (fileNameDisplay) {
      if (fileName) {
        fileNameDisplay.textContent = fileName;
      } else if (activePresetKey === 'windows_notify_email') {
        fileNameDisplay.textContent = 'Windows Notify Email (Default)';
      } else {
        fileNameDisplay.textContent = customFileName || 'Custom Audio File';
      }
    }

    // Detect format
    if (dataUri.includes('audio/wav') || dataUri.includes('UklGR')) {
      sourceFormatBadge.textContent = 'WAV';
    } else if (dataUri.includes('audio/mpeg') || dataUri.includes('audio/mp3')) {
      sourceFormatBadge.textContent = 'MP3';
    } else if (dataUri.includes('audio/ogg')) {
      sourceFormatBadge.textContent = 'OGG';
    } else if (dataUri.includes('audio/m4a') || dataUri.includes('audio/mp4') || dataUri.includes('audio/aac')) {
      sourceFormatBadge.textContent = 'M4A';
    } else {
      sourceFormatBadge.textContent = 'AUDIO';
    }
  }

  // Save full configuration to chrome.storage.local
  function saveConfig() {
    if (!chrome.storage || !chrome.storage.local) return;

    const volumeFloat = parseInt(volumeSlider.value, 10) / 100;
    const isCustom = (activePresetKey === 'custom');
    const effectiveAudio = isCustom ? currentBase64 : getDefaultSound();

    const config = {
      enabled: toggleEnabled.checked,
      presetKey: activePresetKey,
      audioBase64: effectiveAudio,
      customFileName: customFileName,
      volume: volumeFloat,
      matchKeyword: filterKeywordInput.value.trim() || 'static.whatsapp.net',
      soundVersion: 'windows_notify_email_v2'
    };

    chrome.storage.local.set(config, function () {
      if (chrome.runtime.lastError) {
        console.error('Failed to save settings:', chrome.runtime.lastError);
      }
    });
  }

  // Initialize and load persisted preferences
  function loadPreferences() {
    const defaultSound = getDefaultSound();

    if (!chrome.storage || !chrome.storage.local) {
      currentBase64 = defaultSound;
      updatePayloadMetrics(currentBase64);
      return;
    }

    chrome.storage.local.get(['enabled', 'presetKey', 'audioBase64', 'customFileName', 'volume', 'matchKeyword', 'soundVersion'], function (res) {
      if (chrome.runtime.lastError) {
        console.error('Error reading preferences:', chrome.runtime.lastError);
        return;
      }

      // Master toggle
      toggleEnabled.checked = res.enabled !== false;

      // Volume
      const volPercent = typeof res.volume === 'number' ? Math.round(res.volume * 100) : 85;
      volumeSlider.value = volPercent;
      volumeReadout.textContent = `${volPercent}%`;

      // Filter keyword
      filterKeywordInput.value = res.matchKeyword || 'static.whatsapp.net';

      // Custom file name
      customFileName = typeof res.customFileName === 'string' ? res.customFileName : '';

      // Check if user has explicitly configured a custom sound
      const isCustom = (res.presetKey === 'custom' && typeof res.audioBase64 === 'string' && res.audioBase64.length > 20);

      if (isCustom) {
        activePresetKey = 'custom';
        currentBase64 = res.audioBase64;
      } else {
        // ALWAYS enforce default Windows Notify Email and overwrite any legacy audio in storage
        activePresetKey = 'windows_notify_email';
        currentBase64 = defaultSound;
        chrome.storage.local.set({
          presetKey: 'windows_notify_email',
          audioBase64: defaultSound,
          soundVersion: 'windows_notify_email_v2'
        });
      }

      presetSelect.value = activePresetKey;
      updatePayloadMetrics(currentBase64);
    });
  }

  // Stop active preview audio if playing
  function stopPreview() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    previewBtnText.textContent = 'Play Preview';
  }

  // Play preview of currently configured audio
  function playPreview() {
    if (currentAudio) {
      stopPreview();
      return;
    }

    if (!currentBase64) {
      console.warn('No audio payload available for preview');
      return;
    }

    try {
      currentAudio = new Audio(currentBase64);
      currentAudio.volume = parseInt(volumeSlider.value, 10) / 100;

      previewBtnText.textContent = 'Stop Preview';

      currentAudio.addEventListener('ended', stopPreview, { once: true });
      currentAudio.addEventListener('error', function () {
        stopPreview();
        console.error('Error decoding audio preview');
      }, { once: true });

      const playPromise = currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.catch(function (err) {
          stopPreview();
          console.error('Playback error:', err);
        });
      }
    } catch (err) {
      stopPreview();
      console.error('Audio initialisation error:', err);
    }
  }

  // Handle Preset dropdown change
  presetSelect.addEventListener('change', function () {
    const val = presetSelect.value;
    activePresetKey = val;

    if (val !== 'custom' && typeof SOUND_PRESETS !== 'undefined' && SOUND_PRESETS[val]) {
      currentBase64 = SOUND_PRESETS[val].data;
      updatePayloadMetrics(currentBase64, 'Windows Notify Email (Default)');
      saveConfig();
    } else if (val === 'custom') {
      updatePayloadMetrics(currentBase64, customFileName || 'Custom Audio File');
      saveConfig();
    }
  });

  // Handle Master toggle
  toggleEnabled.addEventListener('change', function () {
    saveConfig();
  });

  // Handle Volume slider
  volumeSlider.addEventListener('input', function () {
    const val = volumeSlider.value;
    volumeReadout.textContent = `${val}%`;
    if (currentAudio) {
      currentAudio.volume = parseInt(val, 10) / 100;
    }
  });

  volumeSlider.addEventListener('change', function () {
    saveConfig();
  });

  // Handle Filter keyword change
  filterKeywordInput.addEventListener('change', function () {
    saveConfig();
  });

  // Handle File browse button
  btnBrowse.addEventListener('click', function () {
    fileInput.click();
  });

  // Maximum file size: 5.0 MB (safely within chrome.storage.local 10 MB quota)
  const MAX_FILE_SIZE = 5 * 1024 * 1024;
  // Maximum audio duration: 15 seconds (keeps notification sounds concise)
  const MAX_DURATION_SEC = 15;

  // Process uploaded audio file with validation
  function handleFile(file) {
    if (!file) return;

    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(file.name)) {
      alert('Please select a valid audio file (MP3, WAV, OGG, M4A).');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      alert(`Selected file is too large (${sizeMB} MB). Maximum allowed size for notification sounds is 5.0 MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const candidateBase64 = e.target.result;

      // Pre-flight audio validation: verify file decodes properly and duration is suitable
      const testAudio = new Audio();

      const cleanup = function () {
        testAudio.removeEventListener('loadedmetadata', onLoaded);
        testAudio.removeEventListener('error', onError);
      };

      const onLoaded = function () {
        cleanup();
        if (testAudio.duration > MAX_DURATION_SEC) {
          alert(`Audio duration is too long (${testAudio.duration.toFixed(1)}s). Please choose a notification sound under 15 seconds.`);
          return;
        }

        currentBase64 = candidateBase64;
        customFileName = file.name;
        activePresetKey = 'custom';
        presetSelect.value = 'custom';
        updatePayloadMetrics(currentBase64, file.name);
        saveConfig();
      };

      const onError = function () {
        cleanup();
        alert('Could not decode this audio file. The format or codec may be unsupported or corrupted.');
      };

      testAudio.addEventListener('loadedmetadata', onLoaded, { once: true });
      testAudio.addEventListener('error', onError, { once: true });
      testAudio.src = candidateBase64;
    };
    reader.onerror = function () {
      alert('Failed to read the audio file from disk.');
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  // Drag & drop file support
  dropZone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', function () {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Play Preview button
  btnPreview.addEventListener('click', playPreview);

  // Reset to default preset
  btnReset.addEventListener('click', function () {
    stopPreview();
    const defaultSound = getDefaultSound();
    currentBase64 = defaultSound;
    activePresetKey = 'windows_notify_email';
    presetSelect.value = 'windows_notify_email';
    customFileName = '';
    volumeSlider.value = 85;
    volumeReadout.textContent = '85%';
    filterKeywordInput.value = 'static.whatsapp.net';
    toggleEnabled.checked = true;
    updatePayloadMetrics(currentBase64, 'Windows Notify Email (Default)');
    saveConfig();
  });

  // Initial load
  loadPreferences();

})();
