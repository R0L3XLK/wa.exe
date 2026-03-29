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

const FOOTER = "\n\n> wa.exe created by R O L E X - LK";

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const { version } = await fetchLatestBaileysVersion();

    // Clear and display your Red Banner
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

    // --- FIX: Pairing System Logic moved inside for stability ---
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
                console.log(chalk.white("Your Pairing Code: ") + chalk.red.bold(code));
            } catch (err) {
                console.error("Pairing Error:", err.message);
            }
        }, 3000);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log(chalk.green.bold('\n[SUCCESS] WA.EXE is now linked and active!'));
        }
    });

    // --- FIX: Correct Plugin Argument Order ---
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        if (fs.existsSync('./plugins')) {
            const pluginFiles = fs.readdirSync('./plugins').filter(file => file.endsWith('.js'));
            for (const file of pluginFiles) {
                // Clear cache so changes to plugins take effect without restarting
                const pluginPath = path.join(__dirname, 'plugins', file);
                delete require.cache[require.resolve(pluginPath)];
                const plugin = require(pluginPath);

                if (content.startsWith(plugin.command)) {
                    try {
                        // MATCH THESE ARGS TO YOUR PLUGINS: (sock, from, msg, content, FOOTER)
                        await plugin.execute(sock, from, msg, content, FOOTER);
                    } catch (err) {
                        console.error(`[Plugin Error] ${file}:`, err);
                    }
                }
            }
        }
    });
}

startBot();
