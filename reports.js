/**
 * DO‘KON POS - Hisobotlar, Word (.doc), PDF (.pdf) va Chop Etish Moduli
 * Ixcham 1 sahifali A4 hisobot, o'zbekcha harflarni to'liq qo'llab-quvvatlash,
 * Do'kon nomi, sana, mahsulotlar jadvali va Naqd/Karta/Terminal tushumlari.
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

    document.getElementById('exportWordBtn')?.addEventListener('click', () => {
      this.exportReportToWord();
    });

    document.getElementById('exportPdfBtn')?.addEventListener('click', () => {
      this.exportReportToPdf();
    });

    document.getElementById('printReportBtn')?.addEventListener('click', () => {
      this.printReport();
    });
  }

  getFilteredSales() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

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
        if (sVal) {
          const start = new Date(sVal);
          start.setHours(0, 0, 0, 0);
          match = match && (saleDate >= start);
        }
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

  // Mahsulotlar bo'yicha hisob (savdo vaqtidagi narx saqlanib qoladi!)
  calculateProductBreakdown(sales) {
    const productMap = {};

    sales.forEach(sale => {
      const saleTotal = sale.totalAmount || 1;
      const cashRatio = (sale.cashAmount || 0) / saleTotal;
      const cardRatio = (sale.cardAmount || 0) / saleTotal;
      const termRatio = (sale.terminalAmount || 0) / saleTotal;

      (sale.items || []).forEach(item => {
        const itemPrice = Number(item.price || 0);
        const itemQty = Number(item.qty || 0);
        const itemTotal = itemPrice * itemQty;
        const key = `${item.name}__${itemPrice}`;

        if (!productMap[key]) {
          productMap[key] = {
            name: item.name,
            qty: 0,
            unit: item.unit || 'dona',
            price: itemPrice,
            cash: 0,
            card: 0,
            terminal: 0,
            total: 0
          };
        }

        productMap[key].qty += itemQty;
        productMap[key].total += itemTotal;
        productMap[key].cash += (itemTotal * cashRatio);
        productMap[key].card += (itemTotal * cardRatio);
        productMap[key].terminal += (itemTotal * termRatio);
      });
    });

    return Object.values(productMap).sort((a, b) => b.total - a.total);
  }

  getReportContext() {
    const filteredSales = this.getFilteredSales();
    const productRows = this.calculateProductBreakdown(filteredSales);
    const settings = window.app?.settings || {};

    const totalRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const totalCash = filteredSales.reduce((acc, s) => acc + (s.cashAmount || 0), 0);
    const totalCard = filteredSales.reduce((acc, s) => acc + (s.cardAmount || 0), 0);
    const totalTerminal = filteredSales.reduce((acc, s) => acc + (s.terminalAmount || 0), 0);
    const totalItemsCount = productRows.reduce((acc, p) => acc + p.qty, 0);

    const today = new Date();
    const oylar = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
    const formattedDate = `${today.getDate()}-${oylar[today.getMonth()]}, ${today.getFullYear()}-yil`;
    const currentTime = today.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

    let periodLabel = `Kunlik hisobot: ${formattedDate}`;
    if (this.datePeriod === 'week') periodLabel = `Haftalik hisobot (${formattedDate})`;
    if (this.datePeriod === 'month') periodLabel = `Oylik hisobot (${oylar[today.getMonth()]} ${today.getFullYear()})`;
    if (this.datePeriod === 'year') periodLabel = `Yillik hisobot (${today.getFullYear()}-yil)`;
    if (this.datePeriod === 'all') periodLabel = `Umumiy davr hisoboti (${formattedDate})`;
    if (this.datePeriod === 'custom') {
      const sVal = document.getElementById('reportStartDate')?.value || '...';
      const eVal = document.getElementById('reportEndDate')?.value || '...';
      periodLabel = `Sana oralig‘i: ${sVal} — ${eVal}`;
    }

    return {
      shopName: settings.shopName || 'DO‘KON POS',
      shopAddress: settings.shopAddress || '',
      shopPhone: settings.shopPhone || '',
      formattedDate,
      currentTime,
      periodLabel,
      today,
      filteredSales,
      productRows,
      totalRevenue,
      totalCash,
      totalCard,
      totalTerminal,
      totalItemsCount,
      salesCount: filteredSales.length
    };
  }

  renderAll() {
    const ctx = this.getReportContext();
    this.renderKPIs(ctx.totalRevenue, ctx.totalCash, ctx.totalCard, ctx.totalTerminal, ctx.salesCount);
    this.renderWordViewInApp(ctx);
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

  // Ekranda ixcham, ortiqcha bo'sh joysiz professional A4 hisobot
  renderWordViewInApp(ctx) {
    const container = document.getElementById('wordReportContainer');
    if (!container) return;

    let rowsHtml = '';
    if (ctx.productRows.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">
            Tanlangan davrda yakunlangan savdolar mavjud emas
          </td>
        </tr>
      `;
    } else {
      rowsHtml = ctx.productRows.map((p, idx) => `
        <tr>
          <td style="text-align: center; color: #475569;">${idx + 1}</td>
          <td style="text-align: left; font-weight: 700;">${this.escapeHtml(p.name)}</td>
          <td style="text-align: center;"><strong>${p.qty}</strong> ${this.escapeHtml(p.unit)}</td>
          <td style="text-align: right;">${window.app.formatMoney(p.price)}</td>
          <td style="text-align: right; color: #166534;">${p.cash > 0 ? window.app.formatMoney(Math.round(p.cash)) : '—'}</td>
          <td style="text-align: right; color: #1e40af;">${p.card > 0 ? window.app.formatMoney(Math.round(p.card)) : '—'}</td>
          <td style="text-align: right; color: #92400e;">${p.terminal > 0 ? window.app.formatMoney(Math.round(p.terminal)) : '—'}</td>
          <td style="text-align: right; font-weight: 800; color: #0f172a;">${window.app.formatMoney(p.total)}</td>
        </tr>
      `).join('');
    }

    container.innerHTML = `
      <div class="word-sheet compact-sheet" id="printableReportArea">
        <div class="word-header-block compact">
          <div class="word-header-top">
            <div>
              <div class="word-shop-title">${this.escapeHtml(ctx.shopName)}</div>
              ${ctx.shopAddress || ctx.shopPhone ? `<div class="word-shop-meta">${this.escapeHtml([ctx.shopAddress, ctx.shopPhone].filter(Boolean).join(' • '))}</div>` : ''}
            </div>
            <div class="word-doc-right">
              <div class="word-doc-title">SAVDO VA KASSA HISOBOTI</div>
              <div class="word-date-badge"><i class="fa-regular fa-calendar-check"></i> ${this.escapeHtml(ctx.periodLabel)} • ${ctx.currentTime}</div>
            </div>
          </div>
        </div>

        <!-- Ixcham Moliyaviy Xulosa Jadvali -->
        <div class="word-compact-kpi-strip">
          <div class="wkpi main">
            <span>Jami savdo</span>
            <strong>${window.app.formatMoney(ctx.totalRevenue)}</strong>
          </div>
          <div class="wkpi cash">
            <span>Naqd tushum</span>
            <strong>${window.app.formatMoney(ctx.totalCash)}</strong>
          </div>
          <div class="wkpi card">
            <span>Karta tushumi</span>
            <strong>${window.app.formatMoney(ctx.totalCard)}</strong>
          </div>
          <div class="wkpi terminal">
            <span>Terminal tushumi</span>
            <strong>${window.app.formatMoney(ctx.totalTerminal)}</strong>
          </div>
        </div>

        <!-- Sotilgan mahsulotlar jadvali -->
        <div class="word-table-scroll">
          <table class="word-table compact">
            <thead>
              <tr>
                <th style="width: 34px; text-align: center;">№</th>
                <th style="text-align: left;">Mahsulot nomi</th>
                <th style="width: 82px; text-align: center;">Soni</th>
                <th style="width: 100px; text-align: right;">Bir dona narxi</th>
                <th style="width: 100px; text-align: right;">Naqd</th>
                <th style="width: 100px; text-align: right;">Karta</th>
                <th style="width: 100px; text-align: right;">Terminal</th>
                <th style="width: 115px; text-align: right;">Jami narxi</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr class="word-tfoot-row">
                <td colspan="2" style="text-align: right; font-weight: 800;">JAMI (${ctx.salesCount} ta chek):</td>
                <td style="text-align: center; font-weight: 800;">${ctx.totalItemsCount} dona</td>
                <td></td>
                <td style="text-align: right; font-weight: 800; color: #166534;">${window.app.formatMoney(ctx.totalCash)}</td>
                <td style="text-align: right; font-weight: 800; color: #1e40af;">${window.app.formatMoney(ctx.totalCard)}</td>
                <td style="text-align: right; font-weight: 800; color: #92400e;">${window.app.formatMoney(ctx.totalTerminal)}</td>
                <td style="text-align: right; font-weight: 900; color: #0f172a;">${window.app.formatMoney(ctx.totalRevenue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="word-compact-footer">
          <span>Sotilgan turlar: <strong>${ctx.productRows.length} ta</strong> • Cheklar: <strong>${ctx.salesCount} ta</strong></span>
          <span>Kassir: ___________________ (Sotuvchi #1)</span>
        </div>
      </div>
    `;
  }

  // MICROSOFT WORD (.doc) — IXCHAM VA PROFESSIONAL 1 SAHIFALI FORMAT
  exportReportToWord() {
    const ctx = this.getReportContext();

    const rowsHtml = ctx.productRows.length === 0
      ? `<tr><td colspan="8" style="text-align:center; padding:10pt; color:#64748b;">Tanlangan davrda savdolar mavjud emas</td></tr>`
      : ctx.productRows.map((p, idx) => `
          <tr>
            <td style="text-align:center;">${idx + 1}</td>
            <td style="text-align:left; font-weight:bold;">${this.escapeHtml(p.name)}</td>
            <td style="text-align:center;">${p.qty} ${this.escapeHtml(p.unit)}</td>
            <td style="text-align:right;">${window.app.formatMoney(p.price)}</td>
            <td style="text-align:right;">${p.cash > 0 ? window.app.formatMoney(Math.round(p.cash)) : '—'}</td>
            <td style="text-align:right;">${p.card > 0 ? window.app.formatMoney(Math.round(p.card)) : '—'}</td>
            <td style="text-align:right;">${p.terminal > 0 ? window.app.formatMoney(Math.round(p.terminal)) : '—'}</td>
            <td style="text-align:right; font-weight:bold;">${window.app.formatMoney(p.total)}</td>
          </tr>
        `).join('');

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${this.escapeHtml(ctx.shopName)} - Savdo Hisoboti</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            font-family: 'Calibri', 'Arial', sans-serif;
            font-size: 9.5pt;
            color: #0f172a;
            margin: 0;
            padding: 0;
            line-height: 1.25;
          }
          .header-tbl {
            width: 100%;
            border-collapse: collapse;
            border-bottom: 1.5pt solid #0f172a;
            margin-bottom: 8pt;
          }
          .header-tbl td {
            border: none;
            padding: 0 0 6pt 0;
            vertical-align: bottom;
          }
          .shop-name {
            font-size: 14pt;
            font-weight: bold;
            color: #1e3a8a;
          }
          .shop-sub {
            font-size: 8.5pt;
            color: #475569;
          }
          .report-title {
            font-size: 11.5pt;
            font-weight: bold;
            color: #0f172a;
            text-align: right;
          }
          .report-date {
            font-size: 9pt;
            color: #334155;
            text-align: right;
          }
          .kpi-tbl {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8pt;
          }
          .kpi-tbl td {
            width: 25%;
            border: 0.75pt solid #cbd5e1;
            background-color: #f8fafc;
            padding: 5pt 7pt;
          }
          .kpi-label {
            font-size: 8pt;
            color: #475569;
            text-transform: uppercase;
          }
          .kpi-val {
            font-size: 10.5pt;
            font-weight: bold;
            color: #0f172a;
            margin-top: 2pt;
          }
          .main-tbl {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8pt;
          }
          .main-tbl th {
            background-color: #e2e8f0;
            color: #0f172a;
            border: 0.75pt solid #94a3b8;
            padding: 4.5pt 5pt;
            font-size: 8.5pt;
            font-weight: bold;
          }
          .main-tbl td {
            border: 0.5pt solid #cbd5e1;
            padding: 3.5pt 5pt;
            font-size: 8.5pt;
          }
          .tfoot-row td {
            background-color: #f1f5f9;
            border-top: 1.25pt solid #0f172a;
            font-weight: bold;
            padding: 5pt;
            font-size: 9pt;
          }
          .sign-tbl {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10pt;
          }
          .sign-tbl td {
            border: none;
            padding: 4pt 0 0 0;
            font-size: 8.5pt;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <table class="header-tbl">
          <tr>
            <td style="width: 50%;">
              <div class="shop-name">${this.escapeHtml(ctx.shopName)}</div>
              ${ctx.shopAddress || ctx.shopPhone ? `<div class="shop-sub">${this.escapeHtml([ctx.shopAddress, ctx.shopPhone].filter(Boolean).join(' | '))}</div>` : ''}
            </td>
            <td style="width: 50%;">
              <div class="report-title">SAVDO VA KASSA HISOBOTI</div>
              <div class="report-date">${this.escapeHtml(ctx.periodLabel)} | ${ctx.currentTime}</div>
            </td>
          </tr>
        </table>

        <table class="kpi-tbl">
          <tr>
            <td style="background-color:#eff6ff; border-color:#93c5fd;">
              <div class="kpi-label">Jami savdo summasi</div>
              <div class="kpi-val" style="color:#1e3a8a;">${window.app.formatMoney(ctx.totalRevenue)}</div>
            </td>
            <td>
              <div class="kpi-label">Naqd tushum</div>
              <div class="kpi-val" style="color:#166534;">${window.app.formatMoney(ctx.totalCash)}</div>
            </td>
            <td>
              <div class="kpi-label">Karta tushumi</div>
              <div class="kpi-val" style="color:#1e40af;">${window.app.formatMoney(ctx.totalCard)}</div>
            </td>
            <td>
              <div class="kpi-label">Terminal tushumi</div>
              <div class="kpi-val" style="color:#92400e;">${window.app.formatMoney(ctx.totalTerminal)}</div>
            </td>
          </tr>
        </table>

        <table class="main-tbl">
          <thead>
            <tr>
              <th style="width: 24px; text-align: center;">№</th>
              <th style="text-align: left;">Sotilgan mahsulot nomi</th>
              <th style="width: 58px; text-align: center;">Soni</th>
              <th style="width: 72px; text-align: right;">Bir dona narxi</th>
              <th style="width: 68px; text-align: right;">Naqd</th>
              <th style="width: 68px; text-align: right;">Karta</th>
              <th style="width: 68px; text-align: right;">Terminal</th>
              <th style="width: 82px; text-align: right;">Jami narxi</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr class="tfoot-row">
              <td colspan="2" style="text-align: right;">JAMI (${ctx.salesCount} ta chek):</td>
              <td style="text-align: center;">${ctx.totalItemsCount} dona</td>
              <td></td>
              <td style="text-align: right;">${window.app.formatMoney(ctx.totalCash)}</td>
              <td style="text-align: right;">${window.app.formatMoney(ctx.totalCard)}</td>
              <td style="text-align: right;">${window.app.formatMoney(ctx.totalTerminal)}</td>
              <td style="text-align: right;">${window.app.formatMoney(ctx.totalRevenue)}</td>
            </tr>
          </tfoot>
        </table>

        <table class="sign-tbl">
          <tr>
            <td style="width: 55%;">Mahsulot turlari: <strong>${ctx.productRows.length} ta</strong> | Jami sotildi: <strong>${ctx.totalItemsCount} dona</strong></td>
            <td style="width: 45%; text-align: right;"><strong>Kassir:</strong> ________________ (Sotuvchi #1)</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], {
      type: 'application/msword;charset=utf-8'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = ctx.today.toISOString().slice(0, 10);
    a.download = `DOKON_POS_Hisobot_${dateStr}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.app.showToast('Ixcham Word hisoboti (.doc) yuklab olindi!', 'success');
  }

  // CHOP ETISH (PRINT)
  printReport() {
    document.body.classList.add('printing-report');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-report');
    }, 500);
  }

  // PDF (.pdf) FORMATIDA YUKLAB OLISH (Oflayn, O'zbek harflari 100% aniq chiqadi!)
  exportReportToPdf() {
    try {
      const ctx = this.getReportContext();
      const pages = this.renderReportToCanvasPages(ctx);
      const pdfBytes = this.buildPdfFromCanvasPages(pages);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      const dateStr = ctx.today.toISOString().slice(0, 10);
      a.download = `DOKON_POS_Hisobot_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.app.showToast('PDF hisoboti (.pdf) muvaffaqiyatli yuklab olindi!', 'success');
    } catch (err) {
      console.error('PDF yaratishda xatolik:', err);
      window.app.showToast('PDF yaratishda xatolik yuz berdi!', 'error');
    }
  }

  // A4 sahifalarni (1240 x 1754 px @ 150 DPI) chizish
  renderReportToCanvasPages(ctx) {
    const W = 1240;
    const H = 1754;
    const margin = 56;
    const contentW = W - margin * 2;
    const pages = [];

    const createPage = (pageNum) => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const c = canvas.getContext('2d');
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, W, H);
      return { canvas, c, pageNum };
    };

    const drawHeaderAndKpis = (c) => {
      let y = margin;

      // Sarlavha chap (Do'kon nomi)
      c.fillStyle = '#1e3a8a';
      c.font = 'bold 34px "Segoe UI", Arial, sans-serif';
      c.textAlign = 'left';
      c.fillText(ctx.shopName, margin, y + 32);

      if (ctx.shopAddress || ctx.shopPhone) {
        c.fillStyle = '#475569';
        c.font = '18px "Segoe UI", Arial, sans-serif';
        c.fillText([ctx.shopAddress, ctx.shopPhone].filter(Boolean).join(' • '), margin, y + 60);
      }

      // Sarlavha o'ng (Hisobot nomi va sana)
      c.textAlign = 'right';
      c.fillStyle = '#0f172a';
      c.font = 'bold 26px "Segoe UI", Arial, sans-serif';
      c.fillText('SAVDO VA KASSA HISOBOTI', W - margin, y + 28);

      c.fillStyle = '#334155';
      c.font = '19px "Segoe UI", Arial, sans-serif';
      c.fillText(`${ctx.periodLabel}  |  ${ctx.currentTime}`, W - margin, y + 58);

      y += 78;
      c.strokeStyle = '#0f172a';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(margin, y);
      c.lineTo(W - margin, y);
      c.stroke();

      y += 20;

      // 4 ta ixcham KPI karta
      const kpis = [
        { label: 'JAMI SAVDO', val: window.app.formatMoney(ctx.totalRevenue), bg: '#eff6ff', border: '#93c5fd', color: '#1e3a8a' },
        { label: 'NAQD TUSHUM', val: window.app.formatMoney(ctx.totalCash), bg: '#f0fdf4', border: '#86efac', color: '#166534' },
        { label: 'KARTA TUSHUMI', val: window.app.formatMoney(ctx.totalCard), bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
        { label: 'TERMINAL TUSHUMI', val: window.app.formatMoney(ctx.totalTerminal), bg: '#fffbeb', border: '#fde68a', color: '#92400e' }
      ];
      const gap = 14;
      const boxW = (contentW - gap * 3) / 4;
      const boxH = 74;

      kpis.forEach((k, i) => {
        const bx = margin + i * (boxW + gap);
        c.fillStyle = k.bg;
        c.strokeStyle = k.border;
        c.lineWidth = 1.5;
        c.fillRect(bx, y, boxW, boxH);
        c.strokeRect(bx, y, boxW, boxH);

        c.textAlign = 'left';
        c.fillStyle = '#475569';
        c.font = 'bold 14px "Segoe UI", Arial, sans-serif';
        c.fillText(k.label, bx + 14, y + 26);

        c.fillStyle = k.color;
        c.font = 'bold 21px "Segoe UI", Arial, sans-serif';
        c.fillText(k.val, bx + 14, y + 56);
      });

      return y + boxH + 22;
    };

    // Jadval ustunlari
    const cols = [
      { label: '№', w: 46, align: 'center' },
      { label: 'Mahsulot nomi', w: 320, align: 'left' },
      { label: 'Soni', w: 105, align: 'center' },
      { label: 'Dona narxi', w: 132, align: 'right' },
      { label: 'Naqd', w: 122, align: 'right' },
      { label: 'Karta', w: 122, align: 'right' },
      { label: 'Terminal', w: 122, align: 'right' },
      { label: 'Jami narxi', w: contentW - (46 + 320 + 105 + 132 + 122 + 122 + 122), align: 'right' }
    ];

    const drawTableHeader = (c, y) => {
      const rowH = 38;
      c.fillStyle = '#e2e8f0';
      c.fillRect(margin, y, contentW, rowH);
      c.strokeStyle = '#94a3b8';
      c.lineWidth = 1.5;
      c.strokeRect(margin, y, contentW, rowH);

      c.fillStyle = '#0f172a';
      c.font = 'bold 16px "Segoe UI", Arial, sans-serif';

      let cx = margin;
      cols.forEach((col, i) => {
        if (i > 0) {
          c.beginPath();
          c.moveTo(cx, y);
          c.lineTo(cx, y + rowH);
          c.stroke();
        }
        c.textAlign = col.align;
        const tx = col.align === 'center' ? cx + col.w / 2 : (col.align === 'right' ? cx + col.w - 8 : cx + 8);
        c.fillText(col.label, tx, y + 25);
        cx += col.w;
      });

      return y + rowH;
    };

    const trimText = (c, text, maxW) => {
      let s = String(text || '');
      if (c.measureText(s).width <= maxW) return s;
      while (s.length > 1 && c.measureText(s + '…').width > maxW) {
        s = s.slice(0, -1);
      }
      return s + '…';
    };

    let page = createPage(1);
    pages.push(page);
    let y = drawHeaderAndKpis(page.c);
    y = drawTableHeader(page.c, y);

    const rowH = 34;
    const maxY = H - margin - 110;

    if (ctx.productRows.length === 0) {
      page.c.strokeStyle = '#cbd5e1';
      page.c.strokeRect(margin, y, contentW, 54);
      page.c.fillStyle = '#64748b';
      page.c.font = 'italic 18px "Segoe UI", Arial, sans-serif';
      page.c.textAlign = 'center';
      page.c.fillText('Tanlangan davrda yakunlangan savdolar mavjud emas', W / 2, y + 34);
      y += 54;
    } else {
      ctx.productRows.forEach((p, idx) => {
        if (y + rowH > maxY) {
          page = createPage(pages.length + 1);
          pages.push(page);
          y = margin;
          y = drawTableHeader(page.c, y);
        }

        const c = page.c;
        c.fillStyle = idx % 2 === 1 ? '#f8fafc' : '#ffffff';
        c.fillRect(margin, y, contentW, rowH);
        c.strokeStyle = '#cbd5e1';
        c.lineWidth = 1;
        c.strokeRect(margin, y, contentW, rowH);

        const vals = [
          String(idx + 1),
          p.name,
          `${p.qty} ${p.unit}`,
          window.app.formatMoney(p.price),
          p.cash > 0 ? window.app.formatMoney(Math.round(p.cash)) : '—',
          p.card > 0 ? window.app.formatMoney(Math.round(p.card)) : '—',
          p.terminal > 0 ? window.app.formatMoney(Math.round(p.terminal)) : '—',
          window.app.formatMoney(p.total)
        ];

        let cx = margin;
        cols.forEach((col, i) => {
          if (i > 0) {
            c.beginPath();
            c.moveTo(cx, y);
            c.lineTo(cx, y + rowH);
            c.stroke();
          }
          c.textAlign = col.align;
          c.fillStyle = (i === 1 || i === 7) ? '#0f172a' : '#334155';
          c.font = (i === 1 || i === 7) ? 'bold 15px "Segoe UI", Arial, sans-serif' : '15px "Segoe UI", Arial, sans-serif';
          const tx = col.align === 'center' ? cx + col.w / 2 : (col.align === 'right' ? cx + col.w - 8 : cx + 8);
          c.fillText(trimText(c, vals[i], col.w - 14), tx, y + 23);
          cx += col.w;
        });

        y += rowH;
      });
    }

    // Jami qatori
    const c = page.c;
    const footH = 40;
    c.fillStyle = '#f1f5f9';
    c.fillRect(margin, y, contentW, footH);
    c.strokeStyle = '#0f172a';
    c.lineWidth = 1.5;
    c.strokeRect(margin, y, contentW, footH);

    const footVals = [
      '',
      `JAMI (${ctx.salesCount} ta chek):`,
      `${ctx.totalItemsCount} dona`,
      '',
      window.app.formatMoney(ctx.totalCash),
      window.app.formatMoney(ctx.totalCard),
      window.app.formatMoney(ctx.totalTerminal),
      window.app.formatMoney(ctx.totalRevenue)
    ];

    let cx = margin;
    cols.forEach((col, i) => {
      c.textAlign = i === 1 ? 'right' : col.align;
      c.fillStyle = '#0f172a';
      c.font = 'bold 15.5px "Segoe UI", Arial, sans-serif';
      const tx = i === 1 ? cx + col.w - 8 : (col.align === 'center' ? cx + col.w / 2 : (col.align === 'right' ? cx + col.w - 8 : cx + 8));
      if (footVals[i]) {
        c.fillText(trimText(c, footVals[i], col.w - 12), tx, y + 26);
      }
      cx += col.w;
    });

    y += footH + 26;

    // Pastki imzo satri
    c.fillStyle = '#475569';
    c.font = '16px "Segoe UI", Arial, sans-serif';
    c.textAlign = 'left';
    c.fillText(`Mahsulot turlari: ${ctx.productRows.length} ta  •  Cheklar soni: ${ctx.salesCount} ta`, margin, y);

    c.textAlign = 'right';
    c.fillText('Kassir: _____________________ (Sotuvchi #1)', W - margin, y);

    return pages.map(p => p.canvas);
  }

  // Standart PDF 1.4 yaratuvchi (JPEG sahifalardan)
  buildPdfFromCanvasPages(canvases) {
    const encoder = new TextEncoder();
    const chunks = [];
    let byteOffset = 0;

    const pushBytes = (uint8) => {
      chunks.push(uint8);
      byteOffset += uint8.length;
    };
    const pushStr = (str) => pushBytes(encoder.encode(str));

    pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

    const offsets = [0]; // 1-indexed object offsets
    const pageObjNums = [];

    // Object 1: Catalog, Object 2: Pages
    offsets.push(0); // placeholder 1
    offsets.push(0); // placeholder 2

    let nextObj = 3;

    const pageData = canvases.map(canvas => {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base64 = dataUrl.split(',')[1];
      const binStr = atob(base64);
      const imgBytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        imgBytes[i] = binStr.charCodeAt(i);
      }
      return { width: canvas.width, height: canvas.height, imgBytes };
    });

    // A4 points: 595.28 x 841.89
    const pdfW = 595.28;
    const pdfH = 841.89;

    pageData.forEach((pd, idx) => {
      const imgObj = nextObj++;
      const contentObj = nextObj++;
      const pageObj = nextObj++;
      pageObjNums.push(pageObj);

      // Image XObject
      offsets[imgObj] = byteOffset;
      pushStr(`${imgObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${pd.width} /Height ${pd.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pd.imgBytes.length} >>\nstream\n`);
      pushBytes(pd.imgBytes);
      pushStr('\nendstream\nendobj\n');

      // Page Content Stream
      const streamStr = `q\n${pdfW} 0 0 ${pdfH} 0 0 cm\n/Im${idx} Do\nQ\n`;
      offsets[contentObj] = byteOffset;
      pushStr(`${contentObj} 0 obj\n<< /Length ${streamStr.length} >>\nstream\n${streamStr}endstream\nendobj\n`);

      // Page Object
      offsets[pageObj] = byteOffset;
      pushStr(`${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pdfW} ${pdfH}] /Resources << /XObject << /Im${idx} ${imgObj} 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`);
    });

    // Object 2: Pages
    offsets[2] = byteOffset;
    pushStr(`2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map(n => `${n} 0 R`).join(' ')}] /Count ${pageObjNums.length} >>\nendobj\n`);

    // Object 1: Catalog
    offsets[1] = byteOffset;
    pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // Cross-reference table
    const xrefStart = byteOffset;
    pushStr(`xref\n0 ${nextObj}\n0000000000 65535 f \n`);
    for (let i = 1; i < nextObj; i++) {
      pushStr(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
    }

    pushStr(`trailer\n<< /Size ${nextObj} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`);

    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const out = new Uint8Array(totalLen);
    let pos = 0;
    for (const c of chunks) {
      out.set(c, pos);
      pos += c.length;
    }
    return out;
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

window.reportsManager = new ReportsManager();
