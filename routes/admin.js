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

module.exports = router;
