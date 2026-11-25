/**
 * DO‘KON POS - Mahsulotlar Boshqaruvi (Products Management)
 * CRUD: Qo‘shish, tahrirlash, o‘chirish, rasm yuklash (kompyuter va telefon),
 * qisqa ma'lumot, qidiruv, kategoriya filtri va narx bo‘yicha saralash.
 */

class ProductsManager {
  constructor() {
    this.products = [];
    this.categories = [];
    this.currentEditingId = null;
    this.filterCategory = 'all';
    this.searchQuery = '';
    this.sortOption = 'default';
    this.currentUploadedImage = ''; // DataURL yoki rasm yo'li
  }

  async init() {
    await this.loadData();
    this.renderCategoryFilter();
    this.renderProductsTable();
    this.populateModalCategoryDropdown();
    this.bindEvents();
  }

  async loadData() {
    this.products = await window.storageService.getProducts();
    this.categories = await window.storageService.getCategories();
  }

  bindEvents() {
    const searchInp = document.getElementById('productMgmtSearch');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderProductsTable();
      });
    }

    const catSelect = document.getElementById('productMgmtCategoryFilter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.filterCategory = e.target.value;
        this.renderProductsTable();
      });
    }

    const sortSelect = document.getElementById('productMgmtSort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortOption = e.target.value;
        this.renderProductsTable();
      });
    }

    const addBtn = document.getElementById('openAddProductModalBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const preCat = this.filterCategory !== 'all' ? this.filterCategory : 'somsa';
        this.openProductModal(null, preCat);
      });
    }

    const form = document.getElementById('productForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleProductFormSubmit();
      });
    }

    const closeBtn = document.getElementById('closeProductModalBtn');
    const cancelBtn = document.getElementById('cancelProductFormBtn');
    [closeBtn, cancelBtn].forEach(b => {
      if (b) b.addEventListener('click', () => this.closeProductModal());
    });

    // Rasm yuklash (kompyuter va telefon)
    const imageFileInput = document.getElementById('prodModalImageFile');
    const uploadTriggerBtn = document.getElementById('prodModalUploadBtn');
    const clearImageBtn = document.getElementById('prodModalClearImageBtn');

    if (uploadTriggerBtn && imageFileInput) {
      uploadTriggerBtn.addEventListener('click', () => imageFileInput.click());
    }

    if (imageFileInput) {
      imageFileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this.handleImageFileSelect(file);
        e.target.value = '';
      });
    }

    if (clearImageBtn) {
      clearImageBtn.addEventListener('click', () => {
        const selectedCat = document.getElementById('prodModalCategory')?.value || 'somsa';
        this.currentUploadedImage = '';
        this.updateModalImagePreview(window.storageService.getCategoryDefaultImage(selectedCat), true);
      });
    }

    // Kategoriya o'zgarganda agar maxsus rasm yuklanmagan bo'lsa, oldindan ko'rish rasmini yangilash
    const modalCatSelect = document.getElementById('prodModalCategory');
    if (modalCatSelect) {
      modalCatSelect.addEventListener('change', (e) => {
        if (!this.currentUploadedImage || !this.currentUploadedImage.startsWith('data:image')) {
          this.updateModalImagePreview(window.storageService.getCategoryDefaultImage(e.target.value), true);
        }
      });
    }
  }

  // Mobil va kompyuterdan yuklangan rasmni siqish va DataURL ga aylantirish
  async handleImageFileSelect(file) {
    if (!file.type.startsWith('image/')) {
      window.app.showToast('Iltimos, faqat rasm faylini tanlang (JPG, PNG, WEBP)!', 'warning');
      return;
    }

    try {
      const compressedDataUrl = await this.compressImageFile(file, 480, 480, 0.82);
      this.currentUploadedImage = compressedDataUrl;
      this.updateModalImagePreview(compressedDataUrl, false);
      window.app.showToast('Rasm yuklandi va tayyorlandi!', 'success');
    } catch (err) {
      console.error('Rasmni qayta ishlashda xato:', err);
      window.app.showToast('Rasmni yuklashda xatolik yuz berdi. Boshqa rasm tanlang.', 'error');
    }
  }

  compressImageFile(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Faylni o‘qib bo‘lmadi'));
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Rasm formati yaroqsiz'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  updateModalImagePreview(src, isDefault = false) {
    const previewImg = document.getElementById('prodModalImagePreview');
    const clearBtn = document.getElementById('prodModalClearImageBtn');
    const hintEl = document.getElementById('prodModalImageHint');

    if (previewImg) {
      previewImg.src = src || window.storageService.getCategoryDefaultImage('somsa');
    }
    if (clearBtn) {
      clearBtn.style.display = isDefault ? 'none' : 'inline-flex';
    }
    if (hintEl) {
      hintEl.textContent = isDefault
        ? 'Standart kategoriya rasmi tanlangan (o‘zingiz rasm yuklashingiz mumkin)'
        : 'Shaxsiy mahsulot rasmi yuklangan';
    }
  }

  renderCategoryFilter() {
    const catSelect = document.getElementById('productMgmtCategoryFilter');
    if (!catSelect) return;

    const currentVal = this.filterCategory;
    let html = `<option value="all">Barcha kategoriyalar (${this.products.length})</option>`;
    this.categories.forEach(cat => {
      const count = this.products.filter(p => p.category === cat.id).length;
      html += `<option value="${cat.id}">${cat.name} (${count})</option>`;
    });

    catSelect.innerHTML = html;
    catSelect.value = currentVal;
  }

  populateModalCategoryDropdown() {
    const modalCatSelect = document.getElementById('prodModalCategory');
    if (!modalCatSelect) return;

    modalCatSelect.innerHTML = this.categories.map(cat => {
      return `<option value="${cat.id}">${cat.name}</option>`;
    }).join('');
  }

  getFilteredProducts() {
    const filtered = this.products.filter(p => {
      const matchCat = (this.filterCategory === 'all' || p.category === this.filterCategory);
      const matchSearch = (!this.searchQuery ||
        (p.name && p.name.toLowerCase().includes(this.searchQuery)) ||
        (p.description && p.description.toLowerCase().includes(this.searchQuery)) ||
        (p.barcode && p.barcode.toLowerCase().includes(this.searchQuery))
      );
      return matchCat && matchSearch;
    });

    if (this.sortOption === 'price-asc') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (this.sortOption === 'price-desc') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (this.sortOption === 'name-asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uz'));
    }

    return filtered;
  }

  renderProductsTable() {
    const tableBody = document.getElementById('productsTableBody');
    const countEl = document.getElementById('productsTableCount');
    if (!tableBody) return;

    const filtered = this.getFilteredProducts();

    if (countEl) {
      countEl.textContent = `Jami: ${filtered.length} ta mahsulot`;
    }

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-6 text-muted">
            <i class="fa-solid fa-box-open fa-2x mb-2 d-block"></i>
            Mahsulotlar topilmadi
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = filtered.map((p, index) => {
      const cat = this.categories.find(c => c.id === p.category);
      const catName = cat ? cat.name : 'Somsa';
      const imgUrl = p.resolvedImage || p.image || (cat ? cat.image : '');
      const fallback = typeof FALLBACK_PRODUCT_IMAGE !== 'undefined' ? FALLBACK_PRODUCT_IMAGE : '';

      return `
        <tr>
          <td class="text-center text-muted" data-label="№">${index + 1}</td>
          <td data-label="Mahsulot">
            <div class="table-product-item">
              <img src="${imgUrl}" alt="${this.escapeHtml(p.name)}" class="table-prod-thumb" onerror="this.src='${fallback}'" />
              <div class="table-prod-text">
                <strong>${this.escapeHtml(p.name)}</strong>
                ${p.unit ? `<span class="unit-tag">(${this.escapeHtml(p.unit)})</span>` : ''}
                ${p.description ? `<small class="table-prod-desc">${this.escapeHtml(p.description)}</small>` : ''}
              </div>
            </div>
          </td>
          <td data-label="Kategoriya">
            <span class="badge-category" style="border-color: ${cat?.color || '#bfdbfe'}; color: ${cat?.color || '#2563eb'}; background: ${cat?.bgColor || '#eff6ff'};">
              ${this.escapeHtml(catName)}
            </span>
          </td>
          <td class="font-bold text-success" data-label="Narxi">
            ${window.app.formatMoney(p.price)}
          </td>
          <td class="text-muted font-mono" data-label="Kod">
            ${p.barcode ? this.escapeHtml(p.barcode) : '<span class="text-lighter">—</span>'}
          </td>
          <td data-label="Holat">
            <span class="badge-status-active"><i class="fa-solid fa-check"></i> Sotuvda</span>
          </td>
          <td class="text-right" data-label="Amallar">
            <div class="action-buttons-wrap">
              <button type="button" class="btn-action edit" title="Tahrirlash" onclick="window.productsManager.editProduct('${p.id}')">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button type="button" class="btn-action delete" title="O‘chirish" onclick="window.productsManager.deleteProduct('${p.id}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  openProductModal(product = null, preselectedCategory = 'somsa') {
    this.currentEditingId = product ? product.id : null;
    const modal = document.getElementById('productFormModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    if (!modal) return;

    this.populateModalCategoryDropdown();

    if (product) {
      title.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Mahsulotni tahrirlash';
      document.getElementById('prodModalName').value = product.name || '';
      document.getElementById('prodModalPrice').value = product.price || '';
      document.getElementById('prodModalCategory').value = product.category || 'somsa';
      document.getElementById('prodModalDescription').value = product.description || '';
      document.getElementById('prodModalBarcode').value = product.barcode || '';
      document.getElementById('prodModalUnit').value = product.unit || 'dona';

      const resolved = product.resolvedImage || product.image || window.storageService.getCategoryDefaultImage(product.category);
      const isCustom = !!(product.image && (product.image.startsWith('data:image') || product.image.startsWith('idb://')));
      this.currentUploadedImage = isCustom ? resolved : (product.image || '');
      this.updateModalImagePreview(resolved, !isCustom);
    } else {
      title.innerHTML = '<i class="fa-solid fa-circle-plus"></i> Yangi mahsulot qo‘shish';
      if (form) form.reset();
      const catId = preselectedCategory && preselectedCategory !== 'all' ? preselectedCategory : 'somsa';
      document.getElementById('prodModalCategory').value = catId;
      document.getElementById('prodModalUnit').value = 'dona';
      this.currentUploadedImage = '';
      this.updateModalImagePreview(window.storageService.getCategoryDefaultImage(catId), true);
    }

    modal.classList.add('active');
    if (window.app && window.app.pushNavState) {
      window.app.pushNavState({ view: window.app.currentView, modal: 'productFormModal' });
    }
    setTimeout(() => {
      document.getElementById('prodModalName')?.focus();
    }, 100);
  }

  closeProductModal() {
    const modal = document.getElementById('productFormModal');
    if (modal) modal.classList.remove('active');
    this.currentEditingId = null;
    this.currentUploadedImage = '';
  }

  async handleProductFormSubmit() {
    const name = document.getElementById('prodModalName').value.trim();
    const price = parseFloat(document.getElementById('prodModalPrice').value);
    const category = document.getElementById('prodModalCategory').value;
    const description = document.getElementById('prodModalDescription').value.trim();
    const barcode = document.getElementById('prodModalBarcode').value.trim();
    const unit = document.getElementById('prodModalUnit').value.trim() || 'dona';

    if (!name) {
      window.app.showToast('Mahsulot nomini kiriting!', 'warning');
      return;
    }

    if (isNaN(price) || price < 0) {
      window.app.showToast('Mahsulot narxi 0 yoki musbat son bo‘lishi kerak!', 'warning');
      return;
    }

    const imageToSave = this.currentUploadedImage || window.storageService.getCategoryDefaultImage(category);

    try {
      if (this.currentEditingId) {
        const existing = await window.storageService.getProductById(this.currentEditingId);
        if (existing) {
          existing.name = name;
          existing.price = price;
          existing.category = category;
          existing.description = description;
          existing.barcode = barcode;
          existing.unit = unit;
          existing.image = imageToSave;

          await window.storageService.updateProduct(existing);
          window.app.showToast('Mahsulot muvaffaqiyatli yangilandi!', 'success');
        }
      } else {
        const newProduct = {
          name,
          price,
          category,
          description,
          barcode,
          unit,
          image: imageToSave
        };
        await window.storageService.addProduct(newProduct);
        window.app.showToast('Yangi mahsulot muvaffaqiyatli qo‘shildi!', 'success');
      }

      if (window.soundService) window.soundService.playBeep();
      this.closeProductModal();
      await this.refreshAll();
    } catch (err) {
      console.error('Mahsulotni saqlashda xatolik:', err);
      window.app.showToast('Mahsulotni saqlashda xatolik yuz berdi!', 'error');
    }
  }

  async editProduct(id) {
    const prod = this.products.find(p => p.id === id);
    if (prod) {
      this.openProductModal(prod);
    }
  }

  async deleteProduct(id) {
    const prod = this.products.find(p => p.id === id);
    if (!prod) return;

    const confirmed = await window.app.showConfirm({
      title: 'Mahsulotni o‘chirish',
      message: `Haqiqatan ham «${prod.name}» mahsulotini o‘chirmoqchimisiz?`,
      confirmText: 'Ha, o‘chirish',
      cancelText: 'Bekor qilish',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await window.storageService.deleteProduct(id);
        if (window.soundService) window.soundService.playDelete();
        window.app.showToast(`«${prod.name}» o‘chirildi.`, 'info');
        await this.refreshAll();
      } catch (err) {
        console.error('O‘chirishda xatolik:', err);
        window.app.showToast('O‘chirishda xatolik yuz berdi!', 'error');
      }
    }
  }

  async refreshAll() {
    await this.loadData();
    this.renderCategoryFilter();
    this.renderProductsTable();

    if (window.posManager) {
      await window.posManager.loadData();
      window.posManager.renderCategoryCards();
      window.posManager.renderProducts();
      window.posManager.updateDashboardMetrics();
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

window.productsManager = new ProductsManager();
