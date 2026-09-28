/**
 * ParkSmart – Complete Vanilla JS Single Page CRUD Application
 * Communicates ONLY with Spring Boot REST Backend on http://localhost:8080
 */

// ==================== CONFIG & STATE ====================
const API_BASE = ''; // Relative path, same host & port (http://localhost:8080)

const state = {
  lots: [],
  slots: [],
  bookings: [],
  checkinouts: [],
  bills: [],
  activeView: 'dashboard',
  checkinTab: 'active', // 'pending', 'active', 'history'
  pendingDeleteAction: null
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupEventListeners();
  setupLiveClock();
  loadAllData();

  // Periodic poll to keep telemetry fresh every 30 seconds
  setInterval(() => {
    loadAllData(true);
  }, 30000);
});

// ==================== NAVIGATION ====================
function setupNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetView = item.getAttribute('data-view');
      navigateTo(targetView);
    });
  });

  // Mobile drawer controls
  const mobileBtn = document.getElementById('mobileMenuBtn');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const sidebar = document.getElementById('sidebar');

  if (mobileBtn) {
    mobileBtn.addEventListener('click', () => sidebar.classList.add('open'));
  }
  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => sidebar.classList.remove('open'));
  }

  // Quick Action in Topbar
  document.getElementById('btnQuickBooking')?.addEventListener('click', () => {
    openBookingModal();
  });

  // Global Sync Button
  document.getElementById('btnGlobalRefresh')?.addEventListener('click', () => {
    const btn = document.getElementById('btnGlobalRefresh');
    btn.classList.add('loading');
    loadAllData().finally(() => {
      setTimeout(() => btn.classList.remove('loading'), 400);
    });
  });

  // Presentation Mode Toggle
  document.getElementById('btnPresentationMode')?.addEventListener('click', () => {
    togglePresentationMode(true);
  });
  document.getElementById('btnClosePresentation')?.addEventListener('click', () => {
    togglePresentationMode(false);
  });

  // Handle URL hash changes
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash, false);
  });

  if (window.location.hash) {
    navigateTo(window.location.hash.replace('#', ''), false);
  }
}

