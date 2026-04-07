const API_BASE = 'http://localhost:3000';

async function fetchData(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) options.body = JSON.stringify(body);
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        showToast('API Connection Error', 'danger');
        return null;
    }
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

async function refreshStats() {
    const stats = await fetchData('/admin/stats');
    if (stats) {
        document.getElementById('stat-users').textContent = stats.totalUsers || 0;
        document.getElementById('stat-ledgers').textContent = stats.ledgerCount || 0;
    }
}

async function loadUsers() {
    const users = await fetchData('/admin/users');
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = '';
    
    if (users && Array.isArray(users)) {
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.account_id}</td>
                <td>${user.balance.toFixed(2)}</td>
                <td>${user.currency}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function loadLedgers() {
    const ledgers = await fetchData('/admin/ledgers');
    const tbody = document.querySelector('#ledger-table tbody');
    tbody.innerHTML = '';
    
    if (ledgers && Array.isArray(ledgers)) {
        ledgers.forEach(entry => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(entry.timestamp).toLocaleTimeString()}</td>
                <td>${entry.account_id}</td>
                <td>${entry.type}</td>
                <td>${entry.amount.toFixed(2)} ${entry.currency}</td>
                <td title="${entry.current_hash}">${entry.current_hash.substring(0, 8)}...</td>
                <td><span class="status-badge status-${entry.status}">${entry.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Event Listeners
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.content-pane').forEach(p => p.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
        
        if (btn.dataset.tab === 'users') loadUsers();
        if (btn.dataset.tab === 'ledger') loadLedgers();
    });
});

document.getElementById('btn-refresh').addEventListener('click', () => {
    refreshStats();
    if (document.querySelector('.tab-btn[data-tab="users"]').classList.contains('active')) loadUsers();
    else loadLedgers();
    showToast('Data refreshed');
});

document.getElementById('btn-seed').addEventListener('click', async () => {
    if (confirm('Are you sure? This will delete all users and seed 1000 new ones.')) {
        const res = await fetchData('/admin/seed-users', 'POST');
        if (res) {
            showToast('1000 users seeded');
            refreshStats();
            loadUsers();
        }
    }
});

document.getElementById('btn-refund').addEventListener('click', async () => {
    showToast('Checking for refunds...');
    const res = await fetchData('/admin/run-refunds', 'POST');
    if (res && res.processed) {
        const count = res.processed.filter(r => r.action === 'refunded').length;
        showToast(`Processed ${res.processed.length} IDs, ${count} refunded`);
        refreshStats();
        loadUsers();
        loadLedgers();
    }
});

document.getElementById('btn-reset-ledger').addEventListener('click', async () => {
    if (confirm('Are you sure? This will permanently delete all ledger entries.')) {
        const res = await fetchData('/admin/reset-ledger', 'POST');
        if (res) {
            showToast('Ledger cleared');
            refreshStats();
            loadLedgers();
        }
    }
});

// Initial Load
refreshStats();
loadUsers();
