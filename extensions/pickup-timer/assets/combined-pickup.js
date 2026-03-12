(function() {
  const DAY_MAP = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Friday: 5, Saturday: 6
  };

  // Global coordinator to prevent multiple blocks from fighting over the checkout button
  window.combinedPickupCoordinator = window.combinedPickupCoordinator || {
    blocks: {},
    isCheckingOut: false,
    updateButtons: function() {
      const selectors = [
        'form[action="/cart"] button[name="checkout"]',
        'button[name="checkout"]',
        '.cart__checkout-button',
        '[data-test-id*="checkout"]',
        'a[href="/checkout"]',
        'a[href*="checkout"]',
        '.checkout-button',
        '#checkout',
        '.cart__submit',
        '.cart-checkout-button'
      ];
      const buttons = new Set();
      selectors.forEach(s => document.querySelectorAll(s).forEach(b => buttons.add(b)));
      
      const statuses = Object.values(this.blocks);
      const isComplete = statuses.length === 0 || statuses.some(s => s === true);

      buttons.forEach(btn => {
        if (isComplete || this.isCheckingOut) btn.classList.remove('checkout-button-blurred');
        else btn.classList.add('checkout-button-blurred');
      });
    }
  };

  // Fix for theme-specific missing function errors (prevents theme crashes)
  if (typeof window.updateCartAttributes !== 'function') {
    window.updateCartAttributes = function() { console.log('[Combined Pickup] Theme called missing updateCartAttributes - suppressed.'); };
  }
  if (typeof window.getCookie !== 'function') {
    window.getCookie = function(name) {
      let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    };
  }

  window.initCombinedPickup = function(config) {
    let storeRules = config.storeRules || [];
    let deliveryConfig = config.deliveryConfig || {};
    let matchedRule = null;
    let initAttempts = 0;
    const maxAttempts = 15;
    let isUpdating = false;
    let checkoutButtons = [];

    function findMatchedRule(suburbOrPostcode) {
      if (!suburbOrPostcode) return null;
      if (!Array.isArray(deliveryConfig.rules)) {
        if (deliveryConfig.earliestDays) return deliveryConfig;
        return null;
      }
      const input = suburbOrPostcode.toLowerCase().trim();
      return deliveryConfig.rules.find(rule => {
        if (!rule.suburbs) return false;
        const ruleSuburbs = rule.suburbs.split(',').map(s => s.toLowerCase().trim());
        return ruleSuburbs.includes(input);
      });
    }

    function isDateBlocked(date) {
      const ruleToUse = matchedRule || (Array.isArray(deliveryConfig.rules) && deliveryConfig.rules.length > 0 ? null : deliveryConfig);
      if (!ruleToUse) return true;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      // Calculate Cutoff
      let isPastCutoff = false;
      if (ruleToUse.cutoffTime) {
        const parts = ruleToUse.cutoffTime.split(':').map(Number);
        const cHour = isNaN(parts[0]) ? 12 : parts[0];
        const cMin = isNaN(parts[1]) ? 0 : parts[1];
        const cutoffToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cHour, cMin, 0);
        if (now > cutoffToday) isPastCutoff = true;
      } else {
        // Default to 12:00 PM if not specified
        const defaultCutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        if (now > defaultCutoff) isPastCutoff = true;
      }

      if (ruleToUse.earliestHours) {
        let totalHours = Number(ruleToUse.earliestHours);
        if (isPastCutoff) totalHours += 24; // Effectively push 1 day if past cutoff
        
        const minDate = new Date(now.getTime() + (totalHours * 60 * 60 * 1000));
        let minAllowedDate = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
        
        if (date < minAllowedDate) return true;
      } else if (ruleToUse.earliestDays) {
        let daysToAdd = Number(ruleToUse.earliestDays);
        if (isPastCutoff) daysToAdd += 1;
        
        const min = new Date(today);
        min.setDate(today.getDate() + daysToAdd);
        if (date < min) return true;
      }

      if (ruleToUse.furthestDays) {
        const max = new Date(today);
        max.setDate(today.getDate() + Number(ruleToUse.furthestDays));
        if (date > max) return true;
      }

      if (Array.isArray(ruleToUse.availableDays) && ruleToUse.availableDays.length) {
        const allowed = ruleToUse.availableDays.map(d => DAY_MAP[d]);
        if (!allowed.includes(date.getDay())) return true;
      }

      if (Array.isArray(ruleToUse.blockedDateRules)) {
        for (const rule of ruleToUse.blockedDateRules) {
          if (rule.applyTo === 'single' && rule.singleDate === dateStr) return true;
          if (rule.applyTo === 'range' && rule.fromDate && rule.toDate && dateStr >= rule.fromDate && dateStr <= rule.toDate) return true;
        }
      }
      return false;
    }

    function findCheckoutButtons() {
      const selectors = [
        'form[action="/cart"] button[name="checkout"]',
        'button[name="checkout"]',
        '.cart__checkout-button',
        '[data-test-id*="checkout"]',
        'a[href="/checkout"]',
        'a[href*="checkout"]',
        '.checkout-button',
        '#checkout',
        '.cart__submit',
        '.cart-checkout-button'
      ];
      if (config.customCheckoutSelector) selectors.unshift(config.customCheckoutSelector);
      const buttons = new Set();
      for (const selector of selectors) {
        document.querySelectorAll(selector).forEach(btn => buttons.add(btn));
      }
      if (buttons.size === 0) {
        Array.from(document.querySelectorAll('button, a')).forEach(el => {
          const text = el.textContent.toLowerCase().trim();
          if (text.includes('checkout') || text.includes('check out')) buttons.add(el);
        });
      }
      return Array.from(buttons);
    }

    async function init() {
      if (isUpdating) return;
      isUpdating = true;
      const wrapperId = config.wrapperId;
      let wrapper = document.getElementById(wrapperId);
      const allWrappers = document.querySelectorAll('.combined-wrapper');

      try {
        const cartResponse = await fetch('/cart.js?v=' + Date.now());
        const cart = await cartResponse.json();
        if (cart.item_count === 0 || (cart.items && cart.items.length === 0)) {
          allWrappers.forEach(w => {
            w.style.setProperty('display', 'none', 'important');
            w.innerHTML = '';
            w.removeAttribute('data-combined-wrapper-initialized');
            delete window.combinedPickupCoordinator.blocks[w.id];
          });
          window.combinedPickupCoordinator.updateButtons();
          return;
        }
        if (wrapper) wrapper.style.setProperty('display', 'block', 'important');
      } catch (e) {
        console.error('[Combined Layout] Cart fetch error:', e);
      } finally {
        isUpdating = false;
      }

      checkoutButtons = findCheckoutButtons();

      // Check for existing wrapper before creating/rendering
      if (wrapper && wrapper.getAttribute('data-combined-wrapper-initialized') === 'true') {
        // MUST check if elements exist before calling update
        const checkEl = wrapper.querySelector('.suburb-input');
        if (checkEl) updateCheckoutButtonState(wrapper);
        return;
      }
      
      if (!wrapper && checkoutButtons.length === 0) {
        if (initAttempts < maxAttempts) {
          initAttempts++;
          setTimeout(init, Math.min(500 * Math.pow(1.5, initAttempts / 3), 3000));
        }
        return;
      }

      initAttempts = 0;
      // ... rest of init ...
      checkoutButtons.forEach(btn => {
        if (btn.parentElement && window.getComputedStyle(btn.parentElement).display === 'flex') {
          btn.parentElement.style.flexDirection = 'column';
        }
      });

      if (!wrapper) {
        wrapper = document.createElement('div');
        wrapper.id = wrapperId;
        wrapper.className = 'combined-wrapper';
      }
      wrapper.setAttribute('data-combined-wrapper-initialized', 'true');
      wrapper.style.setProperty('--shipping-color', config.shippingColor);
      wrapper.style.setProperty('--store-pickup-color', config.storePickupColor);
      wrapper.style.setProperty('--normal-color', config.normalColor);
      wrapper.style.setProperty('--active-border-color', config.activeBorderColor);
      wrapper.style.setProperty('--card-radius', config.cardBorderRadius + 'px');

      function updateCheckoutButtonState(wrap) {
        if (window.combinedPickupCoordinator.isCheckingOut || !wrap) return;
        const subInput = wrap.querySelector('.suburb-input');
        const dInput = wrap.querySelector('.delivery-date-input');
        const sSelect = wrap.querySelector('.pickup-store-select');
        
        if (!matchedRule && subInput && subInput.value.trim()) matchedRule = findMatchedRule(subInput.value.trim());
        const activeOption = wrap.querySelector('.pickup-option.active');
        let isComplete = false;
        
        if (activeOption) {
          if (activeOption.classList.contains('normal-shipping')) {
            isComplete = true;
          } else if (activeOption.classList.contains('shipping')) {
            // Shipping is complete if we have a matched rule and a date
            isComplete = !!matchedRule && dInput && dInput.value.trim() !== '';
            
            // IF we have steps, ensure we are on the LAST step or it's finished
            const steps = wrap.querySelectorAll('.delivery-step');
            let lastVisibleStep = null;
            steps.forEach(s => { if (s.style.display !== 'none') lastVisibleStep = s; });
            
            // If any step before the final one (Yes/No) is visible, it's not complete
            if (lastVisibleStep) {
               if (!lastVisibleStep.classList.contains('yes-no-checkbox-wrapper')) {
                 isComplete = false;
               }
            }
          } else if (activeOption.classList.contains('store-pickup')) {
            isComplete = sSelect && sSelect.value !== '';
          }
        }

        if (isComplete && config.showYesNo) {
          const checked = wrap.querySelector('.yes-no-input:checked');
          if (!checked) isComplete = false;
        }
        
        // Use coordinator to manage global checkout button state
        window.combinedPickupCoordinator.blocks[config.wrapperId] = isComplete;
        window.combinedPickupCoordinator.updateButtons();
      }

      const optionsHTML = storeRules.filter(s => s.active).map(s => `<option value="${s.storeName}">${s.storeName} — ${s.openTime || '—'} to ${s.closeTime || '—'} (${s.timezone || '—'})</option>`).join('');
      const timeInputHTML = config.showTime ? '<input type="time" class="delivery-time-input">' : '';
      const normalShippingHTML = config.showNormal ? `<div class="pickup-option normal-shipping"><div class="pickup-option-icon">📦</div><div class="pickup-option-label">${config.normalShippingLabel}</div></div>` : '';
      const shippingHTML = config.showShipping ? `<div class="pickup-option shipping"><div class="pickup-option-icon">🚚</div><div class="pickup-option-label">${config.shippingLabel}</div></div>` : '';
      const pickupHTML = config.showPickup ? `<div class="pickup-option store-pickup"><div class="pickup-option-icon">🏪</div><div class="pickup-option-label">${config.pickupLabel}</div></div>` : '';

      const layoutClass = config.optionsLayout === 'stacked' ? 'layout-stacked' : 'layout-grid';

      wrapper.innerHTML = `
        <div class="pickup-options ${layoutClass}">${normalShippingHTML}${shippingHTML}${pickupHTML}</div>
        <div class="store-info"><select class="pickup-store-select"><option value="" disabled selected hidden>Select a store</option>${optionsHTML}</select></div>
        <div class="delivery-date-section" style="display: none;">
          <div class="suburb-validation-section delivery-step" style="margin-bottom: 16px;">
            <label style="font-weight:700;margin-bottom:8px;display:block;color:#333;font-size:14px;">${config.suburbTitle}</label>
            <div style="display:flex;gap:8px;"><input type="text" class="suburb-input" placeholder="${config.suburbPlaceholder}" style="flex:1;padding:12px;border:2px solid #e0e0e0;border-radius:var(--card-radius);font-size:14px;"><button type="button" class="suburb-check-btn" style="padding:10px 20px;background:var(--store-pickup-color);color:white;border:none;border-radius:var(--card-radius);cursor:pointer;font-weight:600;font-size:14px;">Check</button></div>
            <p class="suburb-message" style="font-size:12px;margin-top:8px;display:none;font-weight:500;"></p>
          </div>
          <div class="delivery-picker-controls delivery-step" style="display: none;">
            <label class="delivery-date-label">${config.deliveryTitle}</label>
            <div class="delivery-date-input-wrapper"><input class="delivery-date-input" readonly placeholder="${config.deliveryTitle}"><button type="button" class="calendar-icon-btn">📅</button><div class="delivery-calendar-popup"></div></div>
            ${timeInputHTML}
            <div style="display:flex;gap:8px;margin-top:16px;"><button type="button" class="calendar-back-btn" style="flex:1;padding:10px 20px;background:#f4f4f4;color:#333;border:1px solid #ddd;border-radius:var(--card-radius);cursor:pointer;font-weight:600;font-size:14px;">Back</button><button type="button" class="calendar-next-btn" style="flex:1;padding:10px 20px;background:var(--store-pickup-color);color:white;border:none;border-radius:var(--card-radius);cursor:pointer;font-weight:600;font-size:14px;">Next</button></div>
          </div>
          ${config.showShippingNote1 ? `<div class="shipping-note-wrapper shipping-note-1-section delivery-step" style="margin-top:16px;display:none;"><label style="font-weight:700;margin-bottom:8px;display:block;color:#333;font-size:14px;">${config.shippingNote1Heading}</label><textarea class="shipping-note-1" style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:var(--card-radius);font-size:14px;min-height:80px;resize:vertical;"></textarea><div style="display:flex;gap:8px;margin-top:8px;"><button type="button" class="shipping-note-1-back" style="flex:1;padding:10px 20px;background:#f4f4f4;color:#333;border:1px solid #ddd;border-radius:var(--card-radius);cursor:pointer;font-weight:600;font-size:14px;">Back</button><button type="button" class="shipping-note-1-next" style="flex:1;padding:10px 20px;background:var(--store-pickup-color);color:white;border:none;border-radius:var(--card-radius);cursor:pointer;font-weight:600;font-size:14px;">Next</button></div></div>` : ''}
          ${config.showShippingNote2 ? `<div class="shipping-note-wrapper shipping-note-2-section delivery-step" style="margin-top:16px;display:none;"><label style="font-weight:700;margin-bottom:8px;display:block;color:#333;font-size:14px;">${config.shippingNote2Heading}</label><textarea class="shipping-note-2" style="width:100%;padding:12px;border:2px solid #e0e0e0;border-radius:var(--card-radius);font-size:14px;min-height:80px;resize:vertical;"></textarea><div style="display:flex;gap:8px;margin-top:8px;"><button type="button" class="shipping-note-2-back" style="flex:1;padding:10px 20px;background:#f4f4f4;color:#333;border:1px solid #ddd;border-radius:var(--card-radius);cursor:pointer;font-weight:600;font-size:14px;">Back</button><button type="button" class="shipping-note-2-next" style="flex:1;padding:10px 20px;background:var(--store-pickup-color);color:white;border:none;border-radius:var(--card-radius);cursor:pointer;font-weight:600;font-size:14px;">Next</button></div></div>` : ''}
          ${config.showYesNo ? `<div class="yes-no-checkbox-wrapper delivery-step" style="margin-top:16px;padding:16px;border:2px solid #e0e0e0;border-radius:var(--card-radius);background:#f9f9f9;display:none;"><label style="font-weight:700;margin-bottom:12px;display:block;color:#333;font-size:14px;">${config.yesNoLabel} <span style="color:#d32f2f;">*</span></label><div style="display:flex;gap:24px;align-items:center;margin-bottom:16px;"><label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:500;color:#444;"><input type="radio" name="yes_no_choice" value="Yes" class="yes-no-input" style="width:18px;height:18px;cursor:pointer;accent-color:var(--store-pickup-color);"> ${config.yesText}</label><label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;font-weight:500;color:#444;"><input type="radio" name="yes_no_choice" value="No" class="yes-no-input" style="width:18px;height:18px;cursor:pointer;accent-color:var(--store-pickup-color);"> ${config.noText}</label></div><button type="button" class="yes-no-back-btn" style="width:100%;padding:10px 20px;background:#f4f4f4;color:#333;border:1px solid #ddd;border-radius:var(--card-radius);cursor:pointer;font-weight:600;font-size:14px;">Back</button></div>` : ''}
        </div>
        ${config.customHtml ? `<div class="custom-html-wrapper">${config.customHtml}</div>` : ''}
      `;

      const normalOption = wrapper.querySelector('.pickup-option.normal-shipping');
      const shippingOption = wrapper.querySelector('.pickup-option.shipping');
      const storeOption = wrapper.querySelector('.pickup-option.store-pickup');
      const storeInfo = wrapper.querySelector('.store-info');
      const storeSelect = wrapper.querySelector('.pickup-store-select');
      const deliverySection = wrapper.querySelector('.delivery-date-section');
      const dateInput = wrapper.querySelector('.delivery-date-input');
      const calendarBtn = wrapper.querySelector('.calendar-icon-btn');
      let calendarPopup = document.getElementById('calendar-portal-' + wrapperId);
      if (!calendarPopup) {
        calendarPopup = wrapper.querySelector('.delivery-calendar-popup');
        if (calendarPopup) {
          calendarPopup.id = 'calendar-portal-' + wrapperId;
          document.body.appendChild(calendarPopup);
        }
      }
      if (!calendarPopup) return;

      const suburbValidationSection = wrapper.querySelector('.suburb-validation-section');
      const timeInput = wrapper.querySelector('.delivery-time-input');
      const note1Section = wrapper.querySelector('.shipping-note-1-section');
      const note2Section = wrapper.querySelector('.shipping-note-2-section');
      const yesNoWrapper = wrapper.querySelector('.yes-no-checkbox-wrapper');
      const yesNoBackBtn = wrapper.querySelector('.yes-no-back-btn');
      const note1Next = wrapper.querySelector('.shipping-note-1-next');
      const note1Back = wrapper.querySelector('.shipping-note-1-back');
      const note2Next = wrapper.querySelector('.shipping-note-2-next');
      const note2Back = wrapper.querySelector('.shipping-note-2-back');
      const calendarNextBtn = wrapper.querySelector('.calendar-next-btn');
      const calendarBackBtn = wrapper.querySelector('.calendar-back-btn');
      const suburbInput = wrapper.querySelector('.suburb-input');
      const suburbCheckBtn = wrapper.querySelector('.suburb-check-btn');
      const suburbMessage = wrapper.querySelector('.suburb-message');
      const deliveryPickerControls = wrapper.querySelector('.delivery-picker-controls');
      const shippingNote1 = wrapper.querySelector('.shipping-note-1');
      const shippingNote2 = wrapper.querySelector('.shipping-note-2');
      const yesNoInputs = wrapper.querySelectorAll('.yes-no-input');
      const pickupOptionsContainer = wrapper.querySelector('.pickup-options');
      let currentMonth = new Date();

      function showDeliveryStep(stepName) {
        wrapper.querySelectorAll('.delivery-step').forEach(s => s.style.display = 'none');
        if (stepName === 'suburb') { if (suburbValidationSection) suburbValidationSection.style.display = 'block'; }
        else if (stepName === 'calendar') { if (deliveryPickerControls) deliveryPickerControls.style.display = 'block'; }
        else if (stepName === 'note1') { if (note1Section) note1Section.style.display = 'block'; }
        else if (stepName === 'note2') { if (note2Section) note2Section.style.display = 'block'; }
        else if (stepName === 'yesno') { if (yesNoWrapper) yesNoWrapper.style.display = 'block'; }
        updateCheckoutButtonState(wrapper);
      }

      if (deliverySection) deliverySection.style.display = 'none';
      updateCheckoutButtonState(wrapper);

      const activeOptions = [normalOption, shippingOption, storeOption].filter(opt => opt !== null);
      if (activeOptions.length === 1) {
        if (pickupOptionsContainer) pickupOptionsContainer.style.setProperty('display', 'none', 'important');
        setTimeout(() => activeOptions[0].click(), 100);
      }

      fetch('/cart.js').then(r => r.json()).then(cart => {
        if (cart.attributes && cart.attributes['Pickup Store'] && storeSelect) storeSelect.value = cart.attributes['Pickup Store'];
      });

      normalOption?.addEventListener('click', () => {
        wrapper.querySelectorAll('.pickup-option').forEach(opt => opt.classList.remove('active'));
        normalOption.classList.add('active');
        if (pickupOptionsContainer) pickupOptionsContainer.style.setProperty('display', 'none', 'important');
        if (storeInfo) storeInfo.classList.remove('active');
        if (deliverySection) deliverySection.style.display = 'none';
        if (yesNoWrapper) { yesNoWrapper.style.display = 'block'; if (yesNoBackBtn) yesNoBackBtn.style.display = 'none'; }
        if (suburbInput) suburbInput.value = '';
        if (suburbMessage) suburbMessage.style.display = 'none';
        matchedRule = null;
        updateCheckoutButtonState(wrapper);
        fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { 'Pickup Store': '', 'Delivery Date': '', 'Delivery Time': '', 'Delivery Type': 'Normal Shipping', 'Delivery Suburb': '', [config.shippingNote1Heading]: '', [config.shippingNote2Heading]: '' } }) });
      });

      shippingOption?.addEventListener('click', () => {
        wrapper.querySelectorAll('.pickup-option').forEach(opt => opt.classList.remove('active'));
        shippingOption.classList.add('active');
        if (pickupOptionsContainer) pickupOptionsContainer.style.setProperty('display', 'none', 'important');
        if (storeInfo) storeInfo.classList.remove('active');
        if (deliverySection) deliverySection.style.display = 'block';
        showDeliveryStep('suburb');
        if (yesNoBackBtn) yesNoBackBtn.style.display = 'block';
        if (suburbInput) suburbInput.value = '';
        if (suburbMessage) suburbMessage.style.display = 'none';
        if (shippingNote1) shippingNote1.value = '';
        if (shippingNote2) shippingNote2.value = '';
        matchedRule = null;
        updateCheckoutButtonState(wrapper);
        fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { 'Pickup Store': '', 'Delivery Type': 'Shipping' } }) });
      });

      storeOption?.addEventListener('click', () => {
        wrapper.querySelectorAll('.pickup-option').forEach(opt => opt.classList.remove('active'));
        storeOption.classList.add('active');
        if (pickupOptionsContainer) pickupOptionsContainer.style.setProperty('display', 'none', 'important');
        if (storeInfo) storeInfo.classList.add('active');
        if (deliverySection) deliverySection.style.display = 'none';
        if (yesNoWrapper) { yesNoWrapper.style.display = 'block'; if (yesNoBackBtn) yesNoBackBtn.style.display = 'none'; }
        if (suburbInput) suburbInput.value = '';
        if (suburbMessage) suburbMessage.style.display = 'none';
        matchedRule = null;
        updateCheckoutButtonState(wrapper);
        fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { 'Delivery Date': '', 'Delivery Time': '', 'Delivery Type': 'Store Pickup', [config.shippingNote1Heading]: '', [config.shippingNote2Heading]: '' } }) });
      });

      suburbCheckBtn?.addEventListener('click', () => {
        const val = suburbInput.value.trim();
        if (!val) { suburbMessage.textContent = 'Please enter a suburb or postcode'; suburbMessage.style.color = '#d32f2f'; suburbMessage.style.display = 'block'; return; }
        const rule = findMatchedRule(val);
        if (rule) {
          matchedRule = rule; suburbMessage.textContent = `✓ Delivery available for ${val}`; suburbMessage.style.color = '#2e7d32'; suburbMessage.style.display = 'block';
          showDeliveryStep('calendar'); dateInput.value = ''; renderCalendar();
          fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { 'Delivery Suburb': val } }) });
        } else {
          matchedRule = null; suburbMessage.textContent = '❌ Sorry, we do not deliver to this area'; suburbMessage.style.color = '#d32f2f'; suburbMessage.style.display = 'block';
        }
      });

      calendarBackBtn?.addEventListener('click', () => showDeliveryStep('suburb'));
      calendarNextBtn?.addEventListener('click', () => {
        if (!dateInput.value) { alert('Please select a delivery date'); return; }
        const [day, month, year] = dateInput.value.split('/');
        saveDate(new Date(year, month - 1, day));
      });

      note1Next?.addEventListener('click', () => { if (config.showShippingNote2) showDeliveryStep('note2'); else if (config.showYesNo) showDeliveryStep('yesno'); else { wrapper.querySelectorAll('.delivery-step').forEach(s => s.style.display = 'none'); updateCheckoutButtonState(wrapper); } });
      note1Back?.addEventListener('click', () => showDeliveryStep('calendar'));
      note2Next?.addEventListener('click', () => { if (config.showYesNo) showDeliveryStep('yesno'); else { wrapper.querySelectorAll('.delivery-step').forEach(s => s.style.display = 'none'); updateCheckoutButtonState(wrapper); } });
      note2Back?.addEventListener('click', () => { if (config.showShippingNote1) showDeliveryStep('note1'); else showDeliveryStep('calendar'); });
      yesNoBackBtn?.addEventListener('click', () => { if (config.showShippingNote2) showDeliveryStep('note2'); else if (config.showShippingNote1) showDeliveryStep('note1'); else showDeliveryStep('calendar'); });
      suburbInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); suburbCheckBtn.click(); } });

      storeSelect.addEventListener('change', () => {
        const selectedStore = storeSelect.value;
        updateCheckoutButtonState(wrapper);
        fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { 'Pickup Store': selectedStore } }) }).then(() => { if (selectedStore) fetch('/discount/FREEPICKUP'); });
      });

      checkoutButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          if (btn.classList.contains('checkout-button-blurred')) { e.preventDefault(); e.stopPropagation(); return; }
          window.combinedPickupCoordinator.isCheckingOut = true;
          window.combinedPickupCoordinator.updateButtons();
          if (storeOption && storeOption.classList.contains('active')) {
            if (btn.tagName === 'A') { e.preventDefault(); const url = new URL(btn.href, window.location.origin); url.searchParams.set('discount', 'FREEPICKUP'); window.location.href = url.toString(); }
            else { const form = btn.closest('form[action="/cart"]'); if (form) { let di = form.querySelector('input[name="discount"]'); if (!di) { di = document.createElement('input'); di.type = 'hidden'; di.name = 'discount'; form.appendChild(di); } di.value = 'FREEPICKUP'; } else { e.preventDefault(); window.location.href = `/checkout?discount=FREEPICKUP`; } }
          }
        });
      });

      function renderCalendar() {
        calendarPopup.innerHTML = '';
        const header = document.createElement('div'); header.className = 'calendar-header';
        header.innerHTML = `<button class="prev">‹</button><span class="month-label">${currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span><button class="next">›</button>`;
        const grid = document.createElement('div'); grid.className = 'calendar-grid';
        ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => { const wd = document.createElement('div'); wd.className = 'calendar-weekday'; wd.textContent = d; grid.appendChild(wd); });
        const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
        const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) grid.appendChild(document.createElement('div'));
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d);
          const cell = document.createElement('div'); cell.className = 'calendar-day'; cell.textContent = d;
          if (isDateBlocked(date)) cell.classList.add('disabled');
          else { cell.onclick = (e) => { e.stopPropagation(); dateInput.value = date.toLocaleDateString('en-GB'); calendarPopup.style.display = 'none'; wrapper.classList.remove('calendar-open'); updateCheckoutButtonState(wrapper); }; }
          grid.appendChild(cell);
        }
        calendarPopup.appendChild(header); calendarPopup.appendChild(grid);
        header.querySelector('.prev').onclick = (e) => { e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); };
        header.querySelector('.next').onclick = (e) => { e.stopPropagation(); currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); };
      }

      function saveDate(date) {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { 'Delivery Date': dateStr, 'Delivery Time': timeInput ? timeInput.value : '' } }) }).then(() => {
          if (config.showShippingNote1) showDeliveryStep('note1'); else if (config.showShippingNote2) showDeliveryStep('note2'); else if (config.showYesNo) showDeliveryStep('yesno'); else { wrapper.querySelectorAll('.delivery-step').forEach(s => s.style.display = 'none'); updateCheckoutButtonState(wrapper); }
        });
      }

      dateInput.addEventListener('click', (e) => { e.stopPropagation(); const isOpen = calendarPopup.style.display === 'block'; calendarPopup.style.display = isOpen ? 'none' : 'block'; if (!isOpen) { wrapper.classList.add('calendar-open'); renderCalendar(); } else { wrapper.classList.remove('calendar-open'); } });
      calendarBtn.addEventListener('click', (e) => { e.stopPropagation(); const isOpen = calendarPopup.style.display === 'block'; calendarPopup.style.display = isOpen ? 'none' : 'block'; if (!isOpen) { wrapper.classList.add('calendar-open'); renderCalendar(); } else { wrapper.classList.remove('calendar-open'); } });
      calendarPopup.addEventListener('click', e => e.stopPropagation());
      document.addEventListener('click', (e) => { if (!wrapper.contains(e.target)) { calendarPopup.style.display = 'none'; wrapper.classList.remove('calendar-open'); } });
      if (timeInput) timeInput.addEventListener('change', () => { if (timeInput.value) fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { 'Delivery Time': timeInput.value } }) }); });
      if (shippingNote1) shippingNote1.addEventListener('change', () => fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { [config.shippingNote1Heading]: shippingNote1.value } }) }));
      if (shippingNote2) shippingNote2.addEventListener('change', () => fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { [config.shippingNote2Heading]: shippingNote2.value } }) }));
      if (yesNoInputs.length > 0) yesNoInputs.forEach(input => input.addEventListener('change', () => { updateCheckoutButtonState(wrapper); fetch('/cart/update.js', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attributes: { [config.yesNoLabel]: input.value } }) }); }));

      if (checkoutButtons.length > 0 && !document.body.contains(wrapper)) {
        const firstBtn = checkoutButtons[0]; if (firstBtn.parentElement) firstBtn.parentElement.insertBefore(wrapper, firstBtn);
      }
    }

    // AJAX Cart Interceptors
    (function() {
      async function refreshCart() { 
        try {
          const resp = await fetch('/cart.js?v=' + Date.now());
          const cart = await resp.json();
          const allWrappers = document.querySelectorAll('.combined-wrapper');
          if (cart.item_count === 0 || (cart.items && cart.items.length === 0)) {
            allWrappers.forEach(w => {
              w.style.setProperty('display', 'none', 'important');
              w.innerHTML = '';
              w.removeAttribute('data-combined-wrapper-initialized');
              delete window.combinedPickupCoordinator.blocks[w.id];
            });
            window.combinedPickupCoordinator.updateButtons();
          } else {
            init(); setTimeout(init, 500); setTimeout(init, 1500);
          }
        } catch(e) { init(); }
      }
      const originalFetch = window.fetch;
      window.fetch = function() { return originalFetch.apply(this, arguments).then(response => { if (response && response.url && (response.url.includes('/cart/add') || response.url.includes('/cart/change') || response.url.includes('/cart/clear') || response.url.includes('/cart/update') || response.url.includes('/cart.js'))) refreshCart(); return response; }); };
      const originalXHR = window.XMLHttpRequest.prototype.send;
      window.XMLHttpRequest.prototype.send = function() { this.addEventListener('load', function() { if (this.responseURL && (this.responseURL.includes('/cart/add') || this.responseURL.includes('/cart/change') || this.responseURL.includes('/cart/clear') || this.responseURL.includes('/cart/update') || this.responseURL.includes('/cart.js'))) refreshCart(); }); return originalXHR.apply(this, arguments); };
      document.addEventListener('cart:updated', refreshCart); document.addEventListener('cart:refresh', refreshCart); document.addEventListener('ajaxProduct:added', refreshCart);
    })();

    // Background Monitor
    setInterval(async () => {
      if (window.combinedPickupCoordinator.isCheckingOut) return;
      try {
        const resp = await fetch('/cart.js?v=' + Date.now());
        const cart = await resp.json();
        const allWrappers = document.querySelectorAll('.combined-wrapper');
        if (cart.item_count === 0 || (cart.items && cart.items.length === 0)) {
          allWrappers.forEach(w => { 
            w.style.setProperty('display', 'none', 'important'); 
            w.innerHTML = ''; 
            w.removeAttribute('data-combined-wrapper-initialized'); 
            delete window.combinedPickupCoordinator.blocks[w.id];
          });
          window.combinedPickupCoordinator.updateButtons();
        } else { 
          allWrappers.forEach(w => {
            if (w.getAttribute('data-combined-wrapper-initialized') === 'true') {
              // MUST check if elements exist
              if (w.querySelector('.suburb-input')) updateCheckoutButtonState(w);
            } else {
              init(); 
            }
          });
        }
      } catch (e) {}
    }, 3000);

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    document.addEventListener('shopify:section:load', init); document.addEventListener('turbo:load', init);
    document.addEventListener('shopify:section:unload', () => { const wrapper = document.getElementById(config.wrapperId); if (wrapper) wrapper.remove(); const portal = document.getElementById('calendar-portal-' + config.wrapperId); if (portal) portal.remove(); });
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          if (Array.from(mutation.addedNodes).some(node => node.querySelector?.('button[name="checkout"]') || node.matches?.('button[name="checkout"]'))) { init(); break; }
        }
        if (mutation.removedNodes.length) init();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };
})();
