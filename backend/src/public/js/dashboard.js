document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  refreshData();

  document.getElementById('btn-refresh').addEventListener('click', () => {
    refreshData();
    showToast('Data refreshed');
  });

  document.getElementById('btn-simulate').addEventListener('click', async () => {
    const btn = document.getElementById('btn-simulate');
    btn.disabled = true;
    btn.textContent = 'Simulating...';

    try {
      const events = generateSampleEvents();
      const res = await fetch('/api/simulator/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events })
      });
      
      const data = await res.json();
      if (data.success) {
        showToast(`Success: ${data.data.message}`, 'success');
        // Give Kafka a second to process before refreshing
        setTimeout(refreshData, 1000);
      } else {
        showToast(`Error: ${data.error.message}`, 'error');
      }
    } catch (err) {
      showToast('Failed to simulate events', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Simulate Events';
    }
  });

  // Poll for updates every 10 seconds
  setInterval(refreshData, 10000);
});

async function checkHealth() {
  const statusEl = document.getElementById('system-status');
  const dotEl = statusEl.querySelector('.status-dot');
  
  try {
    const res = await fetch('/api/health');
    if (res.ok) {
      dotEl.className = 'status-dot ok';
      statusEl.innerHTML = `<span class="status-dot ok"></span> System Online (DB & Kafka OK)`;
    } else {
      dotEl.className = 'status-dot error';
      statusEl.innerHTML = `<span class="status-dot error"></span> System Degraded`;
    }
  } catch (err) {
    dotEl.className = 'status-dot error';
    statusEl.innerHTML = `<span class="status-dot error"></span> System Offline`;
  }
}

async function refreshData() {
  await Promise.all([
    fetchInventory(),
    fetchLedger()
  ]);
}

async function fetchInventory() {
  try {
    const res = await fetch('/api/inventory');
    if (res.status === 401) window.location.href = '/login';
    
    const data = await res.json();
    if (data.success) {
      renderInventory(data.data);
    }
  } catch (err) {
    console.error('Failed to fetch inventory:', err);
  }
}

let currentLedgerPage = 1;

async function fetchLedger(page = currentLedgerPage) {
  try {
    const res = await fetch(`/api/ledger?limit=15&page=${page}`);
    if (res.status === 401) window.location.href = '/login';
    
    const data = await res.json();
    if (data.success) {
      currentLedgerPage = data.data.page;
      renderLedger(data.data.entries);
      renderPagination(data.data.total, data.data.page, data.data.limit);
    }
  } catch (err) {
    console.error('Failed to fetch ledger:', err);
  }
}

window.changePage = function(newPage) {
  fetchLedger(newPage);
};

function renderPagination(total, page, limit) {
  const container = document.getElementById('ledger-pagination');
  if (!container) return;
  
  const totalPages = Math.ceil(total / limit);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  let html = `<div class="pagination">`;
  
  if (page > 1) {
    html += `<button class="btn btn-outline btn-sm" onclick="changePage(${page - 1})">Previous</button>`;
  } else {
    html += `<button class="btn btn-outline btn-sm" disabled>Previous</button>`;
  }
  
  html += `<span class="page-info">Page ${page} of ${totalPages}</span>`;
  
  if (page < totalPages) {
    html += `<button class="btn btn-outline btn-sm" onclick="changePage(${page + 1})">Next</button>`;
  } else {
    html += `<button class="btn btn-outline btn-sm" disabled>Next</button>`;
  }
  
  html += `</div>`;
  container.innerHTML = html;
}

function renderInventory(items) {
  const tbody = document.querySelector('#inventory-table tbody');
  
  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No inventory found. Simulate events to start.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    const qty = parseInt(item.current_quantity, 10);
    const cost = parseFloat(item.total_cost);
    const avg = qty > 0 ? (cost / qty) : 0;
    
    return `
      <tr>
        <td><strong>${item.product_id}</strong></td>
        <td>${qty}</td>
        <td>₹${cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td>₹${avg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');
}

function renderLedger(entries) {
  const tbody = document.querySelector('#ledger-table tbody');
  
  if (!entries || entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No transactions yet.</td></tr>';
    return;
  }

  tbody.innerHTML = entries.map(entry => {
    const date = new Date(entry.timestamp).toLocaleString();
    const qty = entry.quantity;
    const cost = entry.total_cost ? parseFloat(entry.total_cost) : 0;
    const typeClass = entry.event_type.toLowerCase();
    
    return `
      <tr>
        <td>${date}</td>
        <td><strong>${entry.product_id}</strong></td>
        <td><span class="badge ${typeClass}">${entry.event_type}</span></td>
        <td>${qty}</td>
        <td>₹${cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td><span class="badge ${entry.status}">${entry.status}</span></td>
      </tr>
    `;
  }).join('');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('notifications-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <button style="background:none;border:none;cursor:pointer;opacity:0.5;">&times;</button>
  `;
  
  toast.querySelector('button').onclick = () => {
    toast.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => toast.remove(), 300);
  };
  
  container.appendChild(toast);
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.style.animation = 'slideOut 0.3s forwards';
      setTimeout(() => toast.remove(), 300);
    }
  }, 3000);
}

function generateSampleEvents() {
  const now = Date.now();
  const ts = (offsetMinutes) => new Date(now + offsetMinutes * 60000).toISOString();
  const id = () => `evt_sim_${Math.random().toString(36).substr(2, 9)}`;

  return [
    { event_id: id(), product_id: 'PRD001', event_type: 'purchase', quantity: 100, unit_price: 100, timestamp: ts(0) },
    { event_id: id(), product_id: 'PRD001', event_type: 'purchase', quantity: 50, unit_price: 120, timestamp: ts(1) },
    { event_id: id(), product_id: 'PRD002', event_type: 'purchase', quantity: 200, unit_price: 50, timestamp: ts(2) },
    { event_id: id(), product_id: 'PRD001', event_type: 'sale', quantity: 80, timestamp: ts(3) },
    { event_id: id(), product_id: 'PRD001', event_type: 'sale', quantity: 40, timestamp: ts(4) },
    { event_id: id(), product_id: 'PRD002', event_type: 'purchase', quantity: 100, unit_price: 55, timestamp: ts(5) },
    { event_id: id(), product_id: 'PRD002', event_type: 'sale', quantity: 150, timestamp: ts(6) }
  ];
}
