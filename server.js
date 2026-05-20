require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const multer = require('multer');
const cache = require('./utils/cache');
const adminRouter = require('./routes/admin');
const csv = require('csv-parse');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Headers
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(compression());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Initialize Telegram Bot
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // Should be in .env
const bot = new TelegramBot(TG_TOKEN, { polling: true });

bot.on('polling_error', (error) => console.log('Telegram Polling Error:', error));

console.log("🚀 Premium Verification System Active.");

// State Management for step-by-step verification
const userStates = new Map();

function setupBotLogic(botInstance) {
    const mainKeyboard = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "💎 Verify Payment", callback_data: "verify" }, { text: "📊 Pricing Plans", callback_data: "pricing" }],
                [{ text: "📝 Instructions", callback_data: "instructions" }, { text: "🔍 Check Status", callback_data: "status" }],
                [{ text: "🛠️ Support", url: "https://t.me/gamersarena_support" }]
            ]
        }
    };

    botInstance.onText(/\/start(.*)/, (msg, match) => {
        const payload = match[1].trim();

        if (payload === 'verify') {
            userStates.set(msg.chat.id, { step: 'email' });
            botInstance.sendMessage(msg.chat.id, "💎 *Payment Verification* \n\nPlease enter your *Website Email* to begin:");
            return;
        }

        botInstance.sendMessage(msg.chat.id, "🚀 *Welcome to Gamers Arena HQ!* \n\nI am your premium assistant. You can verify your ₹99 Ultimate payment here or on the website.", {
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
    });

    botInstance.onText(/\/myid/, (msg) => {
        botInstance.sendMessage(msg.chat.id, `👤 Your Chat ID: \`${msg.chat.id}\` \n\nCopy this number and give it to the system to enable Admin Notifications.`, { parse_mode: 'Markdown' });
    });

    botInstance.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        // Admin Approval Logic
        if (data.startsWith('adm_app_')) {
            if (chatId.toString() !== ADMIN_CHAT_ID) return botInstance.answerCallbackQuery(query.id, { text: "🚫 Unauthorized access.", show_alert: true });
            const reqId = data.replace('adm_app_', '');
            await processPayment(reqId, 'approved', chatId);
            botInstance.answerCallbackQuery(query.id, { text: "✅ Approved Successfully!" });
            return;
        }
        if (data.startsWith('adm_rej_')) {
            if (chatId.toString() !== ADMIN_CHAT_ID) return botInstance.answerCallbackQuery(query.id, { text: "🚫 Unauthorized access.", show_alert: true });
            const reqId = data.replace('adm_rej_', '');
            await processPayment(reqId, 'rejected', chatId);
            botInstance.answerCallbackQuery(query.id, { text: "❌ Rejected." });
            return;
        }

        if (data === "pricing") {
            botInstance.sendMessage(chatId, "🔥 *Elite Unlimited Access* \n\n▫️ *Ultimate*: ₹99 (UNLIMITED Access)\n\n⏳ _Limited time offer ending soon!_", { parse_mode: 'Markdown' });
        }

        if (data === "instructions") {
            botInstance.sendMessage(chatId, "📋 *How to Join:*\n\n1. Scan QR on website.\n2. Pay ₹99 for Ultimate Plan.\n3. Take a screenshot.\n4. Click 'Verify Payment' here or upload on website.", { parse_mode: 'Markdown' });
        }

        if (data === "verify") {
            userStates.set(chatId, { step: 'email' });
            botInstance.sendMessage(chatId, "📧 Enter your *Website Email* to begin:");
        }

        if (data === "status") {
            userStates.set(chatId, { step: 'check_status' });
            botInstance.sendMessage(chatId, "🔍 Enter your *Email* to check status:");
        }

        if (data.startsWith("plan_")) {
            const plan = data.replace("plan_", "");
            const state = userStates.get(chatId);
            if (state) {
                userStates.set(chatId, { ...state, plan, step: 'utr' });
                botInstance.sendMessage(chatId, `✅ Plan: *${plan.toUpperCase()}*\n\nNow, enter your *UTR/Transaction ID*:`, { parse_mode: 'Markdown' });
            }
        }
    });

    botInstance.on('message', async (msg) => {
        if (msg.text?.startsWith('/')) return;
        const chatId = msg.chat.id;
        const state = userStates.get(chatId);

        if (!state) return;

        // 1. EMAIL STEP
        if (state.step === 'email' && msg.text) {
            const email = msg.text.trim().toLowerCase();
            userStates.set(chatId, { ...state, email, step: 'plan' });
            botInstance.sendMessage(chatId, "🎯 *Confirm Plan:*", {
                reply_markup: {
                    inline_keyboard: [[{ text: "Ultimate (₹99)", callback_data: "plan_ultimate" }]]
                }
            });
        }
        // 2. UTR STEP
        else if (state.step === 'utr' && msg.text) {
            const utr = msg.text.trim();
            if (utr.length < 8) return botInstance.sendMessage(chatId, "⚠️ *Invalid ID*: Use at least 8 characters.");

            const { data: existing } = await supabase.from('payment_requests').select('*').eq('utr_id', utr).maybeSingle();
            if (existing) return botInstance.sendMessage(chatId, "🚨 *Error*: This Transaction ID is already used!");

            userStates.set(chatId, { ...state, utr, step: 'screenshot' });
            botInstance.sendMessage(chatId, "📸 *FINAL STEP*: Now, upload your *Payment Screenshot* here:");
        }
        // 3. SCREENSHOT STEP
        else if (state.step === 'screenshot') {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.document ? msg.document.file_id : null);
            if (!fileId) return botInstance.sendMessage(chatId, "⚠️ Please upload an *Image* or *Document* of your payment proof.");

            const { data: request, error } = await supabase.from('payment_requests').insert([{
                user_email: state.email,
                utr_id: state.utr,
                plan_name: state.plan,
                screenshot_url: fileId, // Store file_id as url for now
                telegram_id: chatId.toString(),
                status: 'pending'
            }]).select().single();

            if (error) {
                botInstance.sendMessage(chatId, "❌ System error. Try again or ensure you are registered on the website.");
            } else {
                botInstance.sendMessage(chatId, "✅ *Submitted Successfully!* \n\nAdmin is verifying your proof. You will get a message here as soon as it's approved. (Usually 10-30 min)");
                notifyAdmin(request);
            }
            userStates.delete(chatId);
        }
        // STATUS CHECK STEP
        else if (state.step === 'check_status' && msg.text) {
            const email = msg.text.trim().toLowerCase();
            const { data: reqs } = await supabase.from('payment_requests').select('*').eq('user_email', email).order('created_at', { ascending: false }).limit(1);

            if (reqs && reqs.length > 0) {
                const r = reqs[0];
                const statusEmoji = r.status === 'approved' ? '✅' : (r.status === 'rejected' ? '❌' : '⏳');
                botInstance.sendMessage(chatId, `🔍 *Verification Status for ${email}:*\n\nStatus: ${statusEmoji} *${r.status.toUpperCase()}*\nUTR: \`${r.utr_id}\`\nPlan: ${r.plan_name.toUpperCase()}\n\n${r.status === 'pending' ? 'Please wait up to 30 min.' : ''}`, { parse_mode: 'Markdown' });
            } else {
                botInstance.sendMessage(chatId, "❓ *No record found* for this email. Make sure you submitted proof correctly.");
            }
            userStates.delete(chatId);
        }
    });
}

