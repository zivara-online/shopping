const SUPABASE_URL = "https://ybybvetysdqpfbvfznoq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieWJ2ZXR5c2RxcGZidmZ6bm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODkyNDAsImV4cCI6MjEwNDg2NTI0MH0.wipbN28UaIRdiqwdoIMnmXeagXB1vKvS7B8quvlgcLo";
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let cachedHierarchy = [];
let cachedProducts = [];
let cachedOrders = [];
let cachedUsers = [];
let imageItemList = [];
let selectedBannerFile = null;

function generateRandomProductId() {
  return "ZIV-" + Math.floor(100000 + Math.random() * 900000);
}

// TAB CONTROLLER
window.switchAdminTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.className = "tab-btn px-4 py-2.5 rounded-xl bg-noir-900 hover:bg-noir-850 text-slate-300 hover:text-white transition flex items-center gap-2 shrink-0 border border-gold-500/15";
  });

  const target = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`tabBtn-${tabId}`);
  if (target) target.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.className = "tab-btn px-4 py-2.5 rounded-xl bg-gold-500 text-noir-950 font-bold transition flex items-center gap-2 shrink-0 shadow";
  }

  if (tabId === 'orders') fetchOrdersData();
  if (tabId === 'users') fetchUsersData();
  if (tabId === 'inventory') fetchAllData();

  if (window.lucide) window.lucide.createIcons();
};

async function checkAdminSession() {
  if (!db) return;
  const { data: { session } } = await db.auth.getSession();
  const loginSection = document.getElementById('adminLoginSection');
  const dashSection = document.getElementById('adminDashboardSection');

  if (session && session.user) {
    document.getElementById('adminSessionEmail').innerText = session.user.email;
    loginSection.classList.add('hidden');
    dashSection.classList.remove('hidden');
    document.getElementById('prodRandomId').value = generateRandomProductId();
    fetchAllData();
    fetchBanners();
    fetchOrdersData();
    fetchUsersData();
  } else {
    loginSection.classList.remove('hidden');
    dashSection.classList.add('hidden');
  }
  if (window.lucide) window.lucide.createIcons();
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;
  const errorEl = document.getElementById('loginErrorMsg');

  if (!db) {
    alert("Database connection client missing.");
    return;
  }

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.innerText = error.message;
    errorEl.classList.remove('hidden');
  } else {
    checkAdminSession();
  }
}

window.handleAdminLogout = async function() {
  if (db) await db.auth.signOut();
  checkAdminSession();
};

function calculateDiscountPreview() {
  const p = parseFloat(document.getElementById('prodPrice').value) || 0;
  const m = parseFloat(document.getElementById('prodOrigPrice').value) || 0;
  const badge = document.getElementById('discountPreviewBadge');
  if (badge) {
    if (m > p && p > 0) {
      const disc = Math.round(((m - p) / m) * 100);
      badge.innerText = `${disc}% OFF`;
    } else {
      badge.innerText = '0% OFF';
    }
  }
}

window.clearSearch = function(inputId, filterFunc) {
  const input = document.getElementById(inputId);
  if (input) {
    input.value = '';
    filterFunc();
  }
};

// ==========================================================
// ORDERS CONTROLLER (WITH 3-DAY RETURN WINDOW & ARCHIVE TABS)
// ==========================================================
let currentOrderSubTab = 'active'; // Default active sub-tab
const RETURN_PERIOD_DAYS = 3; // 3 Days policy

// Sub-Tab Switcher
window.switchOrderSubTab = function(subTabKey) {
  currentOrderSubTab = subTabKey;
  
  document.querySelectorAll('.order-subtab-btn').forEach(btn => {
    btn.className = "order-subtab-btn px-3 py-1.5 rounded-xl bg-noir-950 border border-gold-500/15 text-slate-300 hover:text-white transition flex items-center gap-1.5 shrink-0";
  });

  const activeBtn = document.getElementById(`subTabBtn-${subTabKey}`);
  if (activeBtn) {
    activeBtn.className = "order-subtab-btn px-3 py-1.5 rounded-xl bg-gold-500 text-noir-950 font-bold transition flex items-center gap-1.5 shrink-0 shadow";
  }

  filterOrdersTable();
};

// Check if return window is expired (> 3 days)
function checkReturnStatus(order) {
  const status = (order.status || '').toLowerCase();
  if (status !== 'delivered') {
    return { isDelivered: false, isExpired: false, daysLeft: null, hoursLeft: null };
  }

  // delivered_at agar DB mein nahi hai toh created_at ya fallback use karega
  const deliveredDate = order.delivered_at ? new Date(order.delivered_at) : new Date(order.created_at);
  const now = new Date();
  
  const diffMs = now - deliveredDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  const totalAllowedHours = RETURN_PERIOD_DAYS * 24; // 72 hours

  if (diffHours >= totalAllowedHours) {
    return { isDelivered: true, isExpired: true, daysLeft: 0, hoursLeft: 0 };
  } else {
    const remainingHours = Math.max(0, Math.ceil(totalAllowedHours - diffHours));
    const remainingDays = Math.ceil(remainingHours / 24);
    return { isDelivered: true, isExpired: false, daysLeft: remainingDays, hoursLeft: remainingHours };
  }
}

