// 1. SCROLL ANIMATIONS (Intersection Observer)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show-scroll');
        }
    });
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
    // 0. LOGIN WALL (Force login for all pages except login.html)
    const path = window.location.pathname.toLowerCase();
    const isLoginPage = path.endsWith('login.html') || path.endsWith('login') || path.includes('/login');
    const user = JSON.parse(localStorage.getItem('ga_user'));
    
    if (!user && !isLoginPage) {
        window.location.href = 'login.html';
        return;
    }

    document.querySelectorAll('.card-3d, .section-title, .section-subtitle, .timer-container').forEach(el => {
        el.classList.add('hidden-scroll');
        observer.observe(el);
    });
});

// 2. ADMIN ACCESS
let tapCount = 0;
let tapTimer;
document.addEventListener('click', (e) => {
    if (e.target.closest('#ga-logo')) {
        tapCount++;
        clearTimeout(tapTimer);
        if (tapCount >= 5) {
            e.preventDefault();
            tapCount = 0;
            document.getElementById('admin-modal-overlay').classList.add('active');
        } else {
            tapTimer = setTimeout(() => { tapCount = 0; }, 2000); 
        }
    }
});

let secretCode = '';
window.addEventListener('keydown', (e) => {
    secretCode += e.key.toLowerCase();
    if (secretCode.includes('admin')) {
        document.getElementById('admin-modal-overlay').classList.add('active');
        secretCode = '';
    }
    if (secretCode.length > 10) secretCode = secretCode.slice(-10);
});

// Admin Modal HTML
const modalHTML = `
<div class="modal-overlay" id="admin-modal-overlay">
    <div class="admin-modal">
        <h2 style="margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">System Override</h2>
        <form onsubmit="loginAdmin(event)">
            <input type="text" id="admin-id" class="admin-input" placeholder="Admin ID" required>
            <input type="password" id="admin-pass" class="admin-input" placeholder="Password" required>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="button" class="btn btn-secondary" style="flex: 1; justify-content: center;" onclick="closeAdminModal()">Abort</button>
                <button type="submit" class="btn btn-danger" style="flex: 1; justify-content: center;">Access</button>
            </div>
        </form>
    </div>
</div>
`;
document.write(modalHTML);

function closeAdminModal() { document.getElementById('admin-modal-overlay').classList.remove('active'); }
function loginAdmin(e) {
    e.preventDefault();
    const id = document.getElementById('admin-id').value;
    const pass = document.getElementById('admin-pass').value;
    
    sessionStorage.setItem('ga_admin_id', id);
    sessionStorage.setItem('ga_admin_pass', pass);
    window.location.href = 'admin.html';
}

