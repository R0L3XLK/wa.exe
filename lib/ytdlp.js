const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { YTDLP_PATH } = require('../setup');

/**
 * Get title/metadata without downloading.
 */
function getTitle(url, extraArgs = []) {
    try {
        return execFileSync(YTDLP_PATH, [
            '--no-playlist', '--skip-download',
            '--print', 'title',
            ...extraArgs,
            url
        ], { timeout: 20000 }).toString().trim() || 'Download';
    } catch (_) {
        return 'Download';
    }
}

/**
 * Download media via yt-dlp.
 * @param {string} url        - Media URL
 * @param {string[]} args     - yt-dlp format/quality args
 * @param {string} outTemplate - Output path template (without extension)
 * @returns {Promise<string>} - Resolved path of the downloaded file
 */
function download(url, args, outTemplate) {
    return new Promise((resolve, reject) => {
        const fullArgs = [
            '--no-playlist',
            '-o', `${outTemplate}.%(ext)s`,
            ...args,
            url
        ];

        const proc = spawn(YTDLP_PATH, fullArgs);
        let errOut = '';

        proc.stderr.on('data', d => { errOut += d.toString(); });

        proc.on('close', code => {
            if (code !== 0) {
                const reason = errOut.split('\n')
                    .filter(l => l.toLowerCase().includes('error'))
                    .pop() || errOut.slice(-300);
                return reject(new Error(reason.replace(/.*ERROR:?\s*/i, '').trim() || `yt-dlp exited with code ${code}`));
            }

            // Find the output file — extension is determined by yt-dlp
            const stamp = path.basename(outTemplate);
            const tmpDir = path.dirname(outTemplate);
            const files = fs.readdirSync(tmpDir).filter(f => f.startsWith(stamp));
            if (!files.length) return reject(new Error('yt-dlp produced no output file.'));
            resolve(path.join(tmpDir, files[0]));
        });

        proc.on('error', reject);
    });
}

/**
 * Full flow: get title → download → return { title, buffer, ext }
 */
async function fetchMedia(url, ytdlpArgs, titleArgs = []) {
    const title = getTitle(url, titleArgs);

    const stamp = `wa_dl_${Date.now()}`;
    const outTemplate = path.join(os.tmpdir(), stamp);

    const outFile = await download(url, ytdlpArgs, outTemplate);
    const buffer = fs.readFileSync(outFile);
    fs.unlinkSync(outFile);
    const ext = path.extname(outFile).replace('.', '').toLowerCase();

    return { title, buffer, ext };
}

module.exports = { fetchMedia, getTitle, download };