async function fetchOrdersData() {
  if (!db) return;
  const { data: orders, error } = await db.from('orders').select('*').order('created_at', { ascending: false });
  if (error) return console.warn("Orders error:", error.message);

  cachedOrders = orders || [];
  const totalRev = cachedOrders.reduce((sum, ord) => sum + Number(ord.amount || 0), 0);
  document.getElementById('statTotalSales').innerText = `₹${totalRev.toLocaleString('en-IN')}`;
  document.getElementById('statTotalOrders').innerText = cachedOrders.length;

  // Calculate Sub-tab Badges
  updateOrderBadges();
  filterOrdersTable();
}

function updateOrderBadges() {
  let activeCount = 0;
  let deliveredActiveCount = 0;
  let archivedCount = 0;
  let cancelledCount = 0;

  cachedOrders.forEach(o => {
    const status = (o.status || 'placed').toLowerCase();
    const returnInfo = checkReturnStatus(o);

    if (status === 'cancelled') {
      cancelledCount++;
    } else if (status === 'delivered') {
      if (returnInfo.isExpired) {
        archivedCount++;
      } else {
        deliveredActiveCount++;
      }
    } else {
      activeCount++;
    }
  });

  const bActive = document.getElementById('badge-active');
  const bDelActive = document.getElementById('badge-delivered_active');
  const bArchived = document.getElementById('badge-archived');
  const bCancelled = document.getElementById('badge-cancelled');
  const bAll = document.getElementById('badge-all');

  if (bActive) bActive.innerText = activeCount;
  if (bDelActive) bDelActive.innerText = deliveredActiveCount;
  if (bArchived) bArchived.innerText = archivedCount;
  if (bCancelled) bCancelled.innerText = cancelledCount;
  if (bAll) bAll.innerText = cachedOrders.length;
}

window.filterOrdersTable = function() {
  const q = (document.getElementById('searchOrdersInput')?.value || '').toLowerCase().trim();

  // 1. First Filter by Sub-tab
  let subFiltered = cachedOrders.filter(o => {
    const status = (o.status || 'placed').toLowerCase();
    const returnInfo = checkReturnStatus(o);

    if (currentOrderSubTab === 'active') {
      return status !== 'delivered' && status !== 'cancelled';
    } else if (currentOrderSubTab === 'delivered_active') {
      return status === 'delivered' && !returnInfo.isExpired;
    } else if (currentOrderSubTab === 'archived') {
      return status === 'delivered' && returnInfo.isExpired;
    } else if (currentOrderSubTab === 'cancelled') {
      return status === 'cancelled';
    }
    return true; // 'all'
  });

  // 2. Second Filter by Search Query
  if (q) {
    subFiltered = subFiltered.filter(o => {
      return [o.order_id, o.customer_name, o.customer_phone, o.customer_email, o.shipping_address, o.shiprocket_order_id, o.awb_code]
        .some(field => String(field || '').toLowerCase().includes(q));
    });
  }

  renderOrdersTable(subFiltered);
};

