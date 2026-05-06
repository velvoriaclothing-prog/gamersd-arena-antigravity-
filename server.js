const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieSession = require('cookie-session');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Supabase Setup ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve your HTML files
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SECRET_KEY || 'GA_SECRET_2024'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// --- Helper Functions ---
const requireAuth = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    next();
};

const requireAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
};

// --- API Endpoints ---

// ── AUTH ────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!supabase) return res.status(500).json({ success: false, message: 'DB not connected' });

    const { data, error } = await supabase
        .from('users')
        .insert([{ name, email: email.toLowerCase(), password_hash: password }]) // In production, use hashing!
        .select();

    if (error) return res.json({ success: false, message: error.message });
    
    const user = data[0];
    req.session.userId = user.id;
    req.session.role = 'user';
    req.session.name = user.name;
    
    res.json({ success: true, user: { id: user.id, name: user.name, role: 'user' } });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Hardcoded Admin
    if (email === 'admin' && password === 'Aditi0110') {
        req.session.userId = 0;
        req.session.role = 'admin';
        req.session.name = 'Admin';
        return res.json({ success: true, user: { id: 0, name: 'Admin', role: 'admin' } });
    }

    if (!supabase) return res.status(500).json({ success: false, message: 'DB not connected' });

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('password_hash', password) // Use hashing in production
        .single();

    if (error || !data) return res.json({ success: false, message: 'Invalid credentials' });

    req.session.userId = data.id;
    req.session.role = data.role || 'user';
    req.session.name = data.name;

    res.json({ success: true, user: { id: data.id, name: data.name, role: req.session.role } });
});

app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId && req.session.userId !== 0) return res.json({ success: false });
    res.json({ success: true, user: { id: req.session.userId, name: req.session.name, role: req.session.role } });
});

app.get('/api/auth/logout', (req, res) => {
    req.session = null;
    res.json({ success: true });
});

// ── GAMES ───────────────────────────────────────────────
app.get('/api/games/list', async (req, res) => {
    if (!supabase) {
        try {
            const gamesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'games-data.json'), 'utf8'));
            return res.json({ success: true, games: gamesData });
        } catch (e) {
            // Sample data if JSON not found
            return res.json({ success: true, games: [
                { id: 1, name: 'Neon Samurai', type: 'free', price: 0, image: 'https://images.unsplash.com/photo-1614583225154-5fc20b64190b?w=800' },
                { id: 2, name: 'Elden Ring', type: 'premium', price: 4999, description: 'Master the challenges...' }
            ]});
        }
    }
    const { data, error } = await supabase.from('games').select('*').order('created_at', { ascending: false });
    res.json({ success: true, games: data });
});

app.get('/api/games/reveal/:id', async (req, res) => {
    if (!supabase) {
        try {
            const credsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'credentials-data.json'), 'utf8'));
            const gameCreds = credsData.filter(c => c.game_id == req.params.id);
            if (gameCreds.length === 0) return res.json({ success: false, message: 'No credentials found for this game.' });
            
            // Pick a random one
            const cred = gameCreds[Math.floor(Math.random() * gameCreds.length)];
            return res.json({ success: true, credential: { username: cred.username, password: cred.password } });
        } catch (e) {
            return res.json({ success: true, credential: { username: 'test_user', password: 'test_password' } });
        }
    }
    
    // Find credential for this game
    const { data: cred, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('game_id', req.params.id)
        .limit(1)
        .single();

    if (error || !cred) return res.json({ success: false, message: 'No credentials left!' });

    res.json({ success: true, credential: { username: cred.username, password: cred.password } });
});

// ── ORDERS ──────────────────────────────────────────────
app.post('/api/orders/create', requireAuth, async (req, res) => {
    const { items, total } = req.body;
    if (!supabase) return res.json({ success: true, order: { id: Date.now(), ref: 'GA-' + Math.random().toString(36).substr(2, 8) } });

    const ref = 'GA-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    const { data, error } = await supabase
        .from('orders')
        .insert([{ user_id: req.session.userId, items, total_amount: total, order_ref: ref, status: 'pending' }])
        .select();

    res.json({ success: true, order: data[0] });
});

app.post('/api/orders/claim-payment/:id', requireAuth, async (req, res) => {
    if (!supabase) return res.json({ success: true });
    await supabase.from('orders').update({ status: 'payment_claimed' }).eq('id', req.params.id);
    res.json({ success: true });
});

// ── BLOGS ───────────────────────────────────────────────
app.get('/api/blogs/all', async (req, res) => {
    if (!supabase) return res.json({ success: true, blogs: [] });
    const { data } = await supabase.from('blogs').select('*').order('created_at', { ascending: false });
    res.json({ success: true, blogs: data });
});

