/**
 * DO‘KON POS - Savdolar Tarixi (Sales History)
 * Savdolar ro‘yxati, sana bo‘yicha qidirish va filtrlar,
 * mahsulotlar kesimida sotuvlar, naqd/karta/terminal tushumlari va tafsilotlar.
 */

class HistoryManager {
  constructor() {
    this.sales = [];
    this.searchQuery = '';
    this.dateFilter = 'today'; // 'today', 'yesterday', 'week', 'month', 'all', 'custom', 'exact'
    this.exactDate = '';
    this.customStartDate = null;
    this.customEndDate = null;
    this.statusFilter = 'all';
    this.paymentFilter = 'all'; // 'all', 'cash', 'card', 'terminal', 'split'
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.renderSalesList();
  }

  async loadData() {
    this.sales = await window.storageService.getSales();
  }

  bindEvents() {
    const searchInp = document.getElementById('historySearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderSalesList();
      });
    }

    // Aniq bir kun bo'yicha qidiruv (Sana tanlash)
    const exactDateInp = document.getElementById('historyExactDate');
    if (exactDateInp) {
      exactDateInp.addEventListener('change', (e) => {
        this.exactDate = e.target.value;
        if (this.exactDate) {
          this.dateFilter = 'exact';
          document.querySelectorAll('.history-date-filter-btn').forEach(b => b.classList.remove('active'));
          const customBox = document.getElementById('historyCustomDateRange');
          if (customBox) customBox.style.display = 'none';
        } else {
          this.dateFilter = 'today';
          document.querySelector('.history-date-filter-btn[data-filter="today"]')?.classList.add('active');
        }
        this.renderSalesList();
      });
    }

    const dateBtns = document.querySelectorAll('.history-date-filter-btn');
    dateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dateBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.dateFilter = btn.getAttribute('data-filter');

        if (exactDateInp) {
          exactDateInp.value = '';
          this.exactDate = '';
        }

        const customDateBox = document.getElementById('historyCustomDateRange');
        if (customDateBox) {
          customDateBox.style.display = this.dateFilter === 'custom' ? 'flex' : 'none';
        }

        this.renderSalesList();
      });
    });

    const startInp = document.getElementById('historyStartDate');
    const endInp = document.getElementById('historyEndDate');
    if (startInp && endInp) {
      const onDateChange = () => {
        this.customStartDate = startInp.value;
        this.customEndDate = endInp.value;
        this.renderSalesList();
      };
      startInp.addEventListener('change', onDateChange);
      endInp.addEventListener('change', onDateChange);
    }

    const statusSelect = document.getElementById('historyStatusFilter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.renderSalesList();
      });
    }

    const paymentSelect = document.getElementById('historyPaymentFilter');
    if (paymentSelect) {
      paymentSelect.addEventListener('change', (e) => {
        this.paymentFilter = e.target.value;
        this.renderSalesList();
      });
    }

    const closeDetailBtn = document.getElementById('closeSaleDetailModalBtn');
    const closeDetailFooterBtn = document.getElementById('closeSaleDetailFooterBtn');
    [closeDetailBtn, closeDetailFooterBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          document.getElementById('saleDetailModal')?.classList.remove('active');
        });
      }
    });
  }

  getFilteredSales() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);

      let matchDate = true;
      if (this.dateFilter === 'today') {
        matchDate = saleDate >= todayStart;
      } else if (this.dateFilter === 'yesterday') {
        matchDate = saleDate >= yesterdayStart && saleDate < todayStart;
      } else if (this.dateFilter === 'week') {
        matchDate = saleDate >= weekStart;
      } else if (this.dateFilter === 'month') {
        matchDate = saleDate >= monthStart;
      } else if (this.dateFilter === 'exact' && this.exactDate) {
        const y = saleDate.getFullYear();
        const m = String(saleDate.getMonth() + 1).padStart(2, '0');
        const d = String(saleDate.getDate()).padStart(2, '0');
        matchDate = `${y}-${m}-${d}` === this.exactDate;
      } else if (this.dateFilter === 'custom') {
        if (this.customStartDate) {
          const s = new Date(this.customStartDate);
          s.setHours(0, 0, 0, 0);
          matchDate = matchDate && (saleDate >= s);
        }
        if (this.customEndDate) {
          const e = new Date(this.customEndDate);
          e.setHours(23, 59, 59, 999);
          matchDate = matchDate && (saleDate <= e);
        }
      }

      let matchSearch = true;
      if (this.searchQuery) {
        const dateStr = saleDate.toLocaleDateString('uz-UZ');
        const receiptMatch = (sale.receiptNumber || '').toLowerCase().includes(this.searchQuery);
        const dateMatch = dateStr.toLowerCase().includes(this.searchQuery);
        const itemMatch = sale.items && sale.items.some(i => (i.name || '').toLowerCase().includes(this.searchQuery));
        matchSearch = receiptMatch || dateMatch || itemMatch;
      }

      let matchStatus = true;
      if (this.statusFilter !== 'all') {
        matchStatus = sale.status === this.statusFilter;
      }

      let matchPayment = true;
      if (this.paymentFilter !== 'all') {
        if (this.paymentFilter === 'cash') matchPayment = sale.cashAmount > 0;
        if (this.paymentFilter === 'card') matchPayment = sale.cardAmount > 0;
        if (this.paymentFilter === 'terminal') matchPayment = sale.terminalAmount > 0;
        if (this.paymentFilter === 'split') {
          const activeModes = [sale.cashAmount > 0, sale.cardAmount > 0, sale.terminalAmount > 0].filter(Boolean).length;
          matchPayment = activeModes > 1;
        }
      }

      return matchDate && matchSearch && matchStatus && matchPayment;
    });
  }

  renderProductBreakdown(validSales) {
    const box = document.getElementById('historyProductBreakdown');
    if (!box) return;

    const map = {};
    validSales.forEach(sale => {
      (sale.items || []).forEach(item => {
        const key = `${item.name}__${item.price}`;
        if (!map[key]) {
          map[key] = {
            name: item.name,
            price: item.price,
            qty: 0,
            unit: item.unit || 'dona',
            total: 0
          };
        }
        map[key].qty += Number(item.qty || 0);
        map[key].total += Number(item.price || 0) * Number(item.qty || 0);
      });
    });

    const rows = Object.values(map).sort((a, b) => b.qty - a.qty);

    if (rows.length === 0) {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    box.innerHTML = `
      <div class="history-prod-summary-card">
        <div class="history-prod-summary-head">
          <span><i class="fa-solid fa-boxes-stacked"></i> Tanlangan davrda sotilgan mahsulotlar (${rows.length} tur)</span>
        </div>
        <div class="history-prod-chips">
          ${rows.map(r => `
            <div class="history-prod-chip">
              <span class="chip-name">${this.escapeHtml(r.name)}</span>
              <span class="chip-qty">${r.qty} ${this.escapeHtml(r.unit)}</span>
              <span class="chip-sum">${window.app.formatMoney(r.total)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderSalesList() {
    const listBody = document.getElementById('historyTableBody');
    const statsEl = document.getElementById('historyFilteredStats');
    if (!listBody) return;

    const filtered = this.getFilteredSales();
    const validSales = filtered.filter(s => s.status !== 'cancelled');

    const totalSum = validSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalCash = validSales.reduce((acc, s) => acc + (s.cashAmount || 0), 0);
    const totalCard = validSales.reduce((acc, s) => acc + (s.cardAmount || 0), 0);
    const totalTerminal = validSales.reduce((acc, s) => acc + (s.terminalAmount || 0), 0);

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="history-summary-strip">
          <div class="summary-pill total">
            <span>Savdolar:</span>
            <strong>${filtered.length} ta</strong>
          </div>
          <div class="summary-pill amount">
            <span>Jami tushum:</span>
            <strong>${window.app.formatMoney(totalSum)}</strong>
          </div>
          <div class="summary-pill cash">
            <span>Naqd:</span>
            <strong>${window.app.formatMoney(totalCash)}</strong>
          </div>
          <div class="summary-pill card">
            <span>Karta:</span>
            <strong>${window.app.formatMoney(totalCard)}</strong>
          </div>
          <div class="summary-pill terminal">
            <span>Terminal:</span>
            <strong>${window.app.formatMoney(totalTerminal)}</strong>
          </div>
        </div>
      `;
    }

    this.renderProductBreakdown(validSales);

    if (filtered.length === 0) {
      listBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-6 text-muted">
            <i class="fa-solid fa-receipt fa-2x mb-2 d-block"></i>
            Tanlangan sana yoki filtr bo‘yicha savdolar topilmadi
          </td>
        </tr>
      `;
      return;
    }

    listBody.innerHTML = filtered.map(sale => {
      const date = new Date(sale.createdAt);
      const formattedDate = date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const formattedTime = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
      const isCancelled = sale.status === 'cancelled';

      const paymentTags = [];
      if (sale.cashAmount > 0) {
        paymentTags.push(`<span class="pay-badge cash"><i class="fa-solid fa-money-bill-wave"></i> Naqd: ${window.app.formatMoney(sale.cashAmount)}</span>`);
      }
      if (sale.cardAmount > 0) {
        paymentTags.push(`<span class="pay-badge card"><i class="fa-solid fa-credit-card"></i> Karta: ${window.app.formatMoney(sale.cardAmount)}</span>`);
      }
      if (sale.terminalAmount > 0) {
        paymentTags.push(`<span class="pay-badge terminal"><i class="fa-solid fa-calculator"></i> Terminal: ${window.app.formatMoney(sale.terminalAmount)}</span>`);
      }

      const itemsSummary = (sale.items || []).map(i => `${i.name} (${i.qty})`).join(', ');

      return `
        <tr class="${isCancelled ? 'row-cancelled' : ''}">
          <td data-label="Chek №">
            <div class="receipt-num font-mono">
              <strong>${this.escapeHtml(sale.receiptNumber)}</strong>
            </div>
          </td>
          <td data-label="Sana va Vaqt">
            <div class="date-time-cell">
              <span><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
              <small class="text-muted"><i class="fa-regular fa-clock"></i> ${formattedTime}</small>
            </div>
          </td>
          <td data-label="Mahsulotlar">
            <div class="history-items-summary" title="${this.escapeHtml(itemsSummary)}">
              <span class="badge-item-count">${sale.totalQuantity} dona</span>
              <span class="items-text">${this.escapeHtml(itemsSummary)}</span>
            </div>
          </td>
          <td class="font-bold font-mono ${isCancelled ? 'line-through text-muted' : 'text-primary'}" data-label="Summa">
            ${window.app.formatMoney(sale.totalAmount)}
          </td>
          <td data-label="To‘lov">
            <div class="payment-badges-wrap">
              ${paymentTags.join(' ')}
            </div>
          </td>
          <td data-label="Holat">
            ${isCancelled
              ? `<span class="badge-status-cancelled" title="${this.escapeHtml(sale.cancelReason || 'Bekor qilingan')}"><i class="fa-solid fa-ban"></i> Bekor qilingan</span>`
              : `<span class="badge-status-completed"><i class="fa-solid fa-circle-check"></i> Muvaffaqiyatli</span>`
            }
          </td>
          <td class="text-right" data-label="Amallar">
            <div class="action-buttons-wrap">
              <button type="button" class="btn-action view" title="Tafsilotlarni ko‘rish" onclick="window.historyManager.viewSaleDetail('${sale.id}')">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button type="button" class="btn-action print" title="Chekni ko‘rish / chop etish" onclick="window.historyManager.reprintReceipt('${sale.id}')">
                <i class="fa-solid fa-print"></i>
              </button>
              ${!isCancelled ? `
                <button type="button" class="btn-action cancel" title="Savdoni bekor qilish" onclick="window.historyManager.promptCancelSale('${sale.id}')">
                  <i class="fa-solid fa-ban"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  viewSaleDetail(saleId) {
    const sale = this.sales.find(s => s.id === saleId);
    if (!sale) return;

    const modal = document.getElementById('saleDetailModal');
    const content = document.getElementById('saleDetailContent');
    if (!modal || !content) return;

    const date = new Date(sale.createdAt);
    const isCancelled = sale.status === 'cancelled';

    content.innerHTML = `
      <div class="detail-header-block">
        <div class="detail-title">
          <h3>Chek: ${this.escapeHtml(sale.receiptNumber)}</h3>
          <span class="detail-status ${isCancelled ? 'cancelled' : 'completed'}">
            ${isCancelled ? 'BEKOR QILINGAN' : 'MUVAFFAQIYATLI SAVDO'}
          </span>
        </div>
        <p class="text-muted"><i class="fa-regular fa-clock"></i> ${date.toLocaleString('uz-UZ')}</p>
        ${isCancelled && sale.cancelReason ? `<div class="cancel-alert"><strong>Bekor qilish sababi:</strong> ${this.escapeHtml(sale.cancelReason)}</div>` : ''}
      </div>

      <div class="detail-items-table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Mahsulot</th>
              <th>Narxi</th>
              <th>Soni</th>
              <th class="text-right">Jami</th>
            </tr>
          </thead>
          <tbody>
            ${(sale.items || []).map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${this.escapeHtml(item.name)}</strong></td>
                <td>${window.app.formatMoney(item.price)}</td>
                <td>${item.qty} ${this.escapeHtml(item.unit || 'dona')}</td>
                <td class="text-right font-bold">${window.app.formatMoney(item.price * item.qty)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="detail-totals-box">
        <div class="tot-row">
          <span>Jami mahsulotlar soni:</span>
          <strong>${sale.totalQuantity} dona</strong>
        </div>
        <div class="tot-row main">
          <span>Umumiy summa:</span>
          <strong>${window.app.formatMoney(sale.totalAmount)}</strong>
        </div>
        <hr class="detail-hr">
        <div class="tot-row">
          <span><i class="fa-solid fa-money-bill-wave text-success"></i> Naqd to‘lov:</span>
          <span>${window.app.formatMoney(sale.cashAmount)}</span>
        </div>
        <div class="tot-row">
          <span><i class="fa-solid fa-credit-card text-primary"></i> Karta to‘lovi:</span>
          <span>${window.app.formatMoney(sale.cardAmount)}</span>
        </div>
        <div class="tot-row">
          <span><i class="fa-solid fa-calculator text-warning"></i> Terminal to‘lovi:</span>
          <span>${window.app.formatMoney(sale.terminalAmount)}</span>
        </div>
        ${sale.changeAmount > 0 ? `
          <div class="tot-row change">
            <span>Qaytim (sdacha):</span>
            <strong class="text-success">${window.app.formatMoney(sale.changeAmount)}</strong>
          </div>
        ` : ''}
      </div>

      <div class="detail-actions">
        <button type="button" class="btn-primary" onclick="window.historyManager.reprintReceipt('${sale.id}')">
          <i class="fa-solid fa-print"></i> Chekni chop etish
        </button>
        ${!isCancelled ? `
          <button type="button" class="btn-primary btn-danger" onclick="window.historyManager.promptCancelSale('${sale.id}')">
            <i class="fa-solid fa-ban"></i> Savdoni bekor qilish
          </button>
        ` : ''}
      </div>
    `;

    modal.classList.add('active');
    if (window.app && window.app.pushNavState) {
      window.app.pushNavState({ view: 'history', modal: 'saleDetailModal' });
    }
  }

  async promptCancelSale(saleId) {
    const sale = this.sales.find(s => s.id === saleId);
    if (!sale) return;

    const confirmed = await window.app.showConfirm({
      title: 'Savdoni bekor qilish',
      message: `«${sale.receiptNumber}» raqamli (${window.app.formatMoney(sale.totalAmount)}) savdoni bekor qilmoqchimisiz?`,
      confirmText: 'Ha, bekor qilish',
      cancelText: 'Orqaga',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await window.storageService.updateSaleStatus(saleId, 'cancelled', 'Kassir tomonidan bekor qilindi');
      if (window.soundService) window.soundService.playDelete();
      window.app.showToast(`Savdo #${sale.receiptNumber} bekor qilindi.`, 'warning');

      document.getElementById('saleDetailModal')?.classList.remove('active');

      await this.loadData();
      this.renderSalesList();

      window.posManager.updateDashboardMetrics();
      if (window.reportsManager) window.reportsManager.refresh();
    } catch (e) {
      console.error(e);
      window.app.showToast('Savdoni bekor qilishda xatolik!', 'error');
    }
  }

  reprintReceipt(saleId) {
    const sale = this.sales.find(s => s.id === saleId);
    if (sale && window.receiptManager) {
      window.receiptManager.showReceipt(sale);
    }
  }

  escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

window.historyManager = new HistoryManager();