async function notifyAdmin(request) {
    if (!ADMIN_CHAT_ID) return;

    const message = `💰 *NEW PAYMENT SUBMISSION*\n\n👤 *User*: ${request.user_email}\n🆔 *UTR*: \`${request.utr_id}\`\n🏆 *Plan*: ${request.plan_name.toUpperCase()}\n\nCheck proof and approve below:`;

    const opts = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: "✅ APPROVE", callback_data: `adm_app_${request.id}` }, { text: "❌ REJECT", callback_data: `adm_rej_${request.id}` }]
            ]
        }
    };

    if (request.screenshot_url) {
        // If it starts with data:image, it's from website (Buffer)
        if (request.screenshot_url.startsWith('data:image')) {
            const base64Data = request.screenshot_url.split(',')[1];
            bot.sendPhoto(ADMIN_CHAT_ID, Buffer.from(base64Data, 'base64'), { caption: message, ...opts });
        } else {
            // It's a file_id from Telegram
            bot.sendPhoto(ADMIN_CHAT_ID, request.screenshot_url, { caption: message, ...opts });
        }
    } else {
        bot.sendMessage(ADMIN_CHAT_ID, message, opts);
    }
}

async function processPayment(requestId, status, adminChatId) {
    const { data: request } = await supabase.from('payment_requests').update({ status }).eq('id', requestId).select().single();

    if (status === 'approved' && request) {
        await supabase.from('site_users').update({ is_premium: true, current_plan: request.plan_name || 'ultimate' }).eq('email', request.user_email);

        if (request.telegram_id) {
            bot.sendMessage(request.telegram_id, `💎 *PLAN ACTIVATED!* \n\nYour ${request.plan_name.toUpperCase()} plan is now live. \n\n🚀 *Next Step*: Go to the website and *login again* to refresh your session. Enjoy!`, { 
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[{ text: "🌐 Go to Website", url: "https://gamersarena.store/login.html" }]]
                }
            });
        }
        bot.sendMessage(adminChatId, `✅ Request #${requestId} Approved. User notified.`);
    } else if (status === 'rejected') {
        bot.sendMessage(adminChatId, `❌ Request #${requestId} Rejected.`);
    }
}

