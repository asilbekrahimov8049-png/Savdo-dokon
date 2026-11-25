/**
 * DO‘KON POS - Ma'lumotlar Ombori va Saqlash Servisi (Storage Service)
 * 4 Asosiy Kategoriya: Somsa, Shirinliklar, Salqin Ichimliklar, Shokolad va Vaflilar.
 * LocalStorage + IndexedDB media zaxirasi + xavfsiz migratsiya.
 */

// 4 ASOSIY KATEGORIYA
const DEFAULT_CATEGORIES = [
  {
    id: 'somsa',
    name: 'Somsa',
    shortName: 'Somsa',
    icon: 'fa-fire-burner',
    color: '#d97706',
    bgColor: '#fef3c7',
    image: 'assets/images/cat-somsa.jpg',
    description: 'Go‘shtli, kartoshkali va boshqa somsa turlari'
  },
  {
    id: 'shirinliklar',
    name: 'Shirinliklar',
    shortName: 'Shirinliklar',
    icon: 'fa-bread-slice',
    color: '#ec4899',
    bgColor: '#fce7f3',
    image: 'assets/images/cat-shirinliklar.jpg',
    description: 'Bolichkalar, kruassanlar, kekslar, ruletlar va pishiriqlar'
  },
  {
    id: 'ichimliklar',
    name: 'Salqin Ichimliklar',
    shortName: 'Ichimliklar',
    icon: 'fa-bottle-water',
    color: '#0284c7',
    bgColor: '#e0f2fe',
    image: 'assets/images/cat-ichimliklar.jpg',
    description: 'Coca-Cola, Fanta, Sprite, sharbatlar va suvlar'
  },
  {
    id: 'shokolad_vaflilar',
    name: 'Shokolad va Vaflilar',
    shortName: 'Shokolad & Vafli',
    icon: 'fa-cookie-bite',
    color: '#8b5cf6',
    bgColor: '#f3e8ff',
    image: 'assets/images/cat-shokolad.jpg',
    description: 'Shokoladlar, vaflilar, pechenyelar va batonchiklar'
  }
];

const VALID_CATEGORY_IDS = DEFAULT_CATEGORIES.map(c => c.id);

