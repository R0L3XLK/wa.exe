module.exports = {
    command: '.ping',
    execute: async (sock, msg, from, body) => {
        const footer = "\n\n> wa.exe created by R O L E X - LK";
        
        await sock.sendMessage(from, { 
            text: "System status: Active ⚡" + footer 
        }, { quoted: msg });
    }
};
