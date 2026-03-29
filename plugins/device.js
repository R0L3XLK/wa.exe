module.exports = {
    command: '.d',
    execute: async (sock, from, msg, content, FOOTER) => {
        // Correct way to get the quoted message details
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

        if (!contextInfo || !contextInfo.stanzaId) {
            return await sock.sendMessage(from, {
                text: "⚠️ Please *reply* to a message to detect the device." + FOOTER
            }, { quoted: msg });
        }

        const msgId = contextInfo.stanzaId;
        const sender = contextInfo.participant || from;
        const { deviceName, deviceEmoji, platform } = detectFromId(msgId);

        const text = `*─── [ DEVICE INFO ] ───*

*User:* @${sender.split('@')[0]}
*Message ID:* \`${msgId}\`
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

    // Modern WhatsApp Multi-Device ID Detection
    if (msgId.length === 20 || msgId.startsWith('3EB0')) {
        return { deviceName: 'WhatsApp Web', deviceEmoji: '🌐', platform: 'PC / Browser' };
    } 
    if (msgId.startsWith('BAE5') || msgId.length === 16) {
        return { deviceName: 'WhatsApp Bot', deviceEmoji: '🤖', platform: 'Automation Script' };
    }
    if (msgId.startsWith('3A') || (msgId.length > 20 && msgId.length < 25)) {
        return { deviceName: 'iOS', deviceEmoji: '🍎', platform: 'iPhone' };
    }
    if (msgId.length >= 28 && msgId.length <= 32) {
        return { deviceName: 'Android', deviceEmoji: '🤖', platform: 'Android Device' };
    }

    // Fallback for older prefixes
    const id = msgId.toUpperCase();
    if (id.startsWith('3EB')) return { deviceName: 'Web', deviceEmoji: '🌐', platform: 'Desktop' };
    if (id.startsWith('AC'))  return { deviceName: 'Android', deviceEmoji: '🤖', platform: 'Mobile' };
    if (id.startsWith('IO'))  return { deviceName: 'iOS', deviceEmoji: '🍎', platform: 'iPhone' };

    return { 
        deviceName: 'Mobile/Unknown', 
        deviceEmoji: '📲', 
        platform: `Generic (${msgId.length} chars)` 
    };
}