module.exports = {
    command: '.dl',
    execute: async (sock, from, msg, content, FOOTER) => {
        try {
            const args = content.trim().split(/\s+/);
            let url = args[1];

            // 1. Extract URL from reply if not provided in command
            if (!url) {
                const quotedText =
                    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
                url = extractUrl(quotedText);
            }

            if (!url) {
                return await sock.sendMessage(from, {
                    text: `⚠️ *Usage:* \`.dl <url>\`\nExample: \`.dl https://tiktok.com/xxx\`${FOOTER}`
                }, { quoted: msg });
            }

            await sock.sendMessage(from, { text: `⏳ Fetching media from API...${FOOTER}` });

            // 2. Use a Public API (AIO Downloader)
            // Note: Using a public API like 'Aura' or similar scrapers
            const apiUrl = `https://api.giftedtech.my.id/api/download/all?url=${encodeURIComponent(url)}`;
            
            const response = await fetch(apiUrl);
            const json = await response.json();

            if (!json.success || !json.result) {
                throw new Error("API failed to fetch this link. Try another URL.");
            }

            const data = json.result;
            const downloadUrl = data.url || data.video_url || data.audio_url;
            const title = data.title || "WA.EXE Download";

            // 3. Download the buffer from the API result
            const mediaRes = await fetch(downloadUrl);
            const buffer = Buffer.from(await mediaRes.arrayBuffer());
            const sizeMB = buffer.length / (1024 * 1024);

            if (sizeMB > 100) throw new Error("File is too large for this VPS (Max 100MB).");

            // 4. Send as Video or Image based on what the API returns
            if (url.includes('instagram') || url.includes('tiktok') || url.includes('youtube')) {
                await sock.sendMessage(from, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption: `✅ *${title}*\n📦 Size: ${sizeMB.toFixed(2)} MB${FOOTER}`
                }, { quoted: msg });
            } else {
                // Fallback to document for unknown types
                await sock.sendMessage(from, {
                    document: buffer,
                    mimetype: 'application/octet-stream',
                    fileName: `${title}.mp4`,
                    caption: `✅ Downloaded Successfully!${FOOTER}`
                }, { quoted: msg });
            }

        } catch (err) {
            console.error('[Universal DL Error]:', err.message);
            await sock.sendMessage(from, { text: `❌ *Error:* ${err.message}${FOOTER}` });
        }
    }
};

function extractUrl(text) {
    return text?.match(/https?:\/\/[^\s]+/)?.[0] || null;
                    }
