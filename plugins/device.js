const { getDevice } = require("@whiskeysockets/baileys");

module.exports = {
    command: '.d',
    execute: async (sock, msg, from, body, FOOTER) => {
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

        if (!contextInfo || !contextInfo.stanzaId) {
            await sock.sendMessage(from, {
                text: "⚠️ Please *reply* to a message to detect the device." + FOOTER
            }, { quoted: msg });
            return;
        }

        const msgId = contextInfo.stanzaId;
        const sender = contextInfo.participant || contextInfo.remoteJid || from;

        let deviceName, deviceEmoji, platform;

        try {
            const raw = getDevice(msgId);
            ({ deviceName, deviceEmoji, platform } = mapDevice(raw));
        } catch {
            ({ deviceName, deviceEmoji, platform } = detectFromId(msgId));
        }

        const text = `*─── [ DEVICE INFO ] ───*

*User:* @${sender.split('@')[0]}
*Message ID:* ${msgId}
*Device:* ${deviceName} ${deviceEmoji}
*Platform:* ${platform}${FOOTER}`;

        await sock.sendMessage(from, {
            text,
            mentions: [sender]
        }, { quoted: msg });
    }
};

function mapDevice(raw) {
    switch (raw) {
        case 'android':
            return { deviceName: 'Android', deviceEmoji: '🤖', platform: 'Android Phone / Tablet' };
        case 'ios':
            return { deviceName: 'iOS', deviceEmoji: '🍎', platform: 'iPhone / iPad' };
        case 'web':
            return { deviceName: 'WhatsApp Web / Desktop', deviceEmoji: '💻', platform: 'Browser / Windows / Mac' };
        case 'desktop':
            return { deviceName: 'Desktop App', deviceEmoji: '🖥️', platform: 'Windows / Mac Desktop App' };
        default:
            return detectFromId(raw);
    }
}

function detectFromId(msgId) {
    if (!msgId) return { deviceName: 'Unknown', deviceEmoji: '❓', platform: 'Unknown' };

    // Android: BAE prefix or long IDs (32 chars)
    if (msgId.startsWith('BAE') || msgId.length === 32) {
        return { deviceName: 'Android', deviceEmoji: '🤖', platform: 'Android Phone / Tablet' };
    }

    // iOS: starts with 3A
    if (msgId.startsWith('3A')) {
        return { deviceName: 'iOS', deviceEmoji: '🍎', platform: 'iPhone / iPad' };
    }

    // WhatsApp Web (browser): 3EB0 prefix, ~22 chars
    if (msgId.startsWith('3EB0')) {
        return { deviceName: 'WhatsApp Web / Bot', deviceEmoji: '💻', platform: 'Browser / Baileys Bot' };
    }

    // Desktop (Mac/Windows app): other 3EB prefix
    if (msgId.startsWith('3EB')) {
        return { deviceName: 'Desktop App', deviceEmoji: '🖥️', platform: 'Windows / Mac Desktop App' };
    }

    // Windows: short 18 char IDs
    if (msgId.length === 18) {
        return { deviceName: 'Windows Desktop', deviceEmoji: '🪟', platform: 'WhatsApp for Windows' };
    }

    return { deviceName: 'Unknown', deviceEmoji: '❓', platform: `Unrecognized (prefix: ${msgId.substring(0, 4)}, len: ${msgId.length})` };
}
