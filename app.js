/**
 * DO‘KON POS - Asosiy Dastur Boshqaruvchisi (App Controller)
 * Sahifalar navigatsiyasi, Orqaga/Bosh sahifa, brauzer Back tugmasi (popstate),
 * Chiqish tasdiqlashi, modal va bildirishnomalar, zaxira nusxalash.
 */

class AppController {
  constructor() {
    this.currentView = 'pos'; // 'pos', 'products', 'history', 'reports', 'settings'
    this.viewStack = ['pos'];
    this.settings = {};
    this._confirmResolver = null;
    this._handlingPopState = false;
  }

  async init() {
    await window.storageService.init();
    this.settings = await window.storageService.getSettings();

    if (window.soundService) {
      window.soundService.enabled = this.settings.soundEnabled ?? true;
    }

    if (window.posManager) await window.posManager.init();
    if (window.productsManager) await window.productsManager.init();
    if (window.historyManager) await window.historyManager.init();
    if (window.reportsManager) await window.reportsManager.init();
    if (window.paymentManager) window.paymentManager.init();

    this.loadSettingsForm();
    this.updateStorageInfo();
    this.bindGlobalEvents();
    this.updateShopHeader();
    this.initBrowserHistory();
    this.updateHeaderBackState();
    this.checkIconFontFallback();
  }

  checkIconFontFallback() {
    const apply = () => {
      try {
        const probe = document.createElement('i');
        probe.className = 'fa-solid fa-plus';
        probe.style.cssText = 'position:absolute;left:-9999px;visibility:hidden;';
        document.body.appendChild(probe);
        const beforeContent = window.getComputedStyle(probe, '::before').content;
        probe.remove();
        const faLoaded = !!(beforeContent && beforeContent !== 'none' && beforeContent !== 'normal' && beforeContent !== '""');
        document.body.classList.toggle('no-fa', !faLoaded);
      } catch (e) {}
    };
    apply();
    setTimeout(apply, 1000);
  }

  // Brauzer Back tugmasini qo'llab-quvvatlash
  initBrowserHistory() {
    try {
      const initialHash = (window.location.hash || '').replace('#', '');
      const validViews = ['pos', 'products', 'history', 'reports', 'settings'];
      const startView = validViews.includes(initialHash) ? initialHash : 'pos';

      history.replaceState({ view: 'pos', category: 'all' }, '', '#pos');
      if (startView !== 'pos') {
        this.switchView(startView);
      }

      window.addEventListener('popstate', (e) => {
        this._handlingPopState = true;
        try {
          // 1. Ochiq modal bo'lsa avval uni yopamiz
          const openModals = document.querySelectorAll('.pos-modal.active');
          if (openModals.length > 0) {
            openModals.forEach(m => m.classList.remove('active'));
            if (this._confirmResolver) {
              const res = this._confirmResolver;
              this._confirmResolver = null;
              res(false);
            }
            return;
          }

          // 2. Mobil savatcha ochiq bo'lsa yopamiz
          const cartPanel = document.getElementById('posCartPanel');
          if (cartPanel && cartPanel.classList.contains('mobile-active')) {
            window.posManager?.closeMobileCart();
            return;
          }

          // 3. Oldingi sahifaga yoki kategoriyaga qaytish
          const state = e.state || { view: 'pos', category: 'all' };
          if (state.view && state.view !== this.currentView) {
            this.switchView(state.view, true);
          }
          if (state.view === 'pos' && window.posManager) {
            const targetCat = state.category || 'all';
            if (window.posManager.activeCategory !== targetCat) {
              window.posManager.selectCategory(targetCat, true);
            }
          }
        } finally {
          this._handlingPopState = false;
          this.updateHeaderBackState();
        }
      });
    } catch (err) {
      console.warn('History API cheklovi:', err);
    }
  }

  pushNavState(stateObj) {
    if (this._handlingPopState) return;
    try {
      const hash = stateObj.view ? `#${stateObj.view}` : '#pos';
      history.pushState(stateObj, '', hash);
    } catch (e) {}
  }

