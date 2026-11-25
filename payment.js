/**
 * DO‘KON POS - 3 Xil To‘lov Tizimi (NAQD, KARTA, TERMINAL) va Aralash To‘lov
 * Bir bosishda to‘lash, bo‘lib to‘lash (split payment), qaytim (sdacha) hisoblash.
 */

class PaymentManager {
  constructor() {
    this.totalDue = 0;
    this.cartItems = [];
    this.activeInput = 'cash'; // 'cash', 'card', 'terminal'
    this.cashAmount = 0;
    this.cardAmount = 0;
    this.terminalAmount = 0;
  }

  init() {
    this.bindEvents();
  }

  bindEvents() {
    const cashInput = document.getElementById('payCashInput');
    const cardInput = document.getElementById('payCardInput');
    const terminalInput = document.getElementById('payTerminalInput');

    [cashInput, cardInput, terminalInput].forEach(inp => {
      if (!inp) return;

      inp.addEventListener('focus', () => {
        this.activeInput = inp.getAttribute('data-type');
        this.highlightActiveInput();
      });

      inp.addEventListener('input', () => {
        this.syncInputsToState();
        this.calculateAndValidate();
      });
    });

    const completeSaleBtn = document.getElementById('completeSaleBtn');
    if (completeSaleBtn) {
      completeSaleBtn.addEventListener('click', () => {
        this.processSaleCompletion();
      });
    }

    const closeBtn = document.getElementById('closePaymentModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closePaymentModal();
      });
    }
  }

  openPaymentModal(totalAmount, items, openSplit = false) {
    this.totalDue = totalAmount;
    this.cartItems = items;

    if (openSplit) {
      this.cashAmount = 0;
      this.cardAmount = 0;
      this.terminalAmount = 0;
    } else {
      this.cashAmount = totalAmount;
      this.cardAmount = 0;
      this.terminalAmount = 0;
    }
    this.activeInput = 'cash';

    const modal = document.getElementById('paymentModal');
    const modalTotalDue = document.getElementById('modalTotalDue');
    const splitAccordion = document.getElementById('splitPaymentAccordion');

    if (modalTotalDue) modalTotalDue.textContent = window.app.formatMoney(this.totalDue);
    document.querySelectorAll('.modalDueAmountText').forEach(el => {
      el.textContent = window.app.formatMoney(this.totalDue);
    });

    if (splitAccordion) {
      splitAccordion.open = !!openSplit;
    }

    this.updateInputFields();
    this.highlightActiveInput();
    this.calculateAndValidate();

    if (modal) {
      modal.classList.add('active');
      if (window.app && window.app.pushNavState) {
        window.app.pushNavState({ view: window.app.currentView, modal: 'paymentModal' });
      }
      if (openSplit) {
        setTimeout(() => {
          const cashInp = document.getElementById('payCashInput');
          if (cashInp) cashInp.focus();
        }, 100);
      }
    }
  }

  closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  updateInputFields() {
    const cashInput = document.getElementById('payCashInput');
    const cardInput = document.getElementById('payCardInput');
    const terminalInput = document.getElementById('payTerminalInput');

    if (cashInput) cashInput.value = this.cashAmount > 0 ? this.cashAmount : '';
    if (cardInput) cardInput.value = this.cardAmount > 0 ? this.cardAmount : '';
    if (terminalInput) terminalInput.value = this.terminalAmount > 0 ? this.terminalAmount : '';
  }

  syncInputsToState() {
    const cashInput = document.getElementById('payCashInput');
    const cardInput = document.getElementById('payCardInput');
    const terminalInput = document.getElementById('payTerminalInput');

    this.cashAmount = Math.max(0, parseFloat(cashInput?.value) || 0);
    this.cardAmount = Math.max(0, parseFloat(cardInput?.value) || 0);
    this.terminalAmount = Math.max(0, parseFloat(terminalInput?.value) || 0);
  }

  highlightActiveInput() {
    document.querySelectorAll('.payment-type-card').forEach(card => {
      card.classList.remove('active-focus');
    });

    const activeCard = document.getElementById(`payCard_${this.activeInput}`);
    if (activeCard) {
      activeCard.classList.add('active-focus');
    }
  }

  async payAndComplete(type) {
    this.closePaymentModal();
    if (type === 'cash' || type === 'naqd') {
      await window.posManager.instantPay('naqd');
    } else if (type === 'card' || type === 'karta') {
      await window.posManager.instantPay('karta');
    } else if (type === 'terminal') {
      await window.posManager.instantPay('terminal');
    }
  }

  setRemainingTo(type) {
    const others = (type === 'cash' ? 0 : this.cashAmount) +
      (type === 'card' ? 0 : this.cardAmount) +
      (type === 'terminal' ? 0 : this.terminalAmount);
    const remaining = Math.max(0, this.totalDue - others);

    if (type === 'cash') this.cashAmount = remaining;
    if (type === 'card') this.cardAmount = remaining;
    if (type === 'terminal') this.terminalAmount = remaining;

    this.activeInput = type;
    this.updateInputFields();
    this.highlightActiveInput();
    this.calculateAndValidate();
  }

  calculateAndValidate() {
    const totalPaid = this.cashAmount + this.cardAmount + this.terminalAmount;
    const diff = totalPaid - this.totalDue;

    const totalPaidEl = document.getElementById('payTotalEntered');
    const statusBox = document.getElementById('paymentStatusBox');
    const completeBtn = document.getElementById('completeSaleBtn');

    if (totalPaidEl) totalPaidEl.textContent = window.app.formatMoney(totalPaid);

    let isValid = false;
    let changeAmount = 0;

    const nonCash = this.cardAmount + this.terminalAmount;
    if (nonCash > this.totalDue) {
      if (statusBox) {
        statusBox.className = 'payment-status-box error';
        statusBox.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <strong>Xatolik:</strong> Karta va terminal summasi jami to‘lovdan (${window.app.formatMoney(this.totalDue)}) oshmasligi kerak!
          </div>
        `;
      }
      if (completeBtn) completeBtn.disabled = true;
      return false;
    }

    if (diff < 0) {
      const remaining = Math.abs(diff);
      if (statusBox) {
        statusBox.className = 'payment-status-box warning';
        statusBox.innerHTML = `
          <i class="fa-solid fa-circle-exclamation"></i>
          <div>
            <strong>Yetishmayapti:</strong> yana <span class="highlight-warn">${window.app.formatMoney(remaining)}</span> kiritilishi kerak.
          </div>
        `;
      }
      isValid = false;
    } else if (diff === 0) {
      if (statusBox) {
        statusBox.className = 'payment-status-box success';
        statusBox.innerHTML = `
          <i class="fa-solid fa-circle-check"></i>
          <div>
            <strong>To‘lov to‘liq:</strong> Qaytim yo‘q. Savdoni saqlash mumkin.
          </div>
        `;
      }
      isValid = true;
    } else {
      changeAmount = diff;
      if (statusBox) {
        statusBox.className = 'payment-status-box change';
        statusBox.innerHTML = `
          <i class="fa-solid fa-hand-holding-dollar"></i>
          <div>
            <strong>Xaridorga qaytim (sdacha):</strong> <span class="highlight-change">${window.app.formatMoney(changeAmount)}</span>
          </div>
        `;
      }
      isValid = true;
    }

    if (completeBtn) {
      completeBtn.disabled = !isValid;
    }

    return { isValid, changeAmount };
  }

  async processSaleCompletion() {
    const valResult = this.calculateAndValidate();
    if (!valResult || !valResult.isValid) {
      window.app.showToast('To‘lov summasi to‘liq emas! Iltimos, tekshiring.', 'error');
      if (window.soundService) window.soundService.playError();
      return;
    }

    const { changeAmount } = valResult;

    // Aralash to'lovda naqd tushum sifatida haqiqiy tushgan naqd (qaytim ayirilgan) saqlanadi
    const netCashAmount = Math.max(0, this.cashAmount - changeAmount);

    const paymentTypes = [];
    if (netCashAmount > 0 || this.cashAmount > 0) paymentTypes.push('naqd');
    if (this.cardAmount > 0) paymentTypes.push('karta');
    if (this.terminalAmount > 0) paymentTypes.push('terminal');

    const saleData = {
      items: JSON.parse(JSON.stringify(this.cartItems)),
      totalQuantity: this.cartItems.reduce((acc, i) => acc + i.qty, 0),
      totalAmount: this.totalDue,
      cashAmount: netCashAmount,
      cardAmount: this.cardAmount,
      terminalAmount: this.terminalAmount,
      changeAmount: changeAmount,
      paymentTypes: paymentTypes,
      status: 'completed',
      cashier: 'Sotuvchi #1',
      createdAt: new Date().toISOString()
    };

    try {
      const savedSale = await window.storageService.addSale(saleData);
      if (window.soundService) window.soundService.playSuccess();

      this.closePaymentModal();
      window.posManager.clearCart();
      window.posManager.closeMobileCart();
      window.posManager.updateDashboardMetrics();

      const payDetail = [];
      if (savedSale.cashAmount > 0) payDetail.push(`Naqd: ${window.app.formatMoney(savedSale.cashAmount)}`);
      if (savedSale.cardAmount > 0) payDetail.push(`Karta: ${window.app.formatMoney(savedSale.cardAmount)}`);
      if (savedSale.terminalAmount > 0) payDetail.push(`Terminal: ${window.app.formatMoney(savedSale.terminalAmount)}`);

      const changeMsg = changeAmount > 0 ? ` • Qaytim: ${window.app.formatMoney(changeAmount)}` : '';
      window.app.showToast(`Savdo saqlandi (${savedSale.receiptNumber}): ${payDetail.join(' + ')}${changeMsg}`, 'success');

      if (window.historyManager) {
        window.historyManager.loadData().then(() => window.historyManager.renderSalesList());
      }
      if (window.reportsManager) {
        window.reportsManager.loadData().then(() => window.reportsManager.renderAll());
      }
    } catch (err) {
      console.error('Savdoni saqlashda xatolik:', err);
      window.app.showToast('Savdoni saqlashda xatolik yuz berdi!', 'error');
      if (window.soundService) window.soundService.playError();
    }
  }
}

window.paymentManager = new PaymentManager();
