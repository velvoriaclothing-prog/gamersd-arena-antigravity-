require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const TelegramBot = require('node-telegram-bot-api');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

// Initialize Telegram Bot (Polling Mode)
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8653750659:AAHEjQdPTAMs1TzR11tF2fy_Hon5b8e8_LA';
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
            state.email = msg.text.trim();
            state.step = 'plan';
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

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// API: Content Management
app.get('/api/content', async (req, res) => {
    const { data, error } = await supabase.from('site_content').select('data').eq('id', 'main_content').single();
    if (error) return res.json({ success: true, content: {} });
    res.json({ success: true, content: data.data });
});

app.post('/api/content', async (req, res) => {
    const { id, pass, content } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { error } = await supabase.from('site_content').upsert({ id: 'main_content', data: content });
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Content updated successfully' });
});

// API: Auth - Login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (email === 'admin' && password === 'aditi0110') {
        return res.json({ success: true, user: { name: 'Admin', email: 'admin', role: 'admin', is_premium: true, current_plan: 'ultimate' } });
    }
    const { data: user } = await supabase.from('site_users').select('*').eq('email', email).eq('password', password).maybeSingle();
    if (user) {
        const updatedUser = await ensureLimitReset(user);
        res.json({ success: true, user: { 
            name: updatedUser.name, 
            email: updatedUser.email, 
            role: updatedUser.role, 
            is_premium: updatedUser.is_premium,
            current_plan: updatedUser.current_plan,
            reveals_today: updatedUser.daily_reveal_count
        }});
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// API: Auth - Register
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    const { error } = await supabase.from('site_users').insert([{ name, email, password, role: 'user' }]);
    if (error) return res.status(400).json({ success: false, message: 'Email already registered' });
    res.json({ success: true, message: 'Account created!', user: { name, email, role: 'user' } });
});

// API: Google Manual Login
app.post('/api/auth/google', async (req, res) => {
    const { name, email, googleId } = req.body;
    
    // Auto-register or login the Google user
    const { data: user, error } = await supabase.from('site_users').upsert({
        email: email,
        name: name,
        password: 'google_oauth_' + googleId, // Dummy password
        role: 'user'
    }, { onConflict: 'email' }).select().single();

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, user: { name, email, role: 'user' } });
});

// API: Admin - Get All Payment Requests
app.get('/api/admin/payments', async (req, res) => {
    const { data, error } = await supabase.from('payment_requests').select('*, site_users(name)').order('created_at', { ascending: false });
    res.json({ success: true, payments: data });
});

// API: Admin - Process Payment (with Plan Support)
app.post('/api/admin/payments/process', async (req, res) => {
    const { id, pass, requestId, status, plan } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false });

    const { data: request } = await supabase.from('payment_requests').update({ status }).eq('id', requestId).select().single();
    
    if (status === 'approved') {
        await supabase.from('site_users').update({ 
            is_premium: true, 
            current_plan: plan || request.plan_name || 'starter' 
        }).eq('email', request.user_email);
    }
    res.json({ success: true, message: `Payment ${status} for plan ${plan}` });
});

// API: Get All Free Games (Safe - No Passwords)
app.get('/api/games', async (req, res) => {
    const { data, error } = await supabase.from('games').select('id, game, image').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true, games: data });
});

// API: Get Specific Game Credentials (Tiered Protection)
app.post('/api/games/reveal', async (req, res) => {
    const { gameId, email } = req.body;
    
    // 1. Check Admin
    if (email === 'admin') {
        const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
        return res.json({ success: true, game: data });
    }

    // 2. Check User & Plan
    let { data: user } = await supabase.from('site_users').select('*').eq('email', email).single();
    if (!user || !user.is_premium) return res.status(403).json({ success: false, message: 'PREMIUM_REQUIRED' });

    // 3. Reset Limits if needed
    user = await ensureLimitReset(user);

    // 4. Validate Tiered Limits
    const limits = { 'starter': 5, 'pro': 12, 'ultimate': Infinity };
    const maxReveals = limits[user.current_plan] || 0;

    if (user.daily_reveal_count >= maxReveals) {
        return res.status(403).json({ success: false, message: 'LIMIT_REACHED' });
    }

    // 5. Reveal & Log
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (game) {
        await supabase.from('site_users').update({ daily_reveal_count: user.daily_reveal_count + 1 }).eq('email', email);
        await supabase.from('reveal_logs').insert([{ user_email: email, game_id: gameId }]);
        res.json({ success: true, game });
    } else {
        res.status(404).json({ success: false, message: 'Game not found' });
    }
});

// API: Admin Add Game
app.post('/api/admin/games', async (req, res) => {
    const { id, pass, gameData } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const newGame = {
        id: 'G' + Date.now(),
        game: gameData.game,
        username: gameData.username,
        password: gameData.password,
        image: 'logo.png'
    };
    
    const { error } = await supabase.from('games').insert([newGame]);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Game added successfully', game: newGame });
});

// API: Admin Delete Game
app.post('/api/admin/games/delete', async (req, res) => {
    const { id, pass, gameId } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
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
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const newBundle = {
        id: 'B' + Date.now(),
        name: bundleData.name,
        price: bundleData.price,
        description: bundleData.desc,
        image: 'logo.png'
    };
    
    const { error } = await supabase.from('bundles').insert([newBundle]);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Bundle added successfully', bundle: newBundle });
});

// API: Admin Delete Premium Bundle
app.post('/api/admin/premium/delete', async (req, res) => {
    const { id, pass, bundleId } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const { error } = await supabase.from('bundles').delete().eq('id', bundleId);
    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, message: 'Bundle deleted successfully' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
