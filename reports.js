/**
 * DO‘KON POS - Hisobotlar va Word (.doc) Eksport Moduli
 * Bugungi sana, mahsulotlar kesimida Naqd, Karta, Terminal ustunlari,
 * va yakuniy umumiy hisobot (Umumiy savdo, Naqd, Karta, Terminal)
 */

class ReportsManager {
  constructor() {
    this.sales = [];
    this.products = [];
    this.datePeriod = 'today'; // 'today', 'week', 'month', 'year', 'all', 'custom'
  }

  async init() {
    await this.loadData();
    this.bindEvents();
    this.renderAll();
  }

  async loadData() {
    this.sales = await window.storageService.getSales();
    this.products = await window.storageService.getProducts();
  }

  async refresh() {
    await this.loadData();
    this.renderAll();
  }

  bindEvents() {
    // Davr tugmalari
    const periodBtns = document.querySelectorAll('.report-period-btn');
    periodBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        periodBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.datePeriod = btn.getAttribute('data-period');

        const customBox = document.getElementById('reportCustomDateBox');
        if (customBox) {
          customBox.style.display = this.datePeriod === 'custom' ? 'flex' : 'none';
        }

        this.renderAll();
      });
    });

    // Maxsus sanalar
    const startInp = document.getElementById('reportStartDate');
    const endInp = document.getElementById('reportEndDate');
    if (startInp && endInp) {
      const onDateChange = () => {
        if (this.datePeriod === 'custom') {
          this.renderAll();
        }
      };
      startInp.addEventListener('change', onDateChange);
      endInp.addEventListener('change', onDateChange);
    }

    // WORD (.doc) formatida yuklab olish tugmasi
    const exportWordBtn = document.getElementById('exportWordBtn');
    if (exportWordBtn) {
      exportWordBtn.addEventListener('click', () => {
        this.exportReportToWord();
      });
    }

    // Agar eski Excel tugmasi bo'lsa uni ham Word ga ulaymiz yoki qo'shimcha qilamiz
    const exportSalesExcelBtn = document.getElementById('exportSalesExcelBtn');
    if (exportSalesExcelBtn) {
      exportSalesExcelBtn.addEventListener('click', () => {
        this.exportReportToWord();
      });
    }
  }

  getFilteredSales() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    // Faqat bekor qilinmagan haqiqiy savdolar
    const validSales = this.sales.filter(s => s.status !== 'cancelled');

    return validSales.filter(sale => {
      const saleDate = new Date(sale.createdAt);

      if (this.datePeriod === 'today') {
        return saleDate >= todayStart;
      } else if (this.datePeriod === 'week') {
        return saleDate >= weekStart;
      } else if (this.datePeriod === 'month') {
        return saleDate >= monthStart;
      } else if (this.datePeriod === 'year') {
        return saleDate >= yearStart;
      } else if (this.datePeriod === 'custom') {
        const sVal = document.getElementById('reportStartDate')?.value;
        const eVal = document.getElementById('reportEndDate')?.value;
        let match = true;
        if (sVal) match = match && (saleDate >= new Date(sVal));
        if (eVal) {
          const end = new Date(eVal);
          end.setHours(23, 59, 59, 999);
          match = match && (saleDate <= end);
        }
        return match;
      }
      return true;
    });
  }

  // Mahsulotlar bo'yicha sotuv tahlili (Naqd, Karta, Terminal taqsimoti bilan)
  calculateProductBreakdown(sales) {
    const productMap = {};

    sales.forEach(sale => {
      const saleTotal = sale.totalAmount || 1;
      // To'lov turlarining nisbati (Split to'lov uchun)
      const cashRatio = (sale.cashAmount || 0) / saleTotal;
      const cardRatio = (sale.cardAmount || 0) / saleTotal;
      const termRatio = (sale.terminalAmount || 0) / saleTotal;

      sale.items.forEach(item => {
        const itemTotal = item.price * item.qty;

        if (!productMap[item.name]) {
          productMap[item.name] = {
            name: item.name,
            qty: 0,
            unit: item.unit || 'dona',
            price: item.price,
            cash: 0,
            card: 0,
            terminal: 0,
            total: 0
          };
        }

        productMap[item.name].qty += item.qty;
        productMap[item.name].total += itemTotal;
        productMap[item.name].cash += (itemTotal * cashRatio);
        productMap[item.name].card += (itemTotal * cardRatio);
        productMap[item.name].terminal += (itemTotal * termRatio);
      });
    });

    return Object.values(productMap).sort((a, b) => b.total - a.total);
  }

  renderAll() {
    const filteredSales = this.getFilteredSales();
    const productRows = this.calculateProductBreakdown(filteredSales);

    // Moliyaviy jami tushumlar
    const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalCash = filteredSales.reduce((acc, s) => acc + (s.cashAmount || 0), 0);
    const totalCard = filteredSales.reduce((acc, s) => acc + (s.cardAmount || 0), 0);
    const totalTerminal = filteredSales.reduce((acc, s) => acc + (s.terminalAmount || 0), 0);
    const totalItemsCount = productRows.reduce((acc, p) => acc + p.qty, 0);

    // KPI kartalarini yangilash
    this.renderKPIs(totalRevenue, totalCash, totalCard, totalTerminal, filteredSales.length);

    // Ekranda Word formatidagi jadval va umumiy hisobotni chizish
    this.renderWordViewInApp(productRows, totalRevenue, totalCash, totalCard, totalTerminal, filteredSales.length, totalItemsCount);
  }

  renderKPIs(total, cash, card, terminal, count) {
    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt('repKpiPeriodTotal', window.app.formatMoney(total));
    setTxt('repKpiCash', window.app.formatMoney(cash));
    setTxt('repKpiCard', window.app.formatMoney(card));
    setTxt('repKpiTerminal', window.app.formatMoney(terminal));
    setTxt('repKpiCount', `${count} ta savdo`);

    const avg = count > 0 ? Math.round(total / count) : 0;
    setTxt('repKpiAvg', window.app.formatMoney(avg));
  }

  // Ekranda A4 Word qog'ozi ko'rinishidagi chiroyli rasmiy hisobotni chizish
  renderWordViewInApp(productRows, totalRevenue, totalCash, totalCard, totalTerminal, salesCount, itemsCount) {
    const container = document.getElementById('wordReportContainer');
    if (!container) return;

    const today = new Date();
    const oylar = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    const formattedDate = `${today.getDate()}-${oylar[today.getMonth()]}, ${today.getFullYear()}-yil`;
    const currentTime = today.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    let periodLabel = `Bugungi kun: ${formattedDate}`;
    if (this.datePeriod === 'week') periodLabel = `Oxirgi 7 kunlik savdo hisoboti (${formattedDate})`;
    if (this.datePeriod === 'month') periodLabel = `Shu oy hisoboti (${oylar[today.getMonth()]} ${today.getFullYear()})`;
    if (this.datePeriod === 'all') periodLabel = `Barcha davr bo‘yicha to‘liq hisobot`;
    if (this.datePeriod === 'custom') periodLabel = `Tanlangan sana oralig‘idagi hisobot`;

    let rowsHtml = '';
    if (productRows.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 30px; color: #64748b; font-style: italic;">
            Tanlangan davrda yakunlangan savdolar mavjud emas
          </td>
        </tr>
      `;
    } else {
      rowsHtml = productRows.map((p, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold; color: #475569;">${idx + 1}</td>
          <td style="text-align: left; font-weight: 700;">${p.name}</td>
          <td style="text-align: center;"><strong>${p.qty}</strong> ${p.unit}</td>
          <td style="text-align: right;">${window.app.formatMoney(p.price)}</td>
          <td style="text-align: right; color: #166534; font-weight: 600;">${p.cash > 0 ? window.app.formatMoney(Math.round(p.cash)) : '—'}</td>
          <td style="text-align: right; color: #1e40af; font-weight: 600;">${p.card > 0 ? window.app.formatMoney(Math.round(p.card)) : '—'}</td>
          <td style="text-align: right; color: #92400e; font-weight: 600;">${p.terminal > 0 ? window.app.formatMoney(Math.round(p.terminal)) : '—'}</td>
          <td style="text-align: right; font-weight: 800; color: #0f172a;">${window.app.formatMoney(p.total)}</td>
        </tr>
      `).join('');
    }

    container.innerHTML = `
      <div class="word-sheet">
        <!-- Word Hujjat Bosh qismi (Header) -->
        <div class="word-header-block">
          <div class="word-shop-title">DO‘KON POS</div>
          <div class="word-doc-title">KASSA VA SAVDO KUNLIK HISOBOTI</div>
          <div class="word-date-badge"><i class="fa-regular fa-calendar-check"></i> Sana: <strong>${periodLabel}</strong> | Vaqt: <strong>${currentTime}</strong></div>
        </div>

        <!-- Asosiy Mahsulotlar Jadvali -->
        <table class="word-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">№</th>
              <th style="text-align: left;">Mahsulot nomi</th>
              <th style="width: 100px; text-align: center;">Sotilgan miqdor</th>
              <th style="width: 110px; text-align: right;">Dona narxi</th>
              <th style="width: 120px; text-align: right;">Naqd to‘lov</th>
              <th style="width: 120px; text-align: right;">Karta to‘lovi</th>
              <th style="width: 120px; text-align: right;">Terminal to‘lovi</th>
              <th style="width: 130px; text-align: right;">Jami summa</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="word-tfoot-row">
              <td colspan="2" style="text-align: right; font-weight: 900;">JAMI:</td>
              <td style="text-align: center; font-weight: 900;">${itemsCount} dona</td>
              <td></td>
              <td style="text-align: right; font-weight: 900; color: #166534;">${window.app.formatMoney(totalCash)}</td>
              <td style="text-align: right; font-weight: 900; color: #1e40af;">${window.app.formatMoney(totalCard)}</td>
              <td style="text-align: right; font-weight: 900; color: #92400e;">${window.app.formatMoney(totalTerminal)}</td>
              <td style="text-align: right; font-weight: 900; color: #0f172a; font-size: 15px;">${window.app.formatMoney(totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- OXIRIDA UMUMIY HISOBOT BLOKI (Foydalanuvchi talabi bo'yicha) -->
        <div class="word-summary-final-box">
          <div class="final-box-header">
            <i class="fa-solid fa-file-invoice-dollar"></i>
            <span>YAKUNIY UMUMIY KASSA HISOBOTI</span>
          </div>

          <div class="final-box-body">
            <div class="final-total-highlight">
              <span class="label">UMUMIY SAVDO:</span>
              <span class="value">${window.app.formatMoney(totalRevenue)}</span>
            </div>

            <div class="final-payments-grid">
              <div class="final-pay-card cash">
                <div class="f-title"><i class="fa-solid fa-money-bill-wave"></i> NAQD TUSHUM:</div>
                <div class="f-sum">${window.app.formatMoney(totalCash)}</div>
              </div>

              <div class="final-pay-card card">
                <div class="f-title"><i class="fa-solid fa-credit-card"></i> KARTA TUSHUMI:</div>
                <div class="f-sum">${window.app.formatMoney(totalCard)}</div>
              </div>

              <div class="final-pay-card terminal">
                <div class="f-title"><i class="fa-solid fa-calculator"></i> TERMINAL TUSHUMI:</div>
                <div class="f-sum">${window.app.formatMoney(totalTerminal)}</div>
              </div>
            </div>

            <div class="final-extra-info">
              <div><span>Sotilgan tovarlar turlari:</span> <strong>${productRows.length} tur</strong></div>
              <div><span>Jami sotilgan mahsulotlar:</span> <strong>${itemsCount} dona</strong></div>
              <div><span>Savdolar (cheklar) soni:</span> <strong>${salesCount} ta</strong></div>
              <div><span>O‘rtacha savdo cheki:</span> <strong>${salesCount > 0 ? window.app.formatMoney(Math.round(totalRevenue / salesCount)) : '0 so‘m'}</strong></div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // MICROSOFT WORD (.doc) FORMATIDA YUKLAB OLISH
  exportReportToWord() {
    const filteredSales = this.getFilteredSales();
    const productRows = this.calculateProductBreakdown(filteredSales);

    const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalCash = filteredSales.reduce((acc, s) => acc + (s.cashAmount || 0), 0);
    const totalCard = filteredSales.reduce((acc, s) => acc + (s.cardAmount || 0), 0);
    const totalTerminal = filteredSales.reduce((acc, s) => acc + (s.terminalAmount || 0), 0);
    const totalItemsCount = productRows.reduce((acc, p) => acc + p.qty, 0);

    const today = new Date();
    const oylar = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    const formattedDate = `${today.getDate()}-${oylar[today.getMonth()]}, ${today.getFullYear()}-yil`;
    const currentTime = today.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    // Word hujjati uchun maxsus HTML
    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>DO‘KON POS - Savdo Hisoboti</title>
        <style>
          body {
            font-family: 'Calibri', 'Segoe UI', Arial, sans-serif;
            font-size: 11pt;
            color: #000000;
            line-height: 1.3;
          }
          .title-area {
            text-align: center;
            margin-bottom: 20px;
          }
          .shop-title {
            font-size: 18pt;
            font-weight: bold;
            color: #1e3a8a;
            margin: 0;
          }
          .doc-title {
            font-size: 14pt;
            font-weight: bold;
            color: #0f172a;
            margin: 4px 0;
            text-transform: uppercase;
          }
          .date-line {
            font-size: 11pt;
            color: #475569;
            margin-top: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 20px;
          }
          th {
            background-color: #f1f5f9;
            color: #0f172a;
            border: 1pt solid #cbd5e1;
            padding: 8px 6px;
            font-size: 10.5pt;
            font-weight: bold;
          }
          td {
            border: 1pt solid #cbd5e1;
            padding: 6px;
            font-size: 10pt;
          }
          .total-row {
            background-color: #f8fafc;
            font-weight: bold;
          }
          .summary-box {
            border: 2pt solid #1e3a8a;
            padding: 15px;
            margin-top: 25px;
            background-color: #f8fafc;
          }
          .summary-header {
            font-size: 13pt;
            font-weight: bold;
            color: #1e3a8a;
            text-align: center;
            border-bottom: 1pt solid #cbd5e1;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .sum-line {
            font-size: 12pt;
            padding: 4px 0;
          }
          .main-sum {
            font-size: 14pt;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 1pt dashed #cbd5e1;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .signature-area {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>

        <div class="title-area">
          <div class="shop-title">DO‘KON POS</div>
          <div class="doc-title">KASSA VA SAVDO KUNLIK HISOBOTI</div>
          <div class="date-line"><strong>Sana:</strong> ${formattedDate} &nbsp;|&nbsp; <strong>Vaqt:</strong> ${currentTime}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">№</th>
              <th style="text-align: left;">Mahsulot nomi</th>
              <th style="text-align: center; width: 80px;">Sotilgan miqdor</th>
              <th style="text-align: right; width: 90px;">Dona narxi</th>
              <th style="text-align: right; width: 100px;">Naqd to‘lov</th>
              <th style="text-align: right; width: 100px;">Karta to‘lovi</th>
              <th style="text-align: right; width: 100px;">Terminal to‘lovi</th>
              <th style="text-align: right; width: 110px;">Jami summa</th>
            </tr>
          </thead>
          <tbody>
            ${productRows.map((p, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td><strong>${p.name}</strong></td>
                <td style="text-align: center;">${p.qty} ${p.unit}</td>
                <td style="text-align: right;">${window.app.formatMoney(p.price)}</td>
                <td style="text-align: right;">${p.cash > 0 ? window.app.formatMoney(Math.round(p.cash)) : '—'}</td>
                <td style="text-align: right;">${p.card > 0 ? window.app.formatMoney(Math.round(p.card)) : '—'}</td>
                <td style="text-align: right;">${p.terminal > 0 ? window.app.formatMoney(Math.round(p.terminal)) : '—'}</td>
                <td style="text-align: right; font-weight: bold;">${window.app.formatMoney(p.total)}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" style="text-align: right; font-weight: bold;">JAMI:</td>
              <td style="text-align: center; font-weight: bold;">${totalItemsCount} dona</td>
              <td></td>
              <td style="text-align: right; font-weight: bold;">${window.app.formatMoney(totalCash)}</td>
              <td style="text-align: right; font-weight: bold;">${window.app.formatMoney(totalCard)}</td>
              <td style="text-align: right; font-weight: bold;">${window.app.formatMoney(totalTerminal)}</td>
              <td style="text-align: right; font-weight: bold; font-size: 11pt;">${window.app.formatMoney(totalRevenue)}</td>
            </tr>
          </tbody>
        </table>

        <!-- OXIRIDA UMUMIY HISOBOT (FOYDALANUVCHI SO‘RAGAN DEK) -->
        <div class="summary-box">
          <div class="summary-header">UMUMIY KASSA HISOBOTI</div>
          
          <div class="sum-line main-sum">
            <strong>UMUMIY SAVDO:</strong> ${window.app.formatMoney(totalRevenue)}
          </div>

          <div class="sum-line">
            <strong>• NAQD TUSHUM:</strong> ${window.app.formatMoney(totalCash)}
          </div>

          <div class="sum-line">
            <strong>• KARTA TUSHUMI:</strong> ${window.app.formatMoney(totalCard)}
          </div>

          <div class="sum-line">
            <strong>• TERMINAL TUSHUMI:</strong> ${window.app.formatMoney(totalTerminal)}
          </div>

          <div style="margin-top: 12px; font-size: 10pt; color: #64748b; border-top: 1pt solid #cbd5e1; padding-top: 8px;">
            Jami savdolar soni: <strong>${filteredSales.length} ta</strong> | Jami sotilgan mahsulotlar: <strong>${totalItemsCount} dona</strong> (${productRows.length} turdagi)
          </div>
        </div>

        <table style="border: none; margin-top: 40px;">
          <tr style="border: none;">
            <td style="border: none; width: 50%;"><strong>Kassir:</strong> ________________ (Sotuvchi #1)</td>
            <td style="border: none; width: 50%; text-align: right;"><strong>Qabul qildi:</strong> ________________</td>
          </tr>
        </table>

      </body>
      </html>
    `;

    // Word hujjati (.doc) sifatida saqlash
    const blob = new Blob(['\ufeff', wordHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = today.toISOString().slice(0, 10);
    a.download = `DOKON_POS_Hisobot_${dateStr}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.app.showToast('Savdo hisoboti Word (.doc) fayli muvaffaqiyatli yuklandi!', 'success');
  }
}

window.reportsManager = new ReportsManager();
