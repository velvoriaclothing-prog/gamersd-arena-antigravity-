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
    if (document.getElementById('admin-id').value === 'admin' && document.getElementById('admin-pass').value === 'aditi0110') { 
        window.location.href = 'admin.html';
    } else {
        alert('ACCESS DENIED: Invalid Admin Credentials.');
    }
}


class DragonParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 2;
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 4 - 2;
        this.life = 1;
        this.decay = Math.random() * 0.02 + 0.01;
        this.hue = Math.random() * 40 > 20 ? 190 : 340; // Cyan (190) and Pink/Red (340)
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.2;
    }
    update() {
        this.x += this.speedX + Math.sin(this.angle) * 2;
        this.y += this.speedY + Math.cos(this.angle) * 2;
        this.angle += this.spin;
        this.life -= this.decay;
        this.size -= 0.1;
    }
    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size > 0 ? this.size : 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 100%, 50%, ${this.life})`;
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsla(${this.hue}, 100%, 50%, ${this.life})`;
        ctx.fill();
        ctx.restore();
    }
            if(dist < 50) {
                ctx.beginPath();
                ctx.strokeStyle = `rgba(0, 229, 255, ${0.2 - dist/250})`;
                ctx.lineWidth = 1;
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
            }
        }
    }
    
    requestAnimationFrame(animateDragon);
}
animateDragon();

// 4. DYNAMIC CONTENT LOADING & LIVE EDITOR (Elementor-like feature)
let siteContent = {};
async function loadDynamicContent() {
    try {
        const r = await fetch('/api/content');
        const data = await r.json();
        if (data.success) {
            siteContent = data.content;
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
                            el.style.cursor = "text";
                        }
                    }
                });
            }

            if (isEditMode) showEditBar(pageName);
        }
    } catch (e) { console.warn("Content system offline", e); }
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
    els.forEach(el => {
        const key = el.getAttribute('data-content');
        siteContent[pageName][key] = el.innerText;
    });

    const res = await fetch('/api/content', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ id: 'admin', pass: 'aditi0110', content: siteContent })
    });
    
    if ((await res.json()).success) {
        alert("Changes saved LIVE successfully!");
        window.location.search = ""; // Exit edit mode
    }
}

document.addEventListener('DOMContentLoaded', loadDynamicContent);
