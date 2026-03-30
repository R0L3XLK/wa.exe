const { fetchMedia } = require('../lib/ytdlp');

const ytIdRegex = /(?:http(?:s)?:\/\/)?(?:(?:www\.|)youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/;

module.exports = {
    command: ['.ytv', '.yta'],
    execute: async (sock, msg, from, body, FOOTER) => {
        const cmd = body.trim().split(/\s+/)[0].toLowerCase();
        const isAudio = cmd === '.yta';

        let input = body.replace(cmd, '').trim();

        if (!input) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim();
            input = quotedText.match(ytIdRegex)?.[0] || quotedText;
        }

        const match = input.match(ytIdRegex);
        if (!match) {
            return sock.sendMessage(from, {
                text: `⚠️ *Usage:* \`${cmd} <youtube-link>\`\nOr reply to a YouTube link with \`${cmd}\`` + FOOTER
            }, { quoted: msg });
        }

        const videoId = match[1];
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        await sock.sendMessage(from, {
            text: `⏳ ${isAudio ? '🎵 Downloading audio (MP3)...' : '🎬 Downloading video (MP4)...'}` + FOOTER
        });

        try {
            // FIX: Added Impersonation and User-Agent to bypass Bot Detection
            // FIX: Forced avc1 (H.264) codec to ensure playback support on WhatsApp
            const commonArgs = [
                '--user-agent', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
                '--no-check-certificate',
                '--geo-bypass'
            ];

            const ytdlpArgs = isAudio
                ? [...commonArgs, '-x', '--audio-format', 'mp3', '--audio-quality', '128K', '--max-filesize', '50m']
                : [...commonArgs, 
                   '-f', 'bestvideo[ext=mp4][vcodec^=avc1][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][vcodec^=avc1][height<=720]/best[height<=720]',
                   '--merge-output-format', 'mp4', 
                   '--max-filesize', '90m'
                  ];

            const { title, buffer } = await fetchMedia(videoUrl, ytdlpArgs);

            if (isAudio) {
                await sock.sendMessage(from, {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${title || 'audio'}.mp3`,
                    ptt: false
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: `🎬 *${title || 'YouTube Video'}*` + FOOTER,
                    mimetype: 'video/mp4',
                    fileName: `${title || 'video'}.mp4`
                }, { quoted: msg });
            }

        } catch (e) {
            console.error('[YT Plugin Error]:', e.message);
            
            // Helpful error message for the user if the IP is still hard-blocked
            let errorMsg = e.message;
            if (errorMsg.includes('Sign in')) {
                errorMsg = "YouTube has blocked this server's IP. Please try again in a few minutes or use a different link.";
            }

            await sock.sendMessage(from, {
                text: `❌ Download failed:\n${errorMsg}` + FOOTER
            }, { quoted: msg });
        }
    }
};
