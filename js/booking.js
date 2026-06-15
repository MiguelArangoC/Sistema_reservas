/*
  booking.js
  Handles the state and flow of the 4-step booking wizard.
*/

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('booking-services')) return; // Only run on booking page
  
  const state = {
    step: 1,
    serviceId: null,
    staffId: null,
    date: null,
    time: null,
    client: {
      name: '',
      phone: '',
      email: '',
      notes: ''
    }
  };

  const UI = {
    steps: document.querySelectorAll('.step-content'),
    circles: [
      document.getElementById('step-circle-1'),
      document.getElementById('step-circle-2'),
      document.getElementById('step-circle-3'),
      document.getElementById('step-circle-4')
    ],
    lines: [
      document.getElementById('step-line-1'),
      document.getElementById('step-line-2'),
      document.getElementById('step-line-3')
    ],
    btnNext: document.getElementById('btn-next'),
    btnPrev: document.getElementById('btn-prev'),
    
    // Summary
    sumService: document.getElementById('sum-service'),
    sumStaff: document.getElementById('sum-staff'),
    sumDateTime: document.getElementById('sum-datetime'),
    sumTotal: document.getElementById('sum-total'),
    mobileTotal: document.getElementById('mobile-total'),
    
    // Containers
    servicesContainer: document.getElementById('booking-services'),
    staffContainer: document.getElementById('booking-staff'),
    
    // Form
    form: document.getElementById('booking-form')
  };

  let calendarInstance = null;

  // Initialize
  function initBookingFlow() {
    renderServices();
    setupEventListeners();
    updateUI();
    
    // Init calendar logic, rendering happens when step 3 is reached
    calendarInstance = new window.BookingCalendar('calendar-container', 
      (date) => {
        state.date = date;
        state.time = null; // reset time on new date
        validateStep();
        updateSummary();
      },
      (time) => {
        state.time = time;
        validateStep();
        updateSummary();
      }
    );
  }

  // Render Functions
  function renderServices() {
    UI.servicesContainer.innerHTML = '';
    BUSINESS_CONFIG.services.forEach(srv => {
      const el = document.createElement('div');
      el.className = `card card-glass service-card ${state.serviceId === srv.id ? 'card-selected' : ''}`;
      el.innerHTML = `
        <div class="service-card__icon">${srv.icon}</div>
        <h3 class="service-card__name">${srv.name}</h3>
        <p class="service-card__desc">${srv.description}</p>
        <div class="service-card__meta">
          <span class="service-card__price">${BUSINESS_CONFIG.currency} $${srv.price}</span>
          <span class="service-card__duration">⏱ ${srv.duration} min</span>
        </div>
      `;
      el.addEventListener('click', () => {
        state.serviceId = srv.id;
        state.staffId = null; // Reset staff on new service
        renderServices();
        validateStep();
        updateSummary();
        setTimeout(() => goNext(), 300); // Auto advance
      });
      UI.servicesContainer.appendChild(el);
    });
  }

  function renderStaff() {
    UI.staffContainer.innerHTML = '';
    
    // Filter staff that provide the selected service
    const availableStaff = BUSINESS_CONFIG.staff.filter(s => s.services.includes(state.serviceId));
    
    // Option: Any Staff
    const anyEl = document.createElement('div');
    anyEl.className = `card staff-card ${state.staffId === 'any' ? 'card-selected' : ''}`;
    anyEl.innerHTML = `
      <div class="staff-card__avatar" style="background: var(--bg-input); display:grid; place-items:center; font-size: 32px;">🤝</div>
      <h3 class="staff-card__name">Sin preferencia</h3>
      <p class="staff-card__role">Cualquier disponible</p>
    `;
    anyEl.addEventListener('click', () => {
      state.staffId = 'any';
      calendarInstance.setStaffContext(null); // No specific staff filtering
      renderStaff();
      validateStep();
      updateSummary();
      setTimeout(() => goNext(), 300);
    });
    UI.staffContainer.appendChild(anyEl);

    // Specific staff
    availableStaff.forEach(person => {
      const el = document.createElement('div');
      el.className = `card staff-card ${state.staffId === person.id ? 'card-selected' : ''}`;
      el.innerHTML = `
        <img src="${person.avatar}" alt="${person.name}" class="staff-card__avatar">
        <h3 class="staff-card__name">${person.name}</h3>
        <p class="staff-card__role">${person.role}</p>
        <div class="staff-card__rating">⭐ ${person.rating}</div>
      `;
      el.addEventListener('click', () => {
        state.staffId = person.id;
        calendarInstance.setStaffContext(person.id);
        renderStaff();
        validateStep();
        updateSummary();
        setTimeout(() => goNext(), 300);
      });
      UI.staffContainer.appendChild(el);
    });
  }

  // Navigation Logic
  function goNext() {
    if (state.step < 4) {
      if (state.step === 1 && state.serviceId) renderStaff();
      if (state.step === 2 && state.staffId && calendarInstance) calendarInstance.renderTimeSlots(); // Refresh in case slots changed
      
      state.step++;
      updateUI();
    } else {
      submitBooking();
    }
  }

  function goPrev() {
    if (state.step > 1) {
      state.step--;
      updateUI();
    }
  }

  function validateStep() {
    let isValid = false;
    if (state.step === 1) isValid = !!state.serviceId;
    if (state.step === 2) isValid = !!state.staffId;
    if (state.step === 3) isValid = !!state.date && !!state.time;
    if (state.step === 4) isValid = UI.form.checkValidity();

    UI.btnNext.disabled = !isValid;
  }

  function updateUI() {
    // Show/Hide steps
    UI.steps.forEach((el, index) => {
      if (index + 1 === state.step) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    // Update progress bar
    UI.circles.forEach((el, index) => {
      el.classList.remove('active', 'done');
      if (index + 1 < state.step) el.classList.add('done');
      else if (index + 1 === state.step) el.classList.add('active');
    });
    UI.lines.forEach((el, index) => {
      if (index + 1 < state.step) el.classList.add('done');
      else el.classList.remove('done');
    });

    // Buttons
    UI.btnPrev.style.visibility = state.step === 1 ? 'hidden' : 'visible';
    UI.btnNext.textContent = state.step === 4 ? 'Confirmar Reserva' : 'Siguiente';
    UI.btnNext.className = `btn ${state.step === 4 ? 'btn-primary' : 'btn-primary'}`;
    
    validateStep();
  }

  function updateSummary() {
    let serviceName = "No seleccionado";
    let priceText = "$0";
    if (state.serviceId) {
      const srv = BUSINESS_CONFIG.services.find(s => s.id === state.serviceId);
      if(srv) {
        serviceName = srv.name;
        priceText = `${BUSINESS_CONFIG.currency} $${srv.price}`;
      }
    }
    
    let staffName = "Cualquiera";
    if (state.staffId && state.staffId !== 'any') {
      const p = BUSINESS_CONFIG.staff.find(s => s.id === state.staffId);
      if(p) staffName = p.name;
    }

    let dateText = "No seleccionado";
    if (state.date && state.time) {
      const dOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const dStr = state.date.toLocaleDateString(BUSINESS_CONFIG.locale, dOptions);
      dateText = `${dStr}<br>a las ${state.time}`;
    }

    UI.sumService.textContent = serviceName;
    UI.sumStaff.textContent = staffName;
    UI.sumDateTime.innerHTML = dateText;
    UI.sumTotal.textContent = priceText;
    UI.mobileTotal.textContent = priceText;
  }

  function submitBooking() {
    UI.btnNext.classList.add('btn-loading');
    UI.btnNext.innerHTML = `<span class="btn-text">Confirmando...</span>`;
    UI.btnNext.disabled = true;

    // Collect form data
    state.client.name = document.getElementById('client-name').value;
    state.client.phone = document.getElementById('client-phone').value;
    state.client.email = document.getElementById('client-email').value;
    state.client.notes = document.getElementById('client-notes').value;

    const tzoffset = state.date.getTimezoneOffset() * 60000;
    const dateStr = new Date(state.date - tzoffset).toISOString().split('T')[0];

    const bookingPayload = {
      serviceId: state.serviceId,
      staffId: state.staffId === 'any' ? null : state.staffId,
      date: dateStr,
      time: state.time,
      client: state.client
    };

    // Simulate API Call
    setTimeout(() => {
      if (window.MockDB) {
        const savedBooking = window.MockDB.addBooking(bookingPayload);
        // Save ID to local storage to show in confirmation page
        localStorage.setItem('lastBookingId', savedBooking.id);
        window.location.href = 'confirmation.html';
      } else {
        console.error("MockDB not found");
        window.showToast("Error al procesar reserva", "error");
        UI.btnNext.classList.remove('btn-loading');
        UI.btnNext.textContent = 'Confirmar Reserva';
        UI.btnNext.disabled = false;
      }
    }, 1500);
  }

  function setupEventListeners() {
    UI.btnNext.addEventListener('click', goNext);
    UI.btnPrev.addEventListener('click', goPrev);
    
    // Form validation on input
    UI.form.addEventListener('input', () => {
      if (state.step === 4) validateStep();
    });

    // Mobile Summary Toggle
    const toggle = document.getElementById('summary-toggle');
    const summary = document.querySelector('.booking-summary');
    if (toggle && summary) {
      toggle.addEventListener('click', () => {
        summary.classList.toggle('expanded');
      });
    }
  }

  initBookingFlow();
});
