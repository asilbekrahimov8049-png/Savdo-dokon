/**
 * DO‘KON POS - 3 Xil To‘lov Tizimi (NAQD, KARTA, TERMINAL) & Split Payment
 * Bo‘lib to‘lash, qaytim (sdacha) hisoblash, to‘lovlarni tekshirish va kassa yakuni
 * Foydalanuvchi talabi: Printerdan chiqarish mutlaqo o‘chirilgan.
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
    // Input elementlari o'zgarishi
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

    // To'lovni tasdiqlash
    const completeSaleBtn = document.getElementById('completeSaleBtn');
    if (completeSaleBtn) {
      completeSaleBtn.addEventListener('click', () => {
        this.processSaleCompletion();
      });
    }

    // Modalni yopish
    const closeBtn = document.getElementById('closePaymentModalBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.closePaymentModal();
      });
    }
  }

  // To'lov modal oynasini ochish
  openPaymentModal(totalAmount, items) {
    this.totalDue = totalAmount;
    this.cartItems = items;

    // Standart holatda to'liq naqd qilib qo'yiladi, sotuvchi bir zumda o'zgartira oladi
    this.cashAmount = totalAmount;
    this.cardAmount = 0;
    this.terminalAmount = 0;
    this.activeInput = 'cash';

    const modal = document.getElementById('paymentModal');
    const modalTotalDue = document.getElementById('modalTotalDue');

    if (modalTotalDue) modalTotalDue.textContent = window.app.formatMoney(this.totalDue);
    document.querySelectorAll('.modalDueAmountText').forEach(el => {
      el.textContent = window.app.formatMoney(this.totalDue);
    });

    this.updateInputFields();
    this.highlightActiveInput();
    this.calculateAndValidate();

    if (modal) {
      modal.classList.add('active');
      setTimeout(() => {
        const cashInp = document.getElementById('payCashInput');
        if (cashInp) {
          cashInp.focus();
          cashInp.select();
        }
      }, 100);
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

    this.cashAmount = parseFloat(cashInput?.value) || 0;
    this.cardAmount = parseFloat(cardInput?.value) || 0;
    this.terminalAmount = parseFloat(terminalInput?.value) || 0;
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

  // 1 KLIKDA TO'LOV VA SAQLASH (Modal ichidagi 3 ta kartadan birini bosganda bir zumda saqlaydi!)
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

  // Tezkor to'lov tugmalari: To'liq Naqd, To'liq Karta, To'liq Terminal
  setFullPayment(type) {
    this.cashAmount = 0;
    this.cardAmount = 0;
    this.terminalAmount = 0;

    if (type === 'cash') this.cashAmount = this.totalDue;
    if (type === 'card') this.cardAmount = this.totalDue;
    if (type === 'terminal') this.terminalAmount = this.totalDue;

    this.activeInput = type;
    this.updateInputFields();
    this.highlightActiveInput();
    this.calculateAndValidate();
  }

  // Tezkor kupyuralar (Naqd uchun)
  addCashDenomination(amount) {
    if (this.activeInput !== 'cash') {
      this.activeInput = 'cash';
      this.highlightActiveInput();
    }

    if (amount === 'exact') {
      const nonCash = this.cardAmount + this.terminalAmount;
      this.cashAmount = Math.max(0, this.totalDue - nonCash);
    } else {
      this.cashAmount += amount;
    }

    this.updateInputFields();
    this.calculateAndValidate();
  }

  // Numpad kiritish
  handleNumpadInput(val) {
    let currentVal = '';
    if (this.activeInput === 'cash') currentVal = String(this.cashAmount || '');
    if (this.activeInput === 'card') currentVal = String(this.cardAmount || '');
    if (this.activeInput === 'terminal') currentVal = String(this.terminalAmount || '');

    if (val === 'C') {
      currentVal = '';
    } else if (val === 'backspace') {
      currentVal = currentVal.slice(0, -1);
    } else if (val === '00' || val === '000') {
      if (currentVal && currentVal !== '0') {
        currentVal += val;
      }
    } else {
      if (currentVal === '0') currentVal = '';
      currentVal += val;
    }

    const num = parseFloat(currentVal) || 0;
    if (this.activeInput === 'cash') this.cashAmount = num;
    if (this.activeInput === 'card') this.cardAmount = num;
    if (this.activeInput === 'terminal') this.terminalAmount = num;

    this.updateInputFields();
    this.calculateAndValidate();
  }

  // Hisoblash va to'lovni tekshirish (VALIDATION)
  calculateAndValidate() {
    const totalPaid = this.cashAmount + this.cardAmount + this.terminalAmount;
    const diff = totalPaid - this.totalDue;

    const totalPaidEl = document.getElementById('payTotalEntered');
    const statusBox = document.getElementById('paymentStatusBox');
    const completeBtn = document.getElementById('completeSaleBtn');

    if (totalPaidEl) totalPaidEl.textContent = window.app.formatMoney(totalPaid);

    let isValid = false;
    let changeAmount = 0;

    // Karta yoki terminal summasi umumiy summadan ortiq bo'lmasligi kerak
    const nonCash = this.cardAmount + this.terminalAmount;
    if (nonCash > this.totalDue) {
      if (statusBox) {
        statusBox.className = 'payment-status-box error';
        statusBox.innerHTML = `
          <i class="fa-solid fa-triangle-exclamation"></i>
          <div>
            <strong>Xatolik:</strong> Karta va terminal to‘lovi umumiy summadan (${window.app.formatMoney(this.totalDue)}) ko‘p bo‘lishi mumkin emas!
          </div>
        `;
      }
      if (completeBtn) completeBtn.disabled = true;
      return false;
    }

    if (diff < 0) {
      // Pul kam kiritilgan
      const remaining = Math.abs(diff);
      if (statusBox) {
        statusBox.className = 'payment-status-box warning';
        statusBox.innerHTML = `
          <i class="fa-solid fa-circle-exclamation"></i>
          <div>
            <strong>Yetishmayapti:</strong> <span class="highlight-warn">${window.app.formatMoney(remaining)}</span> to‘lanishi kerak.
          </div>
        `;
      }
      isValid = false;
    } else if (diff === 0) {
      // To'lov to'liq va aniq
      if (statusBox) {
        statusBox.className = 'payment-status-box success';
        statusBox.innerHTML = `
          <i class="fa-solid fa-circle-check"></i>
          <div>
            <strong>To‘lov to‘liq:</strong> Hech qanday qaytim yo‘q. Savdoni yakunlash mumkin.
          </div>
        `;
      }
      isValid = true;
    } else {
      // diff > 0 (Ortiqcha pul berilgan - Qaytim / Sdacha)
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

  // Savdoni yakunlash va saqlash
  async processSaleCompletion() {
    const valResult = this.calculateAndValidate();
    if (!valResult || !valResult.isValid) {
      window.app.showToast('To‘lov summasi to‘liq emas! Iltimos, tekshiring.', 'error');
      if (window.soundService) window.soundService.playError();
      return;
    }

    const { changeAmount } = valResult;

    // To'lov turlarini aniqlash
    const paymentTypes = [];
    if (this.cashAmount > 0) paymentTypes.push('naqd');
    if (this.cardAmount > 0) paymentTypes.push('karta');
    if (this.terminalAmount > 0) paymentTypes.push('terminal');

    const saleData = {
      items: JSON.parse(JSON.stringify(this.cartItems)),
      totalQuantity: this.cartItems.reduce((acc, i) => acc + i.qty, 0),
      totalAmount: this.totalDue,
      cashAmount: this.cashAmount,
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

      // Kassa jiringlashi
      if (window.soundService) window.soundService.playSuccess();

      // Modalni yopish
      this.closePaymentModal();

      // Savatni tozalash
      window.posManager.clearCart();

      // Dashboard ko'rsatkichlarini yangilash
      window.posManager.updateDashboardMetrics();

      // Muvaffaqiyat xabari (Printerdan chiqarish SHARTMAS va UMUMAN CHIQARILMAYDI)
      const payDetail = [];
      if (savedSale.cashAmount > 0) payDetail.push(`Naqd: ${window.app.formatMoney(savedSale.cashAmount)}`);
      if (savedSale.cardAmount > 0) payDetail.push(`Karta: ${window.app.formatMoney(savedSale.cardAmount)}`);
      if (savedSale.terminalAmount > 0) payDetail.push(`Terminal: ${window.app.formatMoney(savedSale.terminalAmount)}`);
      
      const changeMsg = changeAmount > 0 ? ` (Qaytim: ${window.app.formatMoney(changeAmount)})` : '';
      window.app.showToast(`Savdo muvaffaqiyatli saqlandi! [${payDetail.join(', ')}]${changeMsg}`, 'success');

      // Tarix va hisobotlar sahifalarini ham fonida yangilab qo'yish
      if (window.historyManager) {
        window.historyManager.loadData().then(() => window.historyManager.renderSalesList());
      }
      if (window.reportsManager) {
        window.reportsManager.loadData();
      }

    } catch (err) {
      console.error('Savdoni saqlashda xatolik:', err);
      window.app.showToast('Savdoni saqlashda xatolik yuz berdi!', 'error');
      if (window.soundService) window.soundService.playError();
    }
  }
}

window.paymentManager = new PaymentManager();
