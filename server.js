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

// Initialize Telegram Bot (Webhook Mode for Production)
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7297371569:AAEoyHlW_XGZ4B8pL0S6u2fVvW7nS8R_6XU';
const WEBHOOK_URL = `https://gamersd-arena-antigravity.onrender.com/bot${TG_TOKEN}`;
const bot = new TelegramBot(TG_TOKEN);

// Set Webhook (Only if not in dev)
if (process.env.NODE_ENV === 'production') {
    bot.setWebHook(WEBHOOK_URL);
} else {
    // Fallback to polling for local dev
    const botDev = new TelegramBot(TG_TOKEN, { polling: true });
    setupBotLogic(botDev);
}

// Webhook endpoint
app.post(`/bot${TG_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

function setupBotLogic(botInstance) {
    const userCooldowns = new Map();

    botInstance.onText(/\/start/, (msg) => {
        botInstance.sendMessage(msg.chat.id, "🚀 *Gamers Arena Official Verification Bot*\n\nWelcome! To unlock your premium plan, please follow the steps below.\n\n1. Complete payment on the website.\n2. Note your 12-digit UPI/UTR Transaction ID.\n3. Type /verify here to submit.", { parse_mode: 'Markdown' });
    });

    botInstance.onText(/\/verify/, (msg) => {
        botInstance.sendMessage(msg.chat.id, "🔍 *Verification Request*\n\nPlease reply with your details in this EXACT format:\n\n`EMAIL: your@email.com` \n`UTR: 123456789012` \n`PLAN: Starter/Pro/Ultimate` \n\n⚠️ _One UTR can only be used for one account._", { parse_mode: 'Markdown' });
    });

    botInstance.on('message', async (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text || '';

        if (text.startsWith('EMAIL:')) {
            // 1. Rate Limiting (Cooldown)
            const lastAttempt = userCooldowns.get(chatId);
            if (lastAttempt && Date.now() - lastAttempt < 60000) { // 1 min cooldown
                return botInstance.sendMessage(chatId, "⏳ *Cooldown Active*: Please wait 1 minute before submitting again to prevent spam.");
            }
            userCooldowns.set(chatId, Date.now());

            // 2. Parse Data
            const emailMatch = text.match(/EMAIL:\s*(.+)/i);
            const utrMatch = text.match(/UTR:\s*(.+)/i);
            const planMatch = text.match(/PLAN:\s*(.+)/i);

            if (!emailMatch || !utrMatch) {
                return botInstance.sendMessage(chatId, "❌ *Invalid Format*: Please use the format shown in /verify accurately.");
            }

            const email = emailMatch[1].trim();
            const utr = utrMatch[1].trim();
            const plan = (planMatch ? planMatch[1].trim().toLowerCase() : 'starter');

            // 3. UTR Validation (Length Check)
            if (utr.length < 10 || utr.length > 15) {
                return botInstance.sendMessage(chatId, "⚠️ *Invalid UTR*: Transaction IDs are usually 12 digits. Please double-check your receipt.");
            }

            // 4. Duplicate Check & Fraud Prevention
            const { data: existingRequest } = await supabase.from('payment_requests').select('*').eq('utr_id', utr).maybeSingle();
            
            if (existingRequest) {
                if (existingRequest.user_email === email) {
                    return botInstance.sendMessage(chatId, "ℹ️ *Already Submitted*: You have already submitted this Transaction ID for this email. Please wait for admin approval.");
                } else {
                    return botInstance.sendMessage(chatId, "🚨 *FRAUD ALERT*: This payment transaction ID has already been used with another account. Your account has been flagged for review.", { parse_mode: 'Markdown' });
                }
            }

            // 5. Submit to DB
            const { error } = await supabase.from('payment_requests').insert([{ 
                user_email: email, 
                utr_id: utr, 
                plan_name: plan, 
                status: 'pending',
                telegram_id: chatId.toString()
            }]);

            if (error) {
                botInstance.sendMessage(chatId, "❌ *System Error*: Could not process request. Please ensure you are using a registered email.");
            } else {
                botInstance.sendMessage(chatId, "✅ *Submission Successful!*\n\nPlan: " + plan.toUpperCase() + "\nUTR: " + utr + "\n\nAdmin will verify your payment shortly. This usually takes 10-30 minutes. You will be notified here.", { parse_mode: 'Markdown' });
            }
        }
    });

    botInstance.onText(/\/status/, async (msg) => {
        botInstance.sendMessage(msg.chat.id, "To check status, please send:\n`CHECK: your@email.com`", { parse_mode: 'Markdown' });
    });
}

// Initialize logic for the webhook bot too
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