function renderOrdersTable(ordersList) {
  const tbody = document.getElementById('ordersTableBody');
  if (!ordersList.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="p-6 text-center text-slate-500">No orders found in this view.</td></tr>`;
    return;
  }

  tbody.innerHTML = ordersList.map(o => {
    const dateStr = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const itemsList = Array.isArray(o.items) ? o.items : [];
    const status = (o.status || 'placed').toLowerCase();
    const isCod = (o.payment_method === 'COD') || (o.razorpay_payment_id && o.razorpay_payment_id.startsWith('COD'));
    const returnInfo = checkReturnStatus(o);

    return `
      <tr class="hover:bg-noir-950/40 transition">
        <td class="p-3">
          <div class="font-mono font-bold text-gold-400">${o.order_id || 'ZIV-ORD'}</div>
          <div class="text-[10px] text-slate-500">${dateStr}</div>
          <button onclick="viewOrderItems('${o.order_id}')" class="mt-1 text-[10px] text-gold-400 hover:underline flex items-center gap-1 font-semibold">
            <i data-lucide="eye" class="w-3 h-3"></i> ${itemsList.length} Item(s)
          </button>
        </td>
        <td class="p-3">
          <div class="font-semibold text-white">${o.customer_name || 'Guest User'}</div>
          <div class="text-[11px] text-slate-400 font-mono">${o.customer_phone ? '+91 ' + o.customer_phone : 'N/A'}</div>
          <div class="text-[10px] text-slate-500">${o.customer_email || ''}</div>
        </td>
        <td class="p-3 max-w-[180px]">
          <div class="text-slate-300 line-clamp-2 text-[11px]" title="${o.shipping_address || ''}">
            ${o.shipping_address || 'No address provided'}
          </div>
        </td>
        <td class="p-3 font-mono font-bold text-white text-sm">₹${Number(o.amount).toLocaleString('en-IN')}</td>
        <td class="p-3">
          <span class="inline-flex items-center gap-1 px-2 py-0.5 ${isCod ? 'bg-amber-950/80 text-amber-300 border-amber-500/40' : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'} border rounded text-[10px] font-bold font-mono">
            ${isCod ? 'COD' : 'Prepaid'}
          </span>
        </td>
        <td class="p-3 font-mono text-[11px]">
          ${o.shiprocket_order_id ? `
            <div class="space-y-0.5">
              <span class="inline-block px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded font-bold text-[9px]">SR: ${o.shiprocket_order_id}</span>
              <div class="text-[10px] text-slate-400 truncate max-w-[120px]">AWB: ${o.awb_code || 'Pending'}</div>
            </div>
          ` : `
            <button onclick="retryShiprocketOrder('${o.order_id}')" class="text-[10px] text-gold-400 hover:text-gold-300 underline font-bold transition">
              ⚡ Shiprocket
            </button>
          `}
        </td>
        
        <!-- RETURN WINDOW LIFECYCLE BADGE -->
        <td class="p-3">
          ${status === 'delivered' ? (
            returnInfo.isExpired ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-noir-950 border border-gold-500/30 text-gold-400 rounded text-[10px] font-bold font-mono">
                <i data-lucide="archive" class="w-3 h-3"></i> Expired (Archived)
              </span>
            ` : `
              <div class="space-y-0.5">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded text-[10px] font-bold font-mono">
                  <i data-lucide="clock" class="w-3 h-3"></i> ${returnInfo.hoursLeft}h Left
                </span>
                <div class="text-[9px] text-slate-500">Return Window Active</div>
              </div>
            `
          ) : (status === 'cancelled' ? `
            <span class="text-[10px] text-rose-400 font-mono">Cancelled</span>
          ` : `
            <span class="text-[10px] text-slate-500 font-mono">Not Delivered Yet</span>
          `)}
        </td>

        <!-- UPDATE STATUS -->
        <td class="p-3 text-right">
          <select onchange="updateOrderStatus('${o.order_id}', this.value)" class="bg-noir-950 border border-gold-500 text-gold-400 rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer">
            ${['placed', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled'].map(st => `
              <option value="${st}" ${status === st ? 'selected' : ''}>${st.toUpperCase()}</option>
            `).join('')}
          </select>
        </td>
      </tr>`;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

// Order Status Updater (With delivered_at timestamp recording)
window.updateOrderStatus = async function(orderId, newStatus) {
  if (!confirm(`Status '${newStatus.toUpperCase()}' update karein?`)) return fetchOrdersData();
  try {
    const payload = { status: newStatus };
    if (newStatus === 'delivered') {
      payload.delivered_at = new Date().toISOString(); // Timestamp when delivered
    }

    const { error } = await db.from('orders').update(payload).eq('order_id', orderId);
    if (error) throw error;
    alert(`✅ Order ${orderId} ka status updated!`);
    fetchOrdersData();
  } catch (err) {
    alert("❌ Error: " + err.message);
    fetchOrdersData();
  }
};

window.updateOrderStatus = async function(orderId, newStatus) {
  if (!confirm(`Status '${newStatus.toUpperCase()}' update karein?`)) return fetchOrdersData();
  try {
    const { error } = await db.from('orders').update({ status: newStatus }).eq('order_id', orderId);
    if (error) throw error;
    alert(`✅ Order ${orderId} updated!`);
    fetchOrdersData();
  } catch (err) {
    alert("❌ Error: " + err.message);
    fetchOrdersData();
  }
};

window.viewOrderItems = function(orderId) {
  const order = cachedOrders.find(o => o.order_id === orderId);
  if (!order) return;

  document.getElementById('modalOrderTitle').innerText = `Order: ${order.order_id}`;
  document.getElementById('modalOrderSub').innerText = `Customer: ${order.customer_name} | ₹${Number(order.amount).toLocaleString('en-IN')}`;

  const items = Array.isArray(order.items) ? order.items : [];
  document.getElementById('modalOrderItemsList').innerHTML = items.map(it => `
    <div class="flex items-center gap-3.5 pt-3 pb-2">
      <img src="${it.thumbnail_url || it.image || 'Cover.png'}" class="w-14 h-16 object-cover rounded-xl bg-noir-950 border border-gold-500/30 shrink-0" onerror="this.src='Cover.png'" />
      <div class="flex-1 space-y-1">
        <h5 class="font-semibold text-white text-xs">${it.title}</h5>
        <div class="text-[10px] text-slate-400 font-mono">SKU: ${it.product_code || 'ZIV'} ${it.size ? `| Size: ${it.size}` : ''} ${it.color ? `| Color: ${it.color}` : ''}</div>
        <div class="text-xs font-bold text-gold-400">₹${Number(it.price).toLocaleString('en-IN')} <span class="text-slate-400 font-normal">× ${it.quantity || 1}</span></div>
      </div>
    </div>`).join('');

  document.getElementById('orderDetailsModalBackdrop').classList.remove('hidden');
  document.getElementById('orderDetailsModal').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
};

window.closeOrderModal = function() {
  document.getElementById('orderDetailsModalBackdrop').classList.add('hidden');
  document.getElementById('orderDetailsModal').classList.add('hidden');
};

// ================= USERS CONTROLLER =================
async function fetchUsersData() {
  if (!db) return;
  const { data: users, error } = await db.from('users').select('*').order('created_at', { ascending: false });
  if (error) return console.warn("Users error:", error.message);

  cachedUsers = users || [];
  document.getElementById('statTotalUsers').innerText = cachedUsers.length;
  filterUsersTable();
}

window.filterUsersTable = function() {
  const q = (document.getElementById('searchUsersInput')?.value || '').toLowerCase().trim();
  const filtered = cachedUsers.filter(u => {
    if (!q) return true;
    const addresses = Array.isArray(u.addresses) ? u.addresses.map(a => String(a.address || '')).join(' ') : '';
    return [u.name, u.phone, u.email, addresses].some(field => String(field || '').toLowerCase().includes(q));
  });

  renderUsersTable(filtered);
};

function renderUsersTable(usersList) {
  const tbody = document.getElementById('usersTableBody');
  if (!usersList.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500">No matching members found.</td></tr>`;
    return;
  }

  tbody.innerHTML = usersList.map(u => {
    const dateJoined = new Date(u.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const addresses = Array.isArray(u.addresses) ? u.addresses : [];

    return `
      <tr class="hover:bg-noir-950/40 transition">
        <td class="p-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center font-bold text-gold-400 text-xs">
              ${(u.name || 'U').charAt(0).toUpperCase()}
            </div>
            <div class="font-semibold text-white">${u.name || 'VIP Member'}</div>
          </div>
        </td>
        <td class="p-3 font-mono text-slate-300 font-bold">+91 ${u.phone || 'N/A'}</td>
        <td class="p-3 text-slate-400 text-[11px]">${u.email || 'Not Provided'}</td>
        <td class="p-3">
          <div class="text-[11px] text-slate-300">${addresses.length} Saved Location(s)</div>
          <div class="text-[10px] text-slate-500 truncate max-w-[220px]">${addresses[0]?.address || 'No address added'}</div>
        </td>
        <td class="p-3 text-right font-mono text-slate-400 text-[11px]">${dateJoined}</td>
      </tr>`;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

// ================= HERO BANNERS CONTROLLER =================
function handleBannerPreview(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedBannerFile = file;
  const reader = new FileReader();
  reader.onload = (event) => {
    document.getElementById('bannerPreviewImg').src = event.target.result;
    document.getElementById('bannerPreviewContainer').classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

async function fetchBanners() {
  if (!db) return;
  const { data } = await db.from('hero_banners').select('*').order('sort_order', { ascending: true });
  const container = document.getElementById('liveBannersContainer');
  if (!data || data.length === 0) {
    container.innerHTML = `<p class="text-slate-500 text-xs col-span-full">No custom banners set.</p>`;
    return;
  }
  container.innerHTML = data.map(b => `
    <div class="relative rounded-xl overflow-hidden border border-gold-500/20 bg-noir-950 p-2.5 space-y-1.5 shadow">
      <img src="${b.image_url}" class="w-full h-24 object-cover rounded-lg border border-gold-500/10" onerror="this.src='Cover.png'" />
      <span class="text-[10px] font-bold text-gold-400 uppercase tracking-widest block truncate">${b.subtitle || 'Active Slide'}</span>
      <div class="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-gold-500/10">
        <span>Order: #${b.sort_order}</span>
        <button onclick="deleteBanner(${b.id})" class="text-rose-400 hover:text-rose-300 font-semibold">Delete</button>
      </div>
    </div>`).join('');
}

async function handleAddBanner(e) {
  e.preventDefault();
  const btn = document.getElementById('bannerSubmitBtn');
  if (!selectedBannerFile) return alert("Banner image select karein!");

  btn.disabled = true;
  btn.innerText = "Uploading...";

  try {
    const fileExt = selectedBannerFile.name.split('.').pop();
    const filePath = `slide_${Date.now()}.${fileExt}`;
    let targetBucket = 'banners';

    let { error: uploadError } = await db.storage.from(targetBucket).upload(filePath, selectedBannerFile, { cacheControl: '3600', upsert: true });
    if (uploadError) {
      targetBucket = 'product-media';
      const retry = await db.storage.from(targetBucket).upload(filePath, selectedBannerFile, { cacheControl: '3600', upsert: true });
      if (retry.error) throw retry.error;
    }

    const { data: urlData } = db.storage.from(targetBucket).getPublicUrl(filePath);
    await db.from('hero_banners').insert([{
      image_url: urlData.publicUrl,
      title: "",
      subtitle: document.getElementById('bannerSubhead').value.trim(),
      sort_order: parseInt(document.getElementById('bannerSort').value, 10) || 1,
      is_active: true
    }]);

    alert("Cover slide published!");
    e.target.reset();
    selectedBannerFile = null;
    document.getElementById('bannerPreviewContainer').classList.add('hidden');
    fetchBanners();
  } catch (err) {
    alert("Upload failed: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "Upload Slide";
  }
}

window.deleteBanner = async function(id) {
  if (!confirm("Slide delete karein?")) return;
  await db.from('hero_banners').delete().eq('id', id);
  fetchBanners();
};

// ================= MULTI-IMAGE HANDLERS =================
function handleImageSelection(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      imageItemList.push({ file, dataUrl: e.target.result, isExisting: false, url: null });
      renderImagePreviewGrid();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviewGrid() {
  const previewGrid = document.getElementById('imagePreviewGrid');
  if (!imageItemList.length) {
    previewGrid.innerHTML = '';
    previewGrid.classList.add('hidden');
    return;
  }

  previewGrid.classList.remove('hidden');
  previewGrid.innerHTML = imageItemList.map((item, index) => `
    <div class="relative w-20 bg-noir-950 rounded-xl overflow-hidden border ${index === 0 ? 'border-gold-400 ring-2 ring-gold-400/40' : 'border-gold-500/20'} p-1 flex flex-col items-center gap-1 shadow-md">
      <div class="w-full h-16 rounded-lg overflow-hidden bg-black relative">
        <img src="${item.isExisting ? item.url : item.dataUrl}" class="w-full h-full object-cover" />
        <span class="absolute top-1 left-1 bg-noir-950/90 text-gold-400 text-[8px] font-black px-1.5 py-0.5 rounded">#${index + 1}</span>
        ${index === 0 ? `<span class="absolute bottom-1 right-1 bg-gold-500 text-noir-950 text-[7px] font-black px-1 rounded">COVER</span>` : ''}
      </div>
      <div class="flex items-center justify-between w-full px-1 py-0.5">
        <button type="button" onclick="moveImage(${index}, -1)" ${index === 0 ? 'disabled' : ''} class="text-[11px] disabled:opacity-20">◀</button>
        <button type="button" onclick="removeImage(${index})" class="text-[11px] text-rose-400">✕</button>
        <button type="button" onclick="moveImage(${index}, 1)" ${index === imageItemList.length - 1 ? 'disabled' : ''} class="text-[11px] disabled:opacity-20">▶</button>
      </div>
    </div>`).join('');
}

window.moveImage = function(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= imageItemList.length) return;
  const temp = imageItemList[index];
  imageItemList[index] = imageItemList[newIndex];
  imageItemList[newIndex] = temp;
  renderImagePreviewGrid();
};

window.removeImage = function(index) {
  imageItemList.splice(index, 1);
  renderImagePreviewGrid();
};

async function uploadAllImagesInSequence() {
  const finalUrls = [];
  for (const item of imageItemList) {
    if (item.isExisting) {
      finalUrls.push(item.url);
    } else if (item.file) {
      const fileExt = item.file.name.split('.').pop();
      const filePath = `products/${Date.now()}_${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const { error } = await db.storage.from('product-media').upload(filePath, item.file, { cacheControl: '3600', upsert: true });
      if (!error) {
        const { data: { publicUrl } } = db.storage.from('product-media').getPublicUrl(filePath);
        finalUrls.push(publicUrl);
      }
    }
  }
  return finalUrls;
}

// ================= MENUS CONTROLLER =================
async function handleCreateOrUpdateMenu(e) {
  e.preventDefault();
  const editDbId = document.getElementById('editMenuDbId').value;
  const menu_id = document.getElementById('menuCode').value.trim();
  const payload = {
    "MenuID": menu_id,
    "MenuName": document.getElementById('menuName').value.trim(),
    "Menu Serial": parseInt(menu_id, 10) || 1,
    "Active": document.getElementById('menuActive').checked,
    "Icons": document.getElementById('menuIcon').value
  };

  if (editDbId) {
    await db.from('MenuSubmenu').update(payload).eq('id', editDbId);
  } else {
    payload["SubmenuID"] = null;
    payload["SubName"] = null;
    payload["SubMenu Serial"] = 0;
    await db.from('MenuSubmenu').insert([payload]);
  }
  resetMenuForm();
  fetchAllData();
}

window.startEditMenu = function(id) {
  const item = cachedHierarchy.find(m => m.id === id);
  if (!item) return;
  document.getElementById('editMenuDbId').value = item.id;
  document.getElementById('menuCode').value = item.MenuID || '';
  document.getElementById('menuName').value = item.MenuName || '';
  document.getElementById('menuIcon').value = item.Icons || 'shirt';
  document.getElementById('menuActive').checked = item.Active !== false;
  document.getElementById('mainMenuFormHeading').innerHTML = `<i data-lucide="edit" class="w-4 h-4 text-gold-400"></i> Edit Menu`;
  document.getElementById('menuSubmitBtn').innerText = "Update Main Menu";
  document.getElementById('cancelMenuEditBtn').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
};

window.resetMenuForm = function() {
  document.getElementById('mainMenuForm').reset();
  document.getElementById('editMenuDbId').value = "";
  document.getElementById('mainMenuFormHeading').innerHTML = `<i data-lucide="folder-plus" class="w-4 h-4"></i> Add Main Menu Category`;
  document.getElementById('menuSubmitBtn').innerText = "Save Main Menu";
  document.getElementById('cancelMenuEditBtn').classList.add('hidden');
  document.getElementById('menuActive').checked = true;
  if (window.lucide) window.lucide.createIcons();
};

window.deleteMenuRow = async function(id) {
  if (!confirm("Menu remove karein?")) return;
  await db.from('MenuSubmenu').delete().eq('id', id);
  fetchAllData();
};

window.toggleMenuStatus = async function(id, currentStatus) {
  await db.from('MenuSubmenu').update({ "Active": !currentStatus }).eq('id', id);
  fetchAllData();
};

// ================= SUB-MENUS CONTROLLER =================
async function handleCreateOrUpdateSubmenu(e) {
  e.preventDefault();
  const editDbId = document.getElementById('editSubMenuDbId').value;
  const menu_id = document.getElementById('subParentMenu').value;
  const parentName = document.querySelector(`#subParentMenu option[value="${menu_id}"]`)?.dataset.menuname || '';
  const payload = {
    "MenuID": menu_id,
    "SubmenuID": document.getElementById('submenuCode').value.trim().toUpperCase(),
    "MenuName": parentName,
    "SubName": document.getElementById('submenuName').value.trim(),
    "Menu Serial": parseInt(menu_id, 10) || 1,
    "SubMenu Serial": 1,
    "Active": document.getElementById('submenuActive').checked,
    "Icons": document.getElementById('submenuIcon').value
  };

  if (editDbId) {
    await db.from('MenuSubmenu').update(payload).eq('id', editDbId);
  } else {
    await db.from('MenuSubmenu').insert([payload]);
  }
  resetSubMenuForm();
  fetchAllData();
}

window.startEditSubMenu = function(id) {
  const item = cachedHierarchy.find(m => m.id === id);
  if (!item) return;
  document.getElementById('editSubMenuDbId').value = item.id;
  document.getElementById('subParentMenu').value = item.MenuID || '';
  document.getElementById('submenuCode').value = item.SubmenuID || '';
  document.getElementById('submenuName').value = item.SubName || '';
  document.getElementById('submenuIcon').value = item.Icons || 'sparkles';
  document.getElementById('submenuActive').checked = item.Active !== false;
  document.getElementById('subMenuFormHeading').innerHTML = `<i data-lucide="edit" class="w-4 h-4 text-gold-400"></i> Edit Sub-Menu`;
  document.getElementById('subMenuSubmitBtn').innerText = "Update Sub-Menu";
  document.getElementById('cancelSubMenuEditBtn').classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
};

window.resetSubMenuForm = function() {
  document.getElementById('subMenuForm').reset();
  document.getElementById('editSubMenuDbId').value = "";
  document.getElementById('subMenuFormHeading').innerHTML = `<i data-lucide="git-branch" class="w-4 h-4"></i> Add Sub-Menu Item`;
  document.getElementById('subMenuSubmitBtn').innerText = "Save Sub-Menu";
  document.getElementById('cancelSubMenuEditBtn').classList.add('hidden');
  document.getElementById('submenuActive').checked = true;
  autoSuggestSubmenuCode();
  if (window.lucide) window.lucide.createIcons();
};

// ================= INVENTORY & PRODUCTS CONTROLLER =================
window.startEditProduct = function(productId) {
  const product = cachedProducts.find(p => p.product_id === productId || String(p.id) === String(productId));
  if (!product) return alert("Product record nahi mila!");

  switchAdminTab('productForm');
  document.getElementById('isEditingMode').value = "true";
  document.getElementById('productFormHeading').innerHTML = `<i data-lucide="edit-3" class="w-5 h-5 text-gold-400"></i> Edit Product: ${product.product_code}`;
  document.getElementById('prodSubmitBtnText').innerText = "Update & Save Changes";
  document.getElementById('cancelEditBtn')?.classList.remove('hidden');

  document.getElementById('prodRandomId').value = product.product_id;
  document.getElementById('prodCode').value = product.product_code || '';
  document.getElementById('prodBrand').value = product.brand_name || 'Zivara Maison';
  document.getElementById('prodStock').value = product.stock_quantity || 10;
  document.getElementById('prodTitle').value = product.title || '';
  document.getElementById('prodPrice').value = product.price || '';
  document.getElementById('prodOrigPrice').value = product.original_price || '';
  document.getElementById('prodImageUrl').value = product.thumbnail_url || product.image_url || '';
  document.getElementById('prodVideo').value = product.video_url || '';
  document.getElementById('prodSizes').value = (product.available_sizes || []).join(', ');
  document.getElementById('prodColors').value = (product.available_colors || []).join(', ');
  document.getElementById('prodDesc').value = product.description || '';
  document.getElementById('prodActive').checked = product.is_active !== false;
  document.getElementById('prodFeatured').checked = product.is_featured === true;

  document.getElementById('prodMenuSelect').value = product.menu_code || '';
  loadSubmenuDropdownForProduct();
  document.getElementById('prodSubmenuSelect').value = product.submenu_code || '';

  imageItemList = [];
  const primary = product.thumbnail_url || product.image_url;
  if (primary) imageItemList.push({ file: null, dataUrl: null, isExisting: true, url: primary });
  (product.gallery_images || []).forEach(url => {
    if (url) imageItemList.push({ file: null, dataUrl: null, isExisting: true, url });
  });

  renderImagePreviewGrid();
  calculateDiscountPreview();
  if (window.lucide) window.lucide.createIcons();
};

window.resetProductFormToCreate = function() {
  document.getElementById('masterProductForm')?.reset();
  document.getElementById('isEditingMode').value = "false";
  document.getElementById('productFormHeading').innerHTML = `<i data-lucide="package-plus" class="w-5 h-5 text-gold-400"></i> Add Master Product`;
  document.getElementById('prodSubmitBtnText').innerText = "Save & Publish Product";
  document.getElementById('cancelEditBtn')?.classList.add('hidden');
  document.getElementById('prodRandomId').value = generateRandomProductId();
  document.getElementById('prodBrand').value = 'Zivara Maison';
  document.getElementById('prodStock').value = 10;
  document.getElementById('prodActive').checked = true;
  document.getElementById('prodFeatured').checked = false;
  document.getElementById('discountPreviewBadge').innerText = "0% OFF";

  imageItemList = [];
  const previewGrid = document.getElementById('imagePreviewGrid');
  if (previewGrid) {
    previewGrid.innerHTML = '';
    previewGrid.classList.add('hidden');
  }
  if (window.lucide) window.lucide.createIcons();
};

async function handleCreateOrUpdateProduct(e) {
  e.preventDefault();
  const isEditing = document.getElementById('isEditingMode').value === "true";
  const btn = document.getElementById('prodSubmitBtn');
  const submitText = document.getElementById('prodSubmitBtnText');

  if (btn.disabled) return;
  btn.disabled = true;
  submitText.innerText = "Saving...";

  try {
    let finalThumbnail = document.getElementById('prodImageUrl').value.trim() || 'Cover.png';
    let finalGallery = [];

    if (imageItemList.length > 0) {
      const orderedUrls = await uploadAllImagesInSequence();
      if (orderedUrls.length > 0) {
        finalThumbnail = orderedUrls[0];
        finalGallery = orderedUrls.slice(1);
      }
    }

    const product_id = document.getElementById('prodRandomId').value;
    const payload = {
      product_code: document.getElementById('prodCode').value.trim().toUpperCase(),
      brand_name: document.getElementById('prodBrand').value.trim(),
      stock_quantity: parseInt(document.getElementById('prodStock').value, 10),
      title: document.getElementById('prodTitle').value.trim(),
      menu_code: document.getElementById('prodMenuSelect').value,
      submenu_code: document.getElementById('prodSubmenuSelect').value || null,
      price: parseFloat(document.getElementById('prodPrice').value),
      original_price: document.getElementById('prodOrigPrice').value ? parseFloat(document.getElementById('prodOrigPrice').value) : null,
      thumbnail_url: finalThumbnail,
      image_url: finalThumbnail,
      gallery_images: finalGallery,
      video_url: document.getElementById('prodVideo').value.trim() || null,
      available_sizes: document.getElementById('prodSizes').value.split(',').map(s => s.trim()).filter(Boolean),
      available_colors: document.getElementById('prodColors').value.split(',').map(s => s.trim()).filter(Boolean),
      description: document.getElementById('prodDesc').value.trim(),
      is_active: document.getElementById('prodActive').checked,
      is_featured: document.getElementById('prodFeatured').checked
    };

    if (isEditing) {
      await db.from('products').update(payload).eq('product_id', product_id);
      alert(`Product updated!`);
    } else {
      payload.product_id = product_id;
      await db.from('products').insert([payload]);
      alert(`Product published!`);
    }

    resetProductFormToCreate();
    await fetchAllData();
    switchAdminTab('inventory');
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    btn.disabled = false;
    submitText.innerText = isEditing ? "Update & Save Changes" : "Save & Publish Product";
    if (window.lucide) window.lucide.createIcons();
  }
}

window.toggleProductStatus = async function(productId, currentStatus) {
  await db.from('products').update({ is_active: !currentStatus }).eq('product_id', String(productId).trim());
  fetchAllData();
};

window.deleteProduct = async function(productId) {
  if (!confirm(`Product (${productId}) delete karein?`)) return;
  await db.from('products').delete().eq('product_id', String(productId).trim());
  fetchAllData();
};

function loadSubmenuDropdownForProduct() {
  const selectedMenu = document.getElementById('prodMenuSelect').value;
  const filtered = cachedHierarchy.filter(item => String(item.MenuID || '').trim() === selectedMenu && item.SubmenuID);
  document.getElementById('prodSubmenuSelect').innerHTML = `<option value="">-- No Submenu --</option>` + 
    filtered.map(s => `<option value="${String(s.SubmenuID).trim()}">${String(s.SubmenuID).trim()} - ${s.SubName || ''}</option>`).join('');
}

function autoSuggestSubmenuCode() {
  const selectedMenu = document.getElementById('subParentMenu').value;
  const existingSubs = cachedHierarchy.filter(s => String(s.MenuID || '').trim() === selectedMenu && s.SubmenuID);
  const nextLetter = String.fromCharCode(65 + existingSubs.length);
  document.getElementById('submenuCode').value = `${selectedMenu}${nextLetter}`;
}

async function fetchAllData() {
  if (!db) return;
  const { data: hierarchy } = await db.from('MenuSubmenu').select('*').order('Menu Serial', { ascending: true });
  const { data: prods } = await db.from('products').select('*').order('created_at', { ascending: false });

  cachedHierarchy = hierarchy || [];
  cachedProducts = prods || [];

  const parentMenus = [];
  const seen = new Set();
  cachedHierarchy.forEach(m => {
    const id = String(m.MenuID || '').trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      parentMenus.push(m);
    }
  });

  const menuOptions = parentMenus.map(m => `<option value="${String(m.MenuID).trim()}" data-menuname="${m.MenuName}">${String(m.MenuID).trim()} - ${m.MenuName}</option>`).join('');
  document.getElementById('subParentMenu').innerHTML = menuOptions;
  document.getElementById('prodMenuSelect').innerHTML = menuOptions;

  loadSubmenuDropdownForProduct();
  autoSuggestSubmenuCode();
  filterInventoryTable();

  // Render Main Menus
  const parentOnlyRows = cachedHierarchy.filter(m => !m.SubmenuID || m.SubmenuID === 'NULL');
  document.getElementById('mainMenusTableBody').innerHTML = parentOnlyRows.map(m => `
    <tr class="hover:bg-noir-950/40 transition">
      <td class="p-3 font-mono font-bold text-gold-400">${m.MenuID}</td>
      <td class="p-3"><i data-lucide="${m.Icons || 'shirt'}" class="w-4 h-4 text-slate-300"></i></td>
      <td class="p-3 font-semibold text-white">${m.MenuName}</td>
      <td class="p-3">
        <button onclick="toggleMenuStatus(${m.id}, ${m.Active})" class="px-2 py-0.5 rounded-full text-[9px] font-bold ${m.Active ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}">${m.Active ? 'Active' : 'Hidden'}</button>
      </td>
      <td class="p-3 text-right">
        <button onclick="startEditMenu(${m.id})" class="text-gold-400 p-1 mr-2"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
        <button onclick="deleteMenuRow(${m.id})" class="text-rose-400 p-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      </td>
    </tr>`).join('');

  // Render Sub-Menus
  const subOnlyRows = cachedHierarchy.filter(m => m.SubmenuID && m.SubmenuID !== 'NULL' && m.SubName);
  document.getElementById('subMenusTableBody').innerHTML = subOnlyRows.map(s => `
    <tr class="hover:bg-noir-950/40 transition">
      <td class="p-3 text-slate-400 font-mono">${s.MenuName || s.MenuID}</td>
      <td class="p-3 font-mono font-bold text-gold-400">${s.SubmenuID}</td>
      <td class="p-3 font-semibold text-white">${s.SubName}</td>
      <td class="p-3">
        <button onclick="toggleMenuStatus(${s.id}, ${s.Active})" class="px-2 py-0.5 rounded-full text-[9px] font-bold ${s.Active ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}">${s.Active ? 'Active' : 'Hidden'}</button>
      </td>
      <td class="p-3 text-right">
        <button onclick="startEditSubMenu(${s.id})" class="text-gold-400 p-1 mr-2"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
        <button onclick="deleteMenuRow(${s.id})" class="text-rose-400 p-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
      </td>
    </tr>`).join('');

  if (window.lucide) window.lucide.createIcons();
}

window.filterInventoryTable = function() {
  const q = (document.getElementById('searchInventoryInput')?.value || '').toLowerCase().trim();
  const filtered = cachedProducts.filter(p => {
    if (!q) return true;
    return [p.title, p.product_code, p.menu_code, p.submenu_code]
      .some(field => String(field || '').toLowerCase().includes(q));
  });

  renderInventoryTable(filtered);
};

function renderInventoryTable(productsList) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!productsList || productsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-500">No matching products found.</td></tr>`;
  } else {
    tbody.innerHTML = productsList.map(p => {
      const pKey = p.product_id || p.id;
      return `
        <tr class="hover:bg-noir-950/40 transition">
          <td class="p-3"><img src="${p.thumbnail_url || 'Cover.png'}" class="w-12 h-14 object-cover rounded-lg bg-noir-950 border border-gold-500/20" onerror="this.src='Cover.png'" /></td>
          <td class="p-3 font-mono font-bold text-gold-400">${p.product_code || 'ZIV'}</td>
          <td class="p-3">
            <div class="font-semibold text-white">${p.title}</div>
            <div class="text-[10px] text-slate-500">Menu: ${p.menu_code} | Sub: ${p.submenu_code || 'None'}</div>
          </td>
          <td class="p-3 font-bold">₹${Number(p.price).toLocaleString('en-IN')}</td>
          <td class="p-3">${p.stock_quantity} units</td>
          <td class="p-3">
            <button onclick="toggleProductStatus('${pKey}', ${p.is_active})" class="px-2.5 py-1 rounded-full text-[10px] font-bold ${p.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}">${p.is_active ? 'Live' : 'Hidden'}</button>
          </td>
          <td class="p-3 text-right">
            <button onclick="window.startEditProduct('${pKey}')" class="text-gold-400 p-1.5 mr-1"><i data-lucide="edit" class="w-4 h-4"></i></button>
            <button onclick="window.deleteProduct('${pKey}')" class="text-rose-400 p-1.5"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </td>
        </tr>`;
    }).join('');
  }
  if (window.lucide) window.lucide.createIcons();
}

window.addEventListener('DOMContentLoaded', checkAdminSession);
