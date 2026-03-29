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
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

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

    // Pairing System Logic
    if (!sock.authState.creds.registered) {
        console.log(chalk.white.bgRed.bold(" [ CONNECTION SYSTEM ] "));
        const phoneNumber = await question(chalk.red.bold("\nEnter your phone number (e.g., 947XXXXXXXX): "));
        
        // Remove spaces/dashes if any
        const cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
        
        setTimeout(async () => {
            let code = await sock.requestPairingCode(cleanedNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            console.log(chalk.white("Your Pairing Code: ") + chalk.red.bold(code));
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

    // Plugin Handler
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;
        if (!from || typeof from !== 'string') return;

        const content = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

        // Load and execute from /plugins folder
        if (fs.existsSync('./plugins')) {
            const pluginFiles = fs.readdirSync('./plugins').filter(file => file.endsWith('.js'));
            for (const file of pluginFiles) {
                const plugin = require(`./plugins/${file}`);
                // Simple command check (e.g., if content starts with .ping)
                if (content.split(' ')[0] === plugin.command) {
                    try {
                        await plugin.execute(sock, msg, from, content, FOOTER);
                    } catch (err) {
                        console.error(`[Plugin Error] ${file}:`, err.message);
                    }
                }
            }
        }
    });
}

startBot();
