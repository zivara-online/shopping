import { db, state, refreshIcons } from './config.js';

export async function loadProducts() {
  if (!db) return;
  try {
    const { data, error } = await db
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;
    state.allProducts = data || [];
    applyFiltersAndSort();
  } catch (err) {
    console.error("Products error:", err.message);
  }
}

export function renderProductGrid(items) {
  const grid = document.getElementById('productGrid');
  const counter = document.getElementById('productCounter');
  const filterCount = document.getElementById('filterProductCount');

  if (counter) counter.innerText = `${items.length} Item${items.length === 1 ? '' : 's'}`;
  if (filterCount) filterCount.innerText = `${items.length} Products Available`;

  if (!grid) return;
  if (items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-400 bg-noir-900/60 border border-gold-500/10 rounded-3xl space-y-3">
        <i data-lucide="package-search" class="w-10 h-10 mx-auto text-gold-400/40"></i>
        <p class="text-sm font-bold text-slate-200">No matching products found.</p>
        <p class="text-xs text-slate-500">Try adjusting your filters or search keywords.</p>
      </div>
    `;
    refreshIcons();
    return;
  }

  grid.innerHTML = items.map(product => {
    const hasDiscount = product.original_price && product.original_price > product.price;
    const discount = hasDiscount ? Math.round(((product.original_price - product.price) / product.original_price) * 100) : 0;
    const displayImg = product.thumbnail_url || product.image_url || 'Cover.png';

    return `
      <div class="group bg-noir-900 border border-gold-500/20 rounded-2xl overflow-hidden hover:border-gold-400/60 transition duration-300 flex flex-col shadow-lg">
        
        <div class="relative w-full h-44 sm:h-56 bg-noir-950 overflow-hidden">
          <img 
            src="${displayImg}" 
            alt="${product.title}" 
            class="w-full h-full object-cover group-hover:scale-105 transition duration-500 ease-out" 
            loading="lazy"
            onerror="this.src='Cover.png'"
          />
          ${hasDiscount ? `
            <span class="absolute top-2 left-2 bg-noir-950/90 text-gold-400 border border-gold-500/40 text-[9px] font-bold px-2 py-0.5 rounded shadow">
              ${discount}% OFF
            </span>
          ` : ''}
          <button class="absolute top-2 right-2 bg-noir-900/80 p-1.5 rounded-full text-slate-300 hover:text-rose-500 transition shadow">
            <i data-lucide="heart" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <div class="p-3 sm:p-3.5 flex-1 flex flex-col justify-between space-y-2">
          <div>
            <div class="flex items-center justify-between text-[10px] text-slate-400 uppercase font-mono tracking-wider">
              <span>${product.product_code || 'ZIV'}</span>
              ${product.submenu_code ? `<span class="text-gold-400 border border-gold-500/30 px-1 rounded">${product.submenu_code}</span>` : ''}
            </div>
            <h3 class="text-xs font-semibold text-slate-100 line-clamp-1 mt-1" title="${product.title}">
              ${product.title}
            </h3>
          </div>

          <div>
            <div class="flex items-baseline gap-1.5">
              <span class="text-sm sm:text-base font-black text-white">₹${Number(product.price).toLocaleString('en-IN')}</span>
              ${hasDiscount ? `<span class="text-[11px] text-slate-500 line-through">₹${Number(product.original_price).toLocaleString('en-IN')}</span>` : ''}
            </div>
            
            <div class="flex items-center gap-1.5 mt-1">
              <span class="inline-flex items-center text-[10px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-400 px-1.5 py-0.2 rounded">
                ${product.rating || '4.2'} <i data-lucide="star" class="w-2.5 h-2.5 fill-current ml-0.5"></i>
              </span>
              <span class="text-[10px] text-slate-500">(${product.reviews_count || 45})</span>
            </div>
          </div>

          <button 
            onclick="window.addToCart('${product.product_id}')" 
            class="w-full bg-gradient-to-r from-gold-500 to-gold-400 hover:from-gold-400 hover:to-gold-300 text-noir-950 font-bold text-xs py-2 rounded-xl transition flex items-center justify-center gap-1.5 shadow active:scale-95">
            <i data-lucide="shopping-bag" class="w-3.5 h-3.5 stroke-[2.5]"></i>
            <span>Add to Bag</span>
          </button>
        </div>

      </div>
    `;
  }).join('');

  refreshIcons();
}

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
    if (heading) heading.innerText = "The Heritage Edit";
    if (subtext) subtext.innerText = "Live catalogue directly synced with database inventory";
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
  if (heading) heading.innerText = "The Heritage Edit";
  if (subtext) subtext.innerText = "Live catalogue directly synced with database inventory";
  
  applyFiltersAndSort();
}

export function triggerSearch() {
  document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
  applyFiltersAndSort();
}

export function selectMenu(menuId, submenuId, title) {
  state.activeMenuId = menuId ? String(menuId).trim() : null;
  state.activeSubmenuId = submenuId ? String(submenuId).trim() : null;
  
  const heading = document.getElementById('searchHeading');
  const subtext = document.getElementById('searchSubtext');
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const hero = document.getElementById('heroBannerSection');

  if (heading) heading.innerText = title || 'The Heritage Edit';
  if (searchInput) searchInput.value = '';
  clearBtn?.classList.add('hidden');

  if (menuId || submenuId) {
    hero?.classList.add('hidden');
    if (subtext) subtext.innerText = `Showing filtered collection for ${title}`;
  } else {
    hero?.classList.remove('hidden');
    if (subtext) subtext.innerText = "Live catalogue directly synced with database inventory";
  }

  document.querySelectorAll('.cat-checkbox, .mob-cat-checkbox').forEach(cb => {
    cb.checked = (cb.value === menuId);
  });

  applyFiltersAndSort();
}

export function applyFiltersAndSort() {
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

  renderProductGrid(filtered);
}

export function resetAllFilters() {
  state.activeMenuId = null;
  state.activeSubmenuId = null;
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) searchInput.value = '';
  document.getElementById('clearSearchBtn')?.classList.add('hidden');
  document.getElementById('heroBannerSection')?.classList.remove('hidden');

  const heading = document.getElementById('searchHeading');
  const subtext = document.getElementById('searchSubtext');
  if (heading) heading.innerText = "The Heritage Edit";
  if (subtext) subtext.innerText = "Live catalogue directly synced with database inventory";

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
