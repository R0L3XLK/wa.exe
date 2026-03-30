const { spawn, execFileSync } = require('child_process');
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
        const stamp = Date.now();
        const outTemplate = path.join(tmpDir, `wa_yt_${stamp}`);

        try {
            // Step 1: Get title via --skip-download --print title
            let title = 'YouTube';
            try {
                title = execFileSync(YTDLP_PATH, [
                    '--no-playlist', '--skip-download',
                    '--print', 'title', videoUrl
                ], { timeout: 15000 }).toString().trim() || 'YouTube';
            } catch (_) {}

            // Step 2: Download the actual file
            await runYtDlp(videoUrl, isAudio, outTemplate);

            // Step 3: Find the output file (extension may vary)
            const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(`wa_yt_${stamp}`));
            if (!files.length) throw new Error('yt-dlp ran but produced no output file.');

            const outFile = path.join(tmpDir, files[0]);
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
                url
              ]
            : [
                '--no-playlist',
                '-f', 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best[height<=720]',
                '--merge-output-format', 'mp4',
                '--max-filesize', '90m',
                '-o', `${outTemplate}.%(ext)s`,
                url
              ];

        const proc = spawn(YTDLP_PATH, args);
        let errOut = '';

        proc.stderr.on('data', (d) => { errOut += d.toString(); });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                const reason = errOut.split('\n')
                    .filter(l => l.includes('ERROR'))
                    .pop() || errOut.slice(-300);
                reject(new Error(reason.replace(/.*ERROR:?\s*/i, '').trim() || `yt-dlp exited with code ${code}`));
            }
        });

        proc.on('error', reject);
    });
}
