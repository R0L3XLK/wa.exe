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

        const device = detectDevice(msgId);

        const text = `*─── [ DEVICE INFO ] ───*

*User:* @${sender.split('@')[0]}
*Message ID:* ${msgId}
*Device:* ${device.name} ${device.emoji}
*Platform:* ${device.platform}${FOOTER}`;

        await sock.sendMessage(from, {
            text,
            mentions: [sender]
        }, { quoted: msg });
    }
};

function detectDevice(msgId) {
    if (!msgId) return { name: 'Unknown', emoji: '❓', platform: 'Unknown' };

    if (msgId.startsWith('3A')) {
        return { name: 'iOS', emoji: '🍎', platform: 'iPhone / iPad' };
    }
    if (msgId.startsWith('3E')) {
        return { name: 'Android', emoji: '🤖', platform: 'Android Phone / Tablet' };
    }
    if (msgId.startsWith('BAE')) {
        return { name: 'WhatsApp Web / Desktop', emoji: '💻', platform: 'Browser / Windows / Mac / Linux' };
    }
    if (msgId.startsWith('A3')) {
        return { name: 'Bot', emoji: '🦾', platform: 'Automated Bot (API/Script)' };
    }
    if (msgId.startsWith('B2')) {
        return { name: 'WhatsApp Business', emoji: '🏢', platform: 'WhatsApp Business App' };
    }

    return { name: 'Unknown / Bot', emoji: '❓', platform: `Unrecognized ID prefix: ${msgId.substring(0, 3)}` };
}
