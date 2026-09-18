/**
 * calendar.js - Gestor de Calendario, Eventos, Ubicaciones y Recordatorios
 * Versión 0.6.5
 */

// --- Estado Global del Calendario ---
let calendarCurrentDate = new Date();
let calendarSelectedDate = getTodayDateStr();
let editingCalendarEventId = null;
let calendarActiveFilter = 'day'; // 'day' o 'upcoming'

const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEKDAY_NAMES_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

// --- Funciones de Utilidad de Fecha ---
function getTodayDateStr() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatDateToSpanish(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const dateObj = new Date(year, month, day);
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const weekday = dayNames[dateObj.getDay()];
            const monthName = MONTH_NAMES_ES[month];
            return `${weekday}, ${day} de ${monthName} de ${year}`;
        }
    } catch (e) {}
    return dateStr;
}

function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// --- Obtener Eventos Activos ---
function getActiveCalendarEvents() {
    const events = StorageService.getEvents() || [];
    return events.filter(ev => !ev._deleted);
}

// --- Inicialización de la Vista de Calendario ---
function initCalendarView() {
    if (!calendarSelectedDate) {
        calendarSelectedDate = getTodayDateStr();
    }
    renderMonthGrid();
    renderCalendarEventsPanel();
    updateNotificationButtonStatus();
}

// --- Navegación del Calendario ---
function changeCalendarMonth(delta) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + delta);
    renderMonthGrid();
}

function goToCalendarToday() {
    calendarCurrentDate = new Date();
    calendarSelectedDate = getTodayDateStr();
    renderMonthGrid();
    renderCalendarEventsPanel();
}

function selectCalendarDate(dateStr) {
    calendarSelectedDate = dateStr;
    calendarActiveFilter = 'day';
    renderMonthGrid();
    renderCalendarEventsPanel();
}

function setCalendarViewTab(tab) {
    calendarActiveFilter = tab;
    
    const tabDay = document.getElementById('cal-tab-day');
    const tabUpcoming = document.getElementById('cal-tab-upcoming');
    if (tabDay && tabUpcoming) {
        if (tab === 'day') {
            tabDay.classList.add('active');
            tabUpcoming.classList.remove('active');
        } else {
            tabDay.classList.remove('active');
            tabUpcoming.classList.add('active');
        }
    }
    renderCalendarEventsPanel();
}

// --- Renderizado de la Cuadrícula Mensual ---
function renderMonthGrid() {
    const monthTitle = document.getElementById('cal-month-title');
    const daysGrid = document.getElementById('cal-days-grid');
    if (!daysGrid) return;

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    if (monthTitle) {
        monthTitle.textContent = `${MONTH_NAMES_ES[month]} ${year}`;
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDaysInMonth = lastDay.getDate();

    // En JS getDay() es 0=Dom, 1=Lun, etc. Queremos 0=Lun, 6=Dom
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    // Días del mes anterior
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const todayStr = getTodayDateStr();
    const allEvents = getActiveCalendarEvents();

    // Mapear eventos por fecha
    const eventsByDate = {};
    allEvents.forEach(ev => {
        if (ev.date) {
            if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
            eventsByDate[ev.date].push(ev);
        }
    });

    let html = '';

    // 1. Cabecera de días de la semana
    WEEKDAY_NAMES_ES.forEach(dayName => {
        html += `<div class="cal-weekday-header">${dayName}</div>`;
    });

    // 2. Días previos (del mes anterior)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const dayNum = prevMonthLastDay - i;
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        const dayEvents = eventsByDate[dateStr] || [];

        html += `
            <div class="cal-day-cell cal-day-other-month" onclick="selectCalendarDate('${dateStr}')">
                <span class="cal-day-number">${dayNum}</span>
                ${renderEventDots(dayEvents)}
            </div>
        `;
    }

    // 3. Días del mes actual
    for (let day = 1; day <= totalDaysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = (dateStr === todayStr);
        const isSelected = (dateStr === calendarSelectedDate);
        const dayEvents = eventsByDate[dateStr] || [];

        let cellClasses = 'cal-day-cell';
        if (isToday) cellClasses += ' is-today';
        if (isSelected) cellClasses += ' is-selected';
        if (dayEvents.length > 0) cellClasses += ' has-events';

        html += `
            <div class="${cellClasses}" onclick="selectCalendarDate('${dateStr}')" title="${dateStr}">
                <span class="cal-day-number">${day}</span>
                ${renderEventDots(dayEvents)}
            </div>
        `;
    }

    // 4. Días siguientes para completar la cuadrícula (múltiplo de 7)
    const totalRendered = startDayOfWeek + totalDaysInMonth;
    const remainingDays = (7 - (totalRendered % 7)) % 7;
    for (let day = 1; day <= remainingDays; day++) {
        const nextMonth = month === 11 ? 0 : month + 1;
        const nextYear = month === 11 ? year + 1 : year;
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = eventsByDate[dateStr] || [];

        html += `
            <div class="cal-day-cell cal-day-other-month" onclick="selectCalendarDate('${dateStr}')">
                <span class="cal-day-number">${day}</span>
                ${renderEventDots(dayEvents)}
            </div>
        `;
    }

    daysGrid.innerHTML = html;
}

