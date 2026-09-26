import { db, state, refreshIcons } from './config.js';

let currentOffset = 0;
const PAGE_LIMIT = 50;
let isLoadingMore = false;
let hasMoreProducts = true;

// 1. INITIAL & INFINITE PRODUCT FETCH
export async function loadProducts(isAppend = false) {
  if (!db || isLoadingMore || (!hasMoreProducts && isAppend)) return;
  isLoadingMore = true;

  if (!isAppend) {
    currentOffset = 0;
    hasMoreProducts = true;
    state.allProducts = [];
  }

  try {
    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_LIMIT - 1);

    if (error) throw error;

    const fetchedList = data || [];
    if (fetchedList.length < PAGE_LIMIT) {
      hasMoreProducts = false;
    }

    if (isAppend) {
      // Duplicate prevention during pagination append
      const existingIds = new Set(state.allProducts.map(p => p.product_id));
      const freshOnly = fetchedList.filter(p => !existingIds.has(p.product_id));
      state.allProducts = [...state.allProducts, ...freshOnly];
    } else {
      state.allProducts = fetchedList;
    }

    currentOffset += fetchedList.length;
    applyFiltersAndSort(isAppend);
  } catch (err) {
    console.error("Products fetch error:", err.message);
  } finally {
    isLoadingMore = false;
  }
}

