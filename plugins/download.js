const fs = require('fs');

module.exports = {
    command: '.dl',
    execute: async (sock, msg, from, body, FOOTER) => {
        const args = body.trim().split(/\s+/);
        let url = args[1];

        if (!url) {
            const quotedText =
                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
            url = extractUrl(quotedText);
        }

        if (!url) {
            await sock.sendMessage(from, {
                text: `⚠️ Provide a URL or reply to a message with one.\n\n*Usage:* \`.dl <url>\`\n\n*Supported:* YouTube, TikTok, Instagram, Twitter, Reddit, SoundCloud & more.${FOOTER}`
            });
            return;
        }

        await sock.sendMessage(from, { text: `⏳ Downloading...\n🔗 ${url}${FOOTER}` });

        try {
            const platform = detectPlatform(url);
            let result = null;

            if (platform === 'youtube') {
                result = await downloadYouTube(url);
            } else if (platform === 'tiktok') {
                result = await downloadTikTok(url);
            } else {
                await sock.sendMessage(from, {
                    text: `❌ Unsupported platform. Currently supported:\n• YouTube\n• TikTok${FOOTER}`
                });
                return;
            }

            if (!result) throw new Error('No downloadable content found.');

            const { buffer, mimeType, title } = result;
            const sizeMB = buffer.length / (1024 * 1024);

            if (mimeType.startsWith('video/')) {
                if (sizeMB > 64) {
                    await sock.sendMessage(from, { text: `❌ File too large (${sizeMB.toFixed(1)} MB). Max 64 MB for video.${FOOTER}` });
                    return;
                }
                await sock.sendMessage(from, {
                    video: buffer,
                    mimetype: mimeType,
                    caption: `✅ ${title || 'Downloaded'}${FOOTER}`
                });
            } else if (mimeType.startsWith('audio/')) {
                if (sizeMB > 16) {
                    await sock.sendMessage(from, {
                        document: buffer,
                        mimetype: mimeType,
                        fileName: `${title || 'audio'}.mp3`,
                        caption: `✅ ${title || 'Downloaded'}${FOOTER}`
                    });
                } else {
                    await sock.sendMessage(from, {
                        audio: buffer,
                        mimetype: mimeType,
                        ptt: false
                    });
                }
            } else if (mimeType.startsWith('image/')) {
                await sock.sendMessage(from, {
                    image: buffer,
                    caption: `✅ ${title || 'Downloaded'}${FOOTER}`
                });
            } else {
                await sock.sendMessage(from, {
                    document: buffer,
                    mimetype: mimeType || 'application/octet-stream',
                    fileName: `${title || 'download'}`,
                    caption: `✅ ${title || 'Downloaded'}${FOOTER}`
                });
            }
        } catch (err) {
            console.error('[dl plugin]', err.message);
            await sock.sendMessage(from, { text: `❌ Failed: ${err.message}${FOOTER}` });
        }
    }
};

function extractUrl(text) {
    return text?.match(/https?:\/\/[^\s]+/)?.[0] || null;
}

function detectPlatform(url) {
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/tiktok\.com/.test(url)) return 'tiktok';
    if (/instagram\.com/.test(url)) return 'instagram';
    if (/twitter\.com|x\.com/.test(url)) return 'twitter';
    if (/reddit\.com/.test(url)) return 'reddit';
    return 'unknown';
}

async function downloadYouTube(url) {
    const { Innertube } = await import('youtubei.js');
    const yt = await Innertube.create({ retrieve_player: false });

    const videoId = extractYouTubeId(url);
    const info = await yt.getInfo(videoId);
    const title = info.basic_info?.title || 'YouTube Video';

    const ytWithPlayer = await Innertube.create();
    const infoWithPlayer = await ytWithPlayer.getInfo(videoId);

    const stream = await infoWithPlayer.download({
        type: 'video+audio',
        quality: 'best',
        format: 'mp4'
    });

    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }

    return { buffer: Buffer.concat(chunks), mimeType: 'video/mp4', title };
}

function extractYouTubeId(url) {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] || url;
}

async function downloadTikTok(url) {
    const Tiktok = require('@tobyg74/tiktok-api-dl');
    const result = await Tiktok.Downloader(url, { version: 'v1' });

    if (result.status !== 'success') throw new Error('TikTok download failed');

    const videoUrl = result.result?.video?.[0] || result.result?.video2?.[0];
    if (!videoUrl) throw new Error('No video URL in TikTok response');

    const { buffer, mimeType } = await fetchBuffer(videoUrl);
    const title = result.result?.description || 'TikTok Video';
    return { buffer, mimeType: mimeType || 'video/mp4', title };
}

async function fetchBuffer(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching media`);
    const mimeType = (res.headers.get('content-type') || 'video/mp4').split(';')[0].trim();
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, mimeType };
}
