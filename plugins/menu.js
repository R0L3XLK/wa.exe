module.exports = {
    command: '.menu',
    execute: async (sock, msg, from, body, FOOTER) => {
        const menu = `╔══════════════════════╗
║   *WA.EXE COMMAND MENU*   ║
╚══════════════════════╝

━━━━━ 🛠️ *GENERAL* ━━━━━
  *.menu*  — Show this menu
  *.ping*  — Check if bot is online
  *.info*  — Show user/group info

━━━━━ 📱 *TOOLS* ━━━━━
  *.sys*   — Detect device (reply to a msg)

━━━━━ 📥 *DOWNLOADER* ━━━━━
  *.ytv* <url>     — YouTube video (MP4)
  *.yta* <url>     — YouTube audio (MP3)
  *.ig*  <url>     — Instagram post/reel
  *.fb*  <url>     — Facebook video
  *.tt*  <url>     — TikTok (no watermark)

💡 *Tip:* Reply to any link instead of typing the URL.`;

        await sock.sendMessage(from, { text: menu + FOOTER }, { quoted: msg });
    }
};
