import { db, state, refreshIcons } from './config.js';
import { applyFiltersAndSort } from './products.js';

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

    navContainer.innerHTML = `
      <button onclick="window.selectMenu(null, null, 'The Heritage Edit')" class="category-btn text-gold-400 border-b-2 border-gold-400 pb-0.5 flex items-center gap-1.5 shrink-0 transition">
        <i data-lucide="layout-grid" class="w-4 h-4"></i> All Collections
      </button>
    `;
    if (filterContainer) filterContainer.innerHTML = '';
    if (mobileFilterContainer) mobileFilterContainer.innerHTML = '';

    const menuMap = new Map();
    state.menuSubmenuList.forEach(item => {
      const mId = String(item.MenuID || '').trim();
      if (!mId) return;

      if (!menuMap.has(mId)) {
        menuMap.set(mId, {
          menuId: mId,
          menuName: String(item.MenuName || '').trim(),
          icon: item.Icons || 'sparkles',
          submenus: []
        });
      }
      const subId = item.SubmenuID ? String(item.SubmenuID).trim() : '';
      const subName = item.SubName ? String(item.SubName).trim() : '';
      if (subId && subId !== 'NULL' && subName && subName !== 'NULL') {
        menuMap.get(mId).submenus.push({ subId, subName });
      }
    });

    menuMap.forEach(menu => {
      const hasSubs = menu.submenus.length > 0;
      const menuWrapper = document.createElement('div');
      menuWrapper.className = "relative menu-parent py-1 shrink-0";
      menuWrapper.innerHTML = `
        <button onclick="window.selectMenu('${menu.menuId}', null, '${menu.menuName}')" class="category-btn hover:text-gold-400 transition flex items-center gap-1.5 whitespace-nowrap pb-0.5 text-slate-300">
          <i data-lucide="${menu.icon}" class="w-4 h-4 text-gold-400"></i>
          <span>${menu.menuName}</span>
          ${hasSubs ? `<i data-lucide="chevron-down" class="w-3 h-3 text-slate-400 transition pointer-events-none"></i>` : ''}
        </button>

        ${hasSubs ? `
          <div class="dropdown-menu absolute left-0 top-full pt-2 z-[99999] min-w-[220px]">
            <div class="bg-noir-900 border border-gold-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.95)] rounded-2xl py-2 divide-y divide-gold-500/10">
              ${menu.submenus.map(sub => `
                <button onclick="window.selectMenu('${menu.menuId}', '${sub.subId}', '${sub.subName}')" class="w-full text-left px-4 py-2.5 text-[11px] font-semibold text-slate-300 hover:text-gold-400 hover:bg-noir-950 transition flex items-center justify-between">
                  <span>${sub.subName}</span>
                  <span class="text-[9px] text-gold-500/70 border border-gold-500/20 px-1.5 py-0.5 rounded font-mono">${sub.subId}</span>
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
      `;
      navContainer.appendChild(menuWrapper);

      if (filterContainer) {
        filterContainer.innerHTML += `
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" value="${menu.menuId}" class="cat-checkbox accent-gold-500 rounded" onchange="window.applyFiltersAndSort()" />
            <span>${menu.menuName}</span>
          </label>`;
      }
      if (mobileFilterContainer) {
        mobileFilterContainer.innerHTML += `
          <label class="flex items-center gap-2.5 p-2 rounded-xl bg-noir-950 border border-gold-500/20 text-slate-300 cursor-pointer">
            <input type="checkbox" value="${menu.menuId}" class="mob-cat-checkbox accent-gold-500 rounded" onchange="window.syncCategoryCheckboxes('${menu.menuId}', this.checked)" />
            <span>${menu.menuName}</span>
          </label>`;
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
