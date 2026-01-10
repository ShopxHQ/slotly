export function initializeDatePicker(blockId, config) {
  const container = document.getElementById(`slotly-date-picker-${blockId}`);
  if (!container) return;

  const selectedDateInput = container.querySelector(`#selected-date-${blockId}`);
  const selectedTypeInput = container.querySelector(`#selected-type-${blockId}`);
  const dateDisplay = container.querySelector(`#date-display-${blockId}`);
  const dateTrigger = container.querySelector(`#date-trigger-${blockId}`);
  const modalOverlay = container.querySelector(`#modal-overlay-${blockId}`);
  const modalClose = container.querySelector(`#modal-close-${blockId}`);
  const calendarDatesContainer = container.querySelector(`#calendar-dates-${blockId}`);
  const calendarMonthDisplay = container.querySelector(`#calendar-month-${blockId}`);
  const errorDisplay = container.querySelector(`#error-${blockId}`);
  const radioButtons = container.querySelectorAll('.slotly-schedule-type');
  const navButtons = container.querySelectorAll('.slotly-nav-btn');

  let currentDate = new Date();
  let selectedDate = null;
  let selectedType = 'delivery';

  function showError(message) {
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
  }

  function clearError() {
    errorDisplay.style.display = 'none';
  }

  function isDateAvailable(date) {
    const now = new Date();
    const minDate = new Date(now.getTime() + config.leadTimeHours * 60 * 60 * 1000);

    if (date < minDate) return false;

    const maxDate = new Date(now.getTime() + config.maxSelectableDays * 24 * 60 * 60 * 1000);
    if (date > maxDate) return false;

    if (config.disableWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
      return false;
    }

    if (config.disabledDates && config.disabledDates.length > 0) {
      const dateStr = date.toISOString().split('T')[0];
      if (config.disabledDates.includes(dateStr)) {
        return false;
      }
    }

    if (config.cutoffTime) {
      const [hours, minutes] = config.cutoffTime.split(':').map(Number);
      const cutoff = new Date();
      cutoff.setHours(hours, minutes, 0, 0);

      if (new Date().getTime() > cutoff.getTime() && isSameDay(date, new Date())) {
        return false;
      }
    }

    return true;
  }

  function isSameDay(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    calendarMonthDisplay.textContent = currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    calendarDatesContainer.innerHTML = '';

    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const adjustedFirstDay = (firstDayOfWeek + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < adjustedFirstDay; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'slotly-date slotly-date--empty';
      calendarDatesContainer.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateCell = document.createElement('button');
      dateCell.type = 'button';
      dateCell.className = 'slotly-date';
      dateCell.textContent = day;

      const isAvailable = isDateAvailable(date);
      const isSelected = selectedDate && isSameDay(date, selectedDate);

      if (!isAvailable) {
        dateCell.classList.add('slotly-date--disabled');
        dateCell.disabled = true;
      }

      if (isSelected) {
        dateCell.classList.add('slotly-date--selected');
      }

      if (isAvailable) {
        dateCell.addEventListener('click', () => selectDate(date));
      }

      calendarDatesContainer.appendChild(dateCell);
    }
  }

  function selectDate(date) {
    clearError();
    selectedDate = date;
    const dateStr = date.toISOString().split('T')[0];
    
    selectedDateInput.value = dateStr;
    selectedTypeInput.value = selectedType;

    const displayDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    dateDisplay.textContent = displayDate;
    closeModal();
    updateCartAttributes();
    renderCalendar();
  }

  function updateCartAttributes() {
    if (!selectedDate) return;

    const dateStr = selectedDate.toISOString().split('T')[0];
    const attributes = {};

    if (selectedType === 'delivery') {
      attributes._delivery_date = dateStr;
    } else if (selectedType === 'pickup') {
      attributes._pickup_date = dateStr;
    }

    attributes._schedule_type = selectedType;

    if (config.cartNoteEnabled) {
      const displayDate = selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const scheduleLabel = selectedType === 'delivery' ? 'Delivery' : 'Pickup';
      attributes._slotly_schedule = `${scheduleLabel} Date: ${displayDate}`;
    }

    fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ attributes }),
    }).catch((err) => {
      console.error('Error updating cart:', err);
    });
  }

  function openModal() {
    if (modalOverlay) {
      modalOverlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  function handleMonthNavigation(direction) {
    if (direction === 'next') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    }
    renderCalendar();
  }

  if (dateTrigger) {
    dateTrigger.addEventListener('click', openModal);
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeModal();
      }
    });
  }

  radioButtons.forEach((radio) => {
    radio.addEventListener('change', (e) => {
      selectedType = e.target.value;
      selectedTypeInput.value = selectedType;
      if (selectedDate) {
        updateCartAttributes();
      }
    });
  });

  navButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const action = e.currentTarget.getAttribute('data-action');
      handleMonthNavigation(action);
    });
  });

  renderCalendar();
}
