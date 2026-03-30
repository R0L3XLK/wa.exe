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
  *.tiktok* <url>  — Download TikTok video
  *.ytv* <url>     — Download YouTube video
  *.yta* <url>     — Download YouTube audio (MP3)

💡 *Tip:* You can also reply to a link instead of typing the URL.`;

        await sock.sendMessage(from, { text: menu + FOOTER }, { quoted: msg });
    }
};
