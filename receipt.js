/**
 * DO‘KON POS - Chek Boshqaruvi (Receipt Manager)
 * Standart kassa termal cheki (58mm/80mm), printerdan chop etish va PDF saqlash
 */

class ReceiptManager {
  constructor() {
    this.currentSale = null;
  }

  async showReceipt(sale) {
    this.currentSale = sale;
    const settings = await window.storageService.getSettings();

    const modal = document.getElementById('receiptModal');
    const container = document.getElementById('printableReceiptArea');

    if (!modal || !container) return;

    const date = new Date(sale.createdAt);
    const dateFormatted = date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeFormatted = date.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Chek HTML andozasi
    container.innerHTML = `
      <div class="pos-receipt">
        <div class="receipt-header">
          <div class="receipt-logo-icon"><i class="fa-solid fa-shop"></i></div>
          <h2 class="receipt-shop-name">${settings.shopName || 'DO‘KON POS'}</h2>
          ${settings.shopAddress ? `<p class="receipt-sub">${settings.shopAddress}</p>` : ''}
          ${settings.shopPhone ? `<p class="receipt-sub">Tel: ${settings.shopPhone}</p>` : ''}
          ${settings.taxNumber ? `<p class="receipt-sub">${settings.taxNumber}</p>` : ''}
          <div class="receipt-divider-dashed"></div>
        </div>

        <div class="receipt-meta">
          <div><span>Chek №:</span> <strong>${sale.receiptNumber}</strong></div>
          <div><span>Sana:</span> <strong>${dateFormatted} ${timeFormatted}</strong></div>
          <div><span>Kassir:</span> <strong>${sale.cashier || 'Sotuvchi #1'}</strong></div>
          <div><span>Holat:</span> <strong>${sale.status === 'completed' ? 'TO‘LANGAN' : 'BEKOR QILINGAN'}</strong></div>
        </div>

        <div class="receipt-divider-solid"></div>

        <table class="receipt-items-table">
          <thead>
            <tr>
              <th class="text-left">Mahsulot</th>
              <th class="text-center">Miqdor</th>
              <th class="text-right">Narx</th>
              <th class="text-right">Jami</th>
            </tr>
          </thead>
          <tbody>
            ${sale.items.map(item => `
              <tr>
                <td class="text-left item-name">${item.name}</td>
                <td class="text-center">${item.qty} ${item.unit || 'dona'}</td>
                <td class="text-right">${window.app.formatMoney(item.price)}</td>
                <td class="text-right item-subtotal">${window.app.formatMoney(item.price * item.qty)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="receipt-divider-solid"></div>

        <div class="receipt-totals-block">
          <div class="receipt-line">
            <span>Jami tovarlar:</span>
            <span>${sale.totalQuantity} dona (${sale.items.length} tur)</span>
          </div>
          <div class="receipt-line main-total">
            <span>JAMI TO‘LOV:</span>
            <span>${window.app.formatMoney(sale.totalAmount)}</span>
          </div>

          <div class="receipt-divider-dashed"></div>

          <div class="receipt-payment-breakdown">
            ${sale.cashAmount > 0 ? `
              <div class="receipt-line">
                <span>Naqd to‘lov:</span>
                <span>${window.app.formatMoney(sale.cashAmount)}</span>
              </div>
            ` : ''}
            ${sale.cardAmount > 0 ? `
              <div class="receipt-line">
                <span>Karta to‘lovi (Humo/Uzcard):</span>
                <span>${window.app.formatMoney(sale.cardAmount)}</span>
              </div>
            ` : ''}
            ${sale.terminalAmount > 0 ? `
              <div class="receipt-line">
                <span>Bank terminali:</span>
                <span>${window.app.formatMoney(sale.terminalAmount)}</span>
              </div>
            ` : ''}
            ${sale.changeAmount > 0 ? `
              <div class="receipt-line change-line">
                <span>QAYTIM (Sdacha):</span>
                <span>${window.app.formatMoney(sale.changeAmount)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="receipt-divider-dashed"></div>

        <div class="receipt-footer">
          <p class="receipt-thanks">${settings.receiptHeader || 'Xaridingiz uchun rahmat!'}</p>
          <div class="barcode-fake">
            <i class="fa-solid fa-barcode"></i>
            <span>*${sale.receiptNumber}*</span>
          </div>
          <p class="receipt-notice">${settings.receiptFooter || 'Iltimos, chekni saqlang. Yana kelib turing!'}</p>
        </div>
      </div>
    `;

    modal.classList.add('active');
    if (window.app && window.app.pushNavState) {
      window.app.pushNavState({ view: window.app.currentView, modal: 'receiptModal' });
    }
  }

  closeReceipt() {
    const modal = document.getElementById('receiptModal');
    if (modal) modal.classList.remove('active');
  }

  printReceipt() {
    window.print();
  }
}

window.receiptManager = new ReceiptManager();
