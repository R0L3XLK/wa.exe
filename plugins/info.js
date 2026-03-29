const { getContentType } = require("@whiskeysockets/baileys");

module.exports = {
    command: '.info',
    execute: async (sock, msg, from, body) => {
        const footer = "\n\n> wa.exe created by R O L E X - LK";
        const isGroup = from.endsWith('@g.us');
        
        // 1. Determine the Target User
        let target;
        const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        if (mentioned) {
            target = mentioned;
        } else if (msg.message.extendedTextMessage?.contextInfo?.participant) {
            target = msg.message.extendedTextMessage.contextInfo.participant;
        } else if (body.split(' ')[1]) {
            let num = body.split(' ')[1].replace(/[^0-9]/g, '');
            target = `${num}@s.whatsapp.net`;
        } else {
            target = isGroup ? msg.key.participant : from;
        }

        try {
            // 2. Fetch User Data
            let dp;
            try {
                dp = await sock.profilePictureUrl(target, 'image');
            } catch {
                dp = 'https://telegra.ph/file/89c1640700b7cf657371d.jpg'; // Placeholder
            }

            const contact = await sock.onWhatsApp(target);
            const exists = contact[0]?.exists ? "Verified" : "Unknown";
            const pushname = msg.pushName || "User";

            // 3. Group Specific Logic
            let groupInfo = "";
            if (isGroup) {
                const metadata = await sock.groupMetadata(from);
                const participants = metadata.participants;
                const userInGroup = participants.find(p => p.id === target);
                
                const isAdmin = userInGroup?.admin === 'admin' || userInGroup?.admin === 'superadmin';
                const isCreator = metadata.owner === target || userInGroup?.admin === 'superadmin';

                groupInfo = `
*--- GROUP STATUS ---*
*Role:* ${isCreator ? "Group Owner 👑" : (isAdmin ? "Admin 🛡️" : "Member 👤")}
*In Group:* ${userInGroup ? "Yes" : "No"}`;
            }

            // 4. Construct Message
            const infoText = `
*─── [ USER INFO ] ───*

*ID:* @${target.split('@')[0]}
*Status:* ${exists}
*WhatsApp Name:* ${pushname}${groupInfo}

*Link:* https://wa.me/${target.split('@')[0]}${footer}`;

            await sock.sendMessage(from, {
                image: { url: dp },
                caption: infoText,
                mentions: [target]
            }, { quoted: msg });

        } catch (err) {
            console.log(err);
            await sock.sendMessage(from, { text: "Error fetching user data. Make sure the ID is correct." + footer });
        }
    }
};