app.get('/api/aitools/list', async (req, res) => {
    if (!supabase) return res.json({ success: true, tools: [] });
    const { data } = await supabase.from('ai_tools').select('*').order('created_at', { ascending: false });
    res.json({ success: true, tools: data });
});

// ── ADMIN: STATS ─────────────────────────────────────
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    if (!supabase) return res.json({ success: true, stats: { total_users: 0, total_games: 2, total_orders: 0, total_revenue: 0, pending_orders: 0, confirmed_orders: 0, free_games: 1, unclaimed_creds: 0 } });
    
    const [u, g, o, c] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user'),
        supabase.from('games').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('credentials').select('*', { count: 'exact', head: true }).eq('is_claimed', false)
    ]);

    const { data: rev } = await supabase.from('orders').select('total_amount').eq('status', 'confirmed');
    const totalRev = rev ? rev.reduce((acc, curr) => acc + curr.total_amount, 0) : 0;

    res.json({ success: true, stats: {
        total_users: u.count, total_games: g.count, total_orders: o.count,
        total_revenue: totalRev, unclaimed_creds: c.count
    }});
});

// ── ADMIN: GAMES ─────────────────────────────────────
app.post('/api/admin/games/add', requireAdmin, async (req, res) => {
    const { name, type, price, genre, image, description, username, password } = req.body;
    
    // 1. Insert the Game
    const { data, error } = await supabase.from('games').insert([{
        name, type, price, genre, image, description
    }]).select();

    if (error) return res.json({ success: false, message: error.message });

    // 2. If it's a FREE game and ID/Pass provided, insert credentials automatically
    if (type === 'free' && username && password) {
        const gameId = data[0].id;
        await supabase.from('credentials').insert([{
            game_id: gameId,
            username: username,
            password: password
        }]);
    }

    res.json({ success: true, message: 'Game and Credentials added permanently!' });
});

app.post('/api/admin/games/delete/:id', requireAdmin, async (req, res) => {
    await supabase.from('games').delete().eq('id', req.params.id);
    res.json({ success: true });
});

// ── ADMIN: CREDENTIALS ───────────────────────────────
app.get('/api/admin/credentials/list', requireAdmin, async (req, res) => {
    const { data } = await supabase.from('credentials').select('*, games(name)').order('id', { ascending: false });
    res.json({ success: true, credentials: data });
});

app.post('/api/admin/credentials/add', requireAdmin, async (req, res) => {
    const { error } = await supabase.from('credentials').insert([req.body]);
    if (error) return res.json({ success: false, message: error.message });
    res.json({ success: true, message: 'Credential added' });
});

// ── ADMIN: ORDERS ────────────────────────────────────
app.get('/api/admin/orders/all', requireAdmin, async (req, res) => {
    const { data } = await supabase.from('orders').select('*, users(email, name)').order('created_at', { ascending: false });
    res.json({ success: true, orders: data });
});

app.post('/api/admin/orders/update/:id', requireAdmin, async (req, res) => {
    const { status } = req.body;
    await supabase.from('orders').update({ status }).eq('id', req.params.id);
    res.json({ success: true });
});

// ── ADMIN: AI TOOLS ──────────────────────────────────
app.get('/api/admin/aitools/list', requireAdmin, async (req, res) => {
    const { data } = await supabase.from('ai_tools').select('*').order('id', { ascending: false });
    res.json({ success: true, tools: data });
});

app.post('/api/admin/aitools/add', requireAdmin, async (req, res) => {
    const { error } = await supabase.from('ai_tools').insert([req.body]);
    if (error) return res.json({ success: false, message: error.message });
    res.json({ success: true, message: 'AI Tool added permanently' });
});

app.post('/api/admin/aitools/delete/:id', requireAdmin, async (req, res) => {
    await supabase.from('ai_tools').delete().eq('id', req.params.id);
    res.json({ success: true, message: 'AI Tool deleted' });
});

// ── ADMIN: BLOGS (Permanent Add) ─────────────────────
app.post('/api/admin/blogs/add', requireAdmin, async (req, res) => {
    const { error } = await supabase.from('blogs').insert([req.body]);
    if (error) return res.json({ success: false, message: error.message });
    res.json({ success: true, message: 'Blog published permanently' });
});

app.post('/api/admin/blogs/delete/:id', requireAdmin, async (req, res) => {
    await supabase.from('blogs').delete().eq('id', req.params.id);
    res.json({ success: true });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`🚀 Gamers Arena Server running on port ${PORT}`);
});
