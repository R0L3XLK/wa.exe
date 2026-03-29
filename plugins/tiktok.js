module.exports = {
    command: '.tiktok',
    execute: async (sock, from, msg, content, FOOTER) => {
        try {
            let url = content.replace('.tiktok', '').trim();

            if (!url) {
                const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                                 msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
                url = quotedText.trim();
            }

            if (!url || !url.includes('tiktok.com')) {
                return sock.sendMessage(from, { text: "⚠️ Please provide a TikTok link or reply to one." + FOOTER });
            }

            await sock.sendMessage(from, { text: "⏳ Downloading TikTok Video..." });

            // Fetch from a stable AIO API
            const apiUrl = `https://api.giftedtech.my.id/api/download/tiktok?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl).then(res => res.json());

            if (!response.success) throw new Error("TikTok video not found.");

            // Logic: Prefer No-Watermark (HD) if available
            const videoUrl = response.result.video_no_watermark || response.result.video;
            const buffer = Buffer.from(await (await fetch(videoUrl)).arrayBuffer());

            await sock.sendMessage(from, { 
                video: buffer, 
                caption: `✅ *TikTok Downloaded Successfully*` + FOOTER 
            }, { quoted: msg });

        } catch (e) {
            sock.sendMessage(from, { text: `❌ TikTok Error: ${e.message}` });
        }
    }
};
