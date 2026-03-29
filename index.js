const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const chalk = require("chalk");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Global Constants
const FOOTER = "\n\n> wa.exe created by R O L E X - LK";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    // Red Banner Display
    console.clear();
    console.log(chalk.red.bold(`
    ██╗    ██╗ █████╗      ███████╗██╗  ██╗███████╗
    ██║    ██║██╔══██╗     ██╔════╝╚██╗██╔╝██╔════╝
    ██║ █╗ ██║███████║     █████╗   ╚███╔╝ █████╗  
    ██║███╗██║██╔══██║     ██╔══╝   ██╔██╗ ██╔══╝  
    ╚███╔███╔╝██║  ██║     ███████╗██╔╝ ██╗███████╗
     ╚══╝╚══╝ ╚═╝  ╚═╝     ╚══════╝╚═╝  ╚═╝╚═════╝
    
     WA.EXE - WhatsApp Automation by R O L E X - LK
    `));

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false, 
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
    });

    // --- PAIRING CODE SYSTEM (FIXED FOR TERMUX/VPS) ---
    if (!sock.authState.creds.registered) {
        console.log(chalk.white.bgRed.bold(" [ CONNECTION SYSTEM ] "));
        
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const phoneNumber = await new Promise((resolve) => {
            rl.question(chalk.red.bold("\nEnter your phone number (e.g., 947XXXXXXXX): "), (answer) => {
                rl.close();
                resolve(answer);
            });
        });
        
        const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        // Wait for socket to initialize before requesting code
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(cleanedNumber);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.black.bgWhite(" YOUR PAIRING CODE: ") + " " + chalk.red.bold(code));
            } catch (err) {
                console.error(chalk.red("Error requesting code:"), err.message);
            }
        }, 3000);
    }

    // Save Credentials whenever updated
    sock.ev.on('creds.update', saveCreds);

    // Connection Monitor
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(chalk.yellow('Connection closed. Reconnecting:'), shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(chalk.green.bold('\n[SUCCESS] WA.EXE is now linked and active!'));
        }
    });

    // --- PLUGIN HANDLER (FIXED ARGUMENT ORDER) ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const content = msg.message.conversation || 
                        msg.message.extendedTextMessage?.text || 
                        msg.message.imageMessage?.caption || 
                        msg.message.videoMessage?.caption || "";

        const pluginDir = path.join(__dirname, 'plugins');
        
        if (fs.existsSync(pluginDir)) {
            const pluginFiles = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));
            
            for (const file of pluginFiles) {
                const pluginPath = path.join(pluginDir, file);
                
                // Clear cache so plugin updates don't require restart
                delete require.cache[require.resolve(pluginPath)];
                const plugin = require(pluginPath);

                // Command check
                if (content.startsWith(plugin.command)) {
                    try {
                        // Correct Argument Order: (sock, from, msg, content, FOOTER)
                        await plugin.execute(sock, from, msg, content, FOOTER);
                    } catch (err) {
                        console.error(chalk.red(`[Error in ${file}]:`), err);
                    }
                }
            }
        }
    });
}

// Global error handling to prevent bot from crashing
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR:', err);
});

startBot();
