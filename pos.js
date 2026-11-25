/**
 * DO‘KON POS - Savdo va Kassa Jarayoni (POS Manager)
 * 4 Asosiy Kategoriya (Katta rasmli kartochkalar), Mahsulotlar filtri, Narx bo'yicha saralash,
 * Savatcha boshqaruvi, 3 xil to'lov (Naqd, Karta, Terminal) va Aralash to'lov.
 */

// Zaxira rasm (agar rasm yuklanmasa ko'rinadigan chiroyli SVG)
const FALLBACK_PRODUCT_IMAGE = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Cg fill='%2394a3b8'%3E%3Ccircle cx='200' cy='125' r='34' fill='none' stroke='%2394a3b8' stroke-width='6'/%3E%3Cpath d='M255 95h-22l-12-16h-42l-12 16h-22c-11 0-20 9-20 20v70c0 11 9 20 20 20h110c11 0 20-9 20-20v-70c0-11-9-20-20-20z' fill='none' stroke='%2394a3b8' stroke-width='6'/%3E%3C/g%3E%3Ctext x='50%25' y='242' text-anchor='middle' fill='%2364748b' font-family='sans-serif' font-size='15' font-weight='600'%3ERasm yuklanmadi (Zaxira)%3C/text%3E%3C/svg%3E";

class POSManager {
  constructor() {
    this.products = [];
    this.categories = [];
    this.cart = [];
    this.activeCategory = 'all'; // 'all' | 'somsa' | 'shirinliklar' | 'ichimliklar' | 'shokolad_vaflilar'
    this.searchQuery = '';
    this.sortOption = 'default';
  }

  async init() {
    await this.loadData();
    this.restoreDraftCart();
    this.renderCategoryCards();
    this.renderProducts();
    this.renderCart();
    this.updateDashboardMetrics();
    this.bindEvents();
  }

  async loadData() {
    this.products = await window.storageService.getProducts();
    this.categories = await window.storageService.getCategories();
  }

  restoreDraftCart() {
    const saved = window.storageService.getDraftCart();
    if (Array.isArray(saved) && saved.length > 0) {
      this.cart = saved.map(item => {
        const prod = this.products.find(p => p.id === item.id);
        return {
          ...item,
          image: prod ? (prod.resolvedImage || prod.image) : (item.image || FALLBACK_PRODUCT_IMAGE)
        };
      });
    }
  }

  persistCart() {
    window.storageService.saveDraftCart(this.cart);
  }

