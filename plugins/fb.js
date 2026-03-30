const { fetchMedia } = require('../lib/ytdlp');

const FB_REGEX = /https?:\/\/(www\.)?(facebook\.com|fb\.watch|fb\.com)\/.+/i;

module.exports = {
    command: '.fb',
    execute: async (sock, msg, from, body, FOOTER) => {
        let url = body.replace('.fb', '').trim();

        if (!url) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            // Extract URL from quoted text if available
            const quotedText = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim();
            url = quotedText.match(FB_REGEX)?.[0] || quotedText;
        }

        if (!url || !FB_REGEX.test(url)) {
            return sock.sendMessage(from, {
                text: `⚠️ *Usage:* \`.fb <facebook-link>\`\n\nSupports: Facebook videos & Reels` + FOOTER
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `⏳ 📘 Downloading from Facebook...` + FOOTER });

        try {
            // FIX: Forced MP4 container and compatible H.264/AAC codecs
            const { title, buffer, ext } = await fetchMedia(url, [
                '--max-filesize', '90m',
                '--merge-output-format', 'mp4',
                '-f', 'bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            ]);

            const videoExtensions = ['mp4', 'webm', 'mkv', 'mov', 'avi'];
            const isVideo = videoExtensions.includes(ext.toLowerCase());

            if (isVideo) {
                await sock.sendMessage(from, {
                    video: buffer,
                    mimetype: 'video/mp4', // Force WhatsApp to recognize it as playable video
                    caption: `✅ *${title || 'Facebook Video'}*` + FOOTER,
                    fileName: `${title || 'fb-video'}.mp4`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `✅ *${title || 'Facebook Content'}*` + FOOTER
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
