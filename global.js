// 1. Mouse Glow Effect
const glow = document.createElement('div');
glow.className = 'mouse-glow';
document.body.appendChild(glow);

window.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
});

// 2. Scroll Animations (Intersection Observer)
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

// 3. Admin Access: 5-Tap Logic
let tapCount = 0;
let tapTimer;
document.addEventListener('click', (e) => {
    if (e.target.closest('#ga-logo')) {
        tapCount++;
        clearTimeout(tapTimer);
        if (tapCount >= 5) {
            e.preventDefault(); // Stop navigation on the 5th tap
            tapCount = 0;
            document.getElementById('admin-modal-overlay').classList.add('active');
        } else {
            tapTimer = setTimeout(() => { tapCount = 0; }, 2000); 
        }
    }
});

// 4. Admin Access: Secret Keyboard Code "admin"
let secretCode = '';
window.addEventListener('keydown', (e) => {
    secretCode += e.key.toLowerCase();
    if (secretCode.includes('admin')) {
        document.getElementById('admin-modal-overlay').classList.add('active');
        secretCode = '';
    }
    if (secretCode.length > 10) secretCode = secretCode.slice(-10);
});

// Admin Modal HTML injection for all pages
const modalHTML = `
<div class="modal-overlay" id="admin-modal-overlay">
    <div class="admin-modal">
        <h2 style="margin-bottom: 0.5rem; text-transform: uppercase; font-weight: 900; letter-spacing: 2px;">System Override</h2>
        <p style="color: #8b9bb4; margin-bottom: 2rem; font-size: 0.9rem;">Enter security credentials to access Admin Panel.</p>
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

function closeAdminModal() {
    document.getElementById('admin-modal-overlay').classList.remove('active');
}

function loginAdmin(e) {
    e.preventDefault();
    const id = document.getElementById('admin-id').value;
    const pass = document.getElementById('admin-pass').value;
    
    // Frontend redirect, strictly checking credentials
    if (id === 'admin' && pass === 'aditi0110') { 
        window.location.href = 'admin.html';
    } else {
        alert('ACCESS DENIED: Invalid Admin Credentials.');
    }
}

