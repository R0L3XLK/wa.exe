# WA.EXE - WhatsApp Automation Bot

## Overview
A WhatsApp automation bot built with Node.js using the `@whiskeysockets/baileys` library. It connects to WhatsApp via a pairing code system and handles plugin-based commands.

## Project Structure
- `index.js` - Main entry point; connects to WhatsApp and routes messages to plugins
- `plugins/` - Plugin directory; each file exports a `command` and `execute` function
  - `ping.js` - Responds to `.ping` with system status
  - `info.js` - Responds to `.info` with user information
- `session/` - Auto-generated directory storing WhatsApp authentication credentials

## Setup & Running
- Runtime: Node.js 20
- Package manager: npm
- Start command: `node index.js`

## First Run / Authentication
On first run, the bot will prompt for a phone number in the terminal (e.g., `947XXXXXXXX`). It will then generate a **pairing code** that you enter in WhatsApp > Linked Devices. After pairing, session credentials are saved to the `session/` folder for future runs.

## Adding Plugins
Create a new `.js` file in `plugins/` exporting:
```js
module.exports = {
    command: '.commandname',
    execute: async (sock, from, msg, content, FOOTER) => { ... }
};
```

## Dependencies
- `@whiskeysockets/baileys` - WhatsApp Web API library
- `@adiwajshing/keyed-db` - Key-value store used by Baileys
- `chalk` - Terminal color output
- `pino` - Logger
- `qrcode-terminal` - QR code display (available but pairing code is used instead)
- `fs-extra` - Extended file system utilities
