const ytIdRegex = /(?:http(?:s|):\/\/|)(?:(?:www\.|)youtube(?:\-nocookie|)\.com\/(?:watch\?.*(?:|\&)v=|embed|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/;

module.exports = {
    command: '.', // Logic handles .yta and .ytv
    execute: async (sock, from, msg, content, FOOTER) => {
        const cmd = content.toLowerCase().split(/\s+/)[0];
        if (cmd !== '.yta' && cmd !== '.ytv') return;

        try {
            let input = content.replace(cmd, '').trim();
            
            // 1. Handle Reply logic
            if (!input) {
                const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                                 msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
                input = quotedText.trim();
            }

            if (!input) return sock.sendMessage(from, { text: `⚠️ Usage: *${cmd} <url or search>*` + FOOTER });

            await sock.sendMessage(from, { text: `⏳ Searching & Processing...` });

            // 2. Resolve URL or Search Query
            let url = input;
            if (!ytIdRegex.test(input)) {
                // If it's not a URL, use a search API to find the first video
                const searchApi = `https://api.giftedtech.my.id/api/search/youtube?query=${encodeURIComponent(input)}`;
                const sRes = await fetch(searchApi).then(res => res.json());
                if (!sRes.success || !sRes.result[0]) throw new Error("No results found.");
                url = sRes.result[0].url;
            }

            // 3. Download using the API (Compatible with your 'y2mate' style logic)
            const type = cmd === '.yta' ? 'mp3' : 'mp4';
            const dlApi = `https://api.giftedtech.my.id/api/download/dlmp4?url=${encodeURIComponent(url)}`;
            const dlRes = await fetch(dlApi).then(res => res.json());

            if (!dlRes.success) throw new Error("API failed to fetch media.");

            const data = dlRes.result;
            const mediaUrl = cmd === '.yta' ? data.download_url_audio || data.download_url : data.download_url;
            const mediaBuffer = Buffer.from(await (await fetch(mediaUrl)).arrayBuffer());

            // 4. Send to User
            if (cmd === '.yta') {
                await sock.sendMessage(from, { 
                    audio: mediaBuffer, 
                    mimetype: 'audio/mpeg', 
                    fileName: `${data.title}.mp3` 
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, { 
                    video: mediaBuffer, 
                    caption: `✅ *${data.title}*` + FOOTER 
                }, { quoted: msg });
            }

        } catch (e) {
            console.error(e);
            sock.sendMessage(from, { text: `❌ Error: ${e.message}` });
        }
    }
};
