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
        const { deviceName, deviceEmoji, platform } = detectFromId(msgId);

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

function detectFromId(msgId) {
    if (!msgId) return { deviceName: 'Unknown', deviceEmoji: '❓', platform: 'Unknown' };

    const id = msgId.toUpperCase();

    if (id.startsWith('3EB'))  return { deviceName: 'WhatsApp Web', deviceEmoji: '🌐', platform: 'WhatsApp Web (Browser)' };
    if (id.startsWith('AC'))   return { deviceName: 'Android', deviceEmoji: '🤖', platform: 'Android Phone / Tablet' };
    if (id.startsWith('IO'))   return { deviceName: 'iOS', deviceEmoji: '🍎', platform: 'iPhone' };
    if (id.startsWith('IP'))   return { deviceName: 'iPad', deviceEmoji: '📱', platform: 'iPad (iOS)' };
    if (id.startsWith('AN'))   return { deviceName: 'Android', deviceEmoji: '🤖', platform: 'Android (Alternative)' };
    if (id.startsWith('SM'))   return { deviceName: 'Samsung', deviceEmoji: '📲', platform: 'Samsung Android Device' };
    if (id.startsWith('WP'))   return { deviceName: 'Windows Phone', deviceEmoji: '🪟', platform: 'Windows Phone (Legacy)' };
    if (id.startsWith('BB'))   return { deviceName: 'BlackBerry', deviceEmoji: '🫐', platform: 'BlackBerry (Legacy)' };
    if (id.startsWith('FM'))   return { deviceName: 'Facebook Messenger', deviceEmoji: '💬', platform: 'Facebook / Messenger' };

    return { deviceName: 'Unknown', deviceEmoji: '❓', platform: `Unrecognized (prefix: ${msgId.substring(0, 4)}, len: ${msgId.length})` };
}
