const { fetchMedia } = require('../lib/ytdlp');

const IG_REGEX = /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[^\s]+/i;

module.exports = {
    command: '.ig',
    execute: async (sock, msg, from, body, FOOTER) => {
        let url = body.replace('.ig', '').trim();

        if (!url) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            url = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim().match(IG_REGEX)?.[0];
        }

        if (!url || !IG_REGEX.test(url)) {
            return sock.sendMessage(from, {
                text: `⚠️ *Usage:* \`.ig <instagram-link>\`\n\nSupports: Posts, Reels, Stories` + FOOTER
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `⏳ 📸 Downloading from Instagram...` + FOOTER });

        try {
            // FIX: Refined yt-dlp arguments to force mp4 and compatible codecs
            const { title, buffer, ext } = await fetchMedia(url, [
                '--max-filesize', '90m',
                '--merge-output-format', 'mp4',
                '-f', 'bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            ]);

            // Ensure we treat common video extensions as video
            const videoExtensions = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'flv'];
            const isVideo = videoExtensions.includes(ext.toLowerCase());

            if (isVideo) {
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: `✅ *${title || 'Instagram Video'}*` + FOOTER,
                    mimetype: 'video/mp4',
                    fileName: `${title || 'ig-video'}.mp4`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `✅ *${title || 'Instagram Photo'}*` + FOOTER
                }, { quoted: msg });
            }

        } catch (e) {
            console.error('[IG Error]:', e.message);
            await sock.sendMessage(from, {
                text: `❌ Instagram download failed:\n${e.message}` + FOOTER
            }, { quoted: msg });
        }
    }
};
