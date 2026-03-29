module.exports = {
    command: '.yt',
    execute: async (sock, from, msg, content, FOOTER) => {
        try {
            const args = content.trim().split(/\s+/);
            const subCommand = args[0]; // .yta or .ytv
            let url = args[1];

            // 1. Get URL from reply if not provided
            if (!url) {
                const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                                 msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
                url = quotedText.match(/https?:\/\/[^\s]+/)?.[0];
            }

            if (!url) {
                return await sock.sendMessage(from, { 
                    text: `⚠️ *Usage:* \n.ytv <url> (for Video)\n.yta <url> (for Audio)${FOOTER}` 
                }, { quoted: msg });
            }

            await sock.sendMessage(from, { text: `⏳ Processing YouTube Request...${FOOTER}` });

            // 2. Fetch from Public API
            const apiUrl = `https://api.giftedtech.my.id/api/download/ytmp4?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl);
            const json = await response.json();

            if (!json.success) throw new Error("Video not found or API error.");

            const data = json.result;
            const mediaRes = await fetch(subCommand === '.yta' ? data.download_url_audio : data.download_url);
            const buffer = Buffer.from(await mediaRes.arrayBuffer());

            // 3. Send as Audio or Video
            if (subCommand === '.yta') {
                await sock.sendMessage(from, { 
                    audio: buffer, 
                    mimetype: 'audio/mpeg', 
                    fileName: `${data.title}.mp3` 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { 
                    video: buffer, 
                    caption: `✅ *${data.title}*${FOOTER}` 
                }, { quoted: msg });
            }

        } catch (e) {
            await sock.sendMessage(from, { text: `❌ Error: ${e.message}` });
        }
    }
};
