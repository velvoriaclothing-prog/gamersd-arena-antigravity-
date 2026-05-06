const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files from root

const DB_PATH = path.join(__dirname, 'games.json');
const PREMIUM_DB_PATH = path.join(__dirname, 'premium.json');

// Initialize databases if they don't exist
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify([]));
if (!fs.existsSync(PREMIUM_DB_PATH)) fs.writeFileSync(PREMIUM_DB_PATH, JSON.stringify([]));

const readDB = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeDB = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// API: Get All Free Games (Safe - No Passwords)
app.get('/api/games', (req, res) => {
    const games = readDB(DB_PATH);
    const safeGames = games.map(g => ({ id: g.id, game: g.game, image: g.image }));
    res.json({ success: true, games: safeGames });
});

// API: Get Specific Game Credentials (Secure)
app.get('/api/games/:id', (req, res) => {
    const games = readDB(DB_PATH);
    const game = games.find(g => g.id === req.params.id);
    if (game) res.json({ success: true, game });
    else res.status(404).json({ success: false, message: 'Game not found' });
});

// API: Admin Add Game
app.post('/api/admin/games', (req, res) => {
    const { id, pass, gameData } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const games = readDB(DB_PATH);
    const newGame = {
        id: 'G' + Date.now(),
        game: gameData.game,
        username: gameData.username,
        password: gameData.password,
        image: 'logo.png' // Default as requested
    };
    games.unshift(newGame);
    writeDB(DB_PATH, games);
    res.json({ success: true, message: 'Game added successfully', game: newGame });
});

// API: Admin Delete Game
app.post('/api/admin/games/delete', (req, res) => {
    const { id, pass, gameId } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    let games = readDB(DB_PATH);
    games = games.filter(g => g.id !== gameId);
    writeDB(DB_PATH, games);
    res.json({ success: true, message: 'Game deleted successfully' });
});

// API: Get Premium Bundles
app.get('/api/premium', (req, res) => {
    const bundles = readDB(PREMIUM_DB_PATH);
    res.json({ success: true, bundles });
});

// API: Admin Add Premium Bundle
app.post('/api/admin/premium', (req, res) => {
    const { id, pass, bundleData } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    const bundles = readDB(PREMIUM_DB_PATH);
    const newBundle = {
        id: 'B' + Date.now(),
        name: bundleData.name,
        price: bundleData.price,
        desc: bundleData.desc,
        image: 'logo.png'
    };
    bundles.unshift(newBundle);
    writeDB(PREMIUM_DB_PATH, bundles);
    res.json({ success: true, message: 'Bundle added successfully', bundle: newBundle });
});

// API: Admin Delete Premium Bundle
app.post('/api/admin/premium/delete', (req, res) => {
    const { id, pass, bundleId } = req.body;
    if (id !== 'admin' || pass !== 'aditi0110') return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    let bundles = readDB(PREMIUM_DB_PATH);
    bundles = bundles.filter(b => b.id !== bundleId);
    writeDB(PREMIUM_DB_PATH, bundles);
    res.json({ success: true, message: 'Bundle deleted successfully' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