function renderEventDots(events) {
    if (!events || events.length === 0) return '';
    let dotsHtml = '<div class="cal-event-dots">';
    const maxDots = 3;
    events.slice(0, maxDots).forEach(ev => {
        const color = ev.color || 'var(--primary)';
        dotsHtml += `<span class="cal-event-dot" style="background-color: ${color};"></span>`;
    });
    if (events.length > maxDots) {
        dotsHtml += `<span class="cal-event-dot-more">+${events.length - maxDots}</span>`;
    }
    dotsHtml += '</div>';
    return dotsHtml;
}

// --- Renderizado del Panel de Eventos (Día o Próximos) ---
function renderCalendarEventsPanel() {
    const container = document.getElementById('cal-events-list-container');
    const headerTitle = document.getElementById('cal-events-panel-title');
    if (!container) return;

    const allEvents = getActiveCalendarEvents();

    if (calendarActiveFilter === 'day') {
        const dateFormatted = formatDateToSpanish(calendarSelectedDate);
        if (headerTitle) {
            headerTitle.innerHTML = `Eventos del <span style="color: var(--primary);">${dateFormatted}</span>`;
        }

        const dayEvents = allEvents
            .filter(ev => ev.date === calendarSelectedDate)
            .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

        if (dayEvents.length === 0) {
            container.innerHTML = `
                <div class="cal-empty-state">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📅</div>
                    <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">No hay eventos programados</div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Para el ${dateFormatted}</p>
                    <button class="btn btn-primary btn-sm" onclick="openEventModal('${calendarSelectedDate}')">
                        ➕ Agendar Evento en este día
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        dayEvents.forEach(ev => {
            html += renderEventCardHtml(ev);
        });
        container.innerHTML = html;
    } else {
        // Vista de Próximos Eventos
        const todayStr = getTodayDateStr();
        if (headerTitle) {
            headerTitle.innerHTML = `Todos los Próximos Eventos`;
        }

        const upcomingEvents = allEvents
            .filter(ev => ev.date >= todayStr)
            .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')));

        if (upcomingEvents.length === 0) {
            container.innerHTML = `
                <div class="cal-empty-state">
                    <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">✨</div>
                    <div style="font-weight: 600; color: var(--text-main); margin-bottom: 0.25rem;">No hay eventos futuros programados</div>
                    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Crea un nuevo evento para mantener la agenda al día.</p>
                    <button class="btn btn-primary btn-sm" onclick="openEventModal()">
                        ➕ Añadir Nuevo Evento
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        upcomingEvents.forEach(ev => {
            html += renderEventCardHtml(ev, true);
        });
        container.innerHTML = html;
    }
}

// --- Generador de HTML para Tarjeta de Evento ---
function renderEventCardHtml(ev, showDateBadge = false) {
    const site = ev.site || ev.sitio || '';
    const location = ev.location || ev.ubicacion || '';
    const time = ev.time ? `${ev.time} h` : 'Hora por confirmar';
    const note = ev.note || ev.notas || '';
    const color = ev.color || '#1B365D';
    const reminderLabel = getReminderLabel(ev.reminder);
    const mapsUrl = getGoogleMapsUrl(location, site);
    const dateFormatted = formatDateToSpanish(ev.date);

    return `
        <div class="cal-event-card" style="border-left-color: ${color};">
            <div class="cal-event-header">
                <div>
                    ${showDateBadge ? `<div class="cal-event-date-badge">📅 ${dateFormatted}</div>` : ''}
                    <h4 class="cal-event-title">${escapeHtml(ev.title)}</h4>
                </div>
                <div class="cal-event-actions">
                    <button class="btn-icon" onclick="openEventModal(null, '${ev.id}')" title="Editar evento">✏️</button>
                    <button class="btn-icon btn-icon-danger" onclick="deleteCalendarEvent('${ev.id}')" title="Eliminar evento">🗑️</button>
                </div>
            </div>

            <div class="cal-event-details-grid">
                <div class="cal-detail-item">
                    <span class="cal-detail-icon">⏰</span>
                    <span class="cal-detail-text"><strong>Hora:</strong> ${time}</span>
                </div>

                ${site ? `
                <div class="cal-detail-item">
                    <span class="cal-detail-icon">🏛️</span>
                    <span class="cal-detail-text"><strong>Sitio:</strong> ${escapeHtml(site)}</span>
                </div>
                ` : ''}

                ${location ? `
                <div class="cal-detail-item col-span-full">
                    <span class="cal-detail-icon">📍</span>
                    <span class="cal-detail-text">
                        <strong>Ubicación:</strong> ${escapeHtml(location)}
                        ${mapsUrl ? `
                        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="cal-maps-link" title="Abrir en Google Maps">
                            🗺️ Ver Mapa
                        </a>
                        ` : ''}
                    </span>
                </div>
                ` : ''}

                ${reminderLabel ? `
                <div class="cal-detail-item">
                    <span class="cal-detail-icon">🔔</span>
                    <span class="cal-detail-text"><strong>Aviso:</strong> ${reminderLabel}</span>
                </div>
                ` : ''}
            </div>

            ${note ? `
            <div class="cal-event-note">
                📝 ${escapeHtml(note)}
            </div>
            ` : ''}

            <div class="cal-event-footer">
                <button class="btn btn-sm btn-secondary" onclick="exportToGoogleCalendar('${ev.id}')" title="Añadir a Google Calendar">
                    📅 Google Calendar
                </button>
                <button class="btn btn-sm btn-secondary" onclick="downloadIcsFile('${ev.id}')" title="Descargar archivo iCalendar (.ics)">
                    📥 Descargar .ICS
                </button>
            </div>
        </div>
    `;
}

function getReminderLabel(reminder) {
    switch (reminder) {
        case 'at_time': return 'A la hora del evento';
        case '15m': return '15 minutos antes';
        case '1h': return '1 hora antes';
        case '2h': return '2 horas antes';
        case '1d_9am': return '1 día antes (09:00)';
        case '1d': return '1 día antes';
        case '2d': return '2 días antes';
        case '1w': return '1 semana antes';
        default: return null;
    }
}

function getGoogleMapsUrl(location, site) {
    const query = location || site;
    if (!query) return null;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// --- Widget de Próximos Eventos en Pantalla Principal ---
function renderUpcomingEventsWidget() {
    const container = document.getElementById('upcoming-events-widget');
    if (!container) return;

    const allEvents = getActiveCalendarEvents();
    const todayStr = getTodayDateStr();

    // Eventos futuros ordenados por fecha y hora
    const upcoming = allEvents
        .filter(ev => ev.date >= todayStr)
        .sort((a, b) => (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00')))
        .slice(0, 4);

    const todayEvents = allEvents.filter(ev => ev.date === todayStr);

    let html = '';

    if (todayEvents.length > 0) {
        html += `
            <div class="cal-today-alert" onclick="showSection('calendar-section'); selectCalendarDate('${todayStr}');">
                <div style="font-size: 1.5rem;">🔔</div>
                <div>
                    <div style="font-weight: 700; color: var(--primary);">¡Tienes ${todayEvents.length} acto(s) programado(s) HOY!</div>
                    <div style="font-size: 0.85rem; color: var(--text-main);">
                        ${todayEvents.map(e => `<strong>${escapeHtml(e.title)}</strong> (${e.time || 'Hora por confirmar'}${e.site ? ' en ' + escapeHtml(e.site) : ''})`).join(' • ')}
                    </div>
                </div>
            </div>
        `;
    }

    if (upcoming.length === 0) {
        html += `
            <div class="upcoming-widget-card" onclick="showSection('calendar-section'); initCalendarView();">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                    <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>📅</span> Próximos Actos y Eventos
                    </h3>
                    <span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">Ver Agenda →</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; margin: 1rem 0;">
                    No hay actos programados próximamente. Haz clic para consultar o agendar.
                </p>
            </div>
        `;
        container.innerHTML = html;
        return;
    }

    html += `
        <div class="upcoming-widget-card">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                <h3 style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span>📅</span> Próximos Actos y Eventos
                </h3>
                <button class="btn btn-sm btn-secondary" onclick="showSection('calendar-section'); initCalendarView();" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">
                    Ver Calendario Completo →
                </button>
            </div>

            <div class="upcoming-events-mini-list">
    `;

    upcoming.forEach(ev => {
        const parts = ev.date.split('-');
        const dayNum = parts[2];
        const monthShort = MONTH_NAMES_ES[parseInt(parts[1], 10) - 1].substring(0, 3).toUpperCase();
        const site = ev.site || ev.sitio || '';
        const isToday = ev.date === todayStr;

        html += `
            <div class="upcoming-mini-item ${isToday ? 'is-today-mini' : ''}" onclick="showSection('calendar-section'); selectCalendarDate('${ev.date}');">
                <div class="upcoming-mini-date-badge">
                    <span class="day-num">${dayNum}</span>
                    <span class="month-name">${monthShort}</span>
                </div>
                <div class="upcoming-mini-content">
                    <div class="upcoming-mini-title">${escapeHtml(ev.title)}</div>
                    <div class="upcoming-mini-meta">
                        <span>⏰ ${ev.time || 'Hora s/c'}</span>
                        ${site ? `<span>• 🏛️ ${escapeHtml(site)}</span>` : ''}
                    </div>
                </div>
                <span style="color: var(--text-muted); font-size: 1rem;">›</span>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// --- Modal de Añadir / Editar Evento ---
function openEventModal(defaultDate = null, eventId = null) {
    const modal = document.getElementById('event-modal');
    const modalTitle = document.getElementById('event-modal-title');
    if (!modal) return;

    editingCalendarEventId = eventId;

    // Reset fields
    document.getElementById('ev-title').value = '';
    document.getElementById('ev-date').value = defaultDate || calendarSelectedDate || getTodayDateStr();
    document.getElementById('ev-time').value = '18:00';
    document.getElementById('ev-site').value = '';
    document.getElementById('ev-location').value = '';
    document.getElementById('ev-note').value = '';
    document.getElementById('ev-reminder').value = '1d_9am';
    
    // Reset color picker
    setEventColorSelection('#1B365D');

    if (eventId) {
        if (modalTitle) modalTitle.textContent = 'Editar Evento';
        const allEvents = StorageService.getEvents() || [];
        const ev = allEvents.find(e => e.id === eventId);
        if (ev) {
            document.getElementById('ev-title').value = ev.title || '';
            document.getElementById('ev-date').value = ev.date || getTodayDateStr();
            document.getElementById('ev-time').value = ev.time || '';
            document.getElementById('ev-site').value = ev.site || ev.sitio || '';
            document.getElementById('ev-location').value = ev.location || ev.ubicacion || '';
            document.getElementById('ev-note').value = ev.note || ev.notas || '';
            document.getElementById('ev-reminder').value = ev.reminder || 'none';
            setEventColorSelection(ev.color || '#1B365D');
        }
    } else {
        if (modalTitle) modalTitle.textContent = 'Agendar Nuevo Evento';
    }

    modal.style.display = 'grid';
}

function closeEventModal() {
    const modal = document.getElementById('event-modal');
    if (modal) modal.style.display = 'none';
    editingCalendarEventId = null;
}

function setEventColorSelection(color) {
    const hiddenInput = document.getElementById('ev-color');
    if (hiddenInput) hiddenInput.value = color;

    document.querySelectorAll('.color-swatch').forEach(swatch => {
        if (swatch.getAttribute('data-color') === color) {
            swatch.classList.add('selected');
        } else {
            swatch.classList.remove('selected');
        }
    });
}

// --- Guardar Evento ---
function saveCalendarEvent() {
    const title = document.getElementById('ev-title').value.trim();
    const date = document.getElementById('ev-date').value.trim();
    const time = document.getElementById('ev-time').value.trim();
    const site = document.getElementById('ev-site').value.trim();
    const location = document.getElementById('ev-location').value.trim();
    const note = document.getElementById('ev-note').value.trim();
    const reminder = document.getElementById('ev-reminder').value;
    const color = document.getElementById('ev-color').value || '#1B365D';

    if (!title) {
        Toast.error('Por favor, indica un título para el evento.');
        return;
    }

    if (!date) {
        Toast.error('Por favor, indica la fecha del evento.');
        return;
    }

    const events = StorageService.getEvents() || [];
    const nowIso = new Date().toISOString();
    const userProfile = localStorage.getItem('user_profile') || 'Usuario';

    if (editingCalendarEventId) {
        const index = events.findIndex(e => e.id === editingCalendarEventId);
        if (index !== -1) {
            events[index] = {
                ...events[index],
                title,
                date,
                time,
                site,
                sitio: site,
                location,
                ubicacion: location,
                note,
                notas: note,
                reminder,
                color,
                updatedAt: nowIso
            };
            Toast.success('Evento actualizado correctamente.');
        }
    } else {
        const newEvent = {
            id: String(Date.now()),
            title,
            date,
            time,
            site,
            sitio: site,
            location,
            ubicacion: location,
            note,
            notas: note,
            reminder,
            color,
            createdBy: userProfile,
            createdAt: nowIso,
            updatedAt: nowIso,
            _deleted: false
        };
        events.push(newEvent);
        Toast.success('Evento agendado con éxito.');
    }

    StorageService.saveEvents(events);
    StorageService.triggerAutoSync();

    closeEventModal();
    calendarSelectedDate = date;
    renderMonthGrid();
    renderCalendarEventsPanel();
    renderUpcomingEventsWidget();

    // Comprobar recordatorios tras guardar
    checkCalendarReminders();
}

// --- Eliminar Evento ---
function deleteCalendarEvent(eventId) {
    if (!confirm('¿Estás seguro de que deseas eliminar este evento de la agenda?')) {
        return;
    }

    const events = StorageService.getEvents() || [];
    const index = events.findIndex(e => e.id === eventId);
    if (index !== -1) {
        events[index]._deleted = true;
        events[index].updatedAt = new Date().toISOString();
        StorageService.saveEvents(events);
        StorageService.triggerAutoSync();
        Toast.info('Evento eliminado de la agenda.');
        renderMonthGrid();
        renderCalendarEventsPanel();
        renderUpcomingEventsWidget();
    }
}

// --- Exportar a Google Calendar ---
function exportToGoogleCalendar(eventId) {
    const events = getActiveCalendarEvents();
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    const title = encodeURIComponent(ev.title || 'Evento');
    const details = encodeURIComponent((ev.note ? ev.note + '\n\n' : '') + (ev.site ? 'Sitio: ' + ev.site : ''));
    const location = encodeURIComponent(ev.location || ev.site || '');

    // Formatear fechas para Google Calendar: YYYYMMDDTHHmmSSZ o YYYYMMDD
    let datesParam = '';
    const dateClean = ev.date.replace(/-/g, '');

    if (ev.time) {
        const timeParts = ev.time.split(':');
        const startHours = timeParts[0].padStart(2, '0');
        const startMins = timeParts[1] ? timeParts[1].padStart(2, '0') : '00';
        
        // Asumir duración de 2 horas por defecto
        let endHours = String(parseInt(startHours, 10) + 2).padStart(2, '0');
        let endDateClean = dateClean;
        if (parseInt(endHours, 10) >= 24) {
            endHours = String(parseInt(endHours, 10) - 24).padStart(2, '0');
        }

        datesParam = `${dateClean}T${startHours}${startMins}00/${endDateClean}T${endHours}${startMins}00`;
    } else {
        datesParam = `${dateClean}/${dateClean}`;
    }

    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
    window.open(url, '_blank');
}

// --- Exportar a archivo iCalendar (.ICS) ---
function downloadIcsFile(eventId) {
    const events = getActiveCalendarEvents();
    const ev = events.find(e => e.id === eventId);
    if (!ev) return;

    const dateClean = ev.date.replace(/-/g, '');
    let dtStart = '';
    let dtEnd = '';

    if (ev.time) {
        const [h, m] = ev.time.split(':');
        dtStart = `${dateClean}T${h.padStart(2, '0')}${m ? m.padStart(2, '0') : '00'}00`;
        const endH = String(parseInt(h, 10) + 2).padStart(2, '0');
        dtEnd = `${dateClean}T${endH}${m ? m.padStart(2, '0') : '00'}00`;
    } else {
        dtStart = `${dateClean}`;
        dtEnd = `${dateClean}`;
    }

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JMSystems//Vestidores de la Virgen v0.6.5//ES',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${ev.id}@vestidoresdelavirgen.app`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${ev.title}`,
        `DESCRIPTION:${(ev.note || '') + (ev.site ? ' Sitio: ' + ev.site : '')}`,
        `LOCATION:${ev.location || ev.site || ''}`,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${ev.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Comprobador de Recordatorios y Notificaciones ---
function checkCalendarReminders() {
    const allEvents = getActiveCalendarEvents();
    const now = new Date();
    const todayStr = getTodayDateStr();

    let notifiedMap = {};
    try {
        notifiedMap = JSON.parse(localStorage.getItem('notified_calendar_events') || '{}');
    } catch (e) {
        notifiedMap = {};
    }

    allEvents.forEach(ev => {
        if (!ev.date || ev.reminder === 'none' || !ev.reminder) return;

        // Construir fecha y hora del evento
        let eventDateTime = new Date(`${ev.date}T${ev.time || '09:00'}:00`);
        if (isNaN(eventDateTime.getTime())) return;

        // Calcular momento de recordatorio
        let reminderTriggerTime = new Date(eventDateTime.getTime());
        switch (ev.reminder) {
            case 'at_time':
                // A la hora exacta
                break;
            case '15m':
                reminderTriggerTime.setMinutes(reminderTriggerTime.getMinutes() - 15);
                break;
            case '1h':
                reminderTriggerTime.setHours(reminderTriggerTime.getHours() - 1);
                break;
            case '2h':
                reminderTriggerTime.setHours(reminderTriggerTime.getHours() - 2);
                break;
            case '1d_9am':
                reminderTriggerTime.setDate(reminderTriggerTime.getDate() - 1);
                reminderTriggerTime.setHours(9, 0, 0, 0);
                break;
            case '1d':
                reminderTriggerTime.setDate(reminderTriggerTime.getDate() - 1);
                break;
            case '2d':
                reminderTriggerTime.setDate(reminderTriggerTime.getDate() - 2);
                break;
            case '1w':
                reminderTriggerTime.setDate(reminderTriggerTime.getDate() - 7);
                break;
        }

        const notificationKey = `${ev.id}_${ev.reminder}_${ev.date}`;

        // Si ya pasó el momento de aviso pero el evento todavía no ha finalizado (o es hoy)
        const isTimeTriggered = (now >= reminderTriggerTime && now <= eventDateTime);
        const isEventToday = (ev.date === todayStr);

        if ((isTimeTriggered || isEventToday) && !notifiedMap[notificationKey]) {
            notifiedMap[notificationKey] = now.toISOString();

            const siteInfo = ev.site ? ` en ${ev.site}` : '';
            const timeInfo = ev.time ? ` a las ${ev.time} h` : '';
            const message = `Recordatorio: "${ev.title}"${timeInfo}${siteInfo} (${formatShortDate(ev.date)})`;

            // 1. Toast In-App
            Toast.event(message, 8000);

            // 2. Notificación nativa del sistema
            NotificationManager.sendNotification(`📅 Recordatorio de Acto`, {
                body: `${ev.title}${timeInfo}${siteInfo}`,
                tag: ev.id
            });
        }
    });

    try {
        localStorage.setItem('notified_calendar_events', JSON.stringify(notifiedMap));
    } catch (e) {}
}

function updateNotificationButtonStatus() {
    const btn = document.getElementById('cal-enable-notif-btn');
    if (!btn) return;

    if (!NotificationManager.isSupported()) {
        btn.style.display = 'none';
        return;
    }

    const permission = NotificationManager.getPermission();
    if (permission === 'granted') {
        btn.innerHTML = '🔔 Notificaciones Activas';
        btn.className = 'btn btn-sm btn-secondary';
        btn.disabled = true;
        btn.style.opacity = '0.85';
    } else if (permission === 'denied') {
        btn.innerHTML = '🔕 Notificaciones Bloqueadas';
        btn.className = 'btn btn-sm btn-secondary';
        btn.disabled = true;
    } else {
        btn.innerHTML = '🔔 Activar Recordatorios';
        btn.className = 'btn btn-sm btn-primary';
        btn.disabled = false;
        btn.onclick = async () => {
            await NotificationManager.requestPermission();
            updateNotificationButtonStatus();
        };
    }
}

// Helper para prevenir XSS en renders
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Iniciar comprobador periódico de recordatorios (cada 60 seg)
setInterval(checkCalendarReminders, 60000);
