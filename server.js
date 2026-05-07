require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase (Use service role for admin tasks)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

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
    
    // Check for hardcoded master admin first
    if (email === 'admin' && password === 'aditi0110') {
        return res.json({ success: true, user: { name: 'Admin', email: 'admin', role: 'admin' } });
    }

    const { data: user, error } = await supabase.from('site_users').select('*').eq('email', email).eq('password', password).maybeSingle();
    
    if (user) {
        res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
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

// API: Get All Free Games (Safe - No Passwords)
app.get('/api/games', async (req, res) => {
    const { data, error } = await supabase.from('games').select('id, game, image').order('created_at', { ascending: false });
    if (error) return res.status(500).json({ success: false });
    res.json({ success: true, games: data });
});

// API: Get Specific Game Credentials (Secure)
app.get('/api/games/:id', async (req, res) => {
    const { data, error } = await supabase.from('games').select('*').eq('id', req.params.id).single();
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