// DASTLABKI MAHSULOTLAR RO'YXATI (4 TA KATEGORIYA BO'YICHA)
const INITIAL_PRODUCTS = [
  // 1. SOMSA
  {
    id: 'p_somsa_1',
    name: 'Go‘shtli somsa',
    price: 10000,
    category: 'somsa',
    unit: 'dona',
    image: 'assets/images/cat-somsa.jpg',
    description: 'Qarsildoq qatlama xamir, mayin mol go‘shti va piyozli issiq somsa',
    barcode: '1001'
  },
  {
    id: 'p_somsa_2',
    name: 'Kartoshkali somsa',
    price: 6000,
    category: 'somsa',
    unit: 'dona',
    image: 'assets/images/cat-somsa.jpg',
    description: 'Yumshoq kartoshka va ziravorlar bilan pishirilgan tillarang somsa',
    barcode: '1002'
  },
  {
    id: 'p_somsa_3',
    name: 'Tandir go‘shtli somsa',
    price: 12000,
    category: 'somsa',
    unit: 'dona',
    image: 'assets/images/cat-somsa.jpg',
    description: 'Tandirda sedana sepib pishirilgan sersuv milliy somsa',
    barcode: '1003'
  },
  {
    id: 'p_somsa_4',
    name: 'Tovuqli somsa',
    price: 8000,
    category: 'somsa',
    unit: 'dona',
    image: 'assets/images/cat-somsa.jpg',
    description: 'Yengil va mazali tovuq filesidan tayyorlangan somsa',
    barcode: '1004'
  },
  {
    id: 'p_somsa_5',
    name: 'Qovoqli somsa',
    price: 6000,
    category: 'somsa',
    unit: 'dona',
    image: 'assets/images/cat-somsa.jpg',
    description: 'Shirin qovoq va piyozli xushbo‘y pishiriq somsa',
    barcode: '1005'
  },

  // 2. SHIRINLIKLAR (Bolichkalar, pishiriqlar, kruassanlar, kekslar, ruletlar)
  {
    id: 'p_shirin_1',
    name: 'Shirin bolichka (Mayizli)',
    price: 5000,
    category: 'shirinliklar',
    unit: 'dona',
    image: 'assets/images/cat-shirinliklar.jpg',
    description: 'Yangi pishgan yumshoq va xushbo‘y mayizli bolichka',
    barcode: '2001'
  },
  {
    id: 'p_shirin_2',
    name: 'Shokoladli kruassan',
    price: 12000,
    category: 'shirinliklar',
    unit: 'dona',
    image: 'assets/images/cat-shirinliklar.jpg',
    description: 'Sariyog‘li qatlama xamir va quyuq shokoladli kruassan',
    barcode: '2002'
  },
  {
    id: 'p_shirin_3',
    name: 'Vanilli keks (Maffin)',
    price: 8000,
    category: 'shirinliklar',
    unit: 'dona',
    image: 'assets/images/cat-shirinliklar.jpg',
    description: 'Mayin vanil ta’mli yumshoq yangi keks',
    barcode: '2003'
  },
  {
    id: 'p_shirin_4',
    name: 'Olchali biskvit rulet',
    price: 15000,
    category: 'shirinliklar',
    unit: 'dona',
    image: 'assets/images/cat-shirinliklar.jpg',
    description: 'Biskvit xamirli va nordon-shirin olchali rulet',
    barcode: '2004'
  },
  {
    id: 'p_shirin_5',
    name: 'Tvorogli pishiriq (Vatrushka)',
    price: 7000,
    category: 'shirinliklar',
    unit: 'dona',
    image: 'assets/images/cat-shirinliklar.jpg',
    description: 'Tabiiy shirin tvorogli yumshoq pishiriq',
    barcode: '2005'
  },
  {
    id: 'p_shirin_6',
    name: 'Olmali qatlama pishiriq',
    price: 9000,
    category: 'shirinliklar',
    unit: 'dona',
    image: 'assets/images/cat-shirinliklar.jpg',
    description: 'Karamellangan olma va dolchinli qatlama non mahsuloti',
    barcode: '2006'
  },

  // 3. SALQIN ICHIMLIKLAR
  {
    id: 'p_ichim_1',
    name: 'Coca-Cola 0.5L',
    price: 9000,
    category: 'ichimliklar',
    unit: 'dona',
    image: 'assets/images/cat-ichimliklar.jpg',
    description: 'Muzdek klassik gazlangan ichimlik',
    barcode: '5449000000996'
  },
  {
    id: 'p_ichim_2',
    name: 'Coca-Cola 1.5L',
    price: 14000,
    category: 'ichimliklar',
    unit: 'dona',
    image: 'assets/images/cat-ichimliklar.jpg',
    description: 'Katta hajmli salqin gazlangan ichimlik',
    barcode: '5449000000439'
  },
  {
    id: 'p_ichim_3',
    name: 'Fanta Apelsin 0.5L',
    price: 9000,
    category: 'ichimliklar',
    unit: 'dona',
    image: 'assets/images/cat-ichimliklar.jpg',
    description: 'Yorqin apelsin ta’mli gazlangan salqin ichimlik',
    barcode: '5449000011527'
  },
  {
    id: 'p_ichim_4',
    name: 'Sprite 0.5L',
    price: 9000,
    category: 'ichimliklar',
    unit: 'dona',
    image: 'assets/images/cat-ichimliklar.jpg',
    description: 'Limon va laym ta’mli tetiklantiruvchi ichimlik',
    barcode: '5449000018441'
  },
  {
    id: 'p_ichim_5',
    name: 'Dena Sharbat 1L (Olma)',
    price: 14000,
    category: 'ichimliklar',
    unit: 'dona',
    image: 'assets/images/cat-ichimliklar.jpg',
    description: 'Tabiiy mevali salqin sharbat',
    barcode: '4780012345678'
  },
  {
    id: 'p_ichim_6',
    name: 'Chortoq Gazlangan Suv 0.5L',
    price: 8000,
    category: 'ichimliklar',
    unit: 'dona',
    image: 'assets/images/cat-ichimliklar.jpg',
    description: 'Tabiiy shifobaxsh gazlangan mineral suv',
    barcode: '4780008540019'
  },
  {
    id: 'p_ichim_7',
    name: 'Oddiy Toza Suv 0.5L',
    price: 4000,
    category: 'ichimliklar',
    unit: 'dona',
    image: 'assets/images/cat-ichimliklar.jpg',
    description: 'Gazlanmagan toza ichimlik suvi',
    barcode: '4607065000012'
  },

  // 4. SHOKOLAD VA VAFLILAR
  {
    id: 'p_shoko_1',
    name: 'Alpen Gold Sutli Shokolad',
    price: 14000,
    category: 'shokolad_vaflilar',
    unit: 'dona',
    image: 'assets/images/cat-shokolad.jpg',
    description: 'Mayin sutli klassik plitka shokolad 85g',
    barcode: '7622210286801'
  },
  {
    id: 'p_shoko_2',
    name: 'Snickers Super Batonchik',
    price: 11000,
    category: 'shokolad_vaflilar',
    unit: 'dona',
    image: 'assets/images/cat-shokolad.jpg',
    description: 'Yeryong‘oq, karamel va sutli shokoladli batonchik',
    barcode: '5000159461122'
  },
  {
    id: 'p_shoko_3',
    name: 'Twix Xtra Batonchik',
    price: 11000,
    category: 'shokolad_vaflilar',
    unit: 'dona',
    image: 'assets/images/cat-shokolad.jpg',
    description: 'Qarsildoq pechenye va karamelli shokolad tayoqchalar',
    barcode: '5000159459228'
  },
  {
    id: 'p_shoko_4',
    name: 'KitKat Vafli Batonchik',
    price: 9500,
    category: 'shokolad_vaflilar',
    unit: 'dona',
    image: 'assets/images/cat-shokolad.jpg',
    description: 'Sutli shokolad bilan qoplangan qarsildoq vafli',
    barcode: '7613035345911'
  },
  {
    id: 'p_shoko_5',
    name: 'Krem-Vafli Qarsildoq 200g',
    price: 12000,
    category: 'shokolad_vaflilar',
    unit: 'dona',
    image: 'assets/images/cat-shokolad.jpg',
    description: 'Vanil kremli qarsillagan shirin vaflilar',
    barcode: '4780009876543'
  },
  {
    id: 'p_shoko_6',
    name: 'Oreo Pechenye 95g',
    price: 7000,
    category: 'shokolad_vaflilar',
    unit: 'dona',
    image: 'assets/images/cat-shokolad.jpg',
    description: 'Kakao pechenyesi va nozik vanilli krem qatlami',
    barcode: '7622210286819'
  }
];

