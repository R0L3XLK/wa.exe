module.exports = {
    command: '.sys',
    execute: async (sock, from, msg, content, FOOTER) => {
        try {
            // Extract the quoted message's context
            const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

            if (!contextInfo || !contextInfo.stanzaId) {
                return await sock.sendMessage(from, {
                    text: "⚠️ Please *reply* to a message to detect the device." + FOOTER
                }, { quoted: msg });
            }

            const msgId = contextInfo.stanzaId;
            // Get the sender of the quoted message
            const sender = contextInfo.participant || contextInfo.remoteJid || from;
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

        } catch (e) {
            console.error("[Device Plugin Error]:", e);
        }
    }
};

/**
 * Modern Device Detection based on Message ID patterns
 */
function detectFromId(msgId) {
    if (!msgId) return { deviceName: 'Unknown', deviceEmoji: '❓', platform: 'Unknown' };

    const id = msgId.toUpperCase();

    // 1. WhatsApp Web / Desktop (Usually 20 chars or starts with 3EB0)
    if (id.startsWith('3EB0') || id.length === 20) {
        return { deviceName: 'WhatsApp Web', deviceEmoji: '🌐', platform: 'PC / Browser' };
    } 

    // 2. iOS / iPhone (Usually starts with 3A or has a specific length)
    if (id.startsWith('3A') || (id.length >= 22 && id.length <= 25)) {
        return { deviceName: 'iOS', deviceEmoji: '🍎', platform: 'iPhone / iPad' };
    }

    // 3. Android (Usually 32 characters, hex-based)
    if (id.length >= 28 && id.length <= 32) {
        return { deviceName: 'Android', deviceEmoji: '🤖', platform: 'Android Smartphone' };
    }

    // 4. Automation / Bots (Baileys often uses BAE5 or specific prefixes)
    if (id.startsWith('BAE5') || id.startsWith('META')) {
        return { deviceName: 'WhatsApp Bot', deviceEmoji: '⚡', platform: 'Automated Script' };
    }

    // 5. Legacy / Other
    if (id.startsWith('AC')) return { deviceName: 'Android', deviceEmoji: '🤖', platform: 'Mobile (Legacy)' };
    if (id.startsWith('3E')) return { deviceName: 'Web', deviceEmoji: '🌐', platform: 'Desktop' };

    return { 
        deviceName: 'Mobile/Unknown', 
        deviceEmoji: '📲', 
        platform: `Generic Identification (${id.length} chars)` 
    };
                }
