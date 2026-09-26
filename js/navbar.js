import { db, state, refreshIcons } from './config.js';
import { applyFiltersAndSort } from './products.js';

let dropdownTimer = null;

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
        <button onclick="window.selectMenu(null, null, ''); window.hideSubmenu();" class="category-btn text-gold-600 border-b-2 border-gold-500 pb-0.5 flex items-center gap-1.5 shrink-0 font-bold transition">
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
      menuWrapper.className = "relative shrink-0 inline-flex items-center";
      
      const btn = document.createElement('button');
      btn.className = "category-btn text-slate-800 hover:text-gold-600 font-semibold transition flex items-center gap-1.5 whitespace-nowrap pb-0.5 cursor-pointer";
      btn.innerHTML = `
        <i data-lucide="${menu.icon}" class="w-4 h-4 text-gold-600"></i>
        <span>${menu.menuName}</span>
        ${hasSubs ? `<i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-500 pointer-events-none"></i>` : ''}
      `;

      // Click: Menu select
      btn.onclick = (e) => {
        if (!hasSubs) {
          window.selectMenu(menu.menuId, null, menu.menuName);
          window.hideSubmenu();
        } else {
          // On mobile tap or click toggle
          window.toggleSubmenu(btn, menu);
        }
      };

      // Hover: Desktop par cursor aane par dropdown open
      if (hasSubs) {
        menuWrapper.onmouseenter = () => {
          clearTimeout(dropdownTimer);
          window.showSubmenu(btn, menu);
        };
        menuWrapper.onmouseleave = () => {
          dropdownTimer = setTimeout(() => {
            window.hideSubmenu();
          }, 200);
        };
      }

      menuWrapper.appendChild(btn);
      if (navContainer) navContainer.appendChild(menuWrapper);

      // Desktop Filters
      if (filterContainer) {
        const catLabel = document.createElement('label');
        catLabel.className = "flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900 font-medium";
        catLabel.innerHTML = `
          <input type="checkbox" value="${menu.menuId}" class="cat-checkbox accent-gold-500 rounded" onchange="window.applyFiltersAndSort()" />
          <span>${menu.menuName}</span>
        `;
        filterContainer.appendChild(catLabel);
      }

      // Mobile Filters
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

    // Floating Dropdown par cursor rehne par band na ho
    const globalDropdown = document.getElementById('globalSubmenuDropdown');
    if (globalDropdown) {
      globalDropdown.onmouseenter = () => clearTimeout(dropdownTimer);
      globalDropdown.onmouseleave = () => {
        dropdownTimer = setTimeout(() => window.hideSubmenu(), 200);
      };
    }

    refreshIcons();
  } catch (err) {
    console.error("MenuSubmenu error:", err.message);
  }
}

// GLOBAL FLOATING SUBMENU CONTROLLERS
window.showSubmenu = function(btnElement, menu) {
  const dropdown = document.getElementById('globalSubmenuDropdown');
  const content = document.getElementById('globalSubmenuContent');
  if (!dropdown || !content || !menu.submenus.length) return;

  const rect = btnElement.getBoundingClientRect();
  dropdown.style.left = `${Math.max(10, rect.left)}px`;
  dropdown.style.top = `${rect.bottom + 8}px`;

  content.innerHTML = `
    <div class="px-4 py-1.5 text-[10px] uppercase font-bold text-gold-700 bg-gold-50/70 border-b border-ivory-200">
      ${menu.menuName} Categories
    </div>
    ${menu.submenus.map(sub => `
      <button onclick="event.stopPropagation(); window.selectMenu('${menu.menuId}', '${sub.subId}', '${sub.subName}'); window.hideSubmenu();" class="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-800 hover:text-gold-600 hover:bg-ivory-100 transition flex items-center justify-between group/item cursor-pointer">
        <span>${sub.subName}</span>
        <i data-lucide="chevron-right" class="w-3.5 h-3.5 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all text-gold-600"></i>
      </button>
    `).join('')}
  `;

  dropdown.classList.remove('hidden');
  refreshIcons();
};

window.hideSubmenu = function() {
  const dropdown = document.getElementById('globalSubmenuDropdown');
  if (dropdown) dropdown.classList.add('hidden');
};

window.toggleSubmenu = function(btnElement, menu) {
  const dropdown = document.getElementById('globalSubmenuDropdown');
  if (dropdown && !dropdown.classList.contains('hidden')) {
    window.hideSubmenu();
  } else {
    window.showSubmenu(btnElement, menu);
  }
};

// Bahar click karne par dropdown band ho jaye
document.addEventListener('click', (e) => {
  if (!e.target.closest('#globalSubmenuDropdown') && !e.target.closest('.category-btn')) {
    window.hideSubmenu();
  }
});

export function scrollMenus(offset) {
  window.hideSubmenu();
  const container = document.getElementById('categoryNavContainer');
  if (container) {
    container.scrollBy({ left: offset, behavior: 'smooth' });
  }
}

export function syncCategoryCheckboxes(id, isChecked) {
  document.querySelectorAll(`.cat-checkbox[value="${id}"]`).forEach(c => c.checked = isChecked);
}

export function openMobileFilterDrawer() {
  window.hideSubmenu();
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
  window.hideSubmenu();
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
