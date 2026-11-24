/**
 * DO‘KON POS - Ma'lumotlar ombori va Saqlash Servisi
 * LocalStorage asosiy ishonchli va tezkor ombor sifatida,
 * barcha kompyuter va brauzerlarda 100% qotmasdan ishlaydi.
 */

// Standart toifalar
const DEFAULT_CATEGORIES = [
  { id: 'ichimliklar', name: 'Ichimliklar', icon: 'fa-bottle-water', color: '#0284c7' },
  { id: 'suvlar', name: 'Suvlar', icon: 'fa-glass-water', color: '#06b6d4' },
  { id: 'shirinliklar', name: 'Shirinliklar', icon: 'fa-candy-cane', color: '#ec4899' },
  { id: 'chips', name: 'Chips va gazaklar', icon: 'fa-cookie-bite', color: '#f59e0b' },
  { id: 'pechenye', name: 'Pechenye va vafli', icon: 'fa-bread-slice', color: '#d97706' },
  { id: 'qahva', name: 'Coffee va choy', icon: 'fa-mug-hot', color: '#8b5cf6' },
  { id: 'boshqa', name: 'Boshqa mahsulotlar', icon: 'fa-boxes-stacked', color: '#64748b' }
];

// Dastlabki namunaviy mahsulotlar
const INITIAL_PRODUCTS = [
  { id: 'p1', name: 'Coca-Cola 0.5L', price: 9000, category: 'ichimliklar', barcode: '5449000000996', unit: 'dona', icon: 'fa-bottle-water' },
  { id: 'p2', name: 'Coca-Cola 1.5L', price: 14000, category: 'ichimliklar', barcode: '5449000000439', unit: 'dona', icon: 'fa-bottle-water' },
  { id: 'p3', name: 'Fanta 0.5L', price: 9000, category: 'ichimliklar', barcode: '5449000011527', unit: 'dona', icon: 'fa-bottle-water' },
  { id: 'p4', name: 'Sprite 0.5L', price: 9000, category: 'ichimliklar', barcode: '5449000018441', unit: 'dona', icon: 'fa-bottle-water' },
  { id: 'p5', name: 'Chortoq Mineral Suv 0.5L', price: 8000, category: 'suvlar', barcode: '4780008540019', unit: 'dona', icon: 'fa-glass-water' },
  { id: 'p6', name: 'Nestlé Pure Life 0.5L', price: 4000, category: 'suvlar', barcode: '4607065000012', unit: 'dona', icon: 'fa-glass-water' },
  { id: 'p7', name: 'Nestlé Pure Life 1.5L', price: 6000, category: 'suvlar', barcode: '4607065000029', unit: 'dona', icon: 'fa-glass-water' },
  { id: 'p8', name: 'Flash Up Energy 0.45L', price: 8500, category: 'ichimliklar', barcode: '4600682008852', unit: 'dona', icon: 'fa-bolt' },
  { id: 'p9', name: 'Snickers Super 80g', price: 11000, category: 'shirinliklar', barcode: '5000159461122', unit: 'dona', icon: 'fa-candy-cane' },
  { id: 'p10', name: 'Twix Xtra 75g', price: 11000, category: 'shirinliklar', barcode: '5000159459228', unit: 'dona', icon: 'fa-candy-cane' },
  { id: 'p11', name: 'KitKat 4 Bar', price: 9500, category: 'shirinliklar', barcode: '7613035345911', unit: 'dona', icon: 'fa-candy-cane' },
  { id: 'p12', name: 'Lays Qaymoq va Ko‘kat 70g', price: 12000, category: 'chips', barcode: '4600494689034', unit: 'dona', icon: 'fa-cookie-bite' },
  { id: 'p13', name: 'Lays Pishloqli 140g', price: 19000, category: 'chips', barcode: '4600494689041', unit: 'dona', icon: 'fa-cookie-bite' },
  { id: 'p14', name: 'Pringles Original 165g', price: 32000, category: 'chips', barcode: '5053990101566', unit: 'dona', icon: 'fa-cookie-bite' },
  { id: 'p15', name: 'Oreo Pechenye 95g', price: 7000, category: 'pechenye', barcode: '7622210286819', unit: 'dona', icon: 'fa-bread-slice' },
  { id: 'p16', name: 'Lotte Choco Pie 28g', price: 4000, category: 'pechenye', barcode: '8801062267645', unit: 'dona', icon: 'fa-bread-slice' },
  { id: 'p17', name: 'Espresso (Issiq)', price: 10000, category: 'qahva', barcode: '1001', unit: 'dona', icon: 'fa-mug-hot' },
  { id: 'p18', name: 'Cappuccino 250ml', price: 15000, category: 'qahva', barcode: '1002', unit: 'dona', icon: 'fa-mug-hot' },
  { id: 'p19', name: 'Latte Macchiato 300ml', price: 16000, category: 'qahva', barcode: '1003', unit: 'dona', icon: 'fa-mug-hot' },
  { id: 'p20', name: 'Orbit Yalpizli Saqich', price: 5000, category: 'shirinliklar', barcode: '4009900486001', unit: 'dona', icon: 'fa-cube' }
];

