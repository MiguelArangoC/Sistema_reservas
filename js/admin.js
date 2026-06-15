/*
  admin.js
  Logic for the admin dashboard (viewing schedule, metrics)
*/

document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('admin-date');
  const tbody = document.querySelector('#agenda-table tbody');
  const emptyState = document.getElementById('agenda-empty');
  const tableWrapper = document.getElementById('agenda-table');
  
  // Set today as default
  const tzoffset = (new Date()).getTimezoneOffset() * 60000;
  let currentDateStr = new Date(Date.now() - tzoffset).toISOString().split('T')[0];
  dateInput.value = currentDateStr;

  function renderDashboard() {
    const allBookings = window.MockDB.getBookings();
    
    // Stats
    const todayBookings = allBookings.filter(b => b.date === currentDateStr && b.status !== 'cancelled');
    const upcomingBookings = allBookings.filter(b => b.date > currentDateStr && b.status === 'confirmed');
    const cancelledBookings = allBookings.filter(b => b.status === 'cancelled');

    document.getElementById('stat-today').textContent = todayBookings.length;
    document.getElementById('stat-upcoming').textContent = upcomingBookings.length;
    document.getElementById('stat-cancelled').textContent = cancelledBookings.length;

    // Filter by date for table
    let dailyBookings = allBookings.filter(b => b.date === currentDateStr);
    
    // Sort by time
    dailyBookings.sort((a,b) => a.time.localeCompare(b.time));

    tbody.innerHTML = '';

    if (dailyBookings.length === 0) {
      tableWrapper.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    tableWrapper.style.display = 'table';
    emptyState.style.display = 'none';

    dailyBookings.forEach(b => {
      const srv = BUSINESS_CONFIG.services.find(s => s.id === b.serviceId);
      const staff = BUSINESS_CONFIG.staff.find(s => s.id === b.staffId);
      
      const srvName = srv ? srv.name : 'Desconocido';
      const staffName = staff ? staff.name : 'Cualquiera';

      let badgeClass = 'badge-primary';
      let statusText = 'Confirmada';
      if (b.status === 'cancelled') { badgeClass = 'badge-error'; statusText = 'Cancelada'; }
      if (b.status === 'pending') { badgeClass = 'badge-warning'; statusText = 'Pendiente'; }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; color: var(--text-primary);">${b.time}</td>
        <td>
          <div style="font-weight: 500;">${b.client.name}</div>
          <div class="text-xs text-muted">${b.client.phone}</div>
        </td>
        <td>${srvName}</td>
        <td>${staffName}</td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="viewDetails('${b.id}')">Ver</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Date change
  dateInput.addEventListener('change', (e) => {
    currentDateStr = e.target.value;
    renderDashboard();
  });

  // Modal logic
  window.viewDetails = function(id) {
    const b = window.MockDB.getBookings().find(x => x.id === id);
    if(!b) return;

    const srv = BUSINESS_CONFIG.services.find(s => s.id === b.serviceId);
    
    const content = document.getElementById('modal-content');
    content.innerHTML = `
      <div style="display: flex; justify-content: space-between;">
        <span class="text-muted">ID: ${b.id}</span>
        <span class="badge badge-primary">${b.status}</span>
      </div>
      <div class="divider" style="margin: 0;"></div>
      <div><strong>Cliente:</strong> ${b.client.name}</div>
      <div><strong>Teléfono:</strong> <a href="tel:${b.client.phone}" style="color: var(--primary);">${b.client.phone}</a></div>
      <div><strong>Email:</strong> ${b.client.email}</div>
      ${b.client.notes ? `<div style="background: var(--bg-input); padding: 8px; border-radius: 6px;"><strong>Notas:</strong> ${b.client.notes}</div>` : ''}
      <div class="divider" style="margin: 0;"></div>
      <div><strong>Servicio:</strong> ${srv ? srv.name : ''}</div>
      <div><strong>Fecha:</strong> ${b.date} a las ${b.time}</div>
      
      ${b.status !== 'cancelled' ? `
        <div style="margin-top: 16px;">
          <button class="btn btn-danger w-full" onclick="cancelFromAdmin('${b.id}')">Cancelar Reserva</button>
        </div>
      ` : ''}
    `;

    document.getElementById('detail-modal').style.display = 'flex';
  };

  window.closeModal = function() {
    document.getElementById('detail-modal').style.display = 'none';
  };

  window.cancelFromAdmin = function(id) {
    if(confirm('¿Cancelar reserva permanentemente?')) {
      const db = JSON.parse(localStorage.getItem('reservas_mock_db'));
      const idx = db.bookings.findIndex(b => b.id === id);
      if (idx > -1) {
        db.bookings[idx].status = 'cancelled';
        localStorage.setItem('reservas_mock_db', JSON.stringify(db));
        closeModal();
        renderDashboard();
        window.showToast('Reserva cancelada');
      }
    }
  };

  // Initial render
  renderDashboard();
});
