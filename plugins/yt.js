const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/;

module.exports = {
    command: ['.yta', '.ytv'],
    execute: async (sock, msg, from, content, FOOTER) => {
        const cmd = content.toLowerCase().split(/\s+/)[0];

        try {
            let input = content.replace(cmd, '').trim();

            // 1. Get URL from reply if command is empty
            if (!input) {
                const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                                 msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
                input = quotedText.trim();
            }

            // 2. Extract Video ID
            const match = input.match(ytIdRegex);
            const videoId = match ? match[1] : null;

            if (!videoId) {
                return sock.sendMessage(from, { 
                    text: `⚠️ *Usage:* \n${cmd} <youtube-link>\nOr reply to a link with ${cmd}${FOOTER}` 
                }, { quoted: msg });
            }

            await sock.sendMessage(from, { text: `⏳ Fetching from Y2Mate...` });

            // 3. Y2Mate Scraper API (High Speed)
            const type = cmd === '.yta' ? 'mp3' : 'mp4';
            const apiUrl = `https://api.giftedtech.my.id/api/download/y2mate?url=https://www.youtube.com/watch?v=${videoId}&type=${type}`;
            
            const response = await fetch(apiUrl);
            const json = await response.json();

            if (!json.success || !json.result) {
                throw new Error("Y2Mate API failed to process this link.");
            }

            const data = json.result;
            const title = data.title || "YouTube Download";
            
            // Get the best quality URL from the Y2Mate result
            const downloadUrl = data.download_url || data.url;

            // 4. Download and Send
            const mediaRes = await fetch(downloadUrl);
            const buffer = Buffer.from(await mediaRes.arrayBuffer());

            if (cmd === '.yta') {
                await sock.sendMessage(from, { 
                    audio: buffer, 
                    mimetype: 'audio/mpeg', 
                    fileName: `${title}.mp3` 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { 
                    video: buffer, 
                    caption: `✅ *${title}*\n*Type:* Video (Y2Mate)${FOOTER}` 
                }, { quoted: msg });
            }

        } catch (e) {
            console.error('[Y2Mate Error]:', e.message);
            await sock.sendMessage(from, { text: `❌ Y2Mate Error: ${e.message}` });
        }
    }
};