function navigateTo(viewId, updateHash = true) {
  state.activeView = viewId;
  if (updateHash) {
    window.location.hash = viewId;
  }

  // Update Nav links
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    if (item.getAttribute('data-view') === viewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update View sections
  document.querySelectorAll('.view-section').forEach(section => {
    section.classList.remove('active');
  });

  const targetSection = document.getElementById(`view-${viewId}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Close mobile sidebar if open
  document.getElementById('sidebar')?.classList.remove('open');

  // Update header titles
  updatePageTitles(viewId);

  // Render view-specific content
  renderActiveView();
}

function updatePageTitles(viewId) {
  const titleMap = {
    dashboard: { title: 'Dashboard Overview', sub: 'Real-time parking analytics and system telemetry' },
    map: { title: 'Live Parking Map', sub: 'Visual bay management, status tracking, and bay assignments' },
    lots: { title: 'Parking Lots Management', sub: 'Configure facilities, capacity, and geographical locations' },
    slots: { title: 'Parking Slots Management', sub: 'Configure individual bays, vehicle types, and states' },
    bookings: { title: 'Reservations & Bookings', sub: 'Manage customer bookings, schedules, and active reservations' },
    checkinout: { title: 'Check-In & Check-Out Operations', sub: 'Vehicle arrival check-in and checkout billing integration' },
    billing: { title: 'Billing & Invoice Ledger', sub: 'MySQL-persisted parking bills, rate audits, and payment settlement' },
    overstay: { title: 'Overstay Monitoring & Alerts', sub: 'Real-time vehicle overstay duration and penalty tracking' },
    settings: { title: 'System Pricing & Architecture', sub: 'Spring Boot backend rate rules and MySQL telemetry' }
  };

  const meta = titleMap[viewId] || titleMap.dashboard;
  document.getElementById('pageTitle').textContent = meta.title;
  document.getElementById('pageSubtitle').textContent = meta.sub;
}

function setupLiveClock() {
  const clockEl = document.getElementById('liveClock');
  const presClockEl = document.getElementById('presClock');

  function tick() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: true });
    if (clockEl) clockEl.textContent = timeStr;
    if (presClockEl) presClockEl.textContent = timeStr;
  }
  tick();
  setInterval(tick, 1000);
}

// ==================== EVENT LISTENERS (SEARCH/FORMS) ====================
function setupEventListeners() {
  // Parking Lot Form Submit
  document.getElementById('formLot')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveParkingLot();
  });
  document.getElementById('btnOpenCreateLot')?.addEventListener('click', () => {
    openLotModal();
  });

  // Parking Slot Form Submit
  document.getElementById('formSlot')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSlot();
  });
  document.getElementById('btnOpenCreateSlot')?.addEventListener('click', () => {
    openSlotModal();
  });

  // Booking Form Submit
  document.getElementById('formBooking')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveBooking();
  });
  document.getElementById('btnOpenCreateBooking')?.addEventListener('click', () => {
    openBookingModal();
  });

  // Dynamic slot dropdown filter in Booking Modal
  document.getElementById('bookingLotSelect')?.addEventListener('change', (e) => {
    populateBookingSlotSelect(e.target.value);
  });

  // Delete Confirmation Button
  document.getElementById('btnConfirmDelete')?.addEventListener('click', () => {
    if (typeof state.pendingDeleteAction === 'function') {
      state.pendingDeleteAction();
    }
  });

  // Invoice Actions
  document.getElementById('btnPrintInvoice')?.addEventListener('click', () => {
    window.print();
  });

  // Search & Filter Inputs
  document.getElementById('searchLots')?.addEventListener('input', () => renderParkingLotsTable());
  document.getElementById('searchSlots')?.addEventListener('input', () => renderSlotsTable());
  document.getElementById('filterSlotStatus')?.addEventListener('change', () => renderSlotsTable());
  document.getElementById('filterSlotLot')?.addEventListener('change', () => renderSlotsTable());
  document.getElementById('mapLotFilter')?.addEventListener('change', () => renderParkingMap());
  document.getElementById('searchBookings')?.addEventListener('input', () => renderBookingsTable());
  document.getElementById('filterBookingStatus')?.addEventListener('change', () => renderBookingsTable());
  document.getElementById('searchBills')?.addEventListener('input', () => renderBillsTable());
  document.getElementById('filterBillPaymentStatus')?.addEventListener('change', () => renderBillsTable());
}

// ==================== CORE API FETCH PIPELINE ====================
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    });

    // Check server status indicator
    setServerStatus(true);

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { message: res.statusText || `Request failed with status ${res.status}` };
      }
      const errorMsg = errorData.message || (errorData.errors ? Object.values(errorData.errors).join(', ') : 'Operation failed');
      throw new Error(errorMsg);
    }

    if (res.status === 204) {
      return null;
    }
    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      setServerStatus(false);
      throw new Error('Backend server is not running on port 8080.');
    }
    throw err;
  }
}

function setServerStatus(isOnline) {
  const dot = document.getElementById('serverStatusDot');
  const txt = document.getElementById('serverStatusText');
  if (dot && txt) {
    if (isOnline) {
      dot.className = 'status-indicator online';
      txt.textContent = 'Backend Online (Port 8080)';
    } else {
      dot.className = 'status-indicator';
      txt.textContent = 'Backend Offline';
    }
  }
}

// ==================== DATA LOADER ====================
async function loadAllData(silent = false) {
  try {
    const [lots, slots, bookings, checkinouts, bills] = await Promise.all([
      apiRequest('/api/parking-lots').catch(() => []),
      apiRequest('/api/slots').catch(() => []),
      apiRequest('/api/bookings').catch(() => []),
      apiRequest('/api/checkinout').catch(() => []),
      apiRequest('/api/bills').catch(() => [])
    ]);

    state.lots = Array.isArray(lots) ? lots : [];
    state.slots = Array.isArray(slots) ? slots : [];
    state.bookings = Array.isArray(bookings) ? bookings : [];
    state.checkinouts = Array.isArray(checkinouts) ? checkinouts : [];
    state.bills = Array.isArray(bills) ? bills : [];

    // Populate Lot Select Dropdowns
    populateLotDropdowns();

    // Update Dashboard Metrics & Active Views
    renderDashboard();
    renderActiveView();

    if (!silent) {
      // Data loaded cleanly
    }
  } catch (err) {
    console.error('Failed to load application data:', err);
    if (!silent) {
      showToast(err.message, 'danger');
    }
  }
}

function populateLotDropdowns() {
  const mapLotFilter = document.getElementById('mapLotFilter');
  const filterSlotLot = document.getElementById('filterSlotLot');
  const slotLotSelect = document.getElementById('slotLotSelect');
  const bookingLotSelect = document.getElementById('bookingLotSelect');

  const selectedMapLot = mapLotFilter?.value || 'ALL';
  const selectedSlotFilterLot = filterSlotLot?.value || 'ALL';

  const optionsHtml = state.lots.map(l => `<option value="${l.id}">${escapeHtml(l.name)} (${escapeHtml(l.location)})</option>`).join('');

  if (mapLotFilter) {
    mapLotFilter.innerHTML = `<option value="ALL">All Parking Lots</option>${optionsHtml}`;
    mapLotFilter.value = selectedMapLot;
  }
  if (filterSlotLot) {
    filterSlotLot.innerHTML = `<option value="ALL">All Lots</option>${optionsHtml}`;
    filterSlotLot.value = selectedSlotFilterLot;
  }
  if (slotLotSelect) {
    slotLotSelect.innerHTML = `<option value="">Select a parking lot...</option>${optionsHtml}`;
  }
  if (bookingLotSelect) {
    bookingLotSelect.innerHTML = `<option value="">Select a parking lot...</option>${optionsHtml}`;
  }
}

function renderActiveView() {
  switch (state.activeView) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'map':
      renderParkingMap();
      break;
    case 'lots':
      renderParkingLotsTable();
      break;
    case 'slots':
      renderSlotsTable();
      break;
    case 'bookings':
      renderBookingsTable();
      break;
    case 'checkinout':
      renderCheckinoutTable();
      break;
    case 'billing':
      renderBillsTable();
      break;
    case 'overstay':
      renderOverstayTable();
      break;
  }
}

// ==================== 1. PARKING LOT CRUD ====================
async function loadParkingLots() {
  state.lots = await apiRequest('/api/parking-lots');
  populateLotDropdowns();
  renderParkingLotsTable();
  renderDashboard();
}

function renderParkingLotsTable() {
  const tbody = document.getElementById('lotsTableBody');
  if (!tbody) return;

  const searchTerm = (document.getElementById('searchLots')?.value || '').toLowerCase().trim();

  let filtered = state.lots.filter(l => {
    return l.name.toLowerCase().includes(searchTerm) || l.location.toLowerCase().includes(searchTerm);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No parking lots found matching criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(lot => {
    const lotSlots = state.slots.filter(s => s.parkingLot && s.parkingLot.id === lot.id);
    const availableSlots = lotSlots.filter(s => s.status === 'AVAILABLE').length;
    const occupiedSlots = lotSlots.filter(s => s.status === 'OCCUPIED').length;

    return `
      <tr>
        <td><strong>#${lot.id}</strong></td>
        <td><strong>${escapeHtml(lot.name)}</strong></td>
        <td>${escapeHtml(lot.location)}</td>
        <td>${lot.totalSlots} slots</td>
        <td>
          <span class="badge badge-available">${availableSlots} Free</span>
          <span class="badge badge-occupied">${occupiedSlots} Occ</span>
          <small class="text-muted">(${lotSlots.length} configured)</small>
        </td>
        <td><span class="badge badge-completed">ACTIVE</span></td>
        <td class="text-right">
          <div class="action-btn-group">
            <button class="btn btn-outline btn-xs" onclick="viewParkingLot(${lot.id})" title="View Details">View</button>
            <button class="btn btn-secondary btn-xs" onclick="openLotModal(${lot.id})" title="Edit Lot">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="confirmDeleteLot(${lot.id}, '${escapeHtml(lot.name)}')" title="Delete Lot">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openLotModal(lotId = null) {
  const modal = document.getElementById('modalLot');
  const title = document.getElementById('modalLotTitle');
  const idInput = document.getElementById('lotId');
  const nameInput = document.getElementById('lotName');
  const locInput = document.getElementById('lotLocation');
  const capInput = document.getElementById('lotCapacity');

  if (lotId) {
    const lot = state.lots.find(l => l.id === lotId);
    if (!lot) return;
    title.textContent = 'Edit Parking Lot';
    idInput.value = lot.id;
    nameInput.value = lot.name;
    locInput.value = lot.location;
    capInput.value = lot.totalSlots;
  } else {
    title.textContent = 'Add Parking Lot';
    idInput.value = '';
    nameInput.value = '';
    locInput.value = '';
    capInput.value = '';
  }
  openModal('modalLot');
}

async function saveParkingLot() {
  const btn = document.getElementById('btnSubmitLot');
  const id = document.getElementById('lotId').value;
  const name = document.getElementById('lotName').value.trim();
  const location = document.getElementById('lotLocation').value.trim();
  const totalSlots = parseInt(document.getElementById('lotCapacity').value, 10);

  if (!name || !location || isNaN(totalSlots) || totalSlots <= 0) {
    showToast('Please provide valid lot name, location, and capacity.', 'warning');
    return;
  }

  const payload = { name, location, totalSlots };
  setBtnLoading(btn, true, id ? 'Updating...' : 'Creating...');

  try {
    if (id) {
      await apiRequest(`/api/parking-lots/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Parking lot updated successfully.', 'success');
    } else {
      await apiRequest('/api/parking-lots', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Parking lot created successfully.', 'success');
    }
    closeModal('modalLot');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setBtnLoading(btn, false, id ? 'Update Parking Lot' : 'Save Parking Lot');
  }
}

function confirmDeleteLot(id, name) {
  const lotSlots = state.slots.filter(s => s.parkingLot && s.parkingLot.id === id);
  const occupiedSlots = lotSlots.filter(s => s.status === 'OCCUPIED');

  if (occupiedSlots.length > 0) {
    showToast(`Cannot delete "${name}" because it contains occupied slots. Check out vehicles first.`, 'warning');
    return;
  }

  document.getElementById('deletePromptMessage').innerHTML = `
    Are you sure you want to delete parking lot <strong>"${escapeHtml(name)}"</strong> (#${id})?
    ${lotSlots.length > 0 ? `<br><small class="text-danger">Warning: ${lotSlots.length} associated slot(s) may prevent deletion.</small>` : ''}
  `;

  state.pendingDeleteAction = async () => {
    const btn = document.getElementById('btnConfirmDelete');
    setBtnLoading(btn, true, 'Deleting...');
    try {
      await apiRequest(`/api/parking-lots/${id}`, { method: 'DELETE' });
      showToast('Record deleted successfully.', 'success');
      closeModal('modalDelete');
      await loadAllData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBtnLoading(btn, false, 'Delete Record');
    }
  };

  openModal('modalDelete');
}

function viewParkingLot(id) {
  const lot = state.lots.find(l => l.id === id);
  if (!lot) return;
  const lotSlots = state.slots.filter(s => s.parkingLot && s.parkingLot.id === id);
  const availableSlots = lotSlots.filter(s => s.status === 'AVAILABLE').length;
  const occupiedSlots = lotSlots.filter(s => s.status === 'OCCUPIED').length;

  showInspectorModal(`Facility Details: ${lot.name}`, `
    <div class="telemetry-list">
      <div class="telemetry-item"><span class="t-label">Lot ID:</span><span class="t-value">#${lot.id}</span></div>
      <div class="telemetry-item"><span class="t-label">Location:</span><span class="t-value">${escapeHtml(lot.location)}</span></div>
      <div class="telemetry-item"><span class="t-label">Design Capacity:</span><span class="t-value">${lot.totalSlots} Slots</span></div>
      <div class="telemetry-item"><span class="t-label">Configured Bays:</span><span class="t-value">${lotSlots.length}</span></div>
      <div class="telemetry-item"><span class="t-label">Available Now:</span><span class="t-value text-success">${availableSlots} Free</span></div>
      <div class="telemetry-item"><span class="t-label">Occupied Now:</span><span class="t-value text-danger">${occupiedSlots} Parked</span></div>
    </div>
  `);
}

// ==================== 2. PARKING SLOT CRUD ====================
async function loadSlots() {
  state.slots = await apiRequest('/api/slots');
  renderSlotsTable();
  renderParkingMap();
  renderDashboard();
}

function renderSlotsTable() {
  const tbody = document.getElementById('slotsTableBody');
  if (!tbody) return;

  const searchTerm = (document.getElementById('searchSlots')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filterSlotStatus')?.value || 'ALL';
  const lotFilter = document.getElementById('filterSlotLot')?.value || 'ALL';

  let filtered = state.slots.filter(s => {
    const matchesSearch = s.slotNumber.toLowerCase().includes(searchTerm) || (s.vehicleType && s.vehicleType.toLowerCase().includes(searchTerm));
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesLot = lotFilter === 'ALL' || (s.parkingLot && s.parkingLot.id === parseInt(lotFilter, 10));
    return matchesSearch && matchesStatus && matchesLot;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No parking slots found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(slot => {
    const lotName = slot.parkingLot ? slot.parkingLot.name : 'Unassigned';
    return `
      <tr>
        <td><strong>#${slot.id}</strong></td>
        <td><strong class="font-mono">${escapeHtml(slot.slotNumber)}</strong></td>
        <td>${escapeHtml(lotName)}</td>
        <td><span class="badge badge-info">${escapeHtml(slot.vehicleType || 'CAR')}</span></td>
        <td>${renderSlotStatusBadge(slot.status)}</td>
        <td class="text-right">
          <div class="action-btn-group">
            <button class="btn btn-outline btn-xs" onclick="inspectSlot(${slot.id})">View</button>
            <button class="btn btn-secondary btn-xs" onclick="openSlotModal(${slot.id})">Edit</button>
            <button class="btn btn-danger btn-xs" onclick="confirmDeleteSlot(${slot.id}, '${escapeHtml(slot.slotNumber)}', '${slot.status}')" ${slot.status === 'OCCUPIED' ? 'disabled title="Cannot delete occupied bay"' : ''}>Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderSlotStatusBadge(status) {
  switch (status) {
    case 'AVAILABLE':
      return `<span class="badge badge-available">AVAILABLE</span>`;
    case 'OCCUPIED':
      return `<span class="badge badge-occupied">OCCUPIED</span>`;
    case 'BOOKED':
      return `<span class="badge badge-booked">BOOKED</span>`;
    case 'MAINTENANCE':
      return `<span class="badge badge-maintenance">MAINTENANCE</span>`;
    default:
      return `<span class="badge badge-info">${escapeHtml(status || 'UNKNOWN')}</span>`;
  }
}

function openSlotModal(slotId = null) {
  const title = document.getElementById('modalSlotTitle');
  const idInput = document.getElementById('slotId');
  const lotSelect = document.getElementById('slotLotSelect');
  const numberInput = document.getElementById('slotNumber');
  const typeSelect = document.getElementById('slotVehicleType');
  const statusSelect = document.getElementById('slotStatus');

  if (slotId) {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot) return;
    title.textContent = `Edit Parking Slot (${slot.slotNumber})`;
    idInput.value = slot.id;
    if (slot.parkingLot && slot.parkingLot.id) {
      lotSelect.value = slot.parkingLot.id;
    }
    numberInput.value = slot.slotNumber;
    typeSelect.value = slot.vehicleType || 'CAR';
    statusSelect.value = slot.status || 'AVAILABLE';
  } else {
    title.textContent = 'Add Parking Slot';
    idInput.value = '';
    numberInput.value = '';
    typeSelect.value = 'CAR';
    statusSelect.value = 'AVAILABLE';
  }
  openModal('modalSlot');
}

async function saveSlot() {
  const btn = document.getElementById('btnSubmitSlot');
  const id = document.getElementById('slotId').value;
  const lotId = parseInt(document.getElementById('slotLotSelect').value, 10);
  const slotNumber = document.getElementById('slotNumber').value.trim();
  const vehicleType = document.getElementById('slotVehicleType').value;
  const status = document.getElementById('slotStatus').value;

  if (!lotId || !slotNumber) {
    showToast('Please select a parking lot and enter a slot number.', 'warning');
    return;
  }

  const payload = {
    slotNumber,
    vehicleType,
    status,
    parkingLot: { id: lotId }
  };

  setBtnLoading(btn, true, id ? 'Updating...' : 'Creating...');

  try {
    if (id) {
      await apiRequest(`/api/slots/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Parking slot updated successfully.', 'success');
    } else {
      await apiRequest('/api/slots', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Parking slot created successfully.', 'success');
    }
    closeModal('modalSlot');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setBtnLoading(btn, false, id ? 'Update Slot' : 'Save Slot');
  }
}

function confirmDeleteSlot(id, slotNumber, status) {
  if (status === 'OCCUPIED') {
    showToast(`Slot ${slotNumber} is currently OCCUPIED by a vehicle. Please perform check-out before deleting.`, 'danger');
    return;
  }

  document.getElementById('deletePromptMessage').innerHTML = `
    Are you sure you want to delete parking bay <strong>"${escapeHtml(slotNumber)}"</strong> (#${id})?
  `;

  state.pendingDeleteAction = async () => {
    const btn = document.getElementById('btnConfirmDelete');
    setBtnLoading(btn, true, 'Deleting...');
    try {
      await apiRequest(`/api/slots/${id}`, { method: 'DELETE' });
      showToast('Record deleted successfully.', 'success');
      closeModal('modalDelete');
      await loadAllData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBtnLoading(btn, false, 'Delete Record');
    }
  };

  openModal('modalDelete');
}

// ==================== 3. BOOKING CRUD ====================
async function loadBookings() {
  state.bookings = await apiRequest('/api/bookings');
  renderBookingsTable();
  renderCheckinoutTable();
  renderDashboard();
}

function renderBookingsTable() {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  const searchTerm = (document.getElementById('searchBookings')?.value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('filterBookingStatus')?.value || 'ALL';

  let filtered = state.bookings.filter(b => {
    const matchesSearch = b.customerName.toLowerCase().includes(searchTerm) ||
                          b.vehicleNumber.toLowerCase().includes(searchTerm) ||
                          String(b.id).includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No reservations found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => {
    const slotInfo = b.parkingSlot ? `${b.parkingSlot.slotNumber}` : 'N/A';
    const isCompletedOrCancelled = b.status === 'COMPLETED' || b.status === 'CANCELLED';

    return `
      <tr>
        <td><strong>#${b.id}</strong></td>
        <td><strong>${escapeHtml(b.customerName)}</strong></td>
        <td><span class="vehicle-plate-pill">${escapeHtml(b.vehicleNumber)}</span></td>
        <td><strong>${escapeHtml(slotInfo)}</strong></td>
        <td><small>${formatDateTime(b.startTime)}</small></td>
        <td><small>${formatDateTime(b.endTime)}</small></td>
        <td>${renderBookingStatusBadge(b.status)}</td>
        <td class="text-right">
          <div class="action-btn-group">
            <button class="btn btn-outline btn-xs" onclick="viewBookingDetails(${b.id})">View</button>
            ${!isCompletedOrCancelled ? `
              <button class="btn btn-secondary btn-xs" onclick="openBookingModal(${b.id})">Edit</button>
              <button class="btn btn-warning btn-xs" onclick="confirmCancelBooking(${b.id})">Cancel</button>
            ` : ''}
            <button class="btn btn-danger btn-xs" onclick="confirmDeleteBooking(${b.id})">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderBookingStatusBadge(status) {
  switch (status) {
    case 'CONFIRMED':
      return `<span class="badge badge-confirmed">CONFIRMED</span>`;
    case 'COMPLETED':
      return `<span class="badge badge-completed">COMPLETED</span>`;
    case 'CANCELLED':
      return `<span class="badge badge-cancelled">CANCELLED</span>`;
    case 'PENDING':
      return `<span class="badge badge-pending">PENDING</span>`;
    default:
      return `<span class="badge badge-info">${escapeHtml(status || 'UNKNOWN')}</span>`;
  }
}

function openBookingModal(bookingId = null, preselectedSlotId = null) {
  const title = document.getElementById('modalBookingTitle');
  const idInput = document.getElementById('bookingId');
  const custInput = document.getElementById('bookingCustomer');
  const vehInput = document.getElementById('bookingVehicle');
  const lotSelect = document.getElementById('bookingLotSelect');
  const startInput = document.getElementById('bookingStartTime');
  const endInput = document.getElementById('bookingEndTime');
  const statusGroup = document.getElementById('bookingStatusGroup');

  if (bookingId) {
    const booking = state.bookings.find(b => b.id === bookingId);
    if (!booking) return;
    title.textContent = `Edit Booking (#${booking.id})`;
    idInput.value = booking.id;
    custInput.value = booking.customerName;
    vehInput.value = booking.vehicleNumber;
    startInput.value = toInputDateTime(booking.startTime);
    endInput.value = toInputDateTime(booking.endTime);

    if (booking.parkingSlot) {
      if (booking.parkingSlot.parkingLot && booking.parkingSlot.parkingLot.id) {
        lotSelect.value = booking.parkingSlot.parkingLot.id;
      }
      populateBookingSlotSelect(lotSelect.value, booking.parkingSlot.id);
    }
    statusGroup.style.display = 'block';
    document.getElementById('bookingStatus').value = booking.status;
  } else {
    title.textContent = 'New Parking Reservation';
    idInput.value = '';
    custInput.value = '';
    vehInput.value = '';

    const now = new Date();
    const end = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
    startInput.value = toInputDateTime(now);
    endInput.value = toInputDateTime(end);

    statusGroup.style.display = 'none';

    if (preselectedSlotId) {
      const slot = state.slots.find(s => s.id === preselectedSlotId);
      if (slot && slot.parkingLot) {
        lotSelect.value = slot.parkingLot.id;
        populateBookingSlotSelect(slot.parkingLot.id, slot.id);
      }
    } else {
      if (state.lots.length > 0) {
        lotSelect.value = state.lots[0].id;
        populateBookingSlotSelect(state.lots[0].id);
      }
    }
  }
  openModal('modalBooking');
}

function populateBookingSlotSelect(lotId, selectedSlotId = null) {
  const slotSelect = document.getElementById('bookingSlotSelect');
  if (!slotSelect) return;

  if (!lotId) {
    slotSelect.innerHTML = '<option value="">Select a lot first...</option>';
    return;
  }

  const lotSlots = state.slots.filter(s => s.parkingLot && s.parkingLot.id === parseInt(lotId, 10));

  slotSelect.innerHTML = lotSlots.map(s => {
    const isSelected = selectedSlotId && s.id === selectedSlotId;
    const isAvailable = s.status === 'AVAILABLE';
    return `<option value="${s.id}" ${isSelected ? 'selected' : (!isAvailable && !isSelected ? 'disabled' : '')}>
      Slot ${escapeHtml(s.slotNumber)} [${s.status}] (${s.vehicleType || 'CAR'})
    </option>`;
  }).join('');
}

async function saveBooking() {
  const btn = document.getElementById('btnSubmitBooking');
  const id = document.getElementById('bookingId').value;
  const customerName = document.getElementById('bookingCustomer').value.trim();
  const vehicleNumber = document.getElementById('bookingVehicle').value.trim();
  const slotId = parseInt(document.getElementById('bookingSlotSelect').value, 10);
  const startTime = document.getElementById('bookingStartTime').value;
  const endTime = document.getElementById('bookingEndTime').value;

  if (!customerName || !vehicleNumber || !slotId || !startTime || !endTime) {
    showToast('Please complete all required fields.', 'warning');
    return;
  }

  if (new Date(startTime) >= new Date(endTime)) {
    showToast('Start time must be before end time.', 'warning');
    return;
  }

  const payload = {
    customerName,
    vehicleNumber,
    startTime: (startTime && startTime.length === 16) ? `${startTime}:00` : startTime,
    endTime: (endTime && endTime.length === 16) ? `${endTime}:00` : endTime,
    status: id ? document.getElementById('bookingStatus').value : 'CONFIRMED',
    parkingSlot: { id: slotId }
  };

  setBtnLoading(btn, true, id ? 'Updating...' : 'Reserving...');

  try {
    if (id) {
      await apiRequest(`/api/bookings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Booking updated successfully.', 'success');
    } else {
      await apiRequest('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('Booking created successfully.', 'success');
    }
    closeModal('modalBooking');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'danger');
  } finally {
    setBtnLoading(btn, false, id ? 'Update Booking' : 'Confirm Reservation');
  }
}

function confirmCancelBooking(id) {
  document.getElementById('deletePromptMessage').innerHTML = `
    Are you sure you want to CANCEL booking <strong>#${id}</strong>?<br>
    The associated slot will be released back to the available pool.
  `;

  state.pendingDeleteAction = async () => {
    const btn = document.getElementById('btnConfirmDelete');
    setBtnLoading(btn, true, 'Cancelling...');
    try {
      await apiRequest(`/api/bookings/${id}/cancel`, { method: 'PUT' });
      showToast('Booking cancelled successfully.', 'success');
      closeModal('modalDelete');
      await loadAllData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBtnLoading(btn, false, 'Cancel Booking');
    }
  };

  openModal('modalDelete');
}

function confirmDeleteBooking(id) {
  document.getElementById('deletePromptMessage').innerHTML = `
    Are you sure you want to completely DELETE booking <strong>#${id}</strong>?
  `;

  state.pendingDeleteAction = async () => {
    const btn = document.getElementById('btnConfirmDelete');
    setBtnLoading(btn, true, 'Deleting...');
    try {
      await apiRequest(`/api/bookings/${id}`, { method: 'DELETE' });
      showToast('Booking deleted successfully.', 'success');
      closeModal('modalDelete');
      await loadAllData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBtnLoading(btn, false, 'Delete Record');
    }
  };

  openModal('modalDelete');
}

function viewBookingDetails(id) {
  const b = state.bookings.find(item => item.id === id);
  if (!b) return;

  const slotNumber = b.parkingSlot ? b.parkingSlot.slotNumber : 'N/A';
  const lotName = b.parkingSlot && b.parkingSlot.parkingLot ? b.parkingSlot.parkingLot.name : 'N/A';
  const checkinRecord = state.checkinouts.find(c => c.booking && c.booking.id === id);

  showInspectorModal(`Booking Details: #${b.id}`, `
    <div class="telemetry-list">
      <div class="telemetry-item"><span class="t-label">Customer:</span><span class="t-value"><strong>${escapeHtml(b.customerName)}</strong></span></div>
      <div class="telemetry-item"><span class="t-label">Vehicle:</span><span class="t-value font-mono">${escapeHtml(b.vehicleNumber)}</span></div>
      <div class="telemetry-item"><span class="t-label">Assigned Bay:</span><span class="t-value">${escapeHtml(slotNumber)} (${escapeHtml(lotName)})</span></div>
      <div class="telemetry-item"><span class="t-label">Scheduled Start:</span><span class="t-value">${formatDateTime(b.startTime)}</span></div>
      <div class="telemetry-item"><span class="t-label">Scheduled End:</span><span class="t-value">${formatDateTime(b.endTime)}</span></div>
      <div class="telemetry-item"><span class="t-label">Booking Status:</span><span class="t-value">${renderBookingStatusBadge(b.status)}</span></div>
      <div class="telemetry-item"><span class="t-label">Check-in Status:</span><span class="t-value">${checkinRecord ? checkinRecord.status : 'NOT CHECKED IN'}</span></div>
      ${checkinRecord && checkinRecord.actualCheckOutTime ? `<div class="telemetry-item"><span class="t-label">Checkout Time:</span><span class="t-value">${formatDateTime(checkinRecord.actualCheckOutTime)}</span></div>` : ''}
    </div>
  `);
}

// ==================== 4. CHECK-IN / CHECK-OUT ====================
function switchCheckinTab(tabName) {
  state.checkinTab = tabName;
  document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));

  if (tabName === 'pending') document.getElementById('tabCheckinPending')?.classList.add('active');
  if (tabName === 'active') document.getElementById('tabCheckinActive')?.classList.add('active');
  if (tabName === 'history') document.getElementById('tabCheckinHistory')?.classList.add('active');

  renderCheckinoutTable();
}

function renderCheckinoutTable() {
  const tbody = document.getElementById('checkinoutTableBody');
  if (!tbody) return;

  const now = new Date();

  if (state.checkinTab === 'pending') {
    // Confirmed bookings that have no CHECKED_IN or CHECKED_OUT record
    const checkedInBookingIds = state.checkinouts.map(c => c.booking?.id);
    const pendingList = state.bookings.filter(b => b.status === 'CONFIRMED' && !checkedInBookingIds.includes(b.id));

    if (pendingList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No reservations pending arrival.</td></tr>`;
      return;
    }

    tbody.innerHTML = pendingList.map(b => `
      <tr>
        <td><strong>#${b.id}</strong></td>
        <td><strong>${escapeHtml(b.customerName)}</strong></td>
        <td><span class="vehicle-plate-pill">${escapeHtml(b.vehicleNumber)}</span></td>
        <td><strong>Slot ${b.parkingSlot ? b.parkingSlot.slotNumber : 'N/A'}</strong></td>
        <td><small>${formatDateTime(b.startTime)} - ${formatDateTime(b.endTime)}</small></td>
        <td><span class="badge badge-confirmed">CONFIRMED</span></td>
        <td class="text-right">
          <button class="btn btn-primary btn-sm" onclick="performCheckIn(${b.id})">
            <span>Check In</span>
          </button>
        </td>
      </tr>
    `).join('');
  } else if (state.checkinTab === 'active') {
    // Currently checked in
    const activeList = state.checkinouts.filter(c => c.status === 'CHECKED_IN');

    if (activeList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No vehicles currently parked.</td></tr>`;
      return;
    }

    tbody.innerHTML = activeList.map(c => {
      const b = c.booking || {};
      const scheduledEnd = new Date(c.expectedCheckOutTime || b.endTime);
      const isOverstay = now > scheduledEnd;
      const overstayMinutes = isOverstay ? Math.floor((now - scheduledEnd) / (1000 * 60)) : 0;

      return `
        <tr>
          <td><strong>#${b.id || c.id}</strong></td>
          <td><strong>${escapeHtml(b.customerName || 'Guest')}</strong></td>
          <td><span class="vehicle-plate-pill">${escapeHtml(b.vehicleNumber || 'N/A')}</span></td>
          <td><strong>Slot ${b.parkingSlot ? b.parkingSlot.slotNumber : 'N/A'}</strong></td>
          <td>
            <small>In: ${formatDateTime(c.checkInTime)}</small><br>
            <small>Exp: ${formatDateTime(c.expectedCheckOutTime)}</small>
          </td>
          <td>
            ${isOverstay ? `
              <span class="badge badge-occupied animate-pulse">OVERSTAY (+${overstayMinutes}m)</span>
            ` : `
              <span class="badge badge-available">PARKED</span>
            `}
          </td>
          <td class="text-right">
            <button class="btn btn-danger btn-sm" onclick="performCheckOut(${b.id})">
              <span>Check Out & Bill</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } else {
    // Completed checkouts
    const historyList = state.checkinouts.filter(c => c.status === 'CHECKED_OUT');

    if (historyList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No historical stays yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = historyList.map(c => {
      const b = c.booking || {};
      const relatedBill = state.bills.find(bill => bill.bookingId === b.id);

      return `
        <tr>
          <td><strong>#${b.id || c.id}</strong></td>
          <td><strong>${escapeHtml(b.customerName || 'Guest')}</strong></td>
          <td><span class="vehicle-plate-pill">${escapeHtml(b.vehicleNumber || 'N/A')}</span></td>
          <td>Slot ${b.parkingSlot ? b.parkingSlot.slotNumber : 'N/A'}</td>
          <td><small>Out: ${formatDateTime(c.actualCheckOutTime)}</small></td>
          <td><span class="badge badge-completed">CHECKED OUT</span></td>
          <td class="text-right">
            ${relatedBill ? `
              <button class="btn btn-outline btn-xs" onclick="openInvoiceModal(${relatedBill.id})">View Invoice</button>
            ` : `
              <button class="btn btn-secondary btn-xs" onclick="calculateBillForBooking(${b.id})">Generate Bill</button>
            `}
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function performCheckIn(bookingId) {
  try {
    showToast('Processing vehicle check-in...', 'info');
    await apiRequest(`/api/checkinout/check-in/${bookingId}`, { method: 'POST' });
    showToast('Vehicle checked in successfully.', 'success');
    await loadAllData();
    switchCheckinTab('active');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function performCheckOut(bookingId) {
  try {
    showToast('Processing checkout and calculating bill...', 'info');
    await apiRequest(`/api/checkinout/check-out/${bookingId}`, { method: 'POST' });
    showToast('Vehicle checked out successfully. Bill generated.', 'success');

    // Reload bills and data from MySQL
    await loadAllData();

    // Automatically locate and pop open the invoice modal!
    const bill = state.bills.find(b => b.bookingId === bookingId);
    if (bill) {
      openInvoiceModal(bill.id);
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// ==================== 5. BILL CRUD ====================
async function loadBills() {
  state.bills = await apiRequest('/api/bills');
  renderBillsTable();
  renderDashboard();
}

function renderBillsTable() {
  const tbody = document.getElementById('billsTableBody');
  if (!tbody) return;

  const searchTerm = (document.getElementById('searchBills')?.value || '').toLowerCase().trim();
  const paymentFilter = document.getElementById('filterBillPaymentStatus')?.value || 'ALL';

  let filtered = state.bills.filter(b => {
    const matchesSearch = String(b.id).includes(searchTerm) || String(b.bookingId).includes(searchTerm);
    const matchesPayment = paymentFilter === 'ALL' || b.paymentStatus === paymentFilter;
    return matchesSearch && matchesPayment;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No billing invoices found in database.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(bill => {
    const isPaid = bill.paymentStatus === 'PAID';
    return `
      <tr>
        <td><strong>INV-#${bill.id}</strong></td>
        <td>#${bill.bookingId}</td>
        <td>${bill.parkingDurationMinutes}m (${bill.parkingHours}h)</td>
        <td>₹${parseFloat(bill.parkingAmount).toFixed(2)}</td>
        <td>${bill.overstayHours > 0 ? `${bill.overstayHours}h` : 'None'}</td>
        <td class="${bill.overstayPenalty > 0 ? 'text-danger font-bold' : ''}">₹${parseFloat(bill.overstayPenalty).toFixed(2)}</td>
        <td><strong class="text-success font-mono">₹${parseFloat(bill.totalAmount).toFixed(2)}</strong></td>
        <td>
          <span class="badge ${isPaid ? 'badge-paid' : 'badge-unpaid'}">${escapeHtml(bill.paymentStatus)}</span>
        </td>
        <td><small>${formatDateTime(bill.createdAt)}</small></td>
        <td class="text-right">
          <div class="action-btn-group">
            <button class="btn btn-outline btn-xs" onclick="openInvoiceModal(${bill.id})" title="View Invoice">View</button>
            ${!isPaid ? `
              <button class="btn btn-success btn-xs" onclick="markBillPaid(${bill.id})" title="Mark as Paid">Pay</button>
            ` : ''}
            <button class="btn btn-danger btn-xs" onclick="confirmDeleteBill(${bill.id})" title="Delete Record">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function calculateBillForBooking(bookingId) {
  try {
    showToast('Calculating bill via backend engine...', 'info');
    const bill = await apiRequest(`/api/bills/calculate/${bookingId}`, { method: 'POST' });
    showToast('Bill calculated and stored successfully.', 'success');
    await loadAllData();
    openInvoiceModal(bill.id);
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function markBillPaid(billId) {
  try {
    showToast('Updating payment status in MySQL...', 'info');
    await apiRequest(`/api/bills/${billId}/pay`, { method: 'PUT' });
    showToast('Payment marked as paid.', 'success');
    await loadAllData();
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function confirmDeleteBill(billId) {
  document.getElementById('deletePromptMessage').innerHTML = `
    Are you sure you want to DELETE billing record <strong>INV-#${billId}</strong> from MySQL?
  `;

  state.pendingDeleteAction = async () => {
    const btn = document.getElementById('btnConfirmDelete');
    setBtnLoading(btn, true, 'Deleting...');
    try {
      await apiRequest(`/api/bills/${billId}`, { method: 'DELETE' });
      showToast('Record deleted successfully.', 'success');
      closeModal('modalDelete');
      await loadAllData();
    } catch (err) {
      showToast(err.message, 'danger');
    } finally {
      setBtnLoading(btn, false, 'Delete Record');
    }
  };

  openModal('modalDelete');
}

// ==================== 6. BILL DETAILS / INVOICE MODAL ====================
function openInvoiceModal(billId) {
  const bill = state.bills.find(b => b.id === billId);
  if (!bill) return;

  const booking = state.bookings.find(b => b.id === bill.bookingId) || {};
  const slot = booking.parkingSlot || {};
  const lot = slot.parkingLot || {};

  document.getElementById('invNumber').textContent = `INV-#${bill.id}`;
  document.getElementById('invDate').textContent = `Date: ${formatDate(bill.createdAt || new Date())}`;

  const badge = document.getElementById('invStatusBadge');
  badge.textContent = bill.paymentStatus;
  badge.className = `invoice-badge ${bill.paymentStatus === 'PAID' ? 'paid' : ''}`;

  document.getElementById('invCustomer').textContent = booking.customerName || 'N/A';
  document.getElementById('invVehicle').textContent = booking.vehicleNumber || 'N/A';
  document.getElementById('invLot').textContent = lot.name || 'City Center';
  document.getElementById('invSlot').textContent = slot.slotNumber ? `Bay ${slot.slotNumber}` : 'Standard';

  document.getElementById('invCheckIn').textContent = formatDateTime(bill.checkInTime);
  document.getElementById('invScheduledEnd').textContent = formatDateTime(bill.scheduledEndTime);
  document.getElementById('invCheckOut').textContent = formatDateTime(bill.checkOutTime);

  document.getElementById('invDurationMin').textContent = `${bill.parkingDurationMinutes} mins`;
  document.getElementById('invParkingHours').textContent = bill.parkingHours;
  document.getElementById('invParkingAmount').textContent = `₹${parseFloat(bill.parkingAmount).toFixed(2)}`;

  document.getElementById('invOverstayMin').textContent = `${bill.overstayMinutes} mins`;
  document.getElementById('invOverstayHours').textContent = bill.overstayHours;
  document.getElementById('invOverstayPenalty').textContent = `₹${parseFloat(bill.overstayPenalty).toFixed(2)}`;

  document.getElementById('invTotalAmount').textContent = `₹${parseFloat(bill.totalAmount).toFixed(2)}`;

  // Pay button visibility in modal
  const payBtn = document.getElementById('btnPayInvoice');
  if (bill.paymentStatus === 'PAID') {
    payBtn.style.display = 'none';
  } else {
    payBtn.style.display = 'inline-flex';
    payBtn.onclick = async () => {
      await markBillPaid(bill.id);
      openInvoiceModal(bill.id);
    };
  }

  openModal('modalInvoice');
}

// ==================== 7. DASHBOARD METRICS ====================
function renderDashboard() {
  const totalLots = state.lots.length;
  const totalSlots = state.slots.length;
  const availableSlots = state.slots.filter(s => s.status === 'AVAILABLE').length;
  const occupiedSlots = state.slots.filter(s => s.status === 'OCCUPIED').length;
  const activeBookings = state.bookings.filter(b => b.status === 'CONFIRMED').length;
  const pendingPayments = state.bills.filter(b => b.paymentStatus === 'PENDING').length;

  const totalRevenue = state.bills
    .filter(b => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0);

  // Overstay calculations for currently parked
  const now = new Date();
  let overstayAlerts = 0;
  state.checkinouts.forEach(c => {
    if (c.status === 'CHECKED_IN' && c.expectedCheckOutTime) {
      if (now > new Date(c.expectedCheckOutTime)) {
        overstayAlerts++;
      }
    }
  });

  // Update Metrics DOM
  document.getElementById('statTotalLots').textContent = totalLots;
  document.getElementById('statTotalSlots').textContent = totalSlots;
  document.getElementById('statAvailableSlots').textContent = availableSlots;
  document.getElementById('statOccupiedSlots').textContent = occupiedSlots;
  document.getElementById('statActiveBookings').textContent = activeBookings;
  document.getElementById('statPendingPayments').textContent = pendingPayments;
  document.getElementById('statTotalRevenue').textContent = `₹${totalRevenue.toFixed(2)}`;
  document.getElementById('statOverstayAlerts').textContent = overstayAlerts;

  const pct = totalSlots > 0 ? Math.round((availableSlots / totalSlots) * 100) : 0;
  const availabilityBadge = document.getElementById('statSlotAvailabilityPct');
  if (availabilityBadge) availabilityBadge.textContent = `${pct}% Free`;

  // Badges in sidebar
  document.getElementById('liveAvailableBadge').textContent = availableSlots;
  document.getElementById('activeCheckInBadge').textContent = occupiedSlots;
  document.getElementById('overstayBadge').textContent = overstayAlerts;

  // Mini Slots Grid on Dashboard
  const miniGrid = document.getElementById('dashboardMiniSlots');
  if (miniGrid) {
    if (state.slots.length === 0) {
      miniGrid.innerHTML = '<div class="text-muted text-center py-3">No parking bays configured yet.</div>';
    } else {
      miniGrid.innerHTML = state.slots.map(s => {
        let cls = 'mini-slot-available';
        if (s.status === 'OCCUPIED') cls = 'mini-slot-occupied';
        else if (s.status === 'BOOKED') cls = 'mini-slot-booked';
        else if (s.status === 'MAINTENANCE') cls = 'mini-slot-maintenance';

        return `
          <div class="mini-slot-badge ${cls}" onclick="inspectSlot(${s.id})" title="${s.slotNumber} - ${s.status}">
            <span>${escapeHtml(s.slotNumber)}</span>
            <small>${s.status.substring(0, 3)}</small>
          </div>
        `;
      }).join('');
    }
  }

  // Dashboard Recent Activity Table
  const activityBody = document.getElementById('dashboardRecentActivityBody');
  if (activityBody) {
    const activeParked = state.checkinouts.filter(c => c.status === 'CHECKED_IN');
    if (activeParked.length === 0) {
      activityBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">No vehicles currently checked in.</td></tr>';
    } else {
      activityBody.innerHTML = activeParked.map(c => {
        const b = c.booking || {};
        const isOverstay = c.expectedCheckOutTime && now > new Date(c.expectedCheckOutTime);
        return `
          <tr>
            <td><strong>#${b.id || c.id}</strong></td>
            <td><span class="vehicle-plate-pill">${escapeHtml(b.vehicleNumber || 'N/A')}</span></td>
            <td>${escapeHtml(b.customerName || 'Guest')}</td>
            <td><small>${formatDateTime(c.checkInTime)}</small></td>
            <td><small>${formatDateTime(c.expectedCheckOutTime)}</small></td>
            <td>
              ${isOverstay ? '<span class="badge badge-occupied">OVERSTAY</span>' : '<span class="badge badge-available">PARKED</span>'}
            </td>
            <td>
              <button class="btn btn-danger btn-xs" onclick="performCheckOut(${b.id})">Check Out</button>
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // Presentation Mode stats sync
  document.getElementById('pAvailable').textContent = availableSlots;
  document.getElementById('pOccupied').textContent = occupiedSlots;
  document.getElementById('pActive').textContent = activeBookings;
  document.getElementById('pRevenue').textContent = `₹${totalRevenue.toFixed(0)}`;
  document.getElementById('pOverstay').textContent = overstayAlerts;
}

// ==================== 8. LIVE PARKING MAP ====================
function renderParkingMap() {
  const grid = document.getElementById('liveParkingGrid');
  const presGrid = document.getElementById('presParkingGrid');
  if (!grid) return;

  const lotFilter = document.getElementById('mapLotFilter')?.value || 'ALL';

  let slotsToRender = state.slots;
  if (lotFilter !== 'ALL') {
    slotsToRender = state.slots.filter(s => s.parkingLot && s.parkingLot.id === parseInt(lotFilter, 10));
  }

  if (slotsToRender.length === 0) {
    grid.innerHTML = '<div class="text-center py-5 text-muted col-full">No parking slots found in this facility.</div>';
    if (presGrid) presGrid.innerHTML = grid.innerHTML;
    return;
  }

  const html = slotsToRender.map(slot => {
    let stateClass = 'bay-available';
    if (slot.status === 'OCCUPIED') stateClass = 'bay-occupied';
    else if (slot.status === 'BOOKED') stateClass = 'bay-booked';
    else if (slot.status === 'MAINTENANCE') stateClass = 'bay-maintenance';

    // Find currently occupying booking if occupied
    let vehicleTag = '';
    if (slot.status === 'OCCUPIED' || slot.status === 'BOOKED') {
      const activeBooking = state.bookings.find(b => b.parkingSlot && b.parkingSlot.id === slot.id && (b.status === 'CONFIRMED' || b.status === 'PENDING'));
      if (activeBooking) {
        vehicleTag = `<div class="vehicle-plate-pill">${escapeHtml(activeBooking.vehicleNumber)}</div>`;
      }
    }

    return `
      <div class="parking-bay ${stateClass}" onclick="inspectSlot(${slot.id})">
        <div class="bay-number">${escapeHtml(slot.slotNumber)}</div>

        ${slot.status === 'OCCUPIED' ? `
          <div class="car-svg-wrapper">
            <svg viewBox="0 0 60 90" width="46" height="70">
              <defs>
                <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#ef4444" />
                  <stop offset="100%" stop-color="#991b1b" />
                </linearGradient>
              </defs>
              <!-- Car Body -->
              <rect x="10" y="8" width="40" height="74" rx="10" fill="url(#carGrad)" stroke="#fca5a5" stroke-width="1.5" />
              <!-- Windshield Front -->
              <path d="M15 28 L45 28 L41 38 L19 38 Z" fill="#1e293b" opacity="0.9" />
              <!-- Windshield Rear -->
              <path d="M18 64 L42 64 L45 72 L15 72 Z" fill="#1e293b" opacity="0.9" />
              <!-- Roof -->
              <rect x="18" y="38" width="24" height="26" rx="3" fill="#dc2626" />
              <!-- Headlights -->
              <circle cx="16" cy="11" r="3" fill="#fef08a" />
              <circle cx="44" cy="11" r="3" fill="#fef08a" />
              <!-- Taillights -->
              <rect x="14" y="80" width="6" height="2" fill="#fda4af" />
              <rect x="40" y="80" width="6" height="2" fill="#fda4af" />
            </svg>
          </div>
          ${vehicleTag}
        ` : `
          <div class="bay-type">${escapeHtml(slot.vehicleType || 'CAR')}</div>
        `}

        <div class="bay-slot-status">${escapeHtml(slot.status)}</div>
      </div>
    `;
  }).join('');

  grid.innerHTML = html;
  if (presGrid) presGrid.innerHTML = html;
}

function inspectSlot(slotId) {
  const slot = state.slots.find(s => s.id === slotId);
  if (!slot) return;

  const lotName = slot.parkingLot ? slot.parkingLot.name : 'Unassigned';
  const lotLoc = slot.parkingLot ? slot.parkingLot.location : '';

  let occupantHtml = '';
  let footerAction = '';

  if (slot.status === 'AVAILABLE') {
    occupantHtml = `<p class="text-success"><strong>Bay is currently vacant and ready for booking.</strong></p>`;
    footerAction = `
      <button type="button" class="btn btn-primary" onclick="closeModal('modalSlotDetail'); openBookingModal(null, ${slot.id})">
        Book This Slot
      </button>
    `;
  } else if (slot.status === 'OCCUPIED' || slot.status === 'BOOKED') {
    const activeBooking = state.bookings.find(b => b.parkingSlot && b.parkingSlot.id === slot.id && (b.status === 'CONFIRMED' || b.status === 'PENDING'));
    if (activeBooking) {
      occupantHtml = `
        <div class="telemetry-list">
          <div class="telemetry-item"><span class="t-label">Customer:</span><span class="t-value"><strong>${escapeHtml(activeBooking.customerName)}</strong></span></div>
          <div class="telemetry-item"><span class="t-label">Vehicle:</span><span class="t-value font-mono">${escapeHtml(activeBooking.vehicleNumber)}</span></div>
          <div class="telemetry-item"><span class="t-label">Start Time:</span><span class="t-value">${formatDateTime(activeBooking.startTime)}</span></div>
          <div class="telemetry-item"><span class="t-label">Scheduled End:</span><span class="t-value">${formatDateTime(activeBooking.endTime)}</span></div>
        </div>
      `;
      if (slot.status === 'OCCUPIED') {
        footerAction = `
          <button type="button" class="btn btn-danger" onclick="closeModal('modalSlotDetail'); performCheckOut(${activeBooking.id})">
            Check Out Vehicle
          </button>
        `;
      }
    } else {
      occupantHtml = `<p class="text-muted">Vehicle occupying bay with completed reservation.</p>`;
    }
  }

  showInspectorModal(`Slot ${slot.slotNumber}`, `
    <div class="telemetry-list mb-3">
      <div class="telemetry-item"><span class="t-label">Parking Bay:</span><span class="t-value"><strong>${escapeHtml(slot.slotNumber)}</strong></span></div>
      <div class="telemetry-item"><span class="t-label">Parking Facility:</span><span class="t-value">${escapeHtml(lotName)} (${escapeHtml(lotLoc)})</span></div>
      <div class="telemetry-item"><span class="t-label">Vehicle Type:</span><span class="t-value">${escapeHtml(slot.vehicleType || 'CAR')}</span></div>
      <div class="telemetry-item"><span class="t-label">Status:</span><span class="t-value">${renderSlotStatusBadge(slot.status)}</span></div>
    </div>
    ${occupantHtml}
  `, footerAction);
}

// ==================== OVERSTAY ALERTS VIEW ====================
function renderOverstayTable() {
  const tbody = document.getElementById('overstayTableBody');
  if (!tbody) return;

  const now = new Date();
  const overstayList = [];

  state.checkinouts.forEach(c => {
    if (c.status === 'CHECKED_IN' && c.expectedCheckOutTime) {
      const scheduledEnd = new Date(c.expectedCheckOutTime);
      if (now > scheduledEnd) {
        const diffMin = Math.floor((now - scheduledEnd) / (1000 * 60));
        const diffHrs = Math.ceil(diffMin / 60);
        const estPenalty = diffHrs * 50; // ₹50/hr backend rate
        overstayList.push({
          checkin: c,
          booking: c.booking || {},
          overstayMinutes: diffMin,
          overstayHours: diffHrs,
          estPenalty
        });
      }
    }
  });

  if (overstayList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-success font-bold">🟢 No vehicles are currently overstaying. All departures on schedule!</td></tr>`;
    return;
  }

  tbody.innerHTML = overstayList.map(item => `
    <tr>
      <td><strong>#${item.booking.id || item.checkin.id}</strong></td>
      <td><span class="vehicle-plate-pill">${escapeHtml(item.booking.vehicleNumber || 'N/A')}</span></td>
      <td><strong>${escapeHtml(item.booking.customerName || 'Guest')}</strong></td>
      <td>Slot ${item.booking.parkingSlot ? item.booking.parkingSlot.slotNumber : 'N/A'}</td>
      <td><small>${formatDateTime(item.checkin.expectedCheckOutTime)}</small></td>
      <td><span class="text-danger font-bold">+${item.overstayMinutes} mins (${item.overstayHours} hrs)</span></td>
      <td><strong class="text-danger">₹${item.estPenalty.toFixed(2)}</strong></td>
      <td class="text-right">
        <button class="btn btn-danger btn-xs" onclick="performCheckOut(${item.booking.id})">
          Check Out & Bill
        </button>
      </td>
    </tr>
  `).join('');
}

// ==================== PRESENTATION MODE ====================
function togglePresentationMode(show) {
  const overlay = document.getElementById('presentationOverlay');
  if (!overlay) return;

  if (show) {
    overlay.classList.add('open');
    renderParkingMap();
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } else {
    overlay.classList.remove('open');
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
}

// ==================== UTILITY & HELPERS ====================
function openModal(modalId) {
  document.getElementById(modalId)?.classList.add('open');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.remove('open');
}

function showInspectorModal(title, bodyHtml, footerActionHtml = '') {
  document.getElementById('slotDetailTitle').textContent = title;
  document.getElementById('slotInspectorContent').innerHTML = bodyHtml;
  const footer = document.getElementById('slotDetailFooter');
  footer.innerHTML = `
    <button type="button" class="btn btn-secondary" onclick="closeModal('modalSlotDetail')">Close</button>
    ${footerActionHtml}
  `;
  openModal('modalSlotDetail');
}

function setBtnLoading(button, isLoading, text) {
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) {
    button.classList.add('loading');
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `
      <svg class="spin-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
      <span>${escapeHtml(text)}</span>
    `;
  } else {
    button.classList.remove('loading');
    button.innerHTML = text || button.dataset.originalText || 'Submit';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: '✅',
    danger: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || 'ℹ️'}</div>
    <div class="toast-content">${escapeHtml(message)}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

function formatDateTime(isoString) {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

function formatDate(isoString) {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return isoString;
  }
}

function toInputDateTime(dateOrStr) {
  if (!dateOrStr) return '';
  const d = new Date(dateOrStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
