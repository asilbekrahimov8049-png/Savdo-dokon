/**
 * DO‘KON POS - Asosiy Dastur Boshqaruvchisi (App Controller)
 * Sahifalar navigatsiyasi, bildirishnomalar (toasts),
 * klaviatura tezkor tugmalari, sozlamalar va zaxira nusxalash
 */

class AppController {
  constructor() {
    this.currentView = 'pos'; // 'pos', 'products', 'history', 'reports', 'settings'
    this.settings = {};
  }

  async init() {
    console.log('DO‘KON POS ishga tushmoqda...');

    // 1. Storage va Ma'lumotlarni yuklash
    await window.storageService.init();
    this.settings = await window.storageService.getSettings();

    // 2. Sound sozlamasini ulash
    if (window.soundService) {
      window.soundService.enabled = this.settings.soundEnabled ?? true;
    }

    // 3. Modullarni ishga tushirish
    if (window.posManager) await window.posManager.init();
    if (window.productsManager) await window.productsManager.init();
    if (window.historyManager) await window.historyManager.init();
    if (window.reportsManager) await window.reportsManager.init();
    if (window.paymentManager) window.paymentManager.init();

    // 4. Sozlamalar formasini to'ldirish
    this.loadSettingsForm();

    // 5. Hodisalarni ulash
    this.bindGlobalEvents();
    this.updateShopHeader();

    console.log('DO‘KON POS tayyor!');
  }

  // Sahifa navigatsiyasi
  switchView(viewName) {
    this.currentView = viewName;

    // Nav tugmalarini yangilash
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    // Sahifa ko'rinishlarini yangilash
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view_${viewName}`);
    });

    // Sahifa o'zgarganda ma'lumotlarni yangilash
    if (viewName === 'pos') {
      window.posManager.renderProducts();
      window.posManager.updateDashboardMetrics();
      setTimeout(() => document.getElementById('posSearchInput')?.focus(), 100);
    } else if (viewName === 'products') {
      window.productsManager.renderProductsTable();
    } else if (viewName === 'history') {
      window.historyManager.loadData().then(() => window.historyManager.renderSalesList());
    } else if (viewName === 'reports') {
      window.reportsManager.refresh();
    } else if (viewName === 'settings') {
      this.loadSettingsForm();
    }
  }

  // Pulni chiroyli formatlash: 100000 -> 100 000 so‘m
  formatMoney(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) return '0 so‘m';
    const num = Math.round(Number(amount));
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const currency = this.settings?.currency || 'so‘m';
    return `${formatted} ${currency}`;
  }

  // Toast bildirishnoma ko'rsatish
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `pos-toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span class="toast-text">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Do'kon sarlavhasi
  updateShopHeader() {
    const shopNameEl = document.getElementById('appHeaderShopName');
    if (shopNameEl && this.settings.shopName) {
      shopNameEl.textContent = this.settings.shopName;
    }
  }

  // Sozlamalar formasi
  loadSettingsForm() {
    const s = this.settings;
    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v ?? '';
    };

    setVal('settingShopName', s.shopName);
    setVal('settingShopAddress', s.shopAddress);
    setVal('settingShopPhone', s.shopPhone);
    setVal('settingTaxNumber', s.taxNumber);
    setVal('settingReceiptHeader', s.receiptHeader);
    setVal('settingReceiptFooter', s.receiptFooter);
    setVal('settingCurrency', s.currency);

    const soundChk = document.getElementById('settingSoundEnabled');
    if (soundChk) soundChk.checked = s.soundEnabled ?? true;

    const autoPrintChk = document.getElementById('settingAutoPrint');
    if (autoPrintChk) autoPrintChk.checked = s.autoPrintReceipt ?? false;
  }

  async saveSettingsFromForm() {
    const getVal = (id) => document.getElementById(id)?.value?.trim() || '';

    const newSettings = {
      ...this.settings,
      shopName: getVal('settingShopName') || 'DO‘KON POS',
      shopAddress: getVal('settingShopAddress'),
      shopPhone: getVal('settingShopPhone'),
      taxNumber: getVal('settingTaxNumber'),
      receiptHeader: getVal('settingReceiptHeader') || 'Xaridingiz uchun rahmat!',
      receiptFooter: getVal('settingReceiptFooter') || 'Iltimos, chekni saqlang.',
      currency: getVal('settingCurrency') || 'so‘m',
      soundEnabled: document.getElementById('settingSoundEnabled')?.checked ?? true,
      autoPrintReceipt: document.getElementById('settingAutoPrint')?.checked ?? false
    };

    this.settings = await window.storageService.saveSettings(newSettings);
    if (window.soundService) {
      window.soundService.enabled = this.settings.soundEnabled;
    }
    this.updateShopHeader();
    this.showToast('Sozlamalar muvaffaqiyatli saqlandi!', 'success');
  }

