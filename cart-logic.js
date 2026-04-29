// ── GAMERS ARENA CART LOGIC (localStorage based) ──
function getCart() {
    return JSON.parse(localStorage.getItem('gamersArenaCart')) || [];
}
function saveCart(cart) {
    localStorage.setItem('gamersArenaCart', JSON.stringify(cart));
    updateCartBadge();
}
function addToCart(gameName, price, imageSrc) {
    const cart = getCart();
    const exists = cart.find(i => i.name === gameName);
    if (exists) { showToast(gameName + ' is already in your cart!'); return; }
    cart.push({ name: gameName, price: price, image: imageSrc });
    saveCart(cart);
    showToast(gameName + ' added to cart! 🎮');
}
function updateCartBadge() {
    const cart = getCart();
    document.querySelectorAll('#cart-badge').forEach(badge => {
        if (cart.length > 0) { badge.style.display = 'flex'; badge.innerText = cart.length; }
        else { badge.style.display = 'none'; }
    });
}
function getUser() {
    try { return JSON.parse(localStorage.getItem('ga_user')); } catch(e) { return null; }
}
function updateAuthUI() {
    const user = getUser();
    document.querySelectorAll('.auth-btn').forEach(btn => {
        if (user) {
            btn.textContent = user.name;
            btn.onclick = () => { if(confirm('Logout?')) { fetch('/api/auth/logout',{credentials:'include'}); localStorage.removeItem('ga_user'); location.reload(); }};
        } else {
            btn.textContent = 'Sign In';
            btn.onclick = () => window.location.href = 'login.html';
        }
    });
}
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'fixed bottom-6 right-6 bg-cyan-500 text-black px-6 py-3 rounded-lg font-bold text-sm z-[9999] shadow-[0_0_20px_rgba(0,242,255,.5)]';
    t.style.animation = 'fadeInUp .3s ease';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}
document.addEventListener('DOMContentLoaded', () => { updateCartBadge(); updateAuthUI(); });