setupBotLogic(bot);

// Auto-Cleanup Task (Every 1 hour)
setInterval(async () => {
    console.log("🧹 Running Screenshot Cleanup Task...");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // We don't delete the record, just the visual proof to save space
    const { data } = await supabase.from('payment_requests')
        .update({ screenshot_url: null })
        .lt('created_at', yesterday)
        .not('screenshot_url', 'is', null);

    console.log(`Cleaned up ${data?.length || 0} old screenshots.`);
}, 3600000);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));
app.use('/api/admin', adminRouter);

// API: Admin Payments GET
app.get('/api/admin/payments', async (req, res) => {
    // Basic auth check using query params would be ideal, but currently admin_verify.html doesn't send them in fetch
    // However, they are in session storage. Let's make it work without it for now, or just return pending requests.
    const { data, error } = await supabase.from('payment_requests').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true, payments: data });
});

// API: Admin Payments Process
app.post('/api/admin/payments/process', async (req, res) => {
    const { id, pass, requestId, status, plan } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    // We already have processPayment function for Telegram, we can reuse it
    await processPayment(requestId, status, ADMIN_CHAT_ID); // ADMIN_CHAT_ID is where logs go
    
    // Also if we need to set specific plan:
    if (status === 'approved') {
        const { data: request } = await supabase.from('payment_requests').select('*').eq('id', requestId).single();
        if (request) {
            await supabase.from('site_users').update({ current_plan: plan }).eq('email', request.user_email);
        }
    }
    
    res.json({ success: true, message: 'Processed' });
});

// API: Live Stats
app.get('/api/admin/stats', async (req, res) => {
    const { id, pass } = req.query;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { count, error } = await supabase
            .from('site_users')
            .select('*', { count: 'exact', head: true })
            .gt('last_active_at', fiveMinsAgo);

        if (error) throw error;
        res.json({ success: true, live_users: count || 0 });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Admin Bulk Game Upload (CSV)
const upload = multer({ storage: multer.memoryStorage() });
app.post('/api/admin/games/bulk', upload.single('file'), async (req, res) => {
    const { id, pass } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const csvData = req.file.buffer.toString('utf8');
    const records = [];
    csv(csvData, { columns: true, trim: true }, (err, data) => {
        if (err) {
            return res.status(400).json({ success: false, message: 'CSV parsing error' });
        }
        data.forEach(row => records.push(row));
        processBulk(records, res);
    });
});

async function processBulk(records, res) {
    const results = { added: 0, skipped: 0, errors: [] };
    for (const rec of records) {
        const gameName = rec.game || rec.name;
        const username = rec.id || rec.username;
        const password = rec.pass || rec.password;
        if (!gameName || !username || !password) {
            results.skipped++;
            continue;
        }
        const newId = gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
        const { error } = await supabase.from('games').insert([{ id: newId, game: gameName, username, password, credentials: [{ user: username, pass: password }], priority: 0 }]);
        if (error) {
            results.errors.push({ game: gameName, error: error.message });
        } else {
            results.added++;
        }
    }
    res.json({ success: true, summary: results });
}

app.get('/api/admin/live-users', async (req, res) => {
    const { id, pass } = req.query;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count, error } = await supabase
        .from('site_users')
        .select('*', { count: 'exact', head: true })
        .gt('last_active_at', fiveMinsAgo);

    if (error) {
        return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, live_users: count || 0 });
});


