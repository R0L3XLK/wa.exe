const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { YTDLP_PATH } = require('../setup');

const ytIdRegex = /(?:http(?:s)?:\/\/)?(?:(?:www\.|)youtube(?:-nocookie)?\.com\/(?:watch\?.*v=|embed\/|shorts\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/;

module.exports = {
    command: ['.ytv', '.yta'],
    execute: async (sock, msg, from, body, FOOTER) => {
        const cmd = body.trim().split(/\s+/)[0].toLowerCase();
        const isAudio = cmd === '.yta';

        let input = body.replace(cmd, '').trim();

        if (!input) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            input = quoted?.conversation || quoted?.extendedTextMessage?.text || '';
            input = input.trim();
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

        const tmpDir = os.tmpdir();
        const tmpFile = path.join(tmpDir, `wa_yt_${Date.now()}`);

        try {
            const title = await runYtDlp(videoUrl, isAudio, tmpFile);

            const outFile = isAudio ? `${tmpFile}.mp3` : `${tmpFile}.mp4`;

            if (!fs.existsSync(outFile)) {
                throw new Error('Downloaded file not found after yt-dlp completed.');
            }

            const buffer = fs.readFileSync(outFile);
            fs.unlinkSync(outFile);

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

function runYtDlp(url, isAudio, outTemplate) {
    return new Promise((resolve, reject) => {
        const args = isAudio
            ? [
                '--no-playlist', '-x',
                '--audio-format', 'mp3',
                '--audio-quality', '128K',
                '--max-filesize', '50m',
                '-o', `${outTemplate}.%(ext)s`,
                '--print', 'title',
                url
              ]
            : [
                '--no-playlist',
                '-f', 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[height<=720]',
                '--merge-output-format', 'mp4',
                '--max-filesize', '90m',
                '-o', `${outTemplate}.%(ext)s`,
                '--print', 'title',
                url
              ];

        const proc = spawn(YTDLP_PATH, args);
        let title = 'YouTube';
        let errOut = '';

        proc.stdout.on('data', (d) => {
            const line = d.toString().trim();
            if (line) title = line;
        });

        proc.stderr.on('data', (d) => {
            errOut += d.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve(title);
            } else {
                const reason = errOut.split('\n').filter(l => l.includes('ERROR')).pop() || errOut.slice(-200);
                reject(new Error(reason.replace('ERROR:', '').trim() || `yt-dlp exited with code ${code}`));
            }
        });

        proc.on('error', reject);
    });
}