// STANDART SOZLAMALAR
const DEFAULT_SETTINGS = {
  shopName: 'DO‘KON POS',
  shopAddress: 'Toshkent sh., Markaziy savdo majmuasi',
  shopPhone: '+998 90 123 45 67',
  receiptHeader: 'Xaridingiz uchun rahmat!',
  receiptFooter: 'Iltimos, chekni saqlang. Yana kelib turing!',
  taxNumber: 'STIR: 301234567',
  currency: 'so‘m',
  soundEnabled: true,
  autoPrintReceipt: false,
  theme: 'light'
};

// Kichik IndexedDB media ombori (katta rasmlar LocalStorage limitiga tushmasligi uchun zaxira)
class MediaIDBStore {
  constructor() {
    this.dbName = 'DokonPOSMediaDB';
    this.storeName = 'images';
    this.dbPromise = null;
  }

  open() {
    if (this.dbPromise) return this.dbPromise;
    if (!window.indexedDB) return Promise.resolve(null);

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName);
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    return this.dbPromise;
  }

  async setImage(key, dataUrl) {
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        tx.objectStore(this.storeName).put(dataUrl, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  }

  async getImage(key) {
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly');
        const req = tx.objectStore(this.storeName).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async deleteImage(key) {
    const db = await this.open();
    if (!db) return;
    try {
      const tx = db.transaction(this.storeName, 'readwrite');
      tx.objectStore(this.storeName).delete(key);
    } catch (e) {}
  }
}

class StorageService {
  constructor() {
    this.mediaStore = new MediaIDBStore();
    this.imageCache = {}; // idb://... kalitlarini tez olish uchun kesh
    this.ensureInitialized();
  }

  async init() {
    this.ensureInitialized();
    await this.hydrateProductImages();
    return true;
  }

  // Eski versiyadagi mahsulotlarni yo'qotmasdan 4 ta kategoriyaga xavfsiz o'tkazish
  mapLegacyCategory(catId, prodName = '') {
    if (VALID_CATEGORY_IDS.includes(catId)) {
      if (catId === 'shirinliklar') {
        const lower = (prodName || '').toLowerCase();
        const isBakery = ['kruassan', 'bolichka', 'bulochka', 'keks', 'maffin', 'rulet', 'vatrushka', 'pirog', 'sloyka', 'pishiriq'].some(k => lower.includes(k));
        if (isBakery) return 'shirinliklar';
        const isChocoOrCandy = ['snickers', 'twix', 'kitkat', 'alpen', 'orbit', 'vafli', 'pechenye', 'batonchik', 'choco'].some(k => lower.includes(k));
        if (isChocoOrCandy) return 'shokolad_vaflilar';
      }
      return catId;
    }
    if (catId === 'suvlar' || catId === 'ichimliklar' || catId === 'qahva') return 'ichimliklar';
    if (catId === 'pechenye' || catId === 'chips' || catId === 'boshqa') return 'shokolad_vaflilar';
    return 'somsa';
  }

  getCategoryDefaultImage(catId) {
    const cat = DEFAULT_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.image : 'assets/images/cat-somsa.jpg';
  }

  ensureInitialized() {
    try {
      // 1. 4 ta rasmiy kategoriyani saqlash va mahalliy rasmlarga ulash
      localStorage.setItem('pos_categories', JSON.stringify(DEFAULT_CATEGORIES));

      // 2. Mahsulotlarni xavfsiz yuklash / migratsiya qilish (mavjud mahsulotlarni o'chirmasdan!)
      const existingProdsRaw = localStorage.getItem('pos_products');
      if (!existingProdsRaw) {
        localStorage.setItem('pos_products', JSON.stringify(INITIAL_PRODUCTS));
      } else {
        try {
          const parsed = JSON.parse(existingProdsRaw);
          if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.setItem('pos_products', JSON.stringify(INITIAL_PRODUCTS));
          } else {
            let changed = false;
            const migrated = parsed.map(p => {
              const newCat = this.mapLegacyCategory(p.category, p.name);
              const isExternalOldImg = !p.image || p.image.includes('images.unsplash.com');
              const fixedImage = isExternalOldImg ? this.getCategoryDefaultImage(newCat) : p.image;
              if (newCat !== p.category || fixedImage !== p.image || p.description === undefined) {
                changed = true;
              }
              return {
                ...p,
                category: newCat,
                image: fixedImage,
                description: p.description || '',
                unit: p.unit || 'dona'
              };
            });

            // Agar Somsa yoki Shirinliklar (bolichka/pishiriq) kategoriyasi bo'sh bo'lsa, boshlang'ich tovarlarni qo'shib qo'yamiz (eskilarini o'chirmay!)
            const existingIds = new Set(migrated.map(p => p.id));
            const hasSomsa = migrated.some(p => p.category === 'somsa');
            const hasBakery = migrated.some(p => p.category === 'shirinliklar');

            if (!hasSomsa) {
              INITIAL_PRODUCTS.filter(p => p.category === 'somsa').forEach(p => {
                if (!existingIds.has(p.id)) {
                  migrated.push(p);
                  changed = true;
                }
              });
            }
            if (!hasBakery) {
              INITIAL_PRODUCTS.filter(p => p.category === 'shirinliklar').forEach(p => {
                if (!existingIds.has(p.id)) {
                  migrated.push(p);
                  changed = true;
                }
              });
            }

            if (changed) {
              this.safeSetItem('pos_products', JSON.stringify(migrated));
            }
          }
        } catch (e) {
          console.warn('Mahsulotlarni o‘qishda xato, zaxira nusxa tekshirilmoqda:', e);
        }
      }

      // 3. Savdolar tarixi (oldindan bo'lsa umuman tegilmaydi!)
      if (!localStorage.getItem('pos_sales')) {
        localStorage.setItem('pos_sales', JSON.stringify([]));
      }

      // 4. Sozlamalar
      if (!localStorage.getItem('pos_settings')) {
        localStorage.setItem('pos_settings', JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch (err) {
      console.warn('Storage initsializatsiyasida ogohlantirish:', err);
    }
  }

  safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      // Xavfsizlik uchun muhim ma'lumotlarni avtomatik snapshot qilish
      if (key === 'pos_products' || key === 'pos_sales') {
        try {
          localStorage.setItem(`${key}_snapshot`, value);
        } catch (e) {
          // Snapshot sig'masa asosiy saqlashga xalaqit bermaydi
        }
      }
      return true;
    } catch (err) {
      console.error('LocalStorage saqlash xatosi:', err);
      throw err;
    }
  }

  async hydrateProductImages() {
    try {
      const raw = localStorage.getItem('pos_products');
      if (!raw) return;
      const products = JSON.parse(raw);
      for (const p of products) {
        if (p.image && p.image.startsWith('idb://')) {
          const key = p.image.slice(6);
          if (!this.imageCache[key]) {
            const dataUrl = await this.mediaStore.getImage(key);
            if (dataUrl) {
              this.imageCache[key] = dataUrl;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Rasmlarni yuklashda ogohlantirish:', e);
    }
  }

  resolveImageSrc(imageValue, categoryId = 'somsa') {
    if (!imageValue) return this.getCategoryDefaultImage(categoryId);
    if (imageValue.startsWith('idb://')) {
      const key = imageValue.slice(6);
      return this.imageCache[key] || this.getCategoryDefaultImage(categoryId);
    }
    return imageValue;
  }

  // ================= MAHSULOTLAR (PRODUCTS) =================

  async getProducts() {
    try {
      const data = localStorage.getItem('pos_products') || localStorage.getItem('pos_products_snapshot');
      if (!data) return INITIAL_PRODUCTS;
      const products = JSON.parse(data);
      return products.map(p => ({
        ...p,
        resolvedImage: this.resolveImageSrc(p.image, p.category)
      }));
    } catch (e) {
      return INITIAL_PRODUCTS;
    }
  }

  async getProductById(id) {
    const products = await this.getProducts();
    return products.find(p => p.id === id) || null;
  }

  async persistProductsList(products) {
    // resolvedImage vaqtinchalik maydonini olib tashlaymiz
    const clean = products.map(({ resolvedImage, ...rest }) => rest);
    try {
      this.safeSetItem('pos_products', JSON.stringify(clean));
    } catch (err) {
      // Agar rasmlar hajmi LocalStorage limitidan oshsa, data:image rasmlarni IndexedDB ga ko'chiramiz
      const offloaded = [];
      for (const item of clean) {
        if (item.image && item.image.startsWith('data:image')) {
          const mediaKey = `prod_${item.id}`;
          await this.mediaStore.setImage(mediaKey, item.image);
          this.imageCache[mediaKey] = item.image;
          offloaded.push({ ...item, image: `idb://${mediaKey}` });
        } else {
          offloaded.push(item);
        }
      }
      this.safeSetItem('pos_products', JSON.stringify(offloaded));
    }
  }

  async addProduct(product) {
    if (!product.id) {
      product.id = 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    product.createdAt = product.createdAt || new Date().toISOString();
    product.updatedAt = new Date().toISOString();

    if (!product.image) {
      product.image = this.getCategoryDefaultImage(product.category);
    }

    const products = await this.getProducts();
    products.unshift(product);
    await this.persistProductsList(products);
    return {
      ...product,
      resolvedImage: this.resolveImageSrc(product.image, product.category)
    };
  }

  async updateProduct(product) {
    product.updatedAt = new Date().toISOString();
    if (!product.image) {
      product.image = this.getCategoryDefaultImage(product.category);
    }

    const products = await this.getProducts();
    const index = products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      products[index] = product;
    } else {
      products.unshift(product);
    }
    await this.persistProductsList(products);
    return {
      ...product,
      resolvedImage: this.resolveImageSrc(product.image, product.category)
    };
  }

  async deleteProduct(id) {
    let products = await this.getProducts();
    const target = products.find(p => p.id === id);
    if (target && target.image && target.image.startsWith('idb://')) {
      const key = target.image.slice(6);
      delete this.imageCache[key];
      await this.mediaStore.deleteImage(key);
    }
    products = products.filter(p => p.id !== id);
    await this.persistProductsList(products);
    return true;
  }

  // ================= KATEGORIYALAR (CATEGORIES) =================

  async getCategories() {
    try {
      const data = localStorage.getItem('pos_categories');
      if (!data) return DEFAULT_CATEGORIES;
      return JSON.parse(data);
    } catch (e) {
      return DEFAULT_CATEGORIES;
    }
  }

  async getCategoryById(id) {
    const cats = await this.getCategories();
    return cats.find(c => c.id === id) || null;
  }

  // ================= SAVDOLAR TARIXI (SALES) =================

  async getSales() {
    try {
      const data = localStorage.getItem('pos_sales') || localStorage.getItem('pos_sales_snapshot');
      if (!data) return [];
      const sales = JSON.parse(data);
      return sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (e) {
      return [];
    }
  }

  async addSale(saleData) {
    // Har bir mahsulot narxi va nomi savdo vaqtidagi nusxa sifatida saqlanadi (keyinchalik narx o'zgarsa ham hisobot o'zgarmaydi)
    const snapshotItems = (saleData.items || []).map(item => ({
      id: item.id,
      name: item.name,
      price: Number(item.price || 0),
      qty: Number(item.qty || 0),
      unit: item.unit || 'dona',
      category: item.category || '',
      barcode: item.barcode || '',
      subtotal: Number(item.price || 0) * Number(item.qty || 0)
    }));

    const sale = {
      id: saleData.id || 'sale_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      receiptNumber: saleData.receiptNumber || await this.generateNextReceiptNumber(),
      createdAt: saleData.createdAt || new Date().toISOString(),
      items: snapshotItems,
      totalQuantity: Number(saleData.totalQuantity || 0),
      totalAmount: Number(saleData.totalAmount || 0),
      cashAmount: Number(saleData.cashAmount || 0),
      cardAmount: Number(saleData.cardAmount || 0),
      terminalAmount: Number(saleData.terminalAmount || 0),
      changeAmount: Number(saleData.changeAmount || 0),
      paymentTypes: saleData.paymentTypes || [],
      status: saleData.status || 'completed',
      cashier: saleData.cashier || 'Sotuvchi #1',
      notes: saleData.notes || ''
    };

    const sales = await this.getSales();
    sales.unshift(sale);
    this.safeSetItem('pos_sales', JSON.stringify(sales));
    return sale;
  }

  async updateSaleStatus(saleId, status, cancelReason = '') {
    const sales = await this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) throw new Error('Savdo topilmadi: ' + saleId);

    sale.status = status;
    sale.cancelReason = cancelReason;
    sale.cancelledAt = status === 'cancelled' ? new Date().toISOString() : null;

    this.safeSetItem('pos_sales', JSON.stringify(sales));
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

  // ================= VAQTINCHALIK SAVATCHA (DRAFT CART) =================

  getDraftCart() {
    try {
      const raw = localStorage.getItem('pos_draft_cart');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveDraftCart(cart) {
    try {
      const cleanCart = (cart || []).map(({ image, ...rest }) => ({
        ...rest,
        image: image && !image.startsWith('data:image') ? image : ''
      }));
      localStorage.setItem('pos_draft_cart', JSON.stringify(cleanCart));
    } catch (e) {}
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
    this.safeSetItem('pos_settings', JSON.stringify(fullSettings));
    return fullSettings;
  }

  // ================= ZAXIRA VA QAYTA TIKLASH =================

  async exportFullBackup() {
    const rawProducts = await this.getProducts();
    // IDB dagi rasmlarni ham backup JSON ichiga to'liq DataURL qilib qo'shamiz
    const products = rawProducts.map(({ resolvedImage, ...rest }) => ({
      ...rest,
      image: resolvedImage || rest.image
    }));
    const categories = await this.getCategories();
    const sales = await this.getSales();
    const settings = await this.getSettings();

    return {
      version: '3.0',
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
    if (Array.isArray(products)) {
      const normalized = products.map(p => ({
        ...p,
        category: this.mapLegacyCategory(p.category, p.name)
      }));
      await this.persistProductsList(normalized);
    }
    if (Array.isArray(categories)) {
      localStorage.setItem('pos_categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
    if (Array.isArray(sales)) {
      this.safeSetItem('pos_sales', JSON.stringify(sales));
    }
    if (settings) {
      this.safeSetItem('pos_settings', JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
    }

    return true;
  }

  getStorageStats() {
    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pos_')) {
          totalBytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
        }
      }
    } catch (e) {}
    return {
      usedKB: Math.round(totalBytes / 1024),
      maxKB: 5120
    };
  }
}

// Global instansiya
window.storageService = new StorageService();