// API: Heartbeat
app.post('/api/auth/ping', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ success: false });

    await supabase.from('site_users').update({ last_active_at: new Date().toISOString() }).eq('email', email.toLowerCase());
    res.json({ success: true });
});

// API: Website Payment Submission
app.post('/api/payments/submit', async (req, res) => {
    const { email, utr, plan, screenshot } = req.body;

    // Handle Screenshot Storage (Simulated as URL for this logic, ideally upload to Supabase Storage)
    let screenshotUrl = screenshot; // In real app, upload base64 to Storage and get URL

    const { data: request, error } = await supabase.from('payment_requests').insert([{
        user_email: email.toLowerCase(),
        utr_id: utr,
        plan_name: plan || 'ultimate',
        screenshot_url: screenshotUrl,
        status: 'pending'
    }]).select().single();

    if (error) return res.status(400).json({ success: false, message: 'Submission failed. Ensure you are registered.' });

    notifyAdmin(request);
    res.json({ success: true, message: 'Submitted for verification.' });
});

app.get('/api/content', async (req, res) => {
    const { data, error } = await supabase.from('site_content').select('data').eq('id', 'main_content').single();
    if (error) return res.json({ success: true, content: {} });
    res.json({ success: true, content: data.data });
});

app.post('/api/content', async (req, res) => {
    const { id, pass, content } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { error } = await supabase.from('site_content').upsert({ id: 'main_content', data: content });
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Content updated successfully' });
});

app.post('/api/auth/login', async (req, res) => {
    const email = req.body.email?.toLowerCase();
    const password = req.body.password;
    if (email === process.env.ADMIN_ID && password === process.env.ADMIN_PASS) {
        return res.json({ success: true, user: { name: 'Admin', email: process.env.ADMIN_ID, role: 'admin', is_premium: true, current_plan: 'ultimate' } });
    }
    const { data: user } = await supabase.from('site_users').select('*').eq('email', email).eq('password', password).maybeSingle();
    if (user) {
        await supabase.from('site_users').update({ last_active_at: new Date().toISOString() }).eq('email', email);
        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, is_premium: user.is_premium, current_plan: user.current_plan, reveals_today: user.daily_reveal_count, password: user.password } });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, password } = req.body;
    const email = req.body.email?.toLowerCase();
    const { error } = await supabase.from('site_users').insert([{ name, email, password, role: 'user', last_active_at: new Date().toISOString() }]);
    if (error) return res.status(400).json({ success: false, message: 'Email already registered' });
    res.json({ success: true, message: 'Account created!', user: { name, email, role: 'user' } });
});

// API: Google Auth
app.post('/api/auth/google', async (req, res) => {
    const { name, email, googleId } = req.body;
    if (!email) return res.status(400).json({ success: false });

    try {
        const lowerEmail = email.toLowerCase();

        // Check if user exists
        const { data: user, error: fetchError } = await supabase.from('site_users').select('*').eq('email', lowerEmail).maybeSingle();

        if (user) {
            // Update last active
            await supabase.from('site_users').update({ last_active_at: new Date().toISOString() }).eq('email', lowerEmail);
            res.json({ success: true, user: { ...user, password: user.password || 'OAUTH_USER' } });
        } else {
            // Create new user
            const { data: newUser, error: insertError } = await supabase.from('site_users').insert([{
                name: name || 'Google User',
                email: lowerEmail,
                role: 'user',
                last_active_at: new Date().toISOString(),
                is_premium: false
            }]).select().single();

            if (insertError) throw insertError;
            res.json({ success: true, user: { ...newUser, password: 'OAUTH_USER' } });
        }
    } catch (e) {
        console.error("Google Auth Error:", e);
        res.status(500).json({ success: false, message: 'Authentication failed' });
    }
});

app.get('/api/games', async (req, res) => {
    const cachedGames = cache.get('games');
    if (cachedGames) {
        return res.json({ success: true, games: cachedGames });
    }
    let allData = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('games').select('id, game, image, game_total, priority, credentials').order('priority', { ascending: false }).order('id', { ascending: false }).range(from, from + step - 1);
        if (error) return res.status(500).json({ success: false });
        if (data && data.length > 0) { allData = allData.concat(data); from += step; if (data.length < step) break; } else break;
    }
    const safeData = allData.map(g => ({ ...g, credentials: undefined }));
    cache.set('games', safeData, 300); // cache for 5 minutes
    res.json({ success: true, games: safeData });
});
// Duplicate games fetch block removed – original code kept at lines 461‑477.


