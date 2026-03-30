const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const YTDLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
const BIN_DIR = path.join(__dirname, 'bin');
const YTDLP_PATH = path.join(BIN_DIR, 'yt-dlp');

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (targetUrl) => {
            https.get(targetUrl, (res) => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    return request(res.headers.location);
                }
                if (res.statusCode !== 200) {
                    return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
                }
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
            }).on('error', reject);
        };
        request(url);
    });
}

async function ensureYtDlp() {
    if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

    if (fs.existsSync(YTDLP_PATH)) {
        try {
            const version = execSync(`${YTDLP_PATH} --version`, { timeout: 5000 }).toString().trim();
            console.log(`[Setup] yt-dlp found: v${version}`);
            return YTDLP_PATH;
        } catch {
            console.log('[Setup] yt-dlp binary invalid, re-downloading...');
            fs.unlinkSync(YTDLP_PATH);
        }
    }

    console.log('[Setup] Downloading yt-dlp binary...');
    await downloadFile(YTDLP_URL, YTDLP_PATH);
    fs.chmodSync(YTDLP_PATH, '755');
    const version = execSync(`${YTDLP_PATH} --version`, { timeout: 5000 }).toString().trim();
    console.log(`[Setup] yt-dlp downloaded: v${version}`);
    return YTDLP_PATH;
}

module.exports = { ensureYtDlp, YTDLP_PATH };
