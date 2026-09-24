import { db, state, refreshIcons } from './config.js';
import { applyFiltersAndSort } from './products.js';

// Safe Lucide Icon Resolver
function mapSafeIcon(rawIcon) {
  if (!rawIcon) return 'sparkles';
  const icon = String(rawIcon).toLowerCase().trim();
  
  const iconDictionary = {
    'kids': 'baby',
    'kichen': 'utensils',
    'kitchen': 'utensils',
    'beauty': 'sparkles',
    'electronic': 'tv',
    'electronics': 'tv',
    'fashion': 'shirt',
    'jewellery': 'gem',
    'jewelry': 'gem',
    'watch': 'watch',
    'watches': 'watch',
    'bags': 'briefcase'
  };

  return iconDictionary[icon] || icon;
}

export async function loadMenuSubmenu() {
  if (!db) return;

  try {
    const { data, error } = await db
      .from('MenuSubmenu')
      .select('*')
      .eq('Active', true)
      .order('Menu Serial', { ascending: true })
      .order('SubMenu Serial', { ascending: true });

    if (error) throw error;
    state.menuSubmenuList = data || [];

    const navContainer = document.getElementById('categoryNavContainer');
    const filterContainer = document.getElementById('categoryFilterContainer');
    const mobileFilterContainer = document.getElementById('mobileCategoryFilterContainer');

    if (navContainer) {
      navContainer.innerHTML = `
        <button onclick="window.selectMenu(null, null, '')" class="category-btn text-gold-600 border-b-2 border-gold-500 pb-0.5 flex items-center gap-1.5 shrink-0 font-bold transition">
          <i data-lucide="layout-grid" class="w-4 h-4 text-gold-600"></i> All Collections
        </button>
      `;
    }

    if (filterContainer) filterContainer.innerHTML = '';
    if (mobileFilterContainer) mobileFilterContainer.innerHTML = '';

    // Grouping Menus & Submenus
    const menuMap = new Map();
    state.menuSubmenuList.forEach(item => {
      const mId = String(item.MenuID || '').trim();
      if (!mId) return;

      if (!menuMap.has(mId)) {
        menuMap.set(mId, {
          menuId: mId,
          menuName: String(item.MenuName || '').trim(),
          icon: mapSafeIcon(item.Icons || item.MenuName),
          submenus: []
        });
      }

      const subId = item.SubmenuID ? String(item.SubmenuID).trim() : '';
      const subName = item.SubName ? String(item.SubName).trim() : '';
      
      // Check if valid submenu
      if (subId && subId !== 'NULL' && subName && subName !== 'NULL') {
        const exists = menuMap.get(mId).submenus.some(s => s.subId === subId);
        if (!exists) {
          menuMap.get(mId).submenus.push({ subId, subName });
        }
      }
    });

    menuMap.forEach(menu => {
      const hasSubs = menu.submenus.length > 0;
      
      const menuWrapper = document.createElement('div');
      menuWrapper.className = "relative group py-1.5 shrink-0";
      
      // Updated Menu Wrapper with absolute dropdown fix & high contrast
      menuWrapper.innerHTML = `
        <button onclick="window.selectMenu('${menu.menuId}', null, '${menu.menuName}')" class="category-btn text-slate-800 hover:text-gold-600 font-semibold transition flex items-center gap-1.5 whitespace-nowrap pb-0.5 cursor-pointer">
          <i data-lucide="${menu.icon}" class="w-4 h-4 text-gold-600"></i>
          <span>${menu.menuName}</span>
          ${hasSubs ? `<i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-500 group-hover:text-gold-600 transition-transform duration-200 group-hover:rotate-180 pointer-events-none"></i>` : ''}
        </button>

        ${hasSubs ? `
          <!-- DROPDOWN BOX (LIGHT LUXURY THEME & INSTANT HOVER VISIBILITY) -->
          <div class="hidden group-hover:block absolute left-0 top-full pt-2 min-w-[210px] z-[99999]">
            <div class="bg-white border border-ivory-300 shadow-2xl rounded-2xl py-2 divide-y divide-ivory-200 backdrop-blur-xl">
              ${menu.submenus.map(sub => `
                <button onclick="event.stopPropagation(); window.selectMenu('${menu.menuId}', '${sub.subId}', '${sub.subName}')" class="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-800 hover:text-gold-600 hover:bg-ivory-100 transition flex items-center justify-between group/item cursor-pointer">
                  <span>${sub.subName}</span>
                  <i data-lucide="chevron-right" class="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all text-gold-600"></i>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;
      if (navContainer) navContainer.appendChild(menuWrapper);

      // Desktop Checkbox (Light Theme)
      if (filterContainer) {
        const catLabel = document.createElement('label');
        catLabel.className = "flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 font-medium";
        catLabel.innerHTML = `
          <input type="checkbox" value="${menu.menuId}" class="cat-checkbox accent-gold-500 rounded" onchange="window.applyFiltersAndSort()" />
          <span>${menu.menuName}</span>
        `;
        filterContainer.appendChild(catLabel);
      }

      // Mobile Checkbox (Light Theme)
      if (mobileFilterContainer) {
        const mobLabel = document.createElement('label');
        mobLabel.className = "flex items-center gap-2.5 p-2 rounded-xl bg-ivory-50 border border-ivory-200 text-slate-700 cursor-pointer";
        mobLabel.innerHTML = `
          <input type="checkbox" value="${menu.menuId}" class="mob-cat-checkbox accent-gold-500 rounded" onchange="window.syncCategoryCheckboxes('${menu.menuId}', this.checked)" />
          <span>${menu.menuName}</span>
        `;
        mobileFilterContainer.appendChild(mobLabel);
      }
    });

    refreshIcons();
  } catch (err) {
    console.error("MenuSubmenu error:", err.message);
  }
}

export function scrollMenus(offset) {
  document.getElementById('categoryNavContainer')?.scrollBy({ left: offset, behavior: 'smooth' });
}

export function syncCategoryCheckboxes(id, isChecked) {
  document.querySelectorAll(`.cat-checkbox[value="${id}"]`).forEach(c => c.checked = isChecked);
}

// Mobile Filter Drawer & Sort Controls
export function openMobileFilterDrawer() {
  document.getElementById('mobileFilterDrawerBackdrop')?.classList.remove('hidden');
  const drawer = document.getElementById('mobileFilterDrawer');
  if (drawer) drawer.style.transform = 'translateY(0%)';
}

export function closeMobileFilterDrawer() {
  document.getElementById('mobileFilterDrawerBackdrop')?.classList.add('hidden');
  const drawer = document.getElementById('mobileFilterDrawer');
  if (drawer) drawer.style.transform = 'translateY(100%)';
  applyFiltersAndSort();
}

export function toggleMobileSortModal() {
  const modal = document.getElementById('mobileSortModal');
  modal?.classList.toggle('hidden');
  updateSortCheckmarks();
}

export function selectMobileSort(mode) {
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.value = mode;
  toggleMobileSortModal();
  applyFiltersAndSort();
}

export function updateSortCheckmarks() {
  const val = document.getElementById('sortSelect')?.value;
  ['relevance', 'price_low', 'price_high', 'rating'].forEach(m => {
    const el = document.getElementById(`sortCheck-${m}`);
    if (el) {
      if (m === val) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });
}

export function syncMobilePrice(val) {
  const radio = document.querySelector(`input[name="priceRange"][value="${val}"]`);
  if (radio) radio.checked = true;
}

export function syncMobileRating(checked) {
  const cb = document.getElementById('filterRating4');
  if (cb) cb.checked = checked;
}