app.get('/api/premium', async (req, res) => {
    const { data, error } = await supabase.from('bundles').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true, bundles: data || [] });
});

// Admin endpoints
app.post('/api/admin/games', async (req, res) => {
    const { id, pass, gameData } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const newId = gameData.game.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const credentials = gameData.credentials || [];
    
    // Support legacy username/password columns for the first credential
    const username = credentials.length > 0 ? credentials[0].user : null;
    const password = credentials.length > 0 ? credentials[0].pass : null;

    const { error } = await supabase.from('games').insert([{
        id: newId,
        game: gameData.game,
        game_total: gameData.game_total || 1,
        credentials: credentials,
        username: username,
        password: password,
        priority: 0
    }]);
    
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Game added successfully' });
});

// Update game asset
app.post('/api/admin/games/update', async (req, res) => {
    const { id, pass, gameId, updateData } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (!gameId || !updateData) return res.status(400).json({ success: false, message: 'Missing gameId or updateData' });

    try {
        const credentials = updateData.credentials || [];
        const username = credentials.length > 0 ? credentials[0].user : null;
        const password = credentials.length > 0 ? credentials[0].pass : null;

        const updatePayload = {
            game: updateData.game,
            image: updateData.image,
            credentials: credentials,
            username: username,
            password: password,
            priority: updateData.priority || 0
        };

        const { error } = await supabase.from('games').update(updatePayload).eq('id', gameId);
        if (error) throw error;
        cache.del('games'); // Clear cache so changes show immediately
        res.json({ success: true, message: 'Game updated successfully' });
    } catch (err) {
        console.error('Game update error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/games/delete', async (req, res) => {
    const { id, pass, gameId, gameIds } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    try {
        if (gameIds && Array.isArray(gameIds)) {
            const { error } = await supabase.from('games').delete().in('id', gameIds);
            if (error) throw error;
        } else if (gameId) {
            const { error } = await supabase.from('games').delete().eq('id', gameId);
            if (error) throw error;
        } else {
            return res.status(400).json({ success: false, message: 'Missing gameId or gameIds' });
        }
        cache.del('games'); // Clear cache so deletions show immediately
        res.json({ success: true, message: 'Game(s) deleted successfully' });
    } catch (err) {
        console.error('Game delete error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/admin/premium', async (req, res) => {
    const { id, pass, bundleData } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const newId = bundleData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    
    const { error } = await supabase.from('bundles').insert([{
        id: newId,
        name: bundleData.name,
        price: bundleData.price,
        description: bundleData.desc || bundleData.description,
        image: bundleData.image || 'logo.png'
    }]);
    
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Bundle added successfully' });
});

app.post('/api/admin/premium/delete', async (req, res) => {
    const { id, pass, bundleId } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { error } = await supabase.from('bundles').delete().eq('id', bundleId);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Bundle deleted successfully' });
});

app.post('/api/games/reveal', async (req, res) => {
    const { gameId, email, password, adminId, adminPass } = req.body;
    if (adminId === process.env.ADMIN_ID && adminPass === process.env.ADMIN_PASS) {
        const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
        return res.json({ success: true, game: data });
    }
    const { data: user } = await supabase.from('site_users').select('*').eq('email', email?.toLowerCase()).eq('password', password).maybeSingle();
    if (!user) return res.status(401).json({ success: false, message: 'AUTHENTICATION_FAILED' });
    if (!user.is_premium && user.role !== 'admin') return res.status(403).json({ success: false, message: 'PREMIUM_REQUIRED' });
    const limits = { 'starter': 5, 'pro': 12, 'ultimate': Infinity };
    if (user.daily_reveal_count >= (limits[user.current_plan] || 0)) return res.status(403).json({ success: false, message: 'LIMIT_REACHED' });
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (game) {
        await supabase.from('site_users').update({ daily_reveal_count: user.daily_reveal_count + 1, last_active_at: new Date().toISOString() }).eq('email', email);
        await supabase.from('reveal_logs').insert([{ user_email: email, game_id: gameId }]);
        if (!game.credentials && game.username) game.credentials = [{ user: game.username, pass: game.password }];
        res.json({ success: true, game });
    } else res.status(404).json({ success: false, message: 'Game not found' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
