const { fetchMedia } = require('../lib/ytdlp');

const TT_REGEX = /https?:\/\/(www\.|vm\.|m\.)?tiktok\.com\/.+/i;

module.exports = {
    command: '.tt',
    execute: async (sock, msg, from, body, FOOTER) => {
        let url = body.replace('.tt', '').trim();

        if (!url) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            url = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim();
        }

        if (!TT_REGEX.test(url)) {
            return sock.sendMessage(from, {
                text: `⚠️ *Usage:* \`.tt <tiktok-link>\`\n\nDownloads without watermark.` + FOOTER
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `⏳ 🎵 Downloading from TikTok...` + FOOTER });

        try {
            const { title, buffer } = await fetchMedia(url, [
                '--max-filesize', '90m',
                '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--extractor-args', 'tiktok:api_hostname=api16-normal-c-useast1a.tiktokv.com'
            ]);

            await sock.sendMessage(from, {
                video: buffer,
                caption: `✅ *${title}*` + FOOTER,
                mimetype: 'video/mp4'
            }, { quoted: msg });

        } catch (e) {
            console.error('[TT Error]:', e.message);
            await sock.sendMessage(from, {
                text: `❌ TikTok download failed:\n${e.message}` + FOOTER
            }, { quoted: msg });
        }
    }
};
