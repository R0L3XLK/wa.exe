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

    // --- PAIRING CODE SYSTEM (STABLE) ---
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

    // --- PLUGIN HANDLER (STRICT VALIDATION) ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            if (!msg.message) return;

            // STRICT JID CHECK: Prevents the sendMessage(undefined) crash
            const from = msg.key.remoteJid;
            if (!from || typeof from !== 'string' || from === 'status@broadcast') return;

            // Extract content safely
            const content = msg.message.conversation || 
                            msg.message.extendedTextMessage?.text || 
                            msg.message.imageMessage?.caption || 
                            msg.message.videoMessage?.caption || "";

            const pluginDir = path.join(__dirname, 'plugins');
            
            if (fs.existsSync(pluginDir)) {
                const pluginFiles = fs.readdirSync(pluginDir).filter(file => file.endsWith('.js'));
                
                for (const file of pluginFiles) {
                    const pluginPath = path.join(pluginDir, file);
                    
                    try {
                        // Refresh plugin cache
                        delete require.cache[require.resolve(pluginPath)];
                        const plugin = require(pluginPath);

                        // Trigger command if prefix matches
                        if (content.split(' ')[0] === plugin.command) {
                            await plugin.execute(sock, msg, from, content, FOOTER);
                        }
                    } catch (pluginErr) {
                        console.error(chalk.red(`[Plugin Error in ${file}]:`), pluginErr.message);
                    }
                }
            }
        } catch (upsertErr) {
            console.error(chalk.red("[Upsert Error]:"), upsertErr.message);
        }
    });
}

// Global process error catchers to keep the bot alive on VPS
process.on('uncaughtException', (err) => {
    console.error(chalk.red('FATAL ERROR (Uncaught):'), err.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('FATAL ERROR (Unhandled Rejection):'), reason);
});

startBot();