// Standart tizim sozlamalari (Printer avtomatik o'chirilgan)
const DEFAULT_SETTINGS = {
  shopName: 'DO‘KON POS',
  shopAddress: 'Toshkent sh., Markaziy savdo majmuasi',
  shopPhone: '+998 90 123 45 67',
  receiptHeader: 'Xaridingiz uchun rahmat!',
  receiptFooter: 'Iltimos, chekni saqlang. Yana kelib turing!',
  taxNumber: 'STIR: 301234567',
  currency: 'so‘m',
  soundEnabled: true,
  autoPrintReceipt: false, // Foydalanuvchi talabi bo'yicha printer mutlaqo shart emas
  theme: 'light'
};

class StorageService {
  constructor() {
    this.ensureInitialized();
  }

  // Zudlik bilan sinxron initsializatsiya (qotib qolish xavfi yo'q)
  ensureInitialized() {
    try {
      if (!localStorage.getItem('pos_products')) {
        localStorage.setItem('pos_products', JSON.stringify(INITIAL_PRODUCTS));
      }
      if (!localStorage.getItem('pos_categories')) {
        localStorage.setItem('pos_categories', JSON.stringify(DEFAULT_CATEGORIES));
      }
      if (!localStorage.getItem('pos_sales')) {
        localStorage.setItem('pos_sales', JSON.stringify([]));
      }
      if (!localStorage.getItem('pos_settings')) {
        localStorage.setItem('pos_settings', JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (e) {
      console.error('LocalStorage initsializatsiya xatosi:', e);
    }
  }

  async init() {
    this.ensureInitialized();
    return true;
  }

  // ================= MAHSULOTLAR (PRODUCTS) =================

  async getProducts() {
    try {
      const data = localStorage.getItem('pos_products');
      if (!data) {
        localStorage.setItem('pos_products', JSON.stringify(INITIAL_PRODUCTS));
        return INITIAL_PRODUCTS;
      }
      return JSON.parse(data);
    } catch (e) {
      return INITIAL_PRODUCTS;
    }
  }

  async getProductById(id) {
    const products = await this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  async addProduct(product) {
    if (!product.id) {
      product.id = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    product.updatedAt = new Date().toISOString();

    const products = await this.getProducts();
    products.push(product);
    localStorage.setItem('pos_products', JSON.stringify(products));
    return product;
  }

  async updateProduct(product) {
    product.updatedAt = new Date().toISOString();
    let products = await this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      products[index] = product;
      localStorage.setItem('pos_products', JSON.stringify(products));
    }
    return product;
  }

  async deleteProduct(id) {
    let products = await this.getProducts();
    products = products.filter(p => p.id !== id);
    localStorage.setItem('pos_products', JSON.stringify(products));
    return true;
  }

  // ================= TOIFALAR (CATEGORIES) =================

  async getCategories() {
    try {
      const data = localStorage.getItem('pos_categories');
      if (!data) return DEFAULT_CATEGORIES;
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  }

  async addCategory(category) {
    if (!category.id) category.id = 'cat_' + Date.now();
    const cats = await this.getCategories();
    cats.push(category);
    localStorage.setItem('pos_categories', JSON.stringify(cats));
    return category;
  }

  // ================= SAVDOLAR TARIXI (SALES) =================

  async getSales() {
    try {
      const data = localStorage.getItem('pos_sales');
      if (!data) return [];
      const sales = JSON.parse(data);
      return sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      return [];
    }
  }

  async addSale(saleData) {
    const sale = {
      id: saleData.id || 'sale_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      receiptNumber: saleData.receiptNumber || await this.generateNextReceiptNumber(),
      createdAt: saleData.createdAt || new Date().toISOString(),
      items: saleData.items || [],
      totalQuantity: Number(saleData.totalQuantity || 0),
      totalAmount: Number(saleData.totalAmount || 0),
      cashAmount: Number(saleData.cashAmount || 0),
      cardAmount: Number(saleData.cardAmount || 0),
      terminalAmount: Number(saleData.terminalAmount || 0),
      changeAmount: Number(saleData.changeAmount || 0), // Qaytim
      paymentTypes: saleData.paymentTypes || [],
      status: saleData.status || 'completed', // 'completed' yoki 'cancelled'
      cashier: saleData.cashier || 'Sotuvchi #1',
      notes: saleData.notes || ''
    };

    const sales = await this.getSales();
    sales.unshift(sale);
    localStorage.setItem('pos_sales', JSON.stringify(sales));
    return sale;
  }

  async updateSaleStatus(saleId, status, cancelReason = '') {
    const sales = await this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Savdo topilmadi: ' + saleId);

    sale.status = status;
    sale.cancelReason = cancelReason;
    sale.cancelledAt = status === 'cancelled' ? new Date().toISOString() : null;

    localStorage.setItem('pos_sales', JSON.stringify(sales));
    return sale;
  }

  async generateNextReceiptNumber() {
    const today = new Date();
    const dateStr = today.getFullYear().toString().slice(-2) +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');

    const sales = await this.getSales();
    const todaySales = sales.filter(s => {
      const sDate = new Date(s.createdAt);
      return sDate.toDateString() === today.toDateString();
    });

    const nextSeq = String(todaySales.length + 1).padStart(4, '0');
    return `CH-${dateStr}-${nextSeq}`;
  }

  // ================= SOZLAMALAR (SETTINGS) =================

  async getSettings() {
    try {
      const data = localStorage.getItem('pos_settings');
      if (!data) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings) {
    const fullSettings = { ...DEFAULT_SETTINGS, ...settings };
    localStorage.setItem('pos_settings', JSON.stringify(fullSettings));
    return fullSettings;
  }

  // ================= ZAXIRA NUSXA VA QAYTA TIKLASH =================

  async exportFullBackup() {
    const products = await this.getProducts();
    const categories = await this.getCategories();
    const sales = await this.getSales();
    const settings = await this.getSettings();

    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      shopName: settings.shopName || 'DO‘KON POS',
      data: { products, categories, sales, settings }
    };
  }

  async importFullBackup(backupData) {
    if (!backupData || !backupData.data) {
      throw new Error('Yaroqsiz zaxira fayli formati!');
    }

    const { products, categories, sales, settings } = backupData.data;
    if (products) localStorage.setItem('pos_products', JSON.stringify(products));
    if (categories) localStorage.setItem('pos_categories', JSON.stringify(categories));
    if (sales) localStorage.setItem('pos_sales', JSON.stringify(sales));
    if (settings) localStorage.setItem('pos_settings', JSON.stringify(settings));

    return true;
  }
}

// Global instansiya
window.storageService = new StorageService();
