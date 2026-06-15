/*
  calendar.js
  Handles generating the calendar grid, days, and time slots based on BUSINESS_CONFIG.
*/

class BookingCalendar {
  constructor(containerId, onDateSelect, onTimeSelect) {
    this.container = document.getElementById(containerId);
    this.slotsContainer = document.getElementById('time-slots-container');
    this.currentDate = new Date(); // Start at today
    this.selectedDate = null;
    this.selectedTime = null;
    
    // Callbacks
    this.onDateSelect = onDateSelect;
    this.onTimeSelect = onTimeSelect;
    
    // Limits
    this.minDate = new Date(); // Today
    this.minDate.setHours(0,0,0,0);
    this.maxDate = new Date();
    this.maxDate.setMonth(this.maxDate.getMonth() + 2); // Allow booking 2 months ahead
    
    this.render();
  }

  // Navigate Months
  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.render();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.render();
  }

  selectDate(year, month, day) {
    const selected = new Date(year, month, day);
    if (selected < this.minDate || selected > this.maxDate) return;

    // Check if day is closed
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[selected.getDay()];
    if (!BUSINESS_CONFIG.schedule[dayName]) return;

    this.selectedDate = selected;
    this.selectedTime = null; // Reset time when date changes
    
    if(this.onDateSelect) this.onDateSelect(this.selectedDate);
    
    this.render();
    this.renderTimeSlots();
  }

  selectTime(timeStr) {
    this.selectedTime = timeStr;
    if(this.onTimeSelect) this.onTimeSelect(this.selectedTime);
    this.renderTimeSlots(); // Re-render to show selection
  }

  render() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let html = `
      <div class="calendar-header">
        <button type="button" class="btn btn-icon btn-secondary" id="cal-prev" ${this.currentDate <= this.minDate ? 'disabled' : ''}>&lt;</button>
        <span style="font-weight: 600;">${monthNames[month]} ${year}</span>
        <button type="button" class="btn btn-icon btn-secondary" id="cal-next" ${this.currentDate >= this.maxDate ? 'disabled' : ''}>&gt;</button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-day-name">Dom</div>
        <div class="calendar-day-name">Lun</div>
        <div class="calendar-day-name">Mar</div>
        <div class="calendar-day-name">Mié</div>
        <div class="calendar-day-name">Jue</div>
        <div class="calendar-day-name">Vie</div>
        <div class="calendar-day-name">Sáb</div>
    `;
    
    // Empty slots before 1st
    for (let i = 0; i < firstDay; i++) {
      html += `<div></div>`;
    }
    
    const dayNamesList = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    for (let i = 1; i <= daysInMonth; i++) {
      const cellDate = new Date(year, month, i);
      const isPast = cellDate < this.minDate;
      const isFuture = cellDate > this.maxDate;
      
      const dayName = dayNamesList[cellDate.getDay()];
      const isClosed = !BUSINESS_CONFIG.schedule[dayName];
      
      const isDisabled = isPast || isFuture || isClosed;
      
      const isSelected = this.selectedDate && 
                         this.selectedDate.getDate() === i &&
                         this.selectedDate.getMonth() === month &&
                         this.selectedDate.getFullYear() === year;

      html += `<div class="calendar-day ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}" 
                    data-day="${i}" data-month="${month}" data-year="${year}">
                 ${i}
               </div>`;
    }
    
    html += `</div>`;
    this.container.innerHTML = html;
    
    // Attach events
    document.getElementById('cal-prev').addEventListener('click', () => this.prevMonth());
    document.getElementById('cal-next').addEventListener('click', () => this.nextMonth());
    
    const dayCells = this.container.querySelectorAll('.calendar-day:not(.disabled)');
    dayCells.forEach(cell => {
      cell.addEventListener('click', (e) => {
        this.selectDate(
          parseInt(e.target.dataset.year),
          parseInt(e.target.dataset.month),
          parseInt(e.target.dataset.day)
        );
      });
    });
  }

  // Trigger from booking.js when staff changes to filter booked slots
  setStaffContext(staffId) {
    this.selectedStaffId = staffId;
    if(this.selectedDate) {
      this.selectedTime = null;
      if(this.onTimeSelect) this.onTimeSelect(null);
      this.renderTimeSlots();
    }
  }

  renderTimeSlots() {
    if (!this.selectedDate) {
      this.slotsContainer.innerHTML = `<p class="text-muted" style="grid-column: 1/-1;">Selecciona un día en el calendario.</p>`;
      return;
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[this.selectedDate.getDay()];
    const schedule = BUSINESS_CONFIG.schedule[dayName];
    
    if (!schedule) return;

    // Date String for mock DB "YYYY-MM-DD"
    const tzoffset = this.selectedDate.getTimezoneOffset() * 60000;
    const dateStr = new Date(this.selectedDate - tzoffset).toISOString().split('T')[0];
    
    // Get booked slots
    const bookedSlots = window.MockDB ? window.MockDB.getBookedSlots(dateStr, this.selectedStaffId) : [];

    // Generate slots
    const openParts = schedule.open.split(':');
    const closeParts = schedule.close.split(':');
    let currentMins = parseInt(openParts[0]) * 60 + parseInt(openParts[1]);
    const closeMins = parseInt(closeParts[0]) * 60 + parseInt(closeParts[1]);
    const duration = BUSINESS_CONFIG.slotDuration;

    // If today, filter out past hours
    const now = new Date();
    if(this.selectedDate.toDateString() === now.toDateString()) {
      const nowMins = now.getHours() * 60 + now.getMinutes() + 30; // 30 min padding
      if(nowMins > currentMins) currentMins = nowMins;
    }

    // Align to 30 min intervals
    currentMins = Math.ceil(currentMins / duration) * duration;

    let html = '';
    let count = 0;

    while (currentMins + duration <= closeMins) {
      const h = Math.floor(currentMins / 60).toString().padStart(2, '0');
      const m = (currentMins % 60).toString().padStart(2, '0');
      const timeStr = `${h}:${m}`;
      
      const isBooked = bookedSlots.includes(timeStr);
      const isSelected = this.selectedTime === timeStr;
      
      html += `<div class="time-slot ${isBooked ? 'disabled' : ''} ${isSelected ? 'selected' : ''}" data-time="${timeStr}">
                 ${timeStr}
               </div>`;
      
      currentMins += duration;
      count++;
    }

    if (count === 0) {
      html = `<p class="text-muted" style="grid-column: 1/-1;">No hay horarios disponibles.</p>`;
    }

    this.slotsContainer.innerHTML = html;

    // Attach events
    this.slotsContainer.querySelectorAll('.time-slot:not(.disabled)').forEach(slot => {
      slot.addEventListener('click', (e) => {
        this.selectTime(e.target.dataset.time);
      });
    });
  }
}

window.BookingCalendar = BookingCalendar;
