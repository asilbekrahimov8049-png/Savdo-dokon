/**
 * DO‘KON POS - Savdolar Tarixi (Sales History)
 * Cheksiz savdolar ro‘yxati, qidiruv, sanalar bo‘yicha filtr,
 * savdoni bekor qilish, chekni qayta chop etish
 */

class HistoryManager {
  constructor() {
    this.sales = [];
    this.searchQuery = '';
    this.dateFilter = 'today'; // 'today', 'yesterday', 'week', 'month', 'all', 'custom'
    this.customStartDate = null;
    this.customEndDate = null;
    this.statusFilter = 'all'; // 'all', 'completed', 'cancelled'
    this.paymentFilter = 'all'; // 'all', 'cash', 'card', 'terminal'
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
    // Qidiruv
    const searchInp = document.getElementById('historySearchInput');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderSalesList();
      });
    }

    // Sana filtrlari tugmalari
    const dateBtns = document.querySelectorAll('.history-date-filter-btn');
    dateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        dateBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.dateFilter = btn.getAttribute('data-filter');

        const customDateBox = document.getElementById('historyCustomDateRange');
        if (customDateBox) {
          if (this.dateFilter === 'custom') {
            customDateBox.style.display = 'flex';
          } else {
            customDateBox.style.display = 'none';
          }
        }

        this.renderSalesList();
      });
    });

    // Maxsus sana tanlash
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

    // Holat filtri (Barchasi, Yakunlangan, Bekor qilingan)
    const statusSelect = document.getElementById('historyStatusFilter');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        this.renderSalesList();
      });
    }

    // To'lov turi filtri
    const paymentSelect = document.getElementById('historyPaymentFilter');
    if (paymentSelect) {
      paymentSelect.addEventListener('change', (e) => {
        this.paymentFilter = e.target.value;
        this.renderSalesList();
      });
    }

    // Detail modalni yopish
    const closeDetailBtn = document.getElementById('closeSaleDetailModalBtn');
    if (closeDetailBtn) {
      closeDetailBtn.addEventListener('click', () => {
        document.getElementById('saleDetailModal')?.classList.remove('active');
      });
    }
  }

  getFilteredSales() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return this.sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);

      // 1. Sana filtri
      let matchDate = true;
      if (this.dateFilter === 'today') {
        matchDate = saleDate >= todayStart;
      } else if (this.dateFilter === 'yesterday') {
        matchDate = saleDate >= yesterdayStart && saleDate < todayStart;
      } else if (this.dateFilter === 'week') {
        matchDate = saleDate >= weekStart;
      } else if (this.dateFilter === 'month') {
        matchDate = saleDate >= monthStart;
      } else if (this.dateFilter === 'custom') {
        if (this.customStartDate) {
          const s = new Date(this.customStartDate);
          matchDate = matchDate && (saleDate >= s);
        }
        if (this.customEndDate) {
          const e = new Date(this.customEndDate);
          e.setHours(23, 59, 59, 999);
          matchDate = matchDate && (saleDate <= e);
        }
      }

      // 2. Qidiruv filtri
      let matchSearch = true;
      if (this.searchQuery) {
        const receiptMatch = sale.receiptNumber.toLowerCase().includes(this.searchQuery);
        const itemMatch = sale.items && sale.items.some(i => i.name.toLowerCase().includes(this.searchQuery));
        matchSearch = receiptMatch || itemMatch;
      }

      // 3. Status filtri
      let matchStatus = true;
      if (this.statusFilter !== 'all') {
        matchStatus = sale.status === this.statusFilter;
      }

      // 4. To'lov turi filtri
      let matchPayment = true;
      if (this.paymentFilter !== 'all') {
        if (this.paymentFilter === 'cash') matchPayment = sale.cashAmount > 0;
        if (this.paymentFilter === 'card') matchPayment = sale.cardAmount > 0;
        if (this.paymentFilter === 'terminal') matchPayment = sale.terminalAmount > 0;
      }

      return matchDate && matchSearch && matchStatus && matchPayment;
    });
  }

  renderSalesList() {
    const listBody = document.getElementById('historyTableBody');
    const statsEl = document.getElementById('historyFilteredStats');
    if (!listBody) return;

    const filtered = this.getFilteredSales();

    // Statistika hisobi
    const validSales = filtered.filter(s => s.status !== 'cancelled');
    const totalSum = validSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalCash = validSales.reduce((acc, s) => acc + (s.cashAmount || 0), 0);
    const totalCard = validSales.reduce((acc, s) => acc + (s.cardAmount || 0), 0);
    const totalTerminal = validSales.reduce((acc, s) => acc + (s.terminalAmount || 0), 0);

    if (statsEl) {
      statsEl.innerHTML = `
        <div class="history-summary-strip">
          <div class="summary-pill total">
            <span>Tanlangan savdolar:</span>
            <strong>${filtered.length} ta</strong>
          </div>
          <div class="summary-pill amount">
            <span>Jami summa:</span>
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

    if (filtered.length === 0) {
      listBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-6 text-muted">
            <i class="fa-solid fa-receipt fa-2x mb-2 d-block"></i>
            Savdolar topilmadi
          </td>
        </tr>
      `;
      return;
    }

    listBody.innerHTML = filtered.map(sale => {
      const date = new Date(sale.createdAt);
      const formattedDate = date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const formattedTime = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const isCancelled = sale.status === 'cancelled';

      // To'lov turlari teglari
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

      const itemsSummary = sale.items.map(i => `${i.name} (${i.qty})`).join(', ');

      return `
        <tr class="${isCancelled ? 'row-cancelled' : ''}">
          <td>
            <div class="receipt-num font-mono">
              <strong>${sale.receiptNumber}</strong>
            </div>
          </td>
          <td>
            <div class="date-time-cell">
              <span><i class="fa-regular fa-calendar"></i> ${formattedDate}</span>
              <small class="text-muted"><i class="fa-regular fa-clock"></i> ${formattedTime}</small>
            </div>
          </td>
          <td>
            <div class="history-items-summary" title="${itemsSummary}">
              <span class="badge-item-count">${sale.totalQuantity} dona</span>
              <span class="items-text">${itemsSummary}</span>
            </div>
          </td>
          <td class="font-bold font-mono ${isCancelled ? 'line-through text-muted' : 'text-primary'}">
            ${window.app.formatMoney(sale.totalAmount)}
          </td>
          <td>
            <div class="payment-badges-wrap">
              ${paymentTags.join(' ')}
            </div>
          </td>
          <td>
            ${isCancelled 
              ? `<span class="badge-status-cancelled" title="${sale.cancelReason || 'Bekor qilingan'}"><i class="fa-solid fa-ban"></i> Bekor qilingan</span>`
              : `<span class="badge-status-completed"><i class="fa-solid fa-circle-check"></i> Muvaffaqiyatli</span>`
            }
          </td>
          <td class="text-right">
            <div class="action-buttons-wrap">
              <button class="btn-action view" title="Batafsil ko‘rish" onclick="window.historyManager.viewSaleDetail('${sale.id}')">
                <i class="fa-solid fa-eye"></i>
              </button>
              <button class="btn-action print" title="Chek chiqarish" onclick="window.historyManager.reprintReceipt('${sale.id}')">
                <i class="fa-solid fa-print"></i>
              </button>
              ${!isCancelled ? `
                <button class="btn-action cancel" title="Savdoni bekor qilish" onclick="window.historyManager.promptCancelSale('${sale.id}')">
                  <i class="fa-solid fa-ban"></i>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Savdo tafsilotini ko'rish
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
          <h3>Chek: ${sale.receiptNumber}</h3>
          <span class="detail-status ${isCancelled ? 'cancelled' : 'completed'}">
            ${isCancelled ? 'BEKOR QILINGAN' : 'MUOFFAQIYATLI SAVDO'}
          </span>
        </div>
        <p class="text-muted"><i class="fa-regular fa-clock"></i> ${date.toLocaleString('uz-UZ')}</p>
        ${isCancelled && sale.cancelReason ? `<div class="cancel-alert"><strong>Bekor qilish sababi:</strong> ${sale.cancelReason}</div>` : ''}
      </div>

      <div class="detail-items-table-wrap">
        <table class="detail-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Mahsulot</th>
              <th>Narx</th>
              <th>Soni</th>
              <th class="text-right">Jami</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map((item, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${item.name}</strong></td>
                <td>${window.app.formatMoney(item.price)}</td>
                <td>${item.qty} ${item.unit || 'dona'}</td>
                <td class="text-right font-bold">${window.app.formatMoney(item.price * item.qty)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="detail-totals-box">
        <div class="tot-row">
          <span>Jami tovarlar soni:</span>
          <strong>${sale.totalQuantity} dona</strong>
        </div>
        <div class="tot-row main">
          <span>Umumiy qiymati:</span>
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
        <button class="btn btn-primary" onclick="window.historyManager.reprintReceipt('${sale.id}')">
          <i class="fa-solid fa-print"></i> Chekni chop etish
        </button>
        ${!isCancelled ? `
          <button class="btn btn-danger" onclick="window.historyManager.promptCancelSale('${sale.id}')">
            <i class="fa-solid fa-ban"></i> Ushbu savdoni bekor qilish
          </button>
        ` : ''}
      </div>
    `;

    modal.classList.add('active');
  }

  // Savdoni bekor qilish
  async promptCancelSale(saleId) {
    const sale = this.sales.find(s => s.id === saleId);
    if (!sale) return;

    const reason = prompt(`"${sale.receiptNumber}" raqamli savdoni bekor qilish sababini kiriting:`, 'Xaridor fikridan qaytdi / Xato urilgan');
    if (reason === null) return; // Bekor qilindi

    try {
      await window.storageService.updateSaleStatus(saleId, 'cancelled', reason);
      window.soundService.playDelete();
      window.app.showToast(`Savdo #${sale.receiptNumber} bekor qilindi.`, 'warning');

      document.getElementById('saleDetailModal')?.classList.remove('active');

      await this.loadData();
      this.renderSalesList();

      // Dashboard va Hisobotlarni yangilash
      window.posManager.updateDashboardMetrics();
      if (window.reportsManager) window.reportsManager.refresh();
    } catch (e) {
      console.error(e);
      window.app.showToast('Savdoni bekor qilishda xatolik!', 'error');
    }
  }

  // Chekni qayta chop etish
  reprintReceipt(saleId) {
    const sale = this.sales.find(s => s.id === saleId);
    if (sale) {
      window.receiptManager.showReceipt(sale);
    }
  }
}

window.historyManager = new HistoryManager();
