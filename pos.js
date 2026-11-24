/**
 * DO‘KON POS - Savdo va Kassa jarayoni (POS Manager)
 * PLUS (+), MINUS (-), Savatcha, Qidiruv, Kategoriyalar va Real-vaqt hisob-kitob
 */

class POSManager {
  constructor() {
    this.products = [];
    this.categories = [];
    this.cart = []; // [{ id, name, price, qty, unit, barcode, category }]
    this.activeCategory = 'all';
    this.searchQuery = '';
  }

  async init() {
    await this.loadData();
    this.renderCategories();
    this.renderProducts();
    this.renderCart();
    this.updateDashboardMetrics();
    this.bindEvents();
  }

  async loadData() {
    this.products = await window.storageService.getProducts();
    this.categories = await window.storageService.getCategories();
  }

  bindEvents() {
    // Qidiruv maydoni
    const searchInput = document.getElementById('posSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderProducts();
      });

      // Shtrix-kod skaner qilinganda (Enter bosilganda)
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleBarcodeScan(this.searchQuery);
        }
      });
    }

    // Savatni tozalash tugmasi
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', () => {
        this.clearCartConfirm();
      });
    }

    // To'lov tugmasi
    const proceedPaymentBtn = document.getElementById('proceedPaymentBtn');
    if (proceedPaymentBtn) {
      proceedPaymentBtn.addEventListener('click', () => {
        this.proceedToPayment();
      });
    }
  }

  // BIR BOSISHDA TEZKOR TO'LOV VA SAQLASH (Pul kiritmasdan, bittada saqlaydi!)
  async instantPay(paymentType) {
    if (!this.cart || this.cart.length === 0) {
      window.app.showToast('Savatcha bo‘sh! Avval mahsulot tanlang yoki PLUS (+) ni bosing.', 'warning');
      if (window.soundService) window.soundService.playError();
      return;
    }

    const totalAmount = this.getCartTotal();
    let cashAmount = 0;
    let cardAmount = 0;
    let terminalAmount = 0;
    let label = '';

    if (paymentType === 'naqd') {
      cashAmount = totalAmount;
      label = '💵 NAQD';
    } else if (paymentType === 'karta') {
      cardAmount = totalAmount;
      label = '💳 KARTA';
    } else if (paymentType === 'terminal') {
      terminalAmount = totalAmount;
      label = '📟 TERMINAL';
    }

    const saleData = {
      items: JSON.parse(JSON.stringify(this.cart)),
      totalQuantity: this.getCartTotalCount(),
      totalAmount: totalAmount,
      cashAmount: cashAmount,
      cardAmount: cardAmount,
      terminalAmount: terminalAmount,
      changeAmount: 0,
      paymentTypes: [paymentType],
      status: 'completed',
      cashier: 'Sotuvchi #1',
      createdAt: new Date().toISOString()
    };

    try {
      const savedSale = await window.storageService.addSale(saleData);

      // Kassa jiringlashi
      if (window.soundService) window.soundService.playSuccess();

      // Savatni tozalash
      this.clearCart();

      // Dashboardni yangilash
      this.updateDashboardMetrics();

      window.app.showToast(`${label} to‘lovi saqlandi: ${window.app.formatMoney(totalAmount)}! Yangi savdoga tayyor.`, 'success');

      // Tarix va hisobotlarni yangilash
      if (window.historyManager) {
        window.historyManager.loadData().then(() => window.historyManager.renderSalesList());
      }
      if (window.reportsManager) {
        window.reportsManager.loadData().then(() => window.reportsManager.renderAll());
      }
    } catch (e) {
      console.error(e);
      window.app.showToast('Savdoni saqlashda xatolik yuz berdi!', 'error');
    }
  }

  // Bo'lib to'lash kerak bo'lganda (agar naqd + karta aralash bo'lsa)
  openSplitPaymentModal() {
    this.proceedToPayment();
  }

  // To'lovga o'tish (To'g'ridan-to'g'ri chaqirish uchun ham ochiq)
  proceedToPayment() {
    if (!this.cart || this.cart.length === 0) {
      window.app.showToast('Savatcha bo‘sh! Avval mahsulot tanlang yoki PLUS (+) ni bosing.', 'warning');
      if (window.soundService) window.soundService.playError();
      return;
    }
    window.paymentManager.openPaymentModal(this.getCartTotal(), this.cart);
  }

  clearCartConfirm() {
    if (this.cart.length === 0) return;
    if (confirm('Savatchadagi barcha mahsulotlar o‘chirilsinmi?')) {
      this.clearCart();
      if (window.soundService) window.soundService.playDelete();
    }
  }

  // Shtrix-kod yoki qidiruv orqali savatga qo'shish
  handleBarcodeScan(query) {
    if (!query) return;

    let match = this.products.find(p => p.barcode && p.barcode.toLowerCase() === query);
    
    if (!match) {
      const filtered = this.getFilteredProducts();
      if (filtered.length === 1) {
        match = filtered[0];
      }
    }

    if (match) {
      this.addToCart(match.id, 1);
      const searchInput = document.getElementById('posSearchInput');
      if (searchInput) {
        searchInput.value = '';
        this.searchQuery = '';
        this.renderProducts();
      }
      window.app.showToast(`"${match.name}" savatga qo‘shildi!`, 'success');
    }
  }

  // Kategoriyalarni chizish
  renderCategories() {
    const container = document.getElementById('categoriesPills');
    if (!container) return;

    let html = `
      <button type="button" class="cat-pill ${this.activeCategory === 'all' ? 'active' : ''}" onclick="window.posManager.selectCategory('all')">
        <i class="fa-solid fa-layer-group"></i>
        <span>Barchasi</span>
        <span class="badge-count">${this.products.length}</span>
      </button>
    `;

    this.categories.forEach(cat => {
      const count = this.products.filter(p => p.category === cat.id).length;
      html += `
        <button type="button" class="cat-pill ${this.activeCategory === cat.id ? 'active' : ''}" onclick="window.posManager.selectCategory('${cat.id}')">
          <i class="fa-solid ${cat.icon || 'fa-tag'}"></i>
          <span>${cat.name}</span>
          <span class="badge-count">${count}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  selectCategory(catId) {
    this.activeCategory = catId;
    this.renderCategories();
    this.renderProducts();
  }

  getFilteredProducts() {
    return this.products.filter(product => {
      const matchCat = (this.activeCategory === 'all' || product.category === this.activeCategory);
      const matchSearch = (!this.searchQuery || 
        product.name.toLowerCase().includes(this.searchQuery) ||
        (product.barcode && product.barcode.toLowerCase().includes(this.searchQuery))
      );
      return matchCat && matchSearch;
    });
  }

  // Mahsulotlar kartochkalarini chizish
  renderProducts() {
    const grid = document.getElementById('posProductsGrid');
    if (!grid) return;

    const filtered = this.getFilteredProducts();

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-box-open"></i>
          <h3>Mahsulot topilmadi</h3>
          <p>Boshqa kategoriya tanlang yoki yangi mahsulot qo‘shing.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(product => {
      const cartItem = this.cart.find(item => item.id === product.id);
      const countInCart = cartItem ? cartItem.qty : 0;
      const isSelected = countInCart > 0;

      const catObj = this.categories.find(c => c.id === product.category);
      const iconClass = product.icon || (catObj ? catObj.icon : 'fa-box');

      return `
        <div class="product-card ${isSelected ? 'selected' : ''}" data-id="${product.id}" onclick="window.posManager.handleCardClick('${product.id}')">
          <div class="product-card-top">
            <div class="product-icon-wrap">
              <i class="fa-solid ${iconClass}"></i>
            </div>
            ${countInCart > 0 ? `<div class="product-badge-qty">${countInCart}</div>` : ''}
            <div class="product-name" title="${product.name}">${product.name}</div>
            <div class="product-price">${window.app.formatMoney(product.price)}</div>
            ${product.barcode ? `<div class="product-barcode"><i class="fa-solid fa-barcode"></i> ${product.barcode}</div>` : ''}
          </div>

          <!-- Katta va tushunarli PLUS (+) va MINUS (-) boshqaruvi -->
          <div class="product-card-actions" onclick="event.stopPropagation()">
            <button type="button" class="btn-qty-minus ${countInCart === 0 ? 'disabled' : ''}" 
                    title="Kamaytirish (−)" 
                    onclick="window.posManager.decreaseQuantity('${product.id}')">
              <i class="fa-solid fa-minus"></i>
            </button>

            <span class="product-qty-display">${countInCart}</span>

            <button type="button" class="btn-qty-plus" 
                    title="Qo‘shish (+)" 
                    onclick="window.posManager.increaseQuantity('${product.id}')">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>

          <!-- Tushunarli "Savatchaga solish" tugmasi -->
          <button type="button" class="btn-quick-add-cart" onclick="event.stopPropagation(); window.posManager.increaseQuantity('${product.id}')">
            <i class="fa-solid fa-cart-plus"></i>
            <span>${countInCart > 0 ? 'Yana qo‘shish (+)' : 'Savatchaga (+)'}</span>
          </button>
        </div>
      `;
    }).join('');
  }

  handleCardClick(productId) {
    this.increaseQuantity(productId);
  }

  // PLUS (+) tugmasi
  increaseQuantity(productId) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    this.addToCart(productId, 1);
    if (window.soundService) window.soundService.playBeep();
  }

  // MINUS (−) tugmasi
  decreaseQuantity(productId) {
    const itemIndex = this.cart.findIndex(item => item.id === productId);
    if (itemIndex === -1) return;

    if (this.cart[itemIndex].qty > 1) {
      this.cart[itemIndex].qty -= 1;
      if (window.soundService) window.soundService.playMinus();
    } else {
      this.cart.splice(itemIndex, 1);
      if (window.soundService) window.soundService.playDelete();
    }

    this.renderCart();
    this.renderProducts();
  }

  // Savatga qo'shish
  addToCart(productId, qty = 1) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = this.cart.findIndex(item => item.id === productId);
    if (existingIndex !== -1) {
      this.cart[existingIndex].qty += qty;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit || 'dona',
        category: product.category,
        barcode: product.barcode,
        qty: qty
      });
    }

    this.renderCart();
    this.renderProducts();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.id !== productId);
    if (window.soundService) window.soundService.playDelete();
    this.renderCart();
    this.renderProducts();
  }

  setCartItemQuantity(productId, newQty) {
    const val = parseInt(newQty, 10);
    if (isNaN(val) || val <= 0) {
      this.removeFromCart(productId);
      return;
    }

    const item = this.cart.find(i => i.id === productId);
    if (item) {
      item.qty = val;
      this.renderCart();
      this.renderProducts();
    }
  }

  clearCart() {
    this.cart = [];
    this.renderCart();
    this.renderProducts();
  }

  getCartTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.qty), 0);
  }

  getCartTotalCount() {
    return this.cart.reduce((total, item) => total + item.qty, 0);
  }

  // Savatchani ekranga chizish
  renderCart() {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartCountEl = document.getElementById('cartTotalCountBadge');
    const cartTotalAmountEl = document.getElementById('cartTotalAmount');
    const cartItemsTypesEl = document.getElementById('cartItemsTypesCount');
    const headerCartCountEl = document.getElementById('headerCartCount');

    // Mobil suzuvchi bar
    const mobileFloatBar = document.getElementById('mobileCartFloatBar');
    const mobileFloatCount = document.getElementById('mobileFloatCount');
    const mobileFloatTotal = document.getElementById('mobileFloatTotal');

    const totalAmount = this.getCartTotal();
    const totalCount = this.getCartTotalCount();

    if (cartCountEl) cartCountEl.textContent = totalCount;
    if (headerCartCountEl) headerCartCountEl.textContent = totalCount;
    if (cartItemsTypesEl) cartItemsTypesEl.textContent = `${this.cart.length} turdagi (${totalCount} dona)`;
    if (cartTotalAmountEl) cartTotalAmountEl.textContent = window.app.formatMoney(totalAmount);

    if (mobileFloatCount) mobileFloatCount.textContent = `${totalCount} dona`;
    if (mobileFloatTotal) mobileFloatTotal.textContent = window.app.formatMoney(totalAmount);
    if (mobileFloatBar) {
      mobileFloatBar.style.display = totalCount > 0 ? 'flex' : 'none';
    }

    if (!cartItemsList) return;

    if (this.cart.length === 0) {
      cartItemsList.innerHTML = `
        <div class="cart-empty-message">
          <i class="fa-solid fa-basket-shopping"></i>
          <p>Savatcha bo‘sh</p>
          <small>Mahsulot ustiga yoki "Savatchaga (+)" tugmasiga bosing</small>
        </div>
      `;
      return;
    }

    cartItemsList.innerHTML = this.cart.map(item => {
      const itemSubtotal = item.price * item.qty;
      return `
        <div class="cart-item-row" data-id="${item.id}">
          <div class="cart-item-info">
            <div class="cart-item-title">${item.name}</div>
            <div class="cart-item-unit-price">${window.app.formatMoney(item.price)} × ${item.qty} ${item.unit}</div>
          </div>

          <div class="cart-item-controls">
            <button type="button" class="btn-cart-qty minus" 
                    onclick="window.posManager.decreaseQuantity('${item.id}')">
              <i class="fa-solid fa-minus"></i>
            </button>

            <input type="number" class="cart-qty-input" 
                   value="${item.qty}" min="1" max="9999"
                   onchange="window.posManager.setCartItemQuantity('${item.id}', this.value)"
                   onclick="this.select()">

            <button type="button" class="btn-cart-qty plus" 
                    onclick="window.posManager.increaseQuantity('${item.id}')">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>

          <div class="cart-item-subtotal">
            ${window.app.formatMoney(itemSubtotal)}
          </div>

          <button type="button" class="btn-cart-remove" 
                  title="Savatdan o‘chirish" 
                  onclick="window.posManager.removeFromCart('${item.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  // Dashboard ko'rsatkichlari
  async updateDashboardMetrics() {
    const sales = await window.storageService.getSales();
    const today = new Date().toDateString();

    const todaySales = sales.filter(s => {
      return new Date(s.createdAt).toDateString() === today && s.status !== 'cancelled';
    });

    const todayTotal = todaySales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const todayCount = todaySales.length;
    const totalProducts = this.products.length;

    const todaySalesEl = document.getElementById('dashTodaySales');
    const todayCountEl = document.getElementById('dashTodayCount');
    const totalProductsEl = document.getElementById('dashTotalProducts');

    if (todaySalesEl) todaySalesEl.textContent = window.app.formatMoney(todayTotal);
    if (todayCountEl) todayCountEl.textContent = todayCount;
    if (totalProductsEl) totalProductsEl.textContent = totalProducts;
  }
}

window.posManager = new POSManager();
