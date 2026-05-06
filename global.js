// 1. SCROLL ANIMATIONS (Intersection Observer)
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show-scroll');
        }
    });
}, { threshold: 0.1 });

document.addEventListener('DOMContentLoaded', () => {
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

// 3. THE 1,000,000% UPGRADE: DRAGON FIRE PARTICLE ENGINE
const canvas = document.createElement('canvas');
canvas.id = 'dragon-canvas';
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const particles = [];
let mouse = { x: width/2, y: height/2 };
let isMoving = false;
let moveTimer;

window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    isMoving = true;
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => isMoving = false, 100);
});

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
}

let angle = 0;
function animateDragon() {
    ctx.clearRect(0, 0, width, height);
    
    // Create Dragon Tail following mouse
    if (isMoving) {
        for(let i=0; i<5; i++) {
            particles.push(new DragonParticle(mouse.x + (Math.random()*40-20), mouse.y + (Math.random()*40-20)));
        }
    } else {
        // Idle dragon swirling around screen center
        angle += 0.05;
        let dx = width/2 + Math.cos(angle) * 200;
        let dy = height/2 + Math.sin(angle * 2) * 100;
        particles.push(new DragonParticle(dx, dy));
        particles.push(new DragonParticle(dx + 20, dy + 20));
    }

    for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].life <= 0 || particles[i].size <= 0) {
            particles.splice(i, 1);
            i--;
        }
    }
    
    // Connect particles with dragon lightning lines
    ctx.globalCompositeOperation = 'lighter';
    for(let i=0; i<particles.length; i++) {
        for(let j=i; j<particles.length; j++) {
            let dx = particles[i].x - particles[j].x;
            let dy = particles[i].y - particles[j].y;
            let dist = Math.sqrt(dx*dx + dy*dy);
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
