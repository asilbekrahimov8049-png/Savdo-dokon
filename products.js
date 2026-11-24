/**
 * DO‘KON POS - Mahsulotlar Boshqaruvi (Products Management)
 * CRUD: Qo‘shish, tahrirlash, o‘chirish, toifalar, qidiruv va filtrlash
 */

class ProductsManager {
  constructor() {
    this.products = [];
    this.categories = [];
    this.currentEditingId = null;
    this.filterCategory = 'all';
    this.searchQuery = '';
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
    // Mahsulot qidiruv
    const searchInp = document.getElementById('productMgmtSearch');
    if (searchInp) {
      searchInp.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderProductsTable();
      });
    }

    // Kategoriya filtri
    const catSelect = document.getElementById('productMgmtCategoryFilter');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        this.filterCategory = e.target.value;
        this.renderProductsTable();
      });
    }

    // Yangi mahsulot qo'shish tugmasi
    const addBtn = document.getElementById('openAddProductModalBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this.openProductModal();
      });
    }

    // Mahsulot formasi saqlash
    const form = document.getElementById('productForm');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleProductFormSubmit();
      });
    }

    // Modalni yopish
    const closeBtn = document.getElementById('closeProductModalBtn');
    const cancelBtn = document.getElementById('cancelProductFormBtn');
    [closeBtn, cancelBtn].forEach(b => {
      if (b) b.addEventListener('click', () => this.closeProductModal());
    });
  }

  renderCategoryFilter() {
    const catSelect = document.getElementById('productMgmtCategoryFilter');
    if (!catSelect) return;

    let html = `<option value="all">Barcha kategoriyalar (${this.products.length})</option>`;
    this.categories.forEach(cat => {
      const count = this.products.filter(p => p.category === cat.id).length;
      html += `<option value="${cat.id}">${cat.name} (${count})</option>`;
    });

    catSelect.innerHTML = html;
  }

  populateModalCategoryDropdown() {
    const modalCatSelect = document.getElementById('prodModalCategory');
    if (!modalCatSelect) return;

    modalCatSelect.innerHTML = this.categories.map(cat => {
      return `<option value="${cat.id}">${cat.name}</option>`;
    }).join('');
  }

  getFilteredProducts() {
    return this.products.filter(p => {
      const matchCat = (this.filterCategory === 'all' || p.category === this.filterCategory);
      const matchSearch = (!this.searchQuery ||
        p.name.toLowerCase().includes(this.searchQuery) ||
        (p.barcode && p.barcode.toLowerCase().includes(this.searchQuery))
      );
      return matchCat && matchSearch;
    });
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
      const catName = cat ? cat.name : 'Boshqa';
      const catIcon = p.icon || (cat ? cat.icon : 'fa-box');

      return `
        <tr>
          <td class="text-center text-muted">${index + 1}</td>
          <td>
            <div class="table-product-item">
              <div class="table-prod-icon"><i class="fa-solid ${catIcon}"></i></div>
              <div>
                <strong>${p.name}</strong>
                ${p.unit ? `<span class="unit-tag">(${p.unit})</span>` : ''}
              </div>
            </div>
          </td>
          <td>
            <span class="badge-category">${catName}</span>
          </td>
          <td class="font-bold text-success">
            ${window.app.formatMoney(p.price)}
          </td>
          <td class="text-muted font-mono">
            ${p.barcode || '<span class="text-lighter">—</span>'}
          </td>
          <td>
            <span class="badge-status-active"><i class="fa-solid fa-check"></i> Sotuvda</span>
          </td>
          <td class="text-right">
            <div class="action-buttons-wrap">
              <button class="btn-action edit" title="Tahrirlash" onclick="window.productsManager.editProduct('${p.id}')">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-action delete" title="O‘chirish" onclick="window.productsManager.deleteProduct('${p.id}')">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  openProductModal(product = null) {
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
      document.getElementById('prodModalCategory').value = product.category || 'boshqa';
      document.getElementById('prodModalBarcode').value = product.barcode || '';
      document.getElementById('prodModalUnit').value = product.unit || 'dona';
    } else {
      title.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Yangi mahsulot qo‘shish';
      if (form) form.reset();
      document.getElementById('prodModalUnit').value = 'dona';
    }

    modal.classList.add('active');
    setTimeout(() => {
      document.getElementById('prodModalName')?.focus();
    }, 100);
  }

  closeProductModal() {
    const modal = document.getElementById('productFormModal');
    if (modal) modal.classList.remove('active');
    this.currentEditingId = null;
  }

  async handleProductFormSubmit() {
    const name = document.getElementById('prodModalName').value.trim();
    const price = parseFloat(document.getElementById('prodModalPrice').value);
    const category = document.getElementById('prodModalCategory').value;
    const barcode = document.getElementById('prodModalBarcode').value.trim();
    const unit = document.getElementById('prodModalUnit').value.trim() || 'dona';

    if (!name) {
      window.app.showToast('Mahsulot nomini kiriting!', 'warning');
      return;
    }

    if (isNaN(price) || price < 0) {
      window.app.showToast('Mahsulot narxi musbat son bo‘lishi kerak!', 'warning');
      return;
    }

    try {
      if (this.currentEditingId) {
        // Tahrirlash
        const existing = await window.storageService.getProductById(this.currentEditingId);
        if (existing) {
          existing.name = name;
          existing.price = price;
          existing.category = category;
          existing.barcode = barcode;
          existing.unit = unit;

          await window.storageService.updateProduct(existing);
          window.app.showToast('Mahsulot muvaffaqiyatli yangilandi!', 'success');
        }
      } else {
        // Yangi qo'shish
        const newProduct = {
          name,
          price,
          category,
          barcode,
          unit
        };
        await window.storageService.addProduct(newProduct);
        window.app.showToast('Yangi mahsulot muvaffaqiyatli qo‘shildi!', 'success');
      }

      this.closeProductModal();
      await this.refreshAll();
    } catch (err) {
      console.error('Mahsulotni saqlashda xatolik:', err);
      window.app.showToast('Xatolik yuz berdi!', 'error');
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

    if (confirm(`Haqiqatan ham "${prod.name}" mahsulotini o‘chirmoqchimisiz?`)) {
      try {
        await window.storageService.deleteProduct(id);
        window.soundService.playDelete();
        window.app.showToast(`"${prod.name}" o‘chirildi.`, 'info');
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
    // POS kassa ekranini ham sinxronlashtirish
    if (window.posManager) {
      await window.posManager.loadData();
      window.posManager.renderCategories();
      window.posManager.renderProducts();
      window.posManager.updateDashboardMetrics();
    }
  }
}

window.productsManager = new ProductsManager();
