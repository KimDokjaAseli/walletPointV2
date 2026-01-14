document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Fetch User Profile
        const response = await API.getProfile();
        const user = response.data;

        // Update UI with User Info
        updateUserProfile(user);

        // Render Navigation based on Role
        renderNavigation(user.role);

        // Render Dashboard Content
        renderDashboard(user);

    } catch (error) {
        console.error('Dashboard Init Error:', error);
        // If profile fetch fails heavily, might redirect to login (handled in API.getProfile)
    }
});

function updateUserProfile(user) {
    document.getElementById('userName').textContent = user.full_name || user.email;
    document.getElementById('userRole').textContent = user.role;
    document.getElementById('userAvatar').textContent = (user.full_name || user.email).charAt(0).toUpperCase();
}

function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function closeModal(e) {
    if (e && e.target.className !== 'modal-overlay' && e.target.type !== 'button') return;
    const modal = document.querySelector('.modal-overlay');
    if (modal) modal.remove();
}

function renderNavigation(role) {
    const nav = document.getElementById('sidebarNav');
    let items = [];

    // Common Items
    items.push({ label: 'Overview', href: '#dashboard', active: true });

    if (role === 'admin') {
        items.push(
            { label: 'Users', href: '#users' },
            { label: 'Wallets', href: '#wallets' },
            { label: 'Transactions', href: '#transactions' },
            { label: 'P2P Transfers', href: '#admin-transfers' },
            { label: 'Marketplace', href: '#products' },
            { label: 'Sales History', href: '#admin-sales' },
            { label: 'Audit Logs', href: '#audit-logs' }
        );
    } else if (role === 'dosen') {
        items.push(
            { label: 'My Quizzes', href: '#quizzes' },
            { label: 'My Missions', href: '#missions' },
            { label: 'Submissions', href: '#submissions' }
        );
    } else if (role === 'mahasiswa') {
        items.push(
            { label: 'Discovery Hub', href: '#missions' },
            { label: 'Rewards Store', href: '#shop' },
            { label: 'Peer Transfer', href: '#transfer' },
            { label: 'Leaderboard', href: '#leaderboard' },
            { label: 'My Ledger', href: '#history' }
        );
    }

    items.push({ label: 'Settings', href: '#profile' });

    nav.innerHTML = items.map(item => `
        <a href="${item.href}" class="nav-item ${item.active ? 'active' : ''}" data-target="${item.href.substring(1)}">
            ${item.label}
        </a>
    `).join('');

    // Add click listeners
    nav.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            nav.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            handleNavigation(link.dataset.target, role);
        });
    });
}

function handleNavigation(target, role) {
    const title = document.getElementById('pageTitle');
    title.textContent = target.charAt(0).toUpperCase() + target.slice(1).replace('-', ' ');

    if (role === 'admin') {
        switch (target) {
            case 'users':
                AdminController.renderUsers();
                break;
            case 'wallets':
                AdminController.renderWallets();
                break;
            case 'transactions':
                AdminController.renderTransactions();
                break;
            case 'admin-transfers':
                AdminController.renderTransfers();
                break;
            case 'products':
                AdminController.renderProducts();
                break;
            case 'admin-sales':
                AdminController.renderMarketplaceSales();
                break;
            case 'audit-logs':
                AdminController.renderAuditLogs();
                break;
            case 'profile':
                ProfileController.renderProfile();
                break;
            default:
                renderDashboard({ role: 'admin' });
                title.textContent = 'Admin Overview';
                AdminController.loadDashboardStats();
        }
    } else if (role === 'dosen') {
        switch (target) {
            case 'quizzes':
                DosenController.renderQuizzes();
                break;
            case 'missions':
                DosenController.renderMissions();
                break;
            case 'submissions':
                DosenController.renderSubmissions();
                break;
            case 'profile':
                ProfileController.renderProfile();
                break;
            default:
                renderDashboard({ role: 'dosen' });
                title.textContent = 'Dosen Overview';
        }
    } else if (role === 'mahasiswa') {
        switch (target) {
            case 'missions':
                MahasiswaController.renderMissions();
                break;
            case 'shop':
                MahasiswaController.renderShop();
                break;
            case 'transfer':
                MahasiswaController.renderTransfer();
                break;
            case 'leaderboard':
                MahasiswaController.renderLeaderboard();
                break;
            case 'history':
                MahasiswaController.renderLedger();
                break;
            case 'profile':
                ProfileController.renderProfile();
                break;
            default:
                renderDashboard({ role: 'mahasiswa' });
                title.textContent = 'Mahasiswa Overview';
        }
    }
}

