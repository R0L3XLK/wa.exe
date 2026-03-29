const fs = require('fs');

module.exports = {
    command: '.dl',
    execute: async (sock, from, msg, content, FOOTER) => {
        try {
            const args = content.trim().split(/\s+/);
            let url = args[1];
            let type = args[2]?.toLowerCase(); // mp3 or mp4

            // 1. Extract URL from reply if not in command
            if (!url) {
                const quotedText =
                    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                    msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
                url = extractUrl(quotedText);
            }

            if (!url) {
                return await sock.sendMessage(from, {
                    text: `⚠️ *Usage:* \`.dl <url> <type>\`\n\n*Example:* \`.dl https://youtu.be/xxx mp3\`\n\n*Supported:* YouTube, TikTok (more coming soon)${FOOTER}`
                }, { quoted: msg });
            }

            // 2. Default to mp4 if type is missing
            if (!type || !['mp3', 'mp4'].includes(type)) {
                type = 'mp4'; 
            }

            await sock.sendMessage(from, { text: `⏳ Downloading *${type.toUpperCase()}*...\n🔗 ${url}${FOOTER}` });

            const platform = detectPlatform(url);
            let result = null;

            if (platform === 'youtube') {
                result = await downloadYouTube(url, type);
            } else if (platform === 'tiktok') {
                result = await downloadTikTok(url); // TikTok is usually just mp4
            } else {
                return await sock.sendMessage(from, {
                    text: `❌ Unsupported platform. Currently supporting YouTube & TikTok.${FOOTER}`
                });
            }

            if (!result || !result.buffer) throw new Error('Could not retrieve media.');

            const { buffer, title } = result;
            const sizeMB = buffer.length / (1024 * 1024);

            // 3. Send Logic based on Type
            if (type === 'mp3') {
                if (sizeMB > 50) throw new Error("Audio is too large (Max 50MB)");
                
                await sock.sendMessage(from, {
                    audio: buffer,
                    mimetype: 'audio/mpeg',
                    ptt: false,
                    fileName: `${title}.mp3`
                }, { quoted: msg });
                
            } else {
                if (sizeMB > 100) throw new Error("Video is too large (Max 100MB)");

                await sock.sendMessage(from, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption: `✅ *${title}*\n📦 Size: ${sizeMB.toFixed(2)} MB${FOOTER}`
                }, { quoted: msg });
            }

        } catch (err) {
            console.error('[dl plugin error]', err);
            await sock.sendMessage(from, { text: `❌ *Error:* ${err.message}${FOOTER}` });
        }
    }
};

function extractUrl(text) {
    return text?.match(/https?:\/\/[^\s]+/)?.[0] || null;
}

function detectPlatform(url) {
    if (/youtube\.com|youtu\.be/.test(url)) return 'youtube';
    if (/tiktok\.com/.test(url)) return 'tiktok';
    return 'unknown';
}

async function downloadYouTube(url, type) {
    // Note: youtubei.js requires 'vm' for signature decryption
    const { Innertube } = await import('youtubei.js');
    const yt = await Innertube.create();
    
    const videoId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] || url;
    const info = await yt.getInfo(videoId);
    const title = info.basic_info?.title || 'YouTube_Media';

    const format = type === 'mp3' ? 'audio' : 'video+audio';
    const stream = await info.download({
        type: format,
        quality: 'best',
        format: 'mp4'
    });

    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
    }

    return { buffer: Buffer.concat(chunks), title };
}

async function downloadTikTok(url) {
    const Tiktok = require('@tobyg74/tiktok-api-dl');
    const result = await Tiktok.Downloader(url, { version: 'v1' });

    if (result.status !== 'success') throw new Error('TikTok download failed');
    const videoUrl = result.result?.video?.[0] || result.result?.video2?.[0];
    
    const res = await fetch(videoUrl);
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, title: result.result?.description || 'TikTok' };
}