// 2. RENDER GRID (STRICT DEDUPLICATION GUARANTEE)
export function renderProductGrid(items, isAppend = false) {
  const grid = document.getElementById('productGrid');
  const counter = document.getElementById('productCounter');
  const filterCount = document.getElementById('filterProductCount');

  if (!grid) return;

  // Har render se pehle grid ko clean karein
  if (!isAppend) {
    grid.innerHTML = '';
  }

  // Strict Deduplication: title aur product_code match hone par duplicate discard hoga
  const seenMap = new Set();
  const uniqueItems = [];

  (items || []).forEach(p => {
    // Unique identifier banayein (title + sku)
    const identifier = String(p.title || p.product_code || p.product_id).trim().toLowerCase();
    if (identifier && !seenMap.has(identifier)) {
      seenMap.add(identifier);
      uniqueItems.push(p);
    }
  });

  if (counter) counter.innerText = `${uniqueItems.length} Items`;
  if (filterCount) filterCount.innerText = `${uniqueItems.length} Products Available`;

  if (uniqueItems.length === 0 && !isAppend) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-600 bg-white border border-ivory-300 rounded-3xl space-y-3 shadow-sm">
        <i data-lucide="package-search" class="w-10 h-10 mx-auto text-gold-600"></i>
        <p class="text-sm font-bold text-slate-800">No matching products found.</p>
        <p class="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
      </div>`;
    refreshIcons();
    return;
  }

  const cardsMarkup = uniqueItems.map(product => {
    const hasDiscount = product.original_price && product.original_price > product.price;
    const discount = hasDiscount ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;
    const displayImg = product.thumbnail_url || product.image_url || 'Cover.png';

    return `
      <div onclick="window.openProductDetail('${product.product_id}')" class="group bg-white border border-ivory-300 rounded-2xl overflow-hidden hover:border-gold-500 hover:shadow-xl transition duration-300 flex flex-col shadow-sm cursor-pointer transform hover:-translate-y-1">
        
        <div class="relative w-full h-48 sm:h-60 bg-ivory-100 overflow-hidden">
          <img src="${displayImg}" alt="${product.title}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out" loading="lazy" onerror="this.src='Cover.png'" />
          
          ${hasDiscount ? `<span class="absolute top-2 left-2 bg-gold-500 text-white font-bold text-[9px] px-2 py-0.5 rounded shadow-md tracking-wider uppercase font-mono">${discount}% OFF</span>` : ''}
          
          <button onclick="event.stopPropagation(); window.toggleWishlist('${product.product_id}')" class="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-full text-slate-600 hover:text-rose-500 transition shadow-sm border border-ivory-200" title="Wishlist">
            <i data-lucide="heart" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <div class="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3 bg-white">
          <div>
            <div class="flex items-center justify-between text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">
              <span>SKU: ${product.product_code || 'ZIV'}</span>
              ${product.submenu_code ? `<span class="text-gold-700 bg-gold-50 border border-gold-300 px-1.5 py-0.2 rounded font-bold">${product.submenu_code}</span>` : ''}
            </div>
            <h3 class="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1 mt-1.5 group-hover:text-gold-600 transition" title="${product.title}">
              ${product.title}
            </h3>
          </div>

          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-base sm:text-lg font-black text-slate-900 font-mono">₹${Number(product.price).toLocaleString('en-IN')}</span>
              ${hasDiscount ? `<span class="text-xs text-slate-400 line-through font-mono">₹${Number(product.original_price).toLocaleString('en-IN')}</span>` : ''}
            </div>
            
            <div class="flex items-center gap-1.5 mt-1.5">
              <span class="inline-flex items-center text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-sm">
                ${product.rating || '4.5'} <i data-lucide="star" class="w-2.5 h-2.5 fill-current ml-0.5"></i>
              </span>
              <span class="text-[10px] text-slate-500 font-medium">(${product.reviews_count || 45})</span>
            </div>
          </div>

          <button onclick="event.stopPropagation(); window.addToCart('${product.product_id}')" class="w-full bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-600 hover:to-gold-500 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md active:scale-95">
            <i data-lucide="shopping-bag" class="w-3.5 h-3.5 stroke-[2.5]"></i>
            <span>Add to Bag</span>
          </button>
        </div>
      </div>`;
  }).join('');

  if (isAppend) {
    grid.innerHTML += cardsMarkup;
  } else {
    grid.innerHTML = cardsMarkup;
  }

  refreshIcons();
}

// Redirect to Product Detail Page
window.openProductDetail = function(productId) {
  window.location.href = `product-detail.html?id=${productId}`;
};

window.toggleWishlist = function(productId) {
  alert("Item added to your luxury wishlist!");
};

// 3. SEARCH CONTROLLER
export function handleSearchInput(e) {
  const term = e.target.value.trim();
  const clearBtn = document.getElementById('clearSearchBtn');
  const hero = document.getElementById('heroBannerSection');
  const heading = document.getElementById('searchHeading');
  const subtext = document.getElementById('searchSubtext');
  
  if (term.length > 0) {
    clearBtn?.classList.remove('hidden');
    hero?.classList.add('hidden');
    if (heading) heading.innerText = `"${term}"`;
    if (subtext) subtext.innerText = `Showing results matching your query`;
  } else {
    clearBtn?.classList.add('hidden');
    hero?.classList.remove('hidden');
    if (heading) heading.innerText = "";
    if (subtext) subtext.innerText = "";
  }

  applyFiltersAndSort();
}

export function resetSearch() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  document.getElementById('clearSearchBtn')?.classList.add('hidden');
  document.getElementById('heroBannerSection')?.classList.remove('hidden');
  
  const heading = document.getElementById('searchHeading');
  const subtext = document.getElementById('searchSubtext');
  if (heading) heading.innerText = "";
  if (subtext) subtext.innerText = "";
  
  applyFiltersAndSort();
}

export function triggerSearch() {
  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
  applyFiltersAndSort();
}

// 4. TAXONOMY SELECTION
export function selectMenu(menuId, submenuId, title) {
  state.activeMenuId = menuId ? String(menuId).trim() : null;
  state.activeSubmenuId = submenuId ? String(submenuId).trim() : null;
  
  const heading = document.getElementById('searchHeading');
  const subtext = document.getElementById('searchSubtext');
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const hero = document.getElementById('heroBannerSection');

  if (heading) heading.innerText = title || '';
  if (searchInput) searchInput.value = '';
  clearBtn?.classList.add('hidden');

  if (menuId || submenuId) {
    hero?.classList.add('hidden');
    if (subtext) subtext.innerText = `Showing filtered collection for ${title}`;
  } else {
    hero?.classList.remove('hidden');
    if (subtext) subtext.innerText = "";
  }

  document.querySelectorAll('.cat-checkbox, .mob-cat-checkbox').forEach(cb => {
    cb.checked = (cb.value === menuId);
  });

  applyFiltersAndSort();
}

// 5. MULTI-VARIABLE DATABASE FILTER & SORT
export function applyFiltersAndSort(isAppend = false) {
  let filtered = [...state.allProducts];

  const term = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  if (term) {
    filtered = filtered.filter(p => {
      const title = p.title ? p.title.toLowerCase() : '';
      const code = p.product_code ? p.product_code.toLowerCase() : '';
      const menuCode = p.menu_code ? p.menu_code.toString().toLowerCase() : '';
      const subCode = p.submenu_code ? p.submenu_code.toLowerCase() : '';
      return title.includes(term) || code.includes(term) || menuCode === term || subCode.includes(term);
    });
  }

  if (state.activeSubmenuId) {
    filtered = filtered.filter(p => String(p.submenu_code || '').trim() === state.activeSubmenuId);
  } else if (state.activeMenuId) {
    filtered = filtered.filter(p => String(p.menu_code || '').trim() === state.activeMenuId);
  }

  const checkedCategories = Array.from(document.querySelectorAll('.cat-checkbox:checked, .mob-cat-checkbox:checked')).map(cb => cb.value);
  if (checkedCategories.length > 0 && !state.activeSubmenuId) {
    filtered = filtered.filter(p => checkedCategories.includes(String(p.menu_code || '').trim()));
  }

  const priceVal = document.querySelector('input[name="priceRange"]:checked')?.value;
  if (priceVal === 'under2000') {
    filtered = filtered.filter(p => p.price < 2000);
  } else if (priceVal === '2000to5000') {
    filtered = filtered.filter(p => p.price >= 2000 && p.price <= 5000);
  } else if (priceVal === 'above5000') {
    filtered = filtered.filter(p => p.price > 5000);
  }

  const r4Desktop = document.getElementById('filterRating4')?.checked;
  const r4Mobile = document.getElementById('mobileFilterRating4')?.checked;
  if (r4Desktop || r4Mobile) {
    filtered = filtered.filter(p => (p.rating || 5) >= 4.0);
  }

  const sortMode = document.getElementById('sortSelect')?.value || 'relevance';
  if (sortMode === 'price_low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortMode === 'price_high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortMode === 'rating') {
    filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  const activeFilterCount = checkedCategories.length + (priceVal && priceVal !== 'all' ? 1 : 0) + (r4Desktop || r4Mobile ? 1 : 0);
  const dot = document.getElementById('mobileFilterDot');
  if (dot) {
    if (activeFilterCount > 0) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
  }

  renderProductGrid(filtered, isAppend);
}

// 6. RESET ALL FILTERS
export function resetAllFilters() {
  state.activeMenuId = null;
  state.activeSubmenuId = null;
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  document.getElementById('clearSearchBtn')?.classList.add('hidden');
  document.getElementById('heroBannerSection')?.classList.remove('hidden');

  const heading = document.getElementById('searchHeading');
  const subtext = document.getElementById('searchSubtext');
  if (heading) heading.innerText = "";
  if (subtext) subtext.innerText = "";

  document.querySelectorAll('.cat-checkbox, .mob-cat-checkbox').forEach(cb => cb.checked = false);

  const allPricesRadio = document.querySelector('input[name="priceRange"][value="all"]');
  if (allPricesRadio) allPricesRadio.checked = true;
  const mobAllPricesRadio = document.querySelector('input[name="mobilePriceRange"][value="all"]');
  if (mobAllPricesRadio) mobAllPricesRadio.checked = true;

  const r4 = document.getElementById('filterRating4');
  if (r4) r4.checked = false;
  const r4m = document.getElementById('mobileFilterRating4');
  if (r4m) r4m.checked = false;

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = 'relevance';

  applyFiltersAndSort();
}

// 7. AUTO-SCROLL TRIGGER
window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 600) {
    if (!isLoadingMore && hasMoreProducts) {
      loadProducts(true);
    }
  }
});
