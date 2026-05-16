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

// Rate Limiting (100 requests per 15 mins)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Initialize Telegram Bot (Polling Mode)
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TG_TOKEN, { polling: true });

// Error Handling for Bot
bot.on('polling_error', (error) => console.log('Telegram Polling Error:', error));
bot.on('error', (error) => console.log('Telegram Bot General Error:', error));

console.log("🚀 Telegram Bot initialized in Polling Mode.");

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
        botInstance.sendMessage(msg.chat.id, "🚀 *Welcome to Gamers Arena Premium!* \n\nI am your automated verification assistant. How can I help you today?", { 
            parse_mode: 'Markdown',
            ...mainKeyboard
        });
    });

    botInstance.on('callback_query', async (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (data === "pricing") {
            botInstance.sendMessage(chatId, "🔥 *Exclusive New User Deals* \n\n" +
                "▫️ *Starter*: ₹49 (5 Reveals/day)\n" +
                "▫️ *Pro Gamer*: ₹79 (12 Reveals/day)\n" +
                "▫️ *Ultimate*: ₹99 (UNLIMITED Access)\n\n" +
                "⏳ _Limited time offer ending soon!_", { parse_mode: 'Markdown' });
        }

        if (data === "instructions") {
            botInstance.sendMessage(chatId, "📋 *Payment Instructions*\n\n1. Scan the QR on our website.\n2. Pay the exact amount for your plan.\n3. Note down the 12-digit UTR/Ref ID.\n4. Click 'Verify Payment' here to submit.", { parse_mode: 'Markdown' });
        }

        if (data === "verify") {
            userStates.set(chatId, { step: 'email' });
            botInstance.sendMessage(chatId, "📧 Please enter your *Registered Website Email*:");
        }

        if (data === "status") {
            userStates.set(chatId, { step: 'check_status' });
            botInstance.sendMessage(chatId, "🔍 Enter your *Email* to check membership status:");
        }

        if (data.startsWith("plan_")) {
            const plan = data.replace("plan_", "");
            const state = userStates.get(chatId);
            if (state) {
                state.plan = plan;
                state.step = 'utr';
                botInstance.sendMessage(chatId, `✅ Plan selected: *${plan.toUpperCase()}*\n\nNow, please enter your *12-digit UTR/Transaction ID*:`, { parse_mode: 'Markdown' });
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
            botInstance.sendMessage(chatId, "🎯 *Select your Plan:*", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Starter (₹49)", callback_data: "plan_starter" }],
                        [{ text: "Pro (₹79)", callback_data: "plan_pro" }],
                        [{ text: "Ultimate (₹99)", callback_data: "plan_ultimate" }]
                    ]
                }
            });
        } 
        else if (state.step === 'utr') {
            const utr = msg.text.trim();
            if (utr.length < 10 || utr.length > 15) {
                return botInstance.sendMessage(chatId, "⚠️ *Invalid UTR*: Please enter a valid 12-digit ID.");
            }

            // Duplicate Check
            const { data: existing } = await supabase.from('payment_requests').select('*').eq('utr_id', utr).maybeSingle();
            if (existing) {
                return botInstance.sendMessage(chatId, "🚨 *FRAUD ALERT*: This UTR is already in use!", mainKeyboard);
            }

            // Insert to DB
            const { error } = await supabase.from('payment_requests').insert([{ 
                user_email: state.email, 
                utr_id: utr, 
                plan_name: state.plan, 
                telegram_id: chatId.toString() 
            }]);

            if (error) {
                botInstance.sendMessage(chatId, "❌ *Error*: Email not found or system failure.", mainKeyboard);
            } else {
                botInstance.sendMessage(chatId, "✅ *Submission Successful!*\n\nOur admin will verify this within 10-30 minutes. You will be notified here.", mainKeyboard);
            }
            userStates.delete(chatId);
        }
        else if (state.step === 'check_status') {
            const email = msg.text.trim();
            const { data: user } = await supabase.from('site_users').select('*').eq('email', email).maybeSingle();
            
            if (user) {
                const status = user.is_premium ? "✅ ACTIVE" : "⏳ PENDING/NOT PAID";
                botInstance.sendMessage(chatId, `👤 *Account*: ${email}\n🏆 *Plan*: ${user.current_plan.toUpperCase()}\n💎 *Status*: ${status}\n🔥 *Reveals Used Today*: ${user.daily_reveal_count}`, { parse_mode: 'Markdown' });
            } else {
                botInstance.sendMessage(chatId, "❌ No account found with that email.");
            }
            userStates.delete(chatId);
        }
    });
}

setupBotLogic(bot);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname, { extensions: ['html'] }));

// API: Content Management
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

