// routes/admin.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parse');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);
const upload = multer({ storage: multer.memoryStorage() });

// Helper: auth middleware for admin routes
function adminAuth(req, res, next) {
  const { id, pass } = req.body;
  if (id !== process.env.ADMIN_ID || pass !== process.env.ADMIN_PASS) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
}

// Bulk game upload
router.post('/games/bulk', upload.single('file'), adminAuth, async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  const csvData = req.file.buffer.toString('utf8');
  const records = [];
  csv(csvData, { columns: true, trim: true }, (err, data) => {
    if (err) return res.status(400).json({ success: false, message: 'CSV parsing error' });
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
    if (!gameName || !username || !password) { results.skipped++; continue; }
    const newId = gameName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const { error } = await supabase.from('games').insert([{ id: newId, game: gameName, username, password, credentials: [{ user: username, pass: password }], priority: 0 }]);
    if (error) results.errors.push({ game: gameName, error: error.message });
    else results.added++;
  }
  res.json({ success: true, summary: results });
}

// Admin payments list
router.get('/payments', async (req, res) => {
  const { data, error } = await supabase.from('payment_requests').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false });
  res.json({ success: true, payments: data });
});

// Process payment (admin approval/rejection)
router.post('/payments/process', adminAuth, async (req, res) => {
  const { requestId, status, plan } = req.body;
  // Reuse existing processPayment function from main server (import later if needed)
  // For brevity we call the same Supabase updates here.
  const { data: request } = await supabase.from('payment_requests').update({ status }).eq('id', requestId).select().single();
  if (status === 'approved') {
    await supabase.from('site_users').update({ is_premium: true, current_plan: plan || request.plan_name }).eq('email', request.user_email);
  }
  res.json({ success: true, message: 'Processed' });
});

// Update game asset
router.post('/games/update', adminAuth, async (req, res) => {
  const { gameId, updateData } = req.body;
  if (!gameId || !updateData) {
    return res.status(400).json({ success: false, message: 'Missing gameId or updateData' });
  }

  try {
    const credentials = updateData.credentials || [];
    const username = credentials.length > 0 ? credentials[0].user : null;
    const password = credentials.length > 0 ? credentials[0].pass : null;

    const { error } = await supabase.from('games').update({
      game: updateData.game,
      image: updateData.image,
      credentials: credentials,
      username: username,
      password: password,
      priority: updateData.priority || 0
    }).eq('id', gameId);

    if (error) throw error;
    res.json({ success: true, message: 'Game updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add game drop
router.post('/games', adminAuth, async (req, res) => {
  const { gameData } = req.body;
  if (!gameData || !gameData.game) return res.status(400).json({ success: false, message: 'Missing gameData' });

  try {
    const newId = gameData.game.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const credentials = gameData.credentials || [];
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

    if (error) throw error;
    res.json({ success: true, message: 'Game added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete game drop
router.post('/games/delete', adminAuth, async (req, res) => {
  const { gameId, gameIds } = req.body;

  try {
    if (gameIds && Array.isArray(gameIds)) {
      // Bulk delete support
      const { error } = await supabase.from('games').delete().in('id', gameIds);
      if (error) throw error;
      res.json({ success: true, message: 'Games deleted successfully' });
    } else if (gameId) {
      // Single delete
      const { error } = await supabase.from('games').delete().eq('id', gameId);
      if (error) throw error;
      res.json({ success: true, message: 'Game deleted successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Missing gameId or gameIds' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add premium bundle
router.post('/premium', adminAuth, async (req, res) => {
  const { bundleData } = req.body;
  if (!bundleData || !bundleData.name) return res.status(400).json({ success: false, message: 'Missing bundleData' });

  try {
    const newId = bundleData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now();
    const { error } = await supabase.from('bundles').insert([{
      id: newId,
      name: bundleData.name,
      price: bundleData.price,
      description: bundleData.desc || bundleData.description,
      image: bundleData.image || 'logo.png'
    }]);

    if (error) throw error;
    res.json({ success: true, message: 'Bundle added successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete premium bundle
router.post('/premium/delete', adminAuth, async (req, res) => {
  const { bundleId } = req.body;
  if (!bundleId) return res.status(400).json({ success: false, message: 'Missing bundleId' });

  try {
    const { error } = await supabase.from('bundles').delete().eq('id', bundleId);
    if (error) throw error;
    res.json({ success: true, message: 'Bundle deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