// 3. DRAGON CANVAS ANIMATION (Optimized)
let canvas, ctx, particles = [];
function initDragon() {
    canvas = document.getElementById('dragon-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

class DragonParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 5 + 2;
        this.speedX = Math.random() * 2 - 1;
        this.speedY = Math.random() * 2 - 1;
        this.life = 1;
        this.decay = Math.random() * 0.01 + 0.005;
        this.hue = Math.random() > 0.5 ? 190 : 340; 
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
        this.size -= 0.05;
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size > 0 ? this.size : 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 100%, 50%, ${this.life})`;
        ctx.fill();
    }
}

function handleParticles() {
    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
}

function animateDragon() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    handleParticles();
    requestAnimationFrame(animateDragon);
}

window.addEventListener('mousemove', (e) => {
    if (particles.length < 50) {
        for (let i = 0; i < 2; i++) {
            particles.push(new DragonParticle(e.x, e.y));
        }
    }
});

// 4. DYNAMIC CONTENT LOADING & LIVE EDITOR
let siteContent = {};
async function loadDynamicContent() {
    try {
        const r = await fetch('/api/content');
        const data = await r.json();
        if (data.success) {
            siteContent = data.content || {};
            const pageName = window.location.pathname.split('/').pop().split('.')[0] || 'index';
            const urlParams = new URLSearchParams(window.location.search);
            const isEditMode = urlParams.get('edit') === 'true';
            
            if (siteContent[pageName]) {
                Object.keys(siteContent[pageName]).forEach(key => {
                    const el = document.querySelector(`[data-content="${key}"]`);
                    if (el) {
                        el.innerText = siteContent[pageName][key];
                        if (isEditMode) {
                            el.contentEditable = "true";
                            el.style.outline = "2px dashed var(--accent-blue)";
                        }
                    }
                });
            }
            if (isEditMode) showEditBar(pageName);
        }
    } catch (e) { console.warn("Content system offline"); }
}

function showEditBar(pageName) {
    const bar = document.createElement('div');
    bar.style = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.9); padding:1rem 2rem; border-radius:50px; border:2px solid var(--accent-blue); z-index:99999; display:flex; gap:1.5rem; align-items:center; backdrop-filter:blur(20px); box-shadow:0 0 30px rgba(0,229,255,0.3);";
    bar.innerHTML = `
        <span style="color:var(--accent-blue); font-weight:900; font-size:0.8rem; text-transform:uppercase;">Visual Editor Mode: ${pageName.toUpperCase()}</span>
        <button onclick="saveLiveEdits('${pageName}')" class="btn btn-primary" style="padding:0.5rem 1.5rem; font-size:0.8rem;">Save All Changes</button>
        <button onclick="window.location.href='admin.html'" class="btn btn-secondary" style="padding:0.5rem 1.5rem; font-size:0.8rem;">Exit Designer</button>
    `;
    document.body.appendChild(bar);
}

async function saveLiveEdits(pageName) {
    const els = document.querySelectorAll('[data-content]');
    if (!siteContent[pageName]) siteContent[pageName] = {};
    els.forEach(el => {
        const key = el.getAttribute('data-content');
        siteContent[pageName][key] = el.innerText;
    });

    const res = await fetch('/api/content', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            id: sessionStorage.getItem('ga_admin_id'), 
            pass: sessionStorage.getItem('ga_admin_pass'), 
            content: siteContent 
        })
    });
    
    const result = await res.json();
    if (result.success) {
        alert("Changes saved LIVE successfully!");
        window.location.search = "";
    } else {
        alert("Save failed: " + result.message);
    }
}

// 6. SECURITY: Discourage Inspection
function discourageInspection() {
    if (window.location.pathname.includes('game.html')) {
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('keydown', e => {
            if (e.ctrlKey && (e.key === 'u' || e.key === 's' || e.key === 'i' || e.key === 'j')) e.preventDefault();
            if (e.key === 'F12') e.preventDefault();
        });
    }
}

// 7. HEARTBEAT & LIVE TRACKING
function startHeartbeat() {
    const user = JSON.parse(localStorage.getItem('ga_user') || '{}');
    if (!user.email) return;

    const ping = () => {
        fetch('/api/auth/ping', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: user.email })
        }).catch(e => console.warn("Ping failed"));
    };

    ping();
    setInterval(ping, 120000); // Every 2 minutes
}

document.addEventListener('DOMContentLoaded', () => {
    initDragon();
    animateDragon();
    loadDynamicContent();
    updateGlobalUserDisplay();
    discourageInspection();
    startHeartbeat();
});

// 5. GLOBAL USER DISPLAY & AUTH
function updateGlobalUserDisplay() {
    const user = JSON.parse(localStorage.getItem('ga_user') || '{}');
    const authBtns = document.getElementById('auth-btns');
    const userDisplay = document.getElementById('user-display');
    const emailEl = document.getElementById('user-email');
    const badgeEl = document.getElementById('premium-badge');

    if (user.email) {
        if (authBtns) authBtns.style.display = 'none';
        if (userDisplay) userDisplay.style.display = 'flex';
        if (emailEl) emailEl.innerText = user.email;
        
        if (badgeEl) {
            const isAdmin = user.role === 'admin' || user.email === 'admin' || user.email === 'admin@gamersarena.store';
            if (isAdmin) {
                badgeEl.innerText = "⚡ SYSTEM ADMIN";
                badgeEl.style.cssText = "background:#00e5ff; color:#000; font-weight:900; padding:2px 8px; border-radius:4px; font-size:10px; display:inline-block;";
            } else if (user.is_premium) {
                badgeEl.innerText = "👑 SUBSCRIBED (" + (user.current_plan?.toUpperCase() || 'PREMIUM') + ")";
                badgeEl.style.background = "gold";
                badgeEl.style.color = "#000";
            } else {
                badgeEl.innerText = "❌ NOT SUBSCRIBED";
                badgeEl.style.background = "var(--accent-red)";
            }
        }
    } else {
        if (authBtns) authBtns.style.display = 'flex';
        if (userDisplay) userDisplay.style.display = 'none';
    }
}

function logout() {
    localStorage.removeItem('ga_user');
    window.location.href = '/';
}
