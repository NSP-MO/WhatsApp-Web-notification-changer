/**
 * WhatsApp Web Notification Changer - Isolated Bridge Script
 * Synchronizes chrome.storage.local preferences to the Main World injector
 */

(function () {
  'use strict';

  const DEFAULT_SOUND = (typeof SOUND_PRESETS !== 'undefined' && SOUND_PRESETS.windows_notify_email)
    ? SOUND_PRESETS.windows_notify_email.data
    : '';

  function broadcastConfig() {
    if (!chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get(['enabled', 'presetKey', 'audioBase64', 'volume', 'matchKeyword'], function (res) {
      if (chrome.runtime.lastError) {
        return;
      }

      const isCustom = (res.presetKey === 'custom' && typeof res.audioBase64 === 'string' && res.audioBase64.length > 20);
      const effectiveAudio = isCustom ? res.audioBase64 : DEFAULT_SOUND;

      // Migrate legacy or mismatched storage automatically to Windows Notify Email
      if (!isCustom && res.audioBase64 !== DEFAULT_SOUND && DEFAULT_SOUND) {
        chrome.storage.local.set({
          presetKey: 'windows_notify_email',
          audioBase64: DEFAULT_SOUND
        });
      }

      window.postMessage({
        type: 'WA_NOTIF_CONFIG_UPDATE',
        config: {
          enabled: res.enabled !== false,
          audioBase64: effectiveAudio,
          isCustom: isCustom,
          volume: typeof res.volume === 'number' ? res.volume : 0.85,
          matchKeyword: typeof res.matchKeyword === 'string' ? res.matchKeyword : 'static.whatsapp.net'
        }
      }, '*');
    });
  }

  // Initial broadcast on script execution
  broadcastConfig();

  // Re-broadcast when DOM is interactive to ensure main world receiver is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', broadcastConfig, { once: true });
  }

  // Subscribe to storage changes for live real-time updates without page reload
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== 'local') return;

    chrome.storage.local.get(['enabled', 'presetKey', 'audioBase64', 'volume', 'matchKeyword'], function (res) {
      const isCustom = (res.presetKey === 'custom' && typeof res.audioBase64 === 'string' && res.audioBase64.length > 20);
      const effectiveAudio = isCustom ? res.audioBase64 : DEFAULT_SOUND;

      window.postMessage({
        type: 'WA_NOTIF_CONFIG_UPDATE',
        config: {
          enabled: res.enabled !== false,
          audioBase64: effectiveAudio,
          isCustom: isCustom,
          volume: typeof res.volume === 'number' ? res.volume : 0.85,
          matchKeyword: typeof res.matchKeyword === 'string' ? res.matchKeyword : 'static.whatsapp.net'
        }
      }, '*');
    });
  });

})();