  // Zaxira nusxasini yuklab olish (Export JSON)
  async exportBackup() {
    try {
      const backupData = await window.storageService.exportFullBackup();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `DOKON_POS_Zaxira_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showToast('Zaxira nusxasi (Backup) muvaffaqiyatli saqlandi!', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Zaxira olishda xatolik yuz berdi!', 'error');
    }
  }

  // Zaxira nusxasidan tiklash (Import JSON)
  async importBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        if (confirm('Diqqat! Zaxirani tiklash joriy barcha ma‘lumotlarni almashtiradi. Davom etilsinmi?')) {
          await window.storageService.importFullBackup(backupData);
          this.showToast('Ma‘lumotlar muvaffaqiyatli tiklandi! Tizim qayta yuklanmoqda...', 'success');
          setTimeout(() => location.reload(), 1500);
        }
      } catch (err) {
        console.error(err);
        this.showToast('Zaxira faylini o‘qishda xatolik yuz berdi!', 'error');
      }
    };
    reader.readAsText(file);
  }

  // Global hodisalar va tezkor klavishlar
  bindGlobalEvents() {
    // Navigatsiya tugmalari
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Sozlamalar formasi
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettingsFromForm();
      });
    }

    // Backup export
    const exportBackupBtn = document.getElementById('exportBackupBtn');
    if (exportBackupBtn) {
      exportBackupBtn.addEventListener('click', () => this.exportBackup());
    }

    // Backup import
    const importFileInput = document.getElementById('importBackupFileInput');
    const importTriggerBtn = document.getElementById('importBackupTriggerBtn');
    if (importTriggerBtn && importFileInput) {
      importTriggerBtn.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.importBackup(e.target.files[0]);
        }
      });
    }

    // Chek modal tugmalari
    document.getElementById('btnPrintReceipt')?.addEventListener('click', () => {
      window.receiptManager.printReceipt();
    });
    document.getElementById('btnCloseReceipt')?.addEventListener('click', () => {
      window.receiptManager.closeReceipt();
    });

    // KLAVIATURA TEZKOR TUGMALARI (HOTKEYS)
    window.addEventListener('keydown', (e) => {
      // Agar modal ochiq bo'lsa va Esc bosilsa
      if (e.key === 'Escape') {
        document.querySelectorAll('.pos-modal.active').forEach(m => m.classList.remove('active'));
        return;
      }

      // Input yoki textarea ichida bo'lsa boshqa tezkor klavishlar cheklanadi
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      // F2: Mahsulot qidirishga o'tish
      if (e.key === 'F2') {
        e.preventDefault();
        this.switchView('pos');
        const sInp = document.getElementById('posSearchInput');
        if (sInp) {
          sInp.focus();
          sInp.select();
        }
        return;
      }

      // F4: Savatni tozalash
      if (e.key === 'F4') {
        e.preventDefault();
        if (this.currentView === 'pos' && window.posManager.cart.length > 0) {
          if (confirm('Savat tozalansinmi?')) {
            window.posManager.clearCart();
          }
        }
        return;
      }

      // F7: Tezkor Naqd to'lov
      if (e.key === 'F7') {
        e.preventDefault();
        if (this.currentView === 'pos') {
          window.posManager.instantPay('naqd');
        }
        return;
      }

      // F8: Tezkor Karta to'lov
      if (e.key === 'F8') {
        e.preventDefault();
        if (this.currentView === 'pos') {
          window.posManager.instantPay('karta');
        }
        return;
      }

      // F9: Tezkor Terminal to'lov
      if (e.key === 'F9') {
        e.preventDefault();
        if (this.currentView === 'pos') {
          window.posManager.instantPay('terminal');
        }
        return;
      }

      // Alt + 1..5 tezkor sahifalar
      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); this.switchView('pos'); }
        if (e.key === '2') { e.preventDefault(); this.switchView('products'); }
        if (e.key === '3') { e.preventDefault(); this.switchView('history'); }
        if (e.key === '4') { e.preventDefault(); this.switchView('reports'); }
        if (e.key === '5') { e.preventDefault(); this.switchView('settings'); }
      }
    });
  }
}

// Initsializatsiya
window.app = new AppController();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
