document.addEventListener('DOMContentLoaded', () => {
  const calendarGrid = document.getElementById('calendar-grid');
  const detailsPanel = document.getElementById('details-panel');
  const detailsDateEl = document.getElementById('details-date');
  const detailsListEl = document.getElementById('details-list');
  const addEventTodayBtn = document.getElementById('add-event-today-btn');

  const modal = document.getElementById('event-modal');
  const saveBtn = document.getElementById('save-event');
  const cancelBtn = document.getElementById('cancel-event');
  const addBtn = document.getElementById('add-event-btn');
  const monthYear = document.getElementById('month-year');
  const prevMonth = document.getElementById('prev-month');
  const nextMonth = document.getElementById('next-month');
  const backBtn = document.getElementById('back-btn');

  // Inputs
  const inpDate = document.getElementById('event-date');
  const inpTime = document.getElementById('event-time');
  const inpTitle = document.getElementById('event-title');
  const inpNote = document.getElementById('event-note');
  const inpColor = document.getElementById('event-color');

  let currentDate = new Date();
  let selectedDateStr = null; // Track selected date

  function renderCalendar() {
    calendarGrid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const monthNames = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    monthYear.textContent = `${monthNames[month]} ${year}`;

    // Offset Monday start
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    for (let i = 0; i < offset; i++) {
      const empty = document.createElement('div');
      empty.classList.add('day');
      empty.style.backgroundColor = 'transparent';
      empty.style.cursor = 'default';
      calendarGrid.appendChild(empty);
    }

    const events = StorageService.getEvents();

    for (let d = 1; d <= lastDate; d++) {
      const day = document.createElement('div');
      day.classList.add('day');

      const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;

      const dayNum = document.createElement('span');
      dayNum.className = 'day-number';
      dayNum.textContent = d;
      day.appendChild(dayNum);

      if (
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      ) {
        day.classList.add('today');
      }

      // Check selected
      if (selectedDateStr === dateString) {
        day.classList.add('selected');
        showDayDetails(dateString); // Refresh panel if needed
      }

      // Render Events as text chips
      const dayEvents = events.filter(ev => ev.date === dateString);
      dayEvents.forEach(ev => {
        const chip = document.createElement('div');
        chip.className = 'event-chip';
        chip.style.backgroundColor = ev.color || '#4F46E5';
        chip.textContent = ev.time ? `${ev.time} ${ev.title}` : ev.title;
        day.appendChild(chip);
      });

      // Click: Select day and show details
      day.addEventListener('click', () => {
        // Remove prev selection
        document.querySelectorAll('.day.selected').forEach(el => el.classList.remove('selected'));
        day.classList.add('selected');
        selectedDateStr = dateString;
        showDayDetails(dateString);

        // Scroll to details on mobile? Maybe not needed if visible.
        detailsPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });

      calendarGrid.appendChild(day);
    }
  }

  function showDayDetails(dateStr) {
    detailsPanel.classList.add('active');

    // Format date for Header
    const dateObj = new Date(dateStr);
    const opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    detailsDateEl.textContent = dateObj.toLocaleDateString('es-ES', opts);

    const events = StorageService.getEvents().filter(ev => ev.date === dateStr);

    detailsListEl.innerHTML = '';
    if (events.length === 0) {
      detailsListEl.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">No hay eventos para este día.</p>';
    } else {
      events.forEach(ev => {
        const item = document.createElement('div');
        item.className = 'detail-item';
        item.style.borderLeftColor = ev.color || '#4F46E5';

        const noteHtml = ev.note ? `<div class="detail-note">${ev.note}</div>` : '';
        const timeHtml = ev.time ? `<span class="detail-time">⏰ ${ev.time}</span>` : '';

        item.innerHTML = `
                <div class="detail-title">${ev.title}</div>
                ${timeHtml}
                ${noteHtml}
              `;
        detailsListEl.appendChild(item);
      });
    }
  }

  function openModal(dateStr = '') {
    inpDate.value = dateStr || new Date().toISOString().split('T')[0];
    inpTime.value = '';
    inpTitle.value = '';
    inpNote.value = '';
    inpColor.value = '#4F46E5';
    modal.classList.remove('hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
  }

  saveBtn.addEventListener('click', () => {
    const date = inpDate.value;
    const time = inpTime.value;
    const title = inpTitle.value;
    const note = inpNote.value;
    const color = inpColor.value;

    if (!date || !title) {
      alert('Fecha y Título obligatorios');
      return;
    }

    const newEvent = {
      id: Date.now().toString(),
      date,
      time,
      title,
      note,
      color
    };

    const events = StorageService.getEvents();
    events.push(newEvent);
    StorageService.saveEvents(events);

    closeModal();
    renderCalendar();
    // Re-show details for the date we just added to
    selectedDateStr = date;
    showDayDetails(date);
  });

  cancelBtn.addEventListener('click', closeModal);
  addBtn.addEventListener('click', () => openModal(selectedDateStr || '')); // Use selected if avail
  addEventTodayBtn.addEventListener('click', () => openModal(selectedDateStr));

  prevMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  backBtn.addEventListener('click', () => {
    window.location.href = "index.html";
  });

  renderCalendar();
});
