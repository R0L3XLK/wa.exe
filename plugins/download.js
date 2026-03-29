const COBALT_API = 'https://api.cobalt.tools/';

const SUPPORTED = [
    'youtube.com', 'youtu.be',
    'tiktok.com',
    'instagram.com',
    'twitter.com', 'x.com',
    'reddit.com',
    'soundcloud.com',
    'pinterest.com',
    'facebook.com', 'fb.watch',
    'twitch.tv',
    'vimeo.com',
    'dailymotion.com',
    'streamable.com',
    'bilibili.com',
    'tumblr.com',
    'ok.ru',
    'rutube.ru'
];

module.exports = {
    command: '.dl',
    execute: async (sock, msg, from, body, FOOTER) => {
        const args = body.trim().split(/\s+/);
        let url = args[1];

        if (!url) {
            const quotedText =
                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
                '';
            url = extractUrl(quotedText);
        }

        if (!url) {
            await sock.sendMessage(from, {
                text: `⚠️ Please provide a URL or reply to a message containing one.\n\n*Usage:* \`.dl <url>\`\n\n*Supported:* YouTube, TikTok, Instagram, Twitter, Reddit, SoundCloud, Facebook & more.${FOOTER}`
            });
            return;
        }

        const statusMsg = await sock.sendMessage(from, {
            text: `⏳ Downloading...\n🔗 ${url}${FOOTER}`
        });

        try {
            const res = await fetch(COBALT_API, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    url,
                    videoQuality: '720',
                    audioFormat: 'mp3',
                    downloadMode: 'auto',
                    filenameStyle: 'pretty',
                    tiktokFullAudio: true,
                    twitterGif: true
                })
            });

            if (!res.ok) {
                throw new Error(`Cobalt API responded with HTTP ${res.status}`);
            }

            const data = await res.json();

            if (data.status === 'error') {
                const code = data.error?.code || 'unknown';
                await sock.sendMessage(from, {
                    text: `❌ Download failed.\n*Reason:* ${code}${FOOTER}`
                });
                return;
            }

            let downloadUrl = null;
            let filename = data.filename || 'download';
            let isPicker = false;
            let pickerItems = [];

            if (data.status === 'tunnel' || data.status === 'redirect') {
                downloadUrl = data.url;
                filename = data.filename || filename;
            } else if (data.status === 'picker') {
                isPicker = true;
                pickerItems = data.picker || [];
                downloadUrl = pickerItems[0]?.url || null;
            }

            if (!downloadUrl) {
                await sock.sendMessage(from, {
                    text: `❌ Could not retrieve a download link.${FOOTER}`
                });
                return;
            }

            const { buffer, mimeType } = await downloadBuffer(downloadUrl);
            const sizeMB = buffer.length / (1024 * 1024);

            if (isPicker && pickerItems.length > 1) {
                await sock.sendMessage(from, {
                    text: `📂 Found ${pickerItems.length} items — sending the first one.${FOOTER}`
                });
            }

            if (mimeType.startsWith('video/')) {
                if (sizeMB > 64) {
                    await sock.sendMessage(from, {
                        text: `❌ File too large (${sizeMB.toFixed(1)} MB). WhatsApp limit is 64 MB for video.${FOOTER}`
                    });
                    return;
                }
                await sock.sendMessage(from, {
                    video: buffer,
                    mimetype: mimeType,
                    caption: `✅ Done — ${filename}${FOOTER}`
                });

            } else if (mimeType.startsWith('audio/')) {
                if (sizeMB > 16) {
                    await sock.sendMessage(from, {
                        document: buffer,
                        mimetype: mimeType,
                        fileName: filename,
                        caption: `✅ Done — ${filename}${FOOTER}`
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
                    caption: `✅ Done — ${filename}${FOOTER}`
                });

            } else {
                if (sizeMB > 100) {
                    await sock.sendMessage(from, {
                        text: `❌ File too large (${sizeMB.toFixed(1)} MB). Max is 100 MB.${FOOTER}`
                    });
                    return;
                }
                await sock.sendMessage(from, {
                    document: buffer,
                    mimetype: mimeType || 'application/octet-stream',
                    fileName: filename,
                    caption: `✅ Done — ${filename}${FOOTER}`
                });
            }

        } catch (err) {
            console.error('[dl plugin]', err.message);
            await sock.sendMessage(from, {
                text: `❌ Error: ${err.message}${FOOTER}`
            });
        }
    }
};

function extractUrl(text) {
    return text?.match(/https?:\/\/[^\s]+/)?.[0] || null;
}

async function downloadBuffer(url) {
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WA-Bot/1.0)' }
    });
    if (!res.ok) throw new Error(`Failed to download file (HTTP ${res.status})`);
    const mimeType = (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, mimeType };
}
