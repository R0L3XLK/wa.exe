module.exports = {
    command: '.tt',
    execute: async (sock, from, msg, content, FOOTER) => {
        try {
            const args = content.trim().split(/\s+/);
            let url = args[1];

            if (!url) {
                const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                                 msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
                url = quotedText.match(/https?:\/\/[^\s]+/)?.[0];
            }

            if (!url || !url.includes('tiktok.com')) {
                return await sock.sendMessage(from, { text: `⚠️ Please provide a valid TikTok link.${FOOTER}` });
            }

            await sock.sendMessage(from, { text: `⏳ Fetching TikTok Video...${FOOTER}` });

            // Using AIO API for TikTok
            const apiUrl = `https://api.giftedtech.my.id/api/download/tiktok?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl);
            const json = await response.json();

            if (!json.success) throw new Error("Could not find TikTok video.");

            const videoUrl = json.result.video_no_watermark || json.result.video;
            const videoRes = await fetch(videoUrl);
            const buffer = Buffer.from(await videoRes.arrayBuffer());

            await sock.sendMessage(from, { 
                video: buffer, 
                caption: `✅ *TikTok Downloaded*${FOOTER}` 
            }, { quoted: msg });

        } catch (e) {
            await sock.sendMessage(from, { text: `❌ TikTok Error: ${e.message}` });
        }
    }
};
