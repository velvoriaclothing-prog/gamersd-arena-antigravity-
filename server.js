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

// Initialize Telegram Bot
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7297371569:AAEoyHlW_XGZ4B8pL0S6u2fVvW7nS8R_6XU';
const bot = new TelegramBot(TG_TOKEN, { polling: true });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// --- TELEGRAM BOT LOGIC ---
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🚀 Welcome to Gamers Arena Verification Bot!\n\nUse /verify to submit your payment details.");
});

bot.onText(/\/verify/, (msg) => {
    bot.sendMessage(msg.chat.id, "Please send your registered website EMAIL and UTR/Transaction ID in this format:\n\n`EMAIL: your@email.com` \n`UTR: 1234567890`", { parse_mode: 'Markdown' });
});

bot.on('message', async (msg) => {
    const text = msg.text || '';
    if (text.startsWith('EMAIL:')) {
        const emailMatch = text.match(/EMAIL:\s*(.+)/i);
        const utrMatch = text.match(/UTR:\s*(.+)/i);
        
        if (emailMatch && utrMatch) {
            const email = emailMatch[1].trim();
            const utr = utrMatch[1].trim();
            
            const { error } = await supabase.from('payment_requests').insert([{ user_email: email, utr_id: utr, status: 'pending' }]);
            if (error) {
                bot.sendMessage(msg.chat.id, "❌ Error: This UTR might already be submitted or email not found.");
            } else {
                bot.sendMessage(msg.chat.id, "✅ Payment submitted! Admin will verify it shortly. You can check status with /status");
            }
        }
    }
});

bot.onText(/\/status/, async (msg) => {
    bot.sendMessage(msg.chat.id, "Please provide your email to check status:\n`CHECK: your@email.com`", { parse_mode: 'Markdown' });
});

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
    
    // Check for hardcoded master admin first
    if (email === 'admin' && password === 'aditi0110') {
        return res.json({ success: true, user: { name: 'Admin', email: 'admin', role: 'admin', is_premium: true } });
    }

    const { data: user, error } = await supabase.from('site_users').select('*').eq('email', email).eq('password', password).maybeSingle();
    
    if (user) {
        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role, is_premium: user.is_premium } });
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

// API: Admin - Approve/Reject Payment
app.post('/api/admin/payments/process', async (req, res) => {
    const { id, pass, requestId, status } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false });

    const { data: request } = await supabase.from('payment_requests').update({ status }).eq('id', requestId).select().single();
    
    if (status === 'approved') {
        await supabase.from('site_users').update({ is_premium: true }).eq('email', request.user_email);
    }
    
    res.json({ success: true, message: `Payment ${status}` });
});

// API: Get All Free Games (Safe - No Passwords)
app.get('/api/games', async (req, res) => {
    const { data, error } = await supabase.from('games').select('id, game, image').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true, games: data });
});

// API: Get Specific Game Credentials (Secure)
app.post('/api/games/reveal', async (req, res) => {
    const { gameId, email } = req.body;
    
    // Check if user is premium or admin
    if (email !== 'admin') {
        const { data: user } = await supabase.from('site_users').select('is_premium').eq('email', email).single();
        if (!user || !user.is_premium) {
            return res.status(403).json({ success: false, message: 'PREMIUM_REQUIRED' });
        }
    }

    const { data, error } = await supabase.from('games').select('*').eq('id', gameId).single();
    if (data) res.json({ success: true, game: data });
    else res.status(404).json({ success: false, message: 'Game not found' });
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
