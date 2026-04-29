<?php
// ============================================================
// GAMERS ARENA - CONFIG FILE
// Fill in your Hostinger MySQL credentials from hPanel
// ============================================================

// --- DATABASE (Get from Hostinger > Databases > MySQL) ---
define('DB_HOST', 'localhost');
define('DB_NAME', 'YOUR_DB_NAME');      // e.g. u123456789_gamersarena
define('DB_USER', 'YOUR_DB_USER');      // e.g. u123456789_admin
define('DB_PASS', 'YOUR_DB_PASSWORD');  // Your database password

// --- SITE ---
define('SITE_URL', 'https://' . $_SERVER['HTTP_HOST']); // Automatically detects if you use test.gamersarena.shop or the main domain
define('TELEGRAM_LINK', 'https://t.me/gamersarena_shop');
define('SECRET_KEY', 'GA_S3CR3T_K3Y_2024_xZqP9mL!');

// --- ADMIN CREDENTIALS ---
define('ADMIN_ID', 'admin');
define('ADMIN_PASS', 'Aditi0110');

// --- SESSION ---
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