  // Sahifa navigatsiyasi
  switchView(viewName, skipHistory = false) {
    if (!viewName) return;

    if (this.currentView !== viewName) {
      this.viewStack.push(viewName);
      if (this.viewStack.length > 20) this.viewStack.shift();
    }

    this.currentView = viewName;

    // Yon menyu va mobil pastki menyu tugmalarini yangilash
    document.querySelectorAll('.nav-item, .mobile-bottom-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    // Sahifalarni almashtirish
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view_${viewName}`);
    });

    // Mobil yon menyuni yopish
    this.closeMobileSidebar();

    if (!skipHistory) {
      this.pushNavState({ view: viewName, category: window.posManager?.activeCategory || 'all' });
    }

    this.updateHeaderBackState();

    // Sahifaga mos ma'lumotlarni yangilash
    if (viewName === 'pos') {
      window.posManager?.renderCategoryCards();
      window.posManager?.renderProducts();
      window.posManager?.updateDashboardMetrics();
    } else if (viewName === 'products') {
      window.productsManager?.loadData().then(() => {
        window.productsManager.renderCategoryFilter();
        window.productsManager.renderProductsTable();
      });
    } else if (viewName === 'history') {
      window.historyManager?.loadData().then(() => window.historyManager.renderSalesList());
    } else if (viewName === 'reports') {
      window.reportsManager?.refresh();
    } else if (viewName === 'settings') {
      this.loadSettingsForm();
      this.updateStorageInfo();
    }
  }

  // Orqaga qaytish (Har bir ichki sahifa, kategoriya va mobil uchun)
  goBack() {
    // Agar modal ochiq bo'lsa yopish
    const activeModals = document.querySelectorAll('.pos-modal.active');
    if (activeModals.length > 0) {
      activeModals.forEach(m => m.classList.remove('active'));
      return;
    }

    // Agar mobil savat ochiq bo'lsa yopish
    const cartPanel = document.getElementById('posCartPanel');
    if (cartPanel && cartPanel.classList.contains('mobile-active')) {
      window.posManager?.closeMobileCart();
      return;
    }

    // Agar bosh sahifada kategoriya tanlangan bo'lsa "Barchasi"ga qaytish
    if (this.currentView === 'pos' && window.posManager && window.posManager.activeCategory !== 'all') {
      window.posManager.selectCategory('all');
      return;
    }

    // Oldingi sahifaga qaytish
    if (this.viewStack.length > 1) {
      this.viewStack.pop();
      const prevView = this.viewStack[this.viewStack.length - 1] || 'pos';
      this.switchView(prevView, true);
      // Stack oxirini toza saqlash
      if (this.viewStack[this.viewStack.length - 1] !== prevView) {
        this.viewStack.push(prevView);
      }
      return;
    }

    if (this.currentView !== 'pos') {
      this.switchView('pos');
    }
  }

  // Bosh sahifaga qaytish
  goHome() {
    this.viewStack = ['pos'];
    if (window.posManager && window.posManager.activeCategory !== 'all') {
      window.posManager.activeCategory = 'all';
    }
    this.switchView('pos');
  }

  updateHeaderBackState() {
    const backBtn = document.getElementById('headerBackBtn');
    const homeBtn = document.getElementById('headerHomeBtn');
    const inSubView = this.currentView !== 'pos';
    const inCategory = this.currentView === 'pos' && window.posManager && window.posManager.activeCategory !== 'all';

    if (backBtn) {
      backBtn.style.display = (inSubView || inCategory) ? 'inline-flex' : 'none';
    }
    if (homeBtn) {
      homeBtn.style.display = inSubView ? 'inline-flex' : 'none';
    }
  }

  closeMobileSidebar() {
    document.getElementById('appSidebar')?.classList.remove('mobile-open');
    document.getElementById('sidebarBackdrop')?.classList.remove('active');
  }

  toggleMobileSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;
    const isOpen = sidebar.classList.toggle('mobile-open');
    if (backdrop) backdrop.classList.toggle('active', isOpen);
  }

  // Chiqish va Tasdiqlash
  async promptExit() {
    const cartCount = window.posManager ? window.posManager.getCartTotalCount() : 0;
    const extraMsg = cartCount > 0
      ? ` Diqqat: savatchada ${cartCount} ta mahsulot mavjud (ular xavfsiz saqlanadi).`
      : '';

    const confirmed = await this.showConfirm({
      title: 'Tizimdan chiqish',
      message: `Haqiqatan ham kassa tizimidan chiqmoqchimisiz? Barcha mahsulotlar va savdolar tarixi saqlab qolinadi.${extraMsg}`,
      confirmText: 'Ha, chiqish',
      cancelText: 'Qolish',
      type: 'warning'
    });

    if (confirmed) {
      this.closeMobileSidebar();
      const lockScreen = document.getElementById('exitLockScreen');
      const lockShopName = document.getElementById('exitLockShopName');
      if (lockShopName) lockShopName.textContent = this.settings.shopName || 'DO‘KON POS';
      if (lockScreen) lockScreen.classList.add('active');
      this.showToast('Tizimdan xavfsiz chiqildi.', 'info');
    }
  }

  reenterPos() {
    const lockScreen = document.getElementById('exitLockScreen');
    if (lockScreen) lockScreen.classList.remove('active');
    this.goHome();
    this.showToast('Xush kelibsiz! Kassa ishga tayyor.', 'success');
  }

  // Zamonaviy O'zbekcha Tasdiqlash Modali (confirm() o'rniga)
  showConfirm({ title = 'Tasdiqlash', message = '', confirmText = 'Tasdiqlash', cancelText = 'Bekor qilish', type = 'warning' }) {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirmActionModal');
      if (!modal) {
        resolve(window.confirm(message));
        return;
      }

      const titleEl = document.getElementById('confirmModalTitle');
      const msgEl = document.getElementById('confirmModalMessage');
      const okBtn = document.getElementById('confirmModalOkBtn');
      const cancelBtn = document.getElementById('confirmModalCancelBtn');
      const iconWrap = document.getElementById('confirmModalIcon');

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (okBtn) {
        okBtn.textContent = confirmText;
        okBtn.className = `btn-primary ${type === 'danger' ? 'btn-danger' : 'btn-success'}`;
      }
      if (cancelBtn) cancelBtn.textContent = cancelText;
      if (iconWrap) {
        iconWrap.className = `confirm-icon-circle ${type}`;
        iconWrap.innerHTML = type === 'danger'
          ? '<i class="fa-solid fa-triangle-exclamation"></i>'
          : '<i class="fa-solid fa-circle-question"></i>';
      }

      this._confirmResolver = resolve;
      modal.classList.add('active');
    });
  }

  resolveConfirm(result) {
    const modal = document.getElementById('confirmActionModal');
    if (modal) modal.classList.remove('active');
    if (this._confirmResolver) {
      const res = this._confirmResolver;
      this._confirmResolver = null;
      res(result);
    }
  }

  // Pulni formatlash: 100000 -> 100 000 so‘m
  formatMoney(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) return '0 so‘m';
    const num = Math.round(Number(amount));
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const currency = this.settings?.currency || 'so‘m';
    return `${formatted} ${currency}`;
  }

  // Bildirishnoma (Toast) — ekranda ko'pi bilan 2 ta xabar turadi
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    while (container.children.length >= 2) {
      container.firstElementChild.remove();
    }

    const toast = document.createElement('div');
    toast.className = `pos-toast ${type}`;

    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    if (type === 'warning') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
      <i class="fa-solid ${icon}"></i>
      <span class="toast-text">${this.escapeHtml(message)}</span>
      <button type="button" class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      if (!toast.isConnected) return;
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 2600);
  }

  updateShopHeader() {
    const shopNameEl = document.getElementById('appHeaderShopName');
    const sidebarShopEl = document.getElementById('sidebarShopName');
    const name = this.settings.shopName || 'DO‘KON POS';
    if (shopNameEl) shopNameEl.textContent = name;
    if (sidebarShopEl) sidebarShopEl.textContent = name;
  }

  updateStorageInfo() {
    const el = document.getElementById('storageUsageText');
    if (!el || !window.storageService.getStorageStats) return;
    const stats = window.storageService.getStorageStats();
    const prods = window.posManager?.products?.length || 0;
    const sales = window.historyManager?.sales?.length || 0;
    el.textContent = `Saqlangan: ${prods} ta mahsulot, ${sales} ta savdo • Band xotira: ${stats.usedKB} KB`;
  }

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
      soundEnabled: document.getElementById('settingSoundEnabled')?.checked ?? true
    };

    this.settings = await window.storageService.saveSettings(newSettings);
    if (window.soundService) {
      window.soundService.enabled = this.settings.soundEnabled;
    }
    this.updateShopHeader();
    window.posManager?.renderProducts();
    window.posManager?.renderCart();
    window.posManager?.updateDashboardMetrics();
    window.reportsManager?.refresh();
    this.showToast('Sozlamalar muvaffaqiyatli saqlandi!', 'success');
  }

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

      this.showToast('Zaxira nusxasi muvaffaqiyatli yuklab olindi!', 'success');
    } catch (e) {
      console.error(e);
      this.showToast('Zaxira olishda xatolik yuz berdi!', 'error');
    }
  }

  async importBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        const confirmed = await this.showConfirm({
          title: 'Zaxiradan tiklash',
          message: 'Zaxira faylini yuklash joriy mahsulotlar va savdo ma’lumotlarini tiklaydi. Davom etilsinmi?',
          confirmText: 'Ha, tiklash',
          cancelText: 'Bekor qilish',
          type: 'warning'
        });

        if (confirmed) {
          await window.storageService.importFullBackup(backupData);
          this.showToast('Ma’lumotlar muvaffaqiyatli tiklandi! Sahifa yangilanmoqda...', 'success');
          setTimeout(() => location.reload(), 1200);
        }
      } catch (err) {
        console.error(err);
        this.showToast('Zaxira faylini o‘qishda xatolik yuz berdi!', 'error');
      }
    };
    reader.readAsText(file);
  }

  bindGlobalEvents() {
    // Yon menyu va pastki mobil menyu tugmalari
    document.querySelectorAll('.nav-item, .mobile-bottom-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-view');
        if (view) this.switchView(view);
      });
    });

    // Mobil yon menyu foni
    document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
      this.closeMobileSidebar();
    });

    // Tasdiqlash modali tugmalari
    document.getElementById('confirmModalOkBtn')?.addEventListener('click', () => this.resolveConfirm(true));
    document.getElementById('confirmModalCancelBtn')?.addEventListener('click', () => this.resolveConfirm(false));
    document.getElementById('closeConfirmModalBtn')?.addEventListener('click', () => this.resolveConfirm(false));

    // Modal tashqi fonini bosganda yopish
    document.querySelectorAll('.pos-modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal.id === 'confirmActionModal') {
            this.resolveConfirm(false);
          } else {
            modal.classList.remove('active');
          }
        }
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

    // Zaxira nusxa (Backup / Restore)
    document.getElementById('exportBackupBtn')?.addEventListener('click', () => this.exportBackup());

    const importFileInput = document.getElementById('importBackupFileInput');
    const importTriggerBtn = document.getElementById('importBackupTriggerBtn');
    if (importTriggerBtn && importFileInput) {
      importTriggerBtn.addEventListener('click', () => importFileInput.click());
      importFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.importBackup(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Chek modal tugmalari
    document.getElementById('btnPrintReceipt')?.addEventListener('click', () => {
      window.receiptManager?.printReceipt();
    });
    document.getElementById('btnCloseReceipt')?.addEventListener('click', () => {
      window.receiptManager?.closeReceipt();
    });
    document.getElementById('closeReceiptModalBtn')?.addEventListener('click', () => {
      window.receiptManager?.closeReceipt();
    });

    // Klaviatura tezkor tugmalari
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const confirmModal = document.getElementById('confirmActionModal');
        if (confirmModal && confirmModal.classList.contains('active')) {
          this.resolveConfirm(false);
          return;
        }
        document.querySelectorAll('.pos-modal.active').forEach(m => m.classList.remove('active'));
        window.posManager?.closeMobileCart();
        return;
      }

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

      if (e.key === 'F4') {
        e.preventDefault();
        if (this.currentView === 'pos' && window.posManager?.cart?.length > 0) {
          window.posManager.clearCartConfirm();
        }
        return;
      }

      if (e.key === 'F7') {
        e.preventDefault();
        if (this.currentView === 'pos') window.posManager?.instantPay('naqd');
        return;
      }

      if (e.key === 'F8') {
        e.preventDefault();
        if (this.currentView === 'pos') window.posManager?.instantPay('karta');
        return;
      }

      if (e.key === 'F9') {
        e.preventDefault();
        if (this.currentView === 'pos') window.posManager?.instantPay('terminal');
        return;
      }

      if (e.altKey) {
        if (e.key === '1') { e.preventDefault(); this.switchView('pos'); }
        if (e.key === '2') { e.preventDefault(); this.switchView('products'); }
        if (e.key === '3') { e.preventDefault(); this.switchView('history'); }
        if (e.key === '4') { e.preventDefault(); this.switchView('reports'); }
        if (e.key === '5') { e.preventDefault(); this.switchView('settings'); }
      }
    });
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

window.app = new AppController();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
