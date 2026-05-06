function setupAdminTap() {
    let tapCount = 0;
    let tapTimer;
    const logo = document.getElementById('ga-logo');
    
    if(!logo) return;

    logo.addEventListener('click', (e) => {
        e.preventDefault();
        tapCount++;
        clearTimeout(tapTimer);
        
        if (tapCount >= 5) {
            tapCount = 0;
            document.getElementById('admin-modal-overlay').classList.add('active');
        } else {
            tapTimer = setTimeout(() => { tapCount = 0; }, 2000); // Reset after 2s of inactivity
        }
    });
}

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

// Global UI Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupAdminTap();
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