// Helper: Ensure Daily Limit Resets
async function ensureLimitReset(user) {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = user.last_reset_date || '';
    
    if (lastReset !== today) {
        const { data: updated } = await supabase.from('site_users')
            .update({ daily_reveal_count: 0, last_reset_date: today })
            .eq('email', user.email)
            .select()
            .single();
        return updated;
    }
    return user;
}
app.post('/api/auth/login', async (req, res) => {
    const email = req.body.email?.toLowerCase();
    const password = req.body.password;

    if (email === process.env.ADMIN_ID && password === process.env.ADMIN_PASS) {
        return res.json({ success: true, user: { name: 'Admin', email: process.env.ADMIN_ID, role: 'admin', is_premium: true, current_plan: 'ultimate' } });
    }

    // Special handling for Google OAuth refresh
    let user;
    if (password && password.startsWith('google_oauth_')) {
        const { data } = await supabase.from('site_users').select('*').eq('email', email).eq('password', password).maybeSingle();
        user = data;
    } else {
        const { data } = await supabase.from('site_users').select('*').eq('email', email).eq('password', password).maybeSingle();
        user = data;
    }

    if (user) {
        const updatedUser = await ensureLimitReset(user);
        res.json({ success: true, user: { 
            name: updatedUser.name, 
            email: updatedUser.email, 
            role: updatedUser.role, 
            is_premium: updatedUser.is_premium,
            current_plan: updatedUser.current_plan,
            reveals_today: updatedUser.daily_reveal_count,
            password: updatedUser.password // Include for refresh support
        }});
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// API: Auth - Register
app.post('/api/auth/register', async (req, res) => {
    const { name, password } = req.body;
    const email = req.body.email?.toLowerCase();
    const { error } = await supabase.from('site_users').insert([{ name, email, password, role: 'user' }]);
    if (error) return res.status(400).json({ success: false, message: 'Email already registered' });
    res.json({ success: true, message: 'Account created!', user: { name, email, role: 'user' } });
});

// API: Google Manual Login (Fixed to preserve Premium status)
app.post('/api/auth/google', async (req, res) => {
    const { name, googleId } = req.body;
    const email = req.body.email?.toLowerCase();
    
    // 1. Check if user already exists
    const { data: existingUser } = await supabase.from('site_users').select('*').eq('email', email).maybeSingle();

    let user;
    if (existingUser) {
        // Update only name/id, preserve everything else
        const { data: updated } = await supabase.from('site_users').update({ 
            name: name,
            password: 'google_oauth_' + googleId 
        }).eq('email', email).select().single();
        user = updated;
    } else {
        // Create new user
        const { data: created } = await supabase.from('site_users').insert([{
            email: email,
            name: name,
            password: 'google_oauth_' + googleId,
            role: 'user',
            is_premium: false,
            current_plan: 'starter'
        }]).select().single();
        user = created;
    }

    res.json({ success: true, user: { 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        is_premium: user.is_premium, 
        current_plan: user.current_plan,
        password: user.password
    }});
});

// API: Admin - Get All Payment Requests
app.get('/api/admin/payments', async (req, res) => {
    const { data, error } = await supabase.from('payment_requests').select('*, site_users(name)').order('created_at', { ascending: false });
    res.json({ success: true, payments: data });
});

// API: Admin - Process Payment (with Plan Support)
app.post('/api/admin/payments/process', async (req, res) => {
    const { id, pass, requestId, status, plan } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false });

    const { data: request } = await supabase.from('payment_requests').update({ status }).eq('id', requestId).select().single();
    
    if (status === 'approved') {
        await supabase.from('site_users').update({ 
            is_premium: true, 
            current_plan: plan || request.plan_name || 'starter' 
        }).eq('email', request.user_email);
    }
    res.json({ success: true, message: `Payment ${status} for plan ${plan}` });
});

// API: Get All Free Games (Newest First)
app.get('/api/games', async (req, res) => {
    let allData = [];
    let from = 0;
    const step = 1000;
    
    while (true) {
        const { data, error } = await supabase.from('games')
            .select('id, game, image, game_total')
            .order('id', { ascending: false })
            .range(from, from + step - 1);
            
        if (error) return res.status(500).json({ success: false });
        
        if (data && data.length > 0) {
            allData = allData.concat(data);
            from += step;
            if (data.length < step) break;
        } else {
            break;
        }
    }
    
    res.json({ success: true, games: allData });
});

const revealLimiter = new Map();

// API: Get Specific Game Credentials
app.post('/api/games/reveal', async (req, res) => {
    const ip = req.ip;
    const now = Date.now();
    const last = revealLimiter.get(ip) || 0;
    if (now - last < 2000) { // 2 second cool down per IP
        return res.status(429).json({ success: false, message: 'SLOW_DOWN' });
    }
    revealLimiter.set(ip, now);

    const { gameId, email, password, adminId, adminPass } = req.body;
    
    // 1. Check Admin (Strict Verification)
    if (adminId === process.env.ADMIN_ID && adminPass === process.env.ADMIN_PASS) {
        const { data, error } = await supabase.from('games').select('*').eq('id', gameId).single();
        if (error) return res.status(404).json({ success: false, message: 'Game not found' });
        return res.json({ success: true, game: data });
    }

    // 2. Check User Identity & Plan
    let { data: user } = await supabase.from('site_users').select('*').eq('email', email?.toLowerCase()).eq('password', password).single();
    if (!user) return res.status(401).json({ success: false, message: 'AUTHENTICATION_FAILED' });
    if (!user.is_premium) return res.status(403).json({ success: false, message: 'PREMIUM_REQUIRED' });

    user = await ensureLimitReset(user);

    const limits = { 'starter': 5, 'pro': 12, 'ultimate': Infinity };
    const maxReveals = limits[user.current_plan] || 0;

    if (user.daily_reveal_count >= maxReveals) {
        return res.status(403).json({ success: false, message: 'LIMIT_REACHED' });
    }

    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (game) {
        await supabase.from('site_users').update({ daily_reveal_count: user.daily_reveal_count + 1 }).eq('email', email);
        await supabase.from('reveal_logs').insert([{ user_email: email, game_id: gameId }]);
        
        // Backward compatibility: If credentials don't exist in JSON but singular fields do
        if (!game.credentials && game.username) {
            game.credentials = [{ user: game.username, pass: game.password }];
        }
        
        res.json({ success: true, game });
    } else {
        res.status(404).json({ success: false, message: 'Game not found' });
    }
});

// API: Admin Add Game (with Multiple Credentials Support)
app.post('/api/admin/games', async (req, res) => {
    const { id, pass, gameData } = req.body;
    
    // Check Master Admin OR Role-based Admin
    let isAuthorized = (id === process.env.ADMIN_ID && pass === process.env.ADMIN_PASS);
    if (!isAuthorized) {
        const { data: user } = await supabase.from('site_users').select('*').eq('email', id?.toLowerCase()).eq('password', pass).single();
        if (user && user.role === 'admin') isAuthorized = true;
    }
    if (!isAuthorized) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const newGame = {
        id: 'G' + Date.now(),
        game: gameData.game,
        game_total: parseInt(gameData.game_total || 1),
        image: 'logo.png',
        credentials: gameData.credentials || [{ user: gameData.username, pass: gameData.password }]
    };
    
    const { error } = await supabase.from('games').insert([newGame]);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Game added successfully', game: newGame });
});

// API: Admin Update Game
app.post('/api/admin/games/update', async (req, res) => {
    const { id, pass, gameId, updateData } = req.body;
    
    // Check Master Admin OR Role-based Admin
    let isAuthorized = (id === process.env.ADMIN_ID && pass === process.env.ADMIN_PASS);
    if (!isAuthorized) {
        const { data: user } = await supabase.from('site_users').select('*').eq('email', id?.toLowerCase()).eq('password', pass).single();
        if (user && user.role === 'admin') isAuthorized = true;
    }
    
    if (!isAuthorized) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    // Audit Logging
    console.log(`[AUDIT] GAME_UPDATE: ID ${gameId} updated by admin at ${new Date().toISOString()}`);
    
    // Ensure ID isn't changed in updateData
    delete updateData.id;

    const { error } = await supabase.from('games').update(updateData).eq('id', gameId);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Game updated successfully' });
});

// API: Admin Delete Game
app.post('/api/admin/games/delete', async (req, res) => {
    const { id, pass, gameId } = req.body;
    
    // Check Master Admin OR Role-based Admin
    let isAuthorized = (id === process.env.ADMIN_ID && pass === process.env.ADMIN_PASS);
    if (!isAuthorized) {
        const { data: user } = await supabase.from('site_users').select('*').eq('email', id?.toLowerCase()).eq('password', pass).single();
        if (user && user.role === 'admin') isAuthorized = true;
    }
    if (!isAuthorized) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    console.log(`[AUDIT] GAME_DELETE: ID ${gameId} deleted by admin at ${new Date().toISOString()}`);

    const { error } = await supabase.from('games').delete().eq('id', gameId);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Game deleted successfully' });
});

// API: Get Premium Bundles
app.get('/api/premium', async (req, res) => {
    const { data, error } = await supabase.from('bundles').select('*').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false });
    
    // Map 'description' to 'desc' for frontend compatibility
    const mappedBundles = data.map(b => ({
        ...b,
        desc: b.description
    }));
    
    res.json({ success: true, bundles: mappedBundles });
});

// API: Admin Add Premium Bundle
app.post('/api/admin/premium', async (req, res) => {
    const { id, pass, bundleData } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const newBundle = {
        id: 'B' + Date.now(),
        name: bundleData.name,
        price: bundleData.price,
        description: bundleData.desc,
        image: bundleData.image || 'logo.png'
    };
    
    const { error } = await supabase.from('bundles').insert([newBundle]);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Bundle added successfully', bundle: newBundle });
});

// API: Admin Delete Premium Bundle
app.post('/api/admin/premium/delete', async (req, res) => {
    const { id, pass, bundleId } = req.body;
    if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { error } = await supabase.from('bundles').delete().eq('id', bundleId);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Bundle deleted successfully' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
