const { fetchMedia } = require('../lib/ytdlp');

const FB_REGEX = /https?:\/\/(www\.)?(facebook\.com|fb\.watch|fb\.com)\/.+/i;

module.exports = {
    command: '.fb',
    execute: async (sock, msg, from, body, FOOTER) => {
        let url = body.replace('.fb', '').trim();

        if (!url) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            url = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim();
        }

        if (!FB_REGEX.test(url)) {
            return sock.sendMessage(from, {
                text: `⚠️ *Usage:* \`.fb <facebook-link>\`\n\nSupports: Facebook videos & Reels` + FOOTER
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `⏳ 📘 Downloading from Facebook...` + FOOTER });

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
            console.error('[FB Error]:', e.message);
            await sock.sendMessage(from, {
                text: `❌ Facebook download failed:\n${e.message}` + FOOTER
            }, { quoted: msg });
        }
    }
};