function renderDashboard(user) {
    const content = document.getElementById('mainContent');
    const title = document.getElementById('pageTitle');

    title.textContent = `${user.role.charAt(0).toUpperCase() + user.role.slice(1)} Overview`;

    if (user.role === 'admin') {
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card card-gradient-1">
                    <span class="stat-label">System Users</span>
                    <div class="stat-value" id="stats-users">--</div>
                    <div class="stat-trend" style="color: var(--primary)">Total Registered</div>
                </div>
                <div class="stat-card card-gradient-2">
                    <span class="stat-label">Total Transactions</span>
                    <div class="stat-value" id="stats-txns">--</div>
                    <div class="stat-trend" style="color: var(--secondary)">All Time Events</div>
                </div>
                <div class="stat-card card-gradient-3">
                    <span class="stat-label">API Status</span>
                    <div class="stat-value" style="color: var(--success); font-size: 1.5rem; margin-top: 0.5rem;">HEALTY</div>
                    <div class="stat-trend">Connection Stable</div>
                </div>
            </div>
            
            <div class="table-wrapper">
                <div class="table-header">
                    <h3>Quick Access</h3>
                </div>
                <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
                    <p>Welcome to the premium admin panel. Use the sidebar to navigate between modules.</p>
                </div>
            </div>
        `;
        AdminController.loadDashboardStats();
    } else if (user.role === 'dosen') {
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card card-gradient-1">
                    <span class="stat-label">My Missions</span>
                    <div class="stat-value" id="stats-missions">--</div>
                    <div class="stat-trend" style="color: var(--primary)">Total Created</div>
                </div>
                <div class="stat-card card-gradient-2">
                    <span class="stat-label">Pending Reviews</span>
                    <div class="stat-value" id="stats-pending">--</div>
                    <div class="stat-trend" style="color: var(--secondary)">Action Required</div>
                </div>
                <div class="stat-card card-gradient-3">
                    <span class="stat-label">Validated Tasks</span>
                    <div class="stat-value" id="stats-validated">--</div>
                    <div class="stat-trend" style="color: var(--success)">Approved by Me</div>
                </div>
            </div>
            
            <div class="table-wrapper">
                <div class="table-header">
                    <h3>Dosen Dashboard</h3>
                </div>
                <div style="padding: 2.5rem; text-align: center; color: var(--text-muted);">
                    <p>Welcome, Pak/Bu. You can manage your missions and review student submissions using the sidebar.</p>
                </div>
            </div>
        `;
        DosenController.loadDosenStats();
    } else {
        content.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card card-gradient-1">
                    <span class="stat-label">Emerald Balance</span>
                    <div class="stat-value" id="userBalance">--</div>
                    <div class="stat-trend" style="color:var(--primary)">Available to spend</div>
                </div>
                <div class="stat-card card-gradient-2">
                    <span class="stat-label">Completed Missions</span>
                    <div class="stat-value" id="stats-missions-done">--</div>
                    <div class="stat-trend" style="color:var(--secondary)">Points Earned</div>
                </div>
                <div class="stat-card card-gradient-3">
                    <span class="stat-label">Discovery Hub</span>
                    <div class="stat-value" id="stats-active-missions">--</div>
                    <div class="stat-trend" style="color:var(--success)">Available Tasks</div>
                </div>
            </div>

            <div class="card fade-in" style="margin-top: 2rem; padding: 2.5rem; text-align: center; background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(168, 85, 247, 0.05)); border: 1px dashed var(--primary-light);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">👋</div>
                <h2 style="font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">Welcome back, ${user.full_name || 'Student'}!</h2>
                <p style="color: var(--text-muted); max-width: 500px; margin: 0 auto;">Ready to climb the leaderboard? Head over to the Discovery Hub to find new missions and earn more points for rewards.</p>
                <button class="btn btn-primary" style="margin-top: 1.5rem; border-radius: 20px;" onclick="handleNavigation('missions', 'mahasiswa')">Explore Missions</button>
            </div>
        `;
        // Load student stats via API
        loadStudentStats();
    }
}

async function loadStudentStats() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const wallet = await API.getWallet(user.id);
        const missions = await API.getMissions();
        const submissions = await API.getSubmissions({ status: 'approved' });

        document.getElementById('userBalance').textContent = wallet.data.balance.toLocaleString();
        document.getElementById('stats-missions-done').textContent = (submissions.data.submissions || []).filter(s => s.user_id === user.id).length;
        document.getElementById('stats-active-missions').textContent = (missions.data.missions || []).length;
    } catch (e) { console.error(e); }
}
