# WhatsApp Web Notification Changer

A Manifest V3 Chromium browser extension designed to customize notification sounds on WhatsApp Web using Base64 audio payloads. The extension intercepts audio playback via constructor and prototype hooks while providing an integrated settings popup.

---

## Architectural Overview

WhatsApp Web runs client-side within the browser and plays notification sounds when incoming messages arrive. This extension uses a two-tier architecture to intercept audio playback cleanly and provide persistent user customization.

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser Extension Environment                                    │
│                                                                 │
│  ┌───────────────────────┐         ┌─────────────────────────┐  │
│  │     Extension Popup   │         │    content/bridge.js    │  │
│  │ (HTML / CSS / JS)     │         │ (Isolated World)        │  │
│  └──────────┬────────────┘         └────────────▲────────────┘  │
│             │                                   │               │
│             ▼                                   │               │
│  ┌──────────────────────────────────────────────┴────────────┐  │
│  │              chrome.storage.local Engine                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ window.postMessage
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│ WhatsApp Web DOM Page (https://web.whatsapp.com)                │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ content/inject.js (Main World, document_start)            │  │
│  │                                                           │  │
│  │  - Hook: window.Audio                                     │  │
│  │  - Hook: HTMLAudioElement.prototype.play                  │  │
│  │  - Hook: HTMLMediaElement.prototype.src                   │  │
│  │                                                           │  │
│  │  Intercepts audio matching 'static.whatsapp.net'          │  │
│  │  Redirects source to user Base64 payload                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Components

1. **Main World Injector (`content/inject.js`)**:
   - Executes directly within the main execution context (`world: "MAIN"`) at `document_start`.
   - Intercepts native calls to `window.Audio` and `HTMLAudioElement.prototype.play`.
   - Inspects target audio URLs for the specified filter keyword (`static.whatsapp.net`).
   - Replaces matching sources with the configured Base64 audio data URI and applies volume adjustments.

2. **Isolated World Bridge (`content/bridge.js`)**:
   - Runs in the extension's isolated world context on `https://web.whatsapp.com/*`.
   - Manages communication with `chrome.storage.local`.
   - Listens for storage change events and broadcasts updated configurations to the main world via DOM messaging, allowing instant updates without page refreshes.

3. **Settings Interface (`popup/`)**:
   - Built with a Dark Modern palette conforming to modern development standards.
   - Configured with Windows Notify Email as the default sound, with full user customization for custom audio files.
   - Supports importing custom audio files (MP3, WAV, OGG, M4A) with automatic internal Base64 encoding.
   - Provides volume attenuation sliders, live audio preview, and custom audio file uploads.

---

## Directory Structure

```
.
├── manifest.json              # Chromium Manifest V3 configuration
├── content/
│   ├── inject.js              # Main world audio hook and interceptor
│   └── bridge.js              # Isolated world storage bridge
├── popup/
│   ├── popup.html             # Extension settings interface markup
│   ├── popup.css              # Dark Modern styling system
│   └── popup.js               # Interface controller and file processor
├── assets/
│   ├── icons/                 # Extension icons (16px, 32px, 48px, 128px, 512px)
│   │   ├── icon16.png
│   │   ├── icon32.png
│   │   ├── icon48.png
│   │   ├── icon128.png
│   │   └── notification.png
│   └── sounds/
│       ├── Windows Notify Email.wav # Default notification audio asset
│       └── presets.js         # Default audio preset in Base64
├── .gitignore                 # Repository exclusions
└── README.md                  # Project documentation
```

---

## Installation Guide

### Prerequisites
- Google Chrome, Microsoft Edge, Brave, or any Chromium-based browser supporting Manifest V3.

### Steps

1. Clone or download this repository to a local directory:
   ```bash
   git clone https://github.com/your-username/wa-web-notification-changer.git
   ```
2. Open your Chromium browser and navigate to the Extensions management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
3. Enable **Developer mode** using the toggle switch located in the upper-right corner.
4. Click the **Load unpacked** button in the upper-left toolbar.
5. In the file selection dialog, select the repository root directory (`wa-web-notification-changer`).
6. The extension will appear in the installed extensions list and register its toolbar icon.

---

## Usage Instructions

1. **Configuring Audio**:
   - Click the extension icon in the browser toolbar to open the settings panel.
   - The default notification sound is set to **Windows Notify Email**.
   - To use your own sound, select **Custom Audio File** and click **Choose Audio File** (or drag and drop a file) to import an MP3, WAV, OGG, or M4A audio file.

2. **Adjusting Volume**:
   - Use the volume slider to set the output level between 0% and 100%.
   - Click **Play Preview** to verify the sound and volume level.

3. **Activating on WhatsApp Web**:
   - Open [WhatsApp Web](https://web.whatsapp.com) in your browser.
   - If WhatsApp Web is already open, reload the tab once to ensure the early injection script initializes at `document_start`.
   - Incoming notification sounds matching `static.whatsapp.net` will play your customized audio.

---

## Technical Specifications

| Parameter | Specification |
| :--- | :--- |
| **Manifest Version** | 3 |
| **Execution Worlds** | Main (`inject.js`) & Isolated (`bridge.js`) |
| **Permissions** | `storage` |
| **Host Permissions** | `https://web.whatsapp.com/*` |
| **Content Security Policy** | `script-src 'self'; object-src 'self';` |
| **Supported Audio Formats** | WAV, MP3, OGG, M4A, AAC |
| **Design Standard** | Dark Modern Palette (`#1f1f1f`, `#252526`, `#2d2d2d`, `#007acc`) |