  bindEvents() {
    // Qidiruv maydoni
    const searchInput = document.getElementById('posSearchInput');
    const clearSearchBtn = document.getElementById('posSearchClearBtn');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        if (clearSearchBtn) {
          clearSearchBtn.style.display = this.searchQuery ? 'flex' : 'none';
        }
        this.renderProducts();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleBarcodeScan(this.searchQuery);
        }
      });
    }

    if (clearSearchBtn && searchInput) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        this.renderProducts();
        searchInput.focus();
      });
    }

    // Narx bo'yicha saralash
    const sortSelect = document.getElementById('posSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortOption = e.target.value;
        this.renderProducts();
      });
    }

    // Kategoriya ichida tezkor mahsulot qo'shish tugmasi
    const quickAddBtn = document.getElementById('posQuickAddProductBtn');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        if (window.productsManager) {
          const preCat = this.activeCategory !== 'all' ? this.activeCategory : 'somsa';
          window.productsManager.openProductModal(null, preCat);
        }
      });
    }

    // Mobil savat suzuvchi tugmasi -> savatcha panelini ochadi
    const mobileFloatBar = document.getElementById('mobileCartFloatBar');
    if (mobileFloatBar) {
      mobileFloatBar.addEventListener('click', () => {
        this.openMobileCart();
      });
    }

    // Mobil savat yopish tugmasi va fon
    const closeMobileCartBtn = document.getElementById('closeMobileCartBtn');
    const mobileCartBackdrop = document.getElementById('mobileCartBackdrop');
    if (closeMobileCartBtn) {
      closeMobileCartBtn.addEventListener('click', () => this.closeMobileCart());
    }
    if (mobileCartBackdrop) {
      mobileCartBackdrop.addEventListener('click', () => this.closeMobileCart());
    }
  }

  openMobileCart() {
    const cartDrawer = document.getElementById('posCartPanel');
    const backdrop = document.getElementById('mobileCartBackdrop');
    if (cartDrawer) cartDrawer.classList.add('mobile-active');
    if (backdrop) backdrop.classList.add('active');
    if (window.app && window.app.pushNavState) {
      window.app.pushNavState({ view: 'pos', cartOpen: true });
    }
  }

  closeMobileCart() {
    const cartDrawer = document.getElementById('posCartPanel');
    const backdrop = document.getElementById('mobileCartBackdrop');
    if (cartDrawer) cartDrawer.classList.remove('mobile-active');
    if (backdrop) backdrop.classList.remove('active');
  }

  // ================= 1. 4 TA KATTA RASMLI KATEGORIYA =================
  renderCategoryCards() {
    const container = document.getElementById('posCategoryCardsGrid');
    if (!container) return;

    container.innerHTML = this.categories.map((cat, index) => {
      const count = this.products.filter(p => p.category === cat.id).length;
      const isActive = this.activeCategory === cat.id;

      return `
        <button type="button"
                class="pos-category-card ${isActive ? 'active' : ''}"
                onclick="window.posManager.selectCategory('${cat.id}')"
                style="--cat-accent: ${cat.color || '#2563eb'}; animation-delay: ${index * 20}ms;">
          <div class="cat-card-media">
            <img src="${cat.image}" alt="${this.escapeHtml(cat.name)}" onerror="this.src='${FALLBACK_PRODUCT_IMAGE}'" />
            <div class="cat-card-overlay"></div>
            <div class="cat-card-icon-bubble" style="background: ${cat.color || '#2563eb'};">
              <i class="fa-solid ${cat.icon || 'fa-tag'}"></i>
            </div>
            ${isActive ? '<span class="cat-active-check"><i class="fa-solid fa-check"></i> Tanlangan</span>' : ''}
          </div>
          <div class="cat-card-content">
            <div class="cat-card-header">
              <h3 class="cat-card-title">${this.escapeHtml(cat.name)}</h3>
              <span class="cat-card-badge">${count} ta</span>
            </div>
            <p class="cat-card-desc">${this.escapeHtml(cat.description || '')}</p>
          </div>
        </button>
      `;
    }).join('');

    this.updateCategoryIndicator();
  }

  // `products.js` bilan moslik uchun alias
  renderCategories() {
    this.renderCategoryCards();
  }

  selectCategory(catId, skipHistory = false) {
    // Agar faol kategoriya qayta bosilsa, "Barchasi"ga qaytadi
    if (catId !== 'all' && this.activeCategory === catId) {
      this.activeCategory = 'all';
    } else {
      this.activeCategory = catId;
    }

    this.renderCategoryCards();
    this.renderProducts(true);

    if (window.app && window.app.updateHeaderBackState) {
      window.app.updateHeaderBackState();
    }

    if (!skipHistory && window.app && window.app.pushNavState) {
      window.app.pushNavState({ view: 'pos', category: this.activeCategory });
    }

    // Mobil qurilmada kategoriya tanlanganda mahsulotlar ro'yxatiga silliq o'tish
    if (this.activeCategory !== 'all' && window.innerWidth <= 900) {
      const catalogHeader = document.getElementById('posCatalogHeader');
      if (catalogHeader) {
        catalogHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  updateCategoryIndicator() {
    const indicator = document.getElementById('activeCategoryIndicator');
    if (!indicator) return;

    if (this.activeCategory === 'all') {
      indicator.innerHTML = `
        <div class="catalog-status-tag">
          <i class="fa-solid fa-layer-group"></i>
          <span>Barcha mahsulotlar (${this.products.length} ta)</span>
        </div>
      `;
    } else {
      const cat = this.categories.find(c => c.id === this.activeCategory);
      const catName = cat ? cat.name : this.activeCategory;
      const count = this.products.filter(p => p.category === this.activeCategory).length;

      indicator.innerHTML = `
        <div class="catalog-active-filter-bar">
          <button type="button" class="btn-back-all-cats" onclick="window.posManager.selectCategory('all')" title="Barcha kategoriyalarga qaytish">
            <i class="fa-solid fa-arrow-left"></i>
            <span>Orqaga (Barcha kategoriyalar)</span>
          </button>
          <span class="active-cat-pill" style="border-color: ${cat?.color || '#2563eb'}; color: ${cat?.color || '#1e3a8a'};">
            <i class="fa-solid ${cat?.icon || 'fa-tag'}"></i>
            <strong>${this.escapeHtml(catName)}</strong> (${count} ta)
          </span>
        </div>
      `;
    }
  }

  // ================= 2. SARALASH VA MAHSULOTLAR =================
  getFilteredAndSortedProducts() {
    const list = this.products.filter(p => {
      const matchCategory = (this.activeCategory === 'all' || p.category === this.activeCategory);
      const matchSearch = (!this.searchQuery ||
        (p.name && p.name.toLowerCase().includes(this.searchQuery)) ||
        (p.description && p.description.toLowerCase().includes(this.searchQuery)) ||
        (p.barcode && p.barcode.toLowerCase().includes(this.searchQuery))
      );
      return matchCategory && matchSearch;
    });

    if (this.sortOption === 'price-asc') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.sortOption === 'price-desc') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (this.sortOption === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uz'));
    }

    return list;
  }

  renderProducts(animateCategoryOpen = false) {
    const grid = document.getElementById('posProductsGrid');
    const countEl = document.getElementById('catalogFoundCount');
    if (!grid) return;

    const filtered = this.getFilteredAndSortedProducts();

    if (countEl) {
      countEl.textContent = `${filtered.length} ta mahsulot`;
    }

    if (animateCategoryOpen) {
      grid.classList.remove('grid-reveal');
      void grid.offsetWidth;
      grid.classList.add('grid-reveal');
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="pos-products-empty">
          <div class="empty-icon"><i class="fa-solid fa-box-open"></i></div>
          <h3>Mahsulot topilmadi</h3>
          <p>Qidiruv so‘zini o‘zgartiring yoki ushbu kategoriyaga yangi mahsulot qo‘shing.</p>
          <div class="empty-actions">
            <button type="button" class="btn-reset-filters" onclick="window.posManager.resetFilters()">
              <i class="fa-solid fa-rotate-left"></i> Barcha mahsulotlar
            </button>
            <button type="button" class="btn-primary btn-success" onclick="window.productsManager.openProductModal(null, '${this.activeCategory !== 'all' ? this.activeCategory : 'somsa'}')">
              <i class="fa-solid fa-plus"></i> Mahsulot qo‘shish
            </button>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered.map(p => {
      const cat = this.categories.find(c => c.id === p.category);
      const catName = cat ? cat.name : 'Boshqa';
      const catColor = cat ? cat.color : '#2563eb';
      const imgUrl = p.resolvedImage || p.image || (cat ? cat.image : FALLBACK_PRODUCT_IMAGE);

      const inCartItem = this.cart.find(i => i.id === p.id);
      const inCartQty = inCartItem ? inCartItem.qty : 0;
      const isSelected = inCartQty > 0;

      return `
        <div class="pos-product-card ${isSelected ? 'in-cart-selected' : ''}" data-id="${p.id}">
          <div class="prod-card-thumb-wrap" onclick="window.posManager.quickAddToCart('${p.id}', this)">
            <img src="${imgUrl}" alt="${this.escapeHtml(p.name)}" class="prod-card-img" onerror="this.src='${FALLBACK_PRODUCT_IMAGE}'" />
            <span class="prod-category-tag" style="background: ${catColor};">${this.escapeHtml(catName)}</span>
            ${inCartQty > 0 ? `<span class="prod-card-qty-badge">${inCartQty}</span>` : ''}
            <button type="button" class="prod-card-edit-mini"
                    title="Mahsulotni tahrirlash"
                    onclick="event.stopPropagation(); window.productsManager.editProduct('${p.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
          </div>

          <div class="prod-card-body">
            <h4 class="prod-card-title" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</h4>
            <p class="prod-card-desc">${this.escapeHtml(p.description || 'Yangi va sifatli mahsulot')}</p>

            <div class="prod-card-price-row">
              <div class="prod-card-price">${window.app.formatMoney(p.price)}</div>
              <span class="prod-card-unit">/${this.escapeHtml(p.unit || 'dona')}</span>
            </div>

            <div class="prod-card-action-bar">
              ${inCartQty > 0 ? `
                <div class="prod-card-stepper">
                  <button type="button" class="btn-step-minus"
                          onclick="event.stopPropagation(); window.posManager.decreaseQuantity('${p.id}')"
                          title="Kamaytirish">
                    <i class="fa-solid fa-minus"></i>
                  </button>
                  <span class="step-qty-val">${inCartQty}</span>
                  <button type="button" class="btn-step-plus"
                          onclick="event.stopPropagation(); window.posManager.increaseQuantity('${p.id}')"
                          title="Ko‘paytirish">
                    <i class="fa-solid fa-plus"></i>
                  </button>
                </div>
              ` : `
                <button type="button" class="btn-card-add-primary"
                        onclick="event.stopPropagation(); window.posManager.quickAddToCart('${p.id}', this.closest('.pos-product-card'))">
                  <i class="fa-solid fa-cart-plus"></i>
                  <span>Savatchaga</span>
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  resetFilters() {
    this.activeCategory = 'all';
    this.searchQuery = '';
    this.sortOption = 'default';
    const sInp = document.getElementById('posSearchInput');
    const sSel = document.getElementById('posSortSelect');
    const clearBtn = document.getElementById('posSearchClearBtn');
    if (sInp) sInp.value = '';
    if (sSel) sSel.value = 'default';
    if (clearBtn) clearBtn.style.display = 'none';
    this.renderCategoryCards();
    this.renderProducts(true);
    if (window.app && window.app.updateHeaderBackState) {
      window.app.updateHeaderBackState();
    }
  }

  // ================= 3. SAVATCHA JARAYONI =================
  quickAddToCart(productId, triggerEl = null) {
    const product = this.products.find(p => p.id === productId);
    if (!product) return;

    const img = product.resolvedImage || product.image || FALLBACK_PRODUCT_IMAGE;
    const existing = this.cart.find(i => i.id === productId);
    if (existing) {
      existing.qty += 1;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        unit: product.unit || 'dona',
        category: product.category,
        barcode: product.barcode,
        image: img
      });
    }

    if (window.soundService) window.soundService.playBeep();
    this.persistCart();
    this.renderCart();
    this.renderProducts();
    this.animateCartFeedback(productId);
  }

  increaseQuantity(productId) {
    const item = this.cart.find(i => i.id === productId);
    if (item) {
      item.qty += 1;
      if (window.soundService) window.soundService.playBeep();
      this.persistCart();
      this.renderCart();
      this.renderProducts();
      this.animateCartFeedback(productId);
    } else {
      this.quickAddToCart(productId);
    }
  }

  decreaseQuantity(productId) {
    const itemIndex = this.cart.findIndex(i => i.id === productId);
    if (itemIndex === -1) return;

    if (this.cart[itemIndex].qty > 1) {
      this.cart[itemIndex].qty -= 1;
      if (window.soundService) window.soundService.playMinus();
    } else {
      this.cart.splice(itemIndex, 1);
      if (window.soundService) window.soundService.playDelete();
    }

    this.persistCart();
    this.renderCart();
    this.renderProducts();
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.id !== productId);
    if (window.soundService) window.soundService.playDelete();
    this.persistCart();
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
      this.persistCart();
      this.renderCart();
      this.renderProducts();
    }
  }

  clearCart() {
    this.cart = [];
    this.persistCart();
    this.renderCart();
    this.renderProducts();
  }

  async clearCartConfirm() {
    if (this.cart.length === 0) return;
    const confirmed = await window.app.showConfirm({
      title: 'Savatchani tozalash',
      message: 'Savatchadagi barcha tanlangan mahsulotlar o‘chirilsinmi?',
      confirmText: 'Ha, tozalash',
      cancelText: 'Bekor qilish',
      type: 'danger'
    });
    if (confirmed) {
      this.clearCart();
      if (window.soundService) window.soundService.playDelete();
      window.app.showToast('Savatcha tozalandi.', 'info');
    }
  }

  getCartTotal() {
    return this.cart.reduce((total, item) => total + (item.price * item.qty), 0);
  }

  getCartTotalCount() {
    return this.cart.reduce((total, item) => total + item.qty, 0);
  }

  animateCartFeedback(productId = null) {
    ['headerCartCount', 'cartTotalCountBadge', 'mobileCartFloatBar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('bounce-badge');
        void el.offsetWidth;
        el.classList.add('bounce-badge');
      }
    });

    if (productId) {
      const card = document.querySelector(`.pos-product-card[data-id="${productId}"]`);
      if (card) {
        card.classList.remove('card-pulse');
        void card.offsetWidth;
        card.classList.add('card-pulse');
      }
    }
  }

  renderCart() {
    const cartItemsList = document.getElementById('cartItemsList');
    const cartCountEl = document.getElementById('cartTotalCountBadge');
    const cartTotalAmountEl = document.getElementById('cartTotalAmount');
    const cartItemsTypesEl = document.getElementById('cartItemsTypesCount');
    const headerCartCountEl = document.getElementById('headerCartCount');

    const mobileFloatBar = document.getElementById('mobileCartFloatBar');
    const mobileFloatCount = document.getElementById('mobileFloatCount');
    const mobileFloatTotal = document.getElementById('mobileFloatTotal');

    const totalAmount = this.getCartTotal();
    const totalCount = this.getCartTotalCount();

    if (cartCountEl) cartCountEl.textContent = totalCount;
    if (headerCartCountEl) headerCartCountEl.textContent = totalCount;
    if (cartItemsTypesEl) cartItemsTypesEl.textContent = `${this.cart.length} tur (${totalCount} dona)`;
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
          <small>Mahsulot ustiga yoki «Savatchaga» tugmasiga bosing</small>
        </div>
      `;
      return;
    }

    cartItemsList.innerHTML = this.cart.map(item => {
      const itemSubtotal = item.price * item.qty;
      const imgUrl = item.image || FALLBACK_PRODUCT_IMAGE;

      return `
        <div class="cart-item-row" data-id="${item.id}">
          <img src="${imgUrl}" alt="${this.escapeHtml(item.name)}" class="cart-item-thumb" onerror="this.src='${FALLBACK_PRODUCT_IMAGE}'" />
          <div class="cart-item-info">
            <div class="cart-item-title" title="${this.escapeHtml(item.name)}">${this.escapeHtml(item.name)}</div>
            <div class="cart-item-unit-price">${window.app.formatMoney(item.price)} × ${item.qty} ${this.escapeHtml(item.unit)}</div>
          </div>

          <div class="cart-item-controls">
            <button type="button" class="btn-cart-qty minus"
                    onclick="window.posManager.decreaseQuantity('${item.id}')" title="Kamaytirish">
              <i class="fa-solid fa-minus"></i>
            </button>

            <input type="number" class="cart-qty-input"
                   value="${item.qty}" min="1" max="9999"
                   onchange="window.posManager.setCartItemQuantity('${item.id}', this.value)"
                   onclick="this.select()">

            <button type="button" class="btn-cart-qty plus"
                    onclick="window.posManager.increaseQuantity('${item.id}')" title="Ko‘paytirish">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>

          <div class="cart-item-subtotal">
            ${window.app.formatMoney(itemSubtotal)}
          </div>

          <button type="button" class="btn-cart-remove"
                  title="Savatchadan o‘chirish"
                  onclick="window.posManager.removeFromCart('${item.id}')">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;
    }).join('');
  }

  handleBarcodeScan(query) {
    if (!query) return;

    let matched = this.products.find(p => p.barcode && p.barcode.toLowerCase() === query);
    if (!matched) {
      const filtered = this.getFilteredAndSortedProducts();
      if (filtered.length === 1) {
        matched = filtered[0];
      }
    }

    if (matched) {
      this.quickAddToCart(matched.id);
      window.app.showToast(`«${matched.name}» savatchaga qo‘shildi!`, 'success');
      const searchInput = document.getElementById('posSearchInput');
      const clearBtn = document.getElementById('posSearchClearBtn');
      if (searchInput) {
        searchInput.value = '';
        this.searchQuery = '';
        if (clearBtn) clearBtn.style.display = 'none';
        this.renderProducts();
      }
    } else {
      window.app.showToast('Bunday mahsulot topilmadi!', 'warning');
      if (window.soundService) window.soundService.playError();
    }
  }

  // ================= 4. TEZKOR TO'LOV VA ARALASH TO'LOV =================
  async instantPay(paymentType) {
    if (!this.cart || this.cart.length === 0) {
      window.app.showToast('Savatcha bo‘sh! Avval mahsulot tanlang.', 'warning');
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
      label = 'Naqd pul';
    } else if (paymentType === 'karta') {
      cardAmount = totalAmount;
      label = 'Karta';
    } else if (paymentType === 'terminal') {
      terminalAmount = totalAmount;
      label = 'Terminal';
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
      if (window.soundService) window.soundService.playSuccess();

      this.clearCart();
      this.updateDashboardMetrics();
      this.closeMobileCart();

      window.app.showToast(`${label} to‘lovi (${window.app.formatMoney(totalAmount)}) saqlandi! Chek: ${savedSale.receiptNumber}`, 'success');

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

  proceedToPayment() {
    if (!this.cart || this.cart.length === 0) {
      window.app.showToast('Savatcha bo‘sh! Avval mahsulot tanlang.', 'warning');
      if (window.soundService) window.soundService.playError();
      return;
    }
    window.paymentManager.openPaymentModal(this.getCartTotal(), this.cart, false);
  }

  openSplitPaymentModal() {
    if (!this.cart || this.cart.length === 0) {
      window.app.showToast('Savatcha bo‘sh! Avval mahsulot tanlang.', 'warning');
      if (window.soundService) window.soundService.playError();
      return;
    }
    window.paymentManager.openPaymentModal(this.getCartTotal(), this.cart, true);
  }

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
    if (todayCountEl) todayCountEl.textContent = `${todayCount} ta`;
    if (totalProductsEl) totalProductsEl.textContent = `${totalProducts} ta`;
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

window.posManager = new POSManager();
