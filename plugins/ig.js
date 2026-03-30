const { fetchMedia } = require('../lib/ytdlp');

const IG_REGEX = /https?:\/\/(www\.)?instagram\.com\/(p|reel|tv|stories)\/[^\s]+/i;

module.exports = {
    command: '.ig',
    execute: async (sock, msg, from, body, FOOTER) => {
        let url = body.replace('.ig', '').trim();

        if (!url) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim();
            url = quotedText.match(IG_REGEX)?.[0] || quotedText;
        }

        if (!url || !IG_REGEX.test(url)) {
            return sock.sendMessage(from, {
                text: `⚠️ *Usage:* \`.ig <instagram-link>\`` + FOOTER
            }, { quoted: msg });
        }

        await sock.sendMessage(from, { text: `⏳ 📸 Fetching from Instagram...` + FOOTER });

        try {
            // FIX: Added 'User-Agent' and 'Impersonate' to mimic a real browser
            // This helps bypass the "Login Required" error on some servers
            const { title, buffer, ext } = await fetchMedia(url, [
                '--max-filesize', '90m',
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
                '--no-check-certificate',
                '--geo-bypass',
                '--merge-output-format', 'mp4',
                '-f', 'bestvideo[ext=mp4][vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4]/best'
            ]);

            const videoExtensions = ['mp4', 'webm', 'mkv', 'mov'];
            const isVideo = videoExtensions.includes(ext.toLowerCase());

            if (isVideo) {
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: `✅ *${title || 'Instagram Video'}*` + FOOTER,
                    mimetype: 'video/mp4'
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `✅ *${title || 'Instagram Photo'}*` + FOOTER
                }, { quoted: msg });
            }

        } catch (e) {
            // If yt-dlp still fails, it means your IP is hard-blocked.
            console.error('[IG Error]:', e.message);
            await sock.sendMessage(from, {
                text: `❌ *Instagram Blocked this Request*\n\nReason: Instagram is asking for Login. This usually happens on VPS. Try again in a few minutes.` + FOOTER
            }, { quoted: msg });
        }
    }
};
