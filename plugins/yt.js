const { fetchMedia, getTitle } = require('../lib/ytdlp');

const ytIdRegex = /(?:http(?:s)?:\/\/)?(?:(?:www\.|)youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/;

module.exports = {
    command: ['.ytv', '.yta'],
    execute: async (sock, msg, from, body, FOOTER) => {
        const cmd = body.trim().split(/\s+/)[0].toLowerCase();
        const isAudio = cmd === '.yta';

        let input = body.replace(cmd, '').trim();

        if (!input) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            input = (quoted?.conversation || quoted?.extendedTextMessage?.text || '').trim();
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
            const ytdlpArgs = isAudio
                ? ['-x', '--audio-format', 'mp3', '--audio-quality', '128K', '--max-filesize', '50m']
                : ['-f', 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[height<=720]',
                   '--merge-output-format', 'mp4', '--max-filesize', '90m'];

            const { title, buffer } = await fetchMedia(videoUrl, ytdlpArgs);

            if (isAudio) {
                await sock.sendMessage(from, {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`,
                    ptt: false
                }, { quoted: msg });
            } else {
                await sock.sendMessage(from, {
                    video: buffer,
                    caption: `🎬 *${title}*` + FOOTER,
                    mimetype: 'video/mp4'
                }, { quoted: msg });
            }

        } catch (e) {
            console.error('[YT Plugin Error]:', e.message);
            await sock.sendMessage(from, {
                text: `❌ Download failed: ${e.message}` + FOOTER
            }, { quoted: msg });
        }
    }
};
