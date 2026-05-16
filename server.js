require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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

    botInstance.onText(/\/start/, (msg) => {
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
            const reqId = data.replace('adm_app_', '');
            await processPayment(reqId, 'approved', chatId);
            return;
        }
        if (data.startsWith('adm_rej_')) {
            const reqId = data.replace('adm_rej_', '');
            await processPayment(reqId, 'rejected', chatId);
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
                state.plan = plan;
                state.step = 'utr';
                botInstance.sendMessage(chatId, `✅ Plan: *${plan.toUpperCase()}*\n\nNow, enter your *UTR/Transaction ID* (8-128 chars):`, { parse_mode: 'Markdown' });
            }
        }
    });

    botInstance.on('message', async (msg) => {
        if (msg.text?.startsWith('/')) return;
        const chatId = msg.chat.id;
        const state = userStates.get(chatId);

        if (!state) return;

        if (state.step === 'email') {
            const email = msg.text.trim().toLowerCase();
            userStates.set(chatId, { ...state, email, step: 'plan' });
            botInstance.sendMessage(chatId, "🎯 *Confirm Plan:*", {
                reply_markup: {
                    inline_keyboard: [[{ text: "Ultimate (₹99)", callback_data: "plan_ultimate" }]]
                }
            });
        } 
        else if (state.step === 'utr') {
            const utr = msg.text.trim();
            if (utr.length < 8 || utr.length > 128) return botInstance.sendMessage(chatId, "⚠️ *Invalid ID*: Use 8-128 characters.");

            const { data: existing } = await supabase.from('payment_requests').select('*').eq('utr_id', utr).maybeSingle();
            if (existing) return botInstance.sendMessage(chatId, "🚨 *Error*: This Transaction ID is already used!", mainKeyboard);

            const { data: request, error } = await supabase.from('payment_requests').insert([{ 
                user_email: state.email, 
                utr_id: utr, 
                plan_name: state.plan, 
                telegram_id: chatId.toString() 
            }]).select().single();

            if (error) {
                botInstance.sendMessage(chatId, "❌ Account not found. Register on the website first.", mainKeyboard);
            } else {
                botInstance.sendMessage(chatId, "✅ *Submitted!* Admin will verify within 30 min. Check your status soon.", mainKeyboard);
                notifyAdmin(request);
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
        bot.sendPhoto(ADMIN_CHAT_ID, request.screenshot_url, { caption: message, ...opts });
    } else {
        bot.sendMessage(ADMIN_CHAT_ID, message, opts);
    }
}

async function processPayment(requestId, status, adminChatId) {
    const { data: request } = await supabase.from('payment_requests').update({ status }).eq('id', requestId).select().single();
    
    if (status === 'approved' && request) {
        await supabase.from('site_users').update({ is_premium: true, current_plan: request.plan_name || 'ultimate' }).eq('email', request.user_email);
        
        if (request.telegram_id) {
            bot.sendMessage(request.telegram_id, `💎 *PLAN ACTIVATED!* \n\nYour ${request.plan_name.toUpperCase()} plan is now live. \n\n🚀 *Next Step*: Go to the website and *login again* to refresh your session. Enjoy!`, { parse_mode: 'Markdown' });
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

// API: Live Stats
app.get('/api/admin/stats', async (req, res) => {
    const { id, pass } = req.query;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false });

    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count, error } = await supabase.from('site_users').select('*', { count: 'exact', head: true }).gt('last_active_at', fiveMinsAgo);
    
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
        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, is_premium: user.is_premium, current_plan: user.current_plan, reveals_today: user.daily_reveal_count, password: user.password }});
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

app.get('/api/games', async (req, res) => {
    let allData = [];
    let from = 0;
    const step = 1000;
    while (true) {
        const { data, error } = await supabase.from('games').select('id, game, image, game_total, priority').order('priority', { ascending: false }).order('id', { ascending: false }).range(from, from + step - 1);
        if (error) return res.status(500).json({ success: false });
        if (data && data.length > 0) { allData = allData.concat(data); from += step; if (data.length < step) break; } else break;
    }
    res.json({ success: true, games: allData });
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
