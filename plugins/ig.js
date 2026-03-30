const { fetchMedia } = require('../lib/ytdlp');

const IG_REGEX = /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[^\s]+/i;

module.exports = {
    command: '.ig',
    execute: async (sock, msg, from, body, FOOTER) => {
        let url = body.replace('.ig', '').trim();

        if (!url) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            url = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim();
        }

        if (!IG_REGEX.test(url)) {
            return sock.sendMessage(from, {
                text: `⚠️ *Usage:* \`.ig <instagram-link>\`\n\nSupports: Posts, Reels, Stories` + FOOTER
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `⏳ 📸 Downloading from Instagram...` + FOOTER });

        try {
            const { title, buffer, ext } = await fetchMedia(url, [
                '--max-filesize', '90m',
                '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            ]);

            const isVideo = ['mp4', 'webm', 'mkv', 'mov'].includes(ext);

            if (isVideo) {
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: `✅ *${title}*` + FOOTER,
                    mimetype: 'video/mp4'
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `✅ *${title}*` + FOOTER
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
