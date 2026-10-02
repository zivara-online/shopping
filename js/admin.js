const SUPABASE_URL = "https://ybybvetysdqpfbvfznoq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieWJ2ZXR5c2RxcGZidmZ6bm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODkyNDAsImV4cCI6MjEwNDg2NTI0MH0.wipbN28UaIRdiqwdoIMnmXeagXB1vKvS7B8quvlgcLo";
const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ==========================================================
// ONESIGNAL PUSH NOTIFICATION TRIGGER ENGINE
// ==========================================================
const ONESIGNAL_APP_ID = "724a8d07-873c-418e-b7e3-b7059c922db2";
const ONESIGNAL_REST_KEY = "724a8d07-873c-418e-b7e3-b7059c922db2"; // OneSignal -> Keys & IDs se copy ki hui REST API key yahan paste karein

async function sendBroadcastNotification(title, message, imageUrl = "", targetUrl = "https://www.zivarafashion.online") {
  try {
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      included_segments: ["Total Subscriptions"],
      headings: { en: title },
      contents: { en: message },
      url: targetUrl,
      chrome_web_icon: "https://www.zivarafashion.online/Logo.png"
    };

    if (imageUrl) {
      payload.chrome_web_image = imageUrl;
      payload.big_picture = imageUrl;
    }

    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_KEY}`
      },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log("Push Notification Result:", result);
  } catch (err) {
    console.error("OneSignal push error:", err);
  }
}

let cachedHierarchy = [];
let cachedProducts = [];
let cachedOrders = [];
let cachedUsers = [];
let cachedCoupons = [];
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
  if (tabId === 'coupons') fetchCouponsData();
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
    fetchCouponsData();
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
// NUMBER TO WORDS CONVERTER (INR FORMAT)
// ==========================================================
function priceToWordsINR(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
    } else {
      str += a[n];
    }
    return str.trim();
  }

  num = Math.floor(Number(num) || 0);
  if (num === 0) return 'Zero Rupees';

  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let hundred = Math.floor(num / 100);
  let rem = num % 100;

  let res = '';
  if (crore > 0) res += inWords(crore) + ' Crore ';
  if (lakh > 0) res += inWords(lakh) + ' Lakh ';
  if (thousand > 0) res += inWords(thousand) + ' Thousand ';
  if (hundred > 0) res += inWords(hundred) + ' Hundred ';
  if (rem > 0) res += inWords(rem) + ' ';

  return (res + 'Rupees Only').replace(/\s+/g, ' ').trim();
}

// ==========================================================
// ADMIN TAX INVOICE GENERATOR (QUOTATION STYLE A4)
// ==========================================================
window.printAdminTaxInvoice = function(orderId) {
  const order = cachedOrders.find(o => o.order_id === orderId);
  if (!order) return alert("Order details nahi mili!");

  const items = Array.isArray(order.items) ? order.items : [];
  const grandTotal = Number(order.amount || 0);
  const taxableAmount = Math.round((grandTotal / 1.18) * 100) / 100;
  const totalTax = Math.round((grandTotal - taxableAmount) * 100) / 100;

  const orderDate = new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const deliveryDate = order.delivered_at 
    ? new Date(order.delivered_at).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : (order.status === 'delivered' ? orderDate : 'Pending Delivery');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return alert("Popups allow karein invoice print karne ke liye.");

  const itemsRowsHtml = items.map(it => {
    const itemTotal = Number(it.price || 0) * Number(it.quantity || 1);
    const itemBase = Math.round((itemTotal / 1.18) * 100) / 100;
    const itemTax = Math.round((itemTotal - itemBase) * 100) / 100;
    const sizeInfo = it.size ? ' | Size: ' + it.size : '';
    const colorInfo = it.color ? ' | Color: ' + it.color : '';

    return '<tr>' +
      '<td>' +
        '<b>' + (it.title || 'Product') + '</b>' +
        '<div style="font-size: 9px; color: #64748b; font-family: monospace;">SKU: ' + (it.product_code || 'ZIV') + sizeInfo + colorInfo + '</div>' +
      '</td>' +
      '<td class="center">' + (it.quantity || 1) + ' EACH</td>' +
      '<td class="right">' + itemBase.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</td>' +
      '<td class="right">' + itemTax.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</td>' +
      '<td class="right"><b>₹' + itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) + '</b></td>' +
    '</tr>';
  }).join('');

  const totalQuantity = items.reduce((s, i) => s + Number(i.quantity || 1), 0);

  const invoiceHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Tax Invoice - ${order.order_id}</title>
      <style>
        * { box-sizing: border-box; font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; }
        body { background: #fff; padding: 30px; font-size: 11px; line-height: 1.4; }
        .invoice-box { max-width: 800px; margin: auto; }
        .doc-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin-bottom: 8px; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .header-table td { vertical-align: top; }
        .brand-logo { height: 55px; object-fit: contain; }
        .company-name { font-size: 20px; font-weight: 800; color: #D4AF37; margin-bottom: 2px; }
        .company-details { font-size: 10px; color: #334155; line-height: 1.35; }
        .highlight-bar { background: #D4AF37; height: 3px; width: 100%; margin: 8px 0 10px 0; }
        
        .meta-strip { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; display: flex; justify-content: space-between; padding: 7px 12px; font-size: 10.5px; margin-bottom: 14px; font-weight: 700; }
        .meta-strip span { font-weight: 400; color: #475569; }

        .bill-to-section { margin-bottom: 16px; font-size: 11px; }
        .bill-to-title { font-weight: 800; text-transform: uppercase; font-size: 10px; color: #64748b; margin-bottom: 3px; letter-spacing: 0.5px; }
        .customer-name { font-size: 13px; font-weight: 800; color: #0f172a; }

        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .items-table th { background: #fff; border-bottom: 2px solid #0f172a; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: 800; }
        .items-table td { padding: 9px 6px; border-bottom: 1px solid #e2e8f0; font-size: 10.5px; vertical-align: middle; }
        .items-table th.right, .items-table td.right { text-align: right; }
        .items-table th.center, .items-table td.center { text-align: center; }

        .subtotal-row td { font-weight: 800; border-top: 2px solid #D4AF37; border-bottom: 2px solid #D4AF37; padding: 9px 6px; }

        .bottom-section { display: flex; justify-content: space-between; margin-top: 10px; gap: 20px; }
        .left-col { flex: 1.2; font-size: 10px; }
        .right-col { flex: 1; text-align: right; font-size: 10.5px; }
        
        .calc-table { width: 100%; border-collapse: collapse; }
        .calc-table td { padding: 4px 0; }
        .calc-table .total-row { border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; font-size: 12px; font-weight: 800; padding: 6px 0; }

        .words-block { margin-top: 8px; font-size: 10.5px; font-weight: 800; }
        .sign-box { margin-top: 35px; text-align: right; }
        .sign-box .sign-title { font-weight: 800; font-size: 9.5px; text-transform: uppercase; color: #0f172a; }

        @media print {
          body { padding: 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="doc-title">TAX INVOICE (ADMIN ARCHIVE COPY)</div>

        <!-- HEADER -->
        <table class="header-table">
          <tr>
            <td style="width: 14%;">
              <img src="Logo.png" class="brand-logo" onerror="this.style.display='none'" />
            </td>
            <td style="width: 86%;">
              <div class="company-name">ZIVARA FASHION</div>
              <div class="company-details">
                 Ground Floor, 447 E , Khata no. 11 Plot No. 757, Dhori Basti Sottardih, Ram Ratan-, Bokaro, Jharkhand- 825102 <br>
                <b>Mobile:</b> +91 8757875033 &nbsp;|&nbsp; <b>GSTIN:</b> 20EXRPK4999G1ZV &nbsp;|&nbsp; <b>PAN:</b> 0EXRPK4999G<br>
                <b>Email:</b> info@zivarafashion.online &nbsp;|&nbsp; <b>Website:</b> https://www.zivarafashion.online
              </div>
            </td>
          </tr>
        </table>

        <div class="highlight-bar"></div>

        <!-- META INFORMATION -->
        <div class="meta-strip">
          <div>INVOICE NO: <span>INV/${order.order_id.replace('ZIV-ORD-', '')}</span></div>
          <div>ORDER DATE: <span>${orderDate}</span></div>
          <div>DELIVERED DATE: <span>${deliveryDate}</span></div>
        </div>

        <!-- BILL TO -->
        <div class="bill-to-section">
          <div class="bill-to-title">BILL TO</div>
          <div class="customer-name">${order.customer_name || 'Valued Member'}</div>
          <div><b>Mobile:</b> +91 ${order.customer_phone || 'N/A'}</div>
          <div><b>Address:</b> ${order.shipping_address || 'No shipping address provided'}</div>
          <div><b>Payment Mode:</b> ${order.payment_method === 'COD' ? 'Cash on Delivery (COD)' : 'Prepaid (Razorpay / Online Verified)'}</div>
          <div><b>Status:</b> ${String(order.status || 'placed').toUpperCase()}</div>
        </div>

        <!-- ITEMS TABLE -->
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50%;">ITEMS & DESCRIPTION</th>
              <th class="center" style="width: 10%;">QTY.</th>
              <th class="right" style="width: 15%;">RATE (₹)</th>
              <th class="right" style="width: 10%;">TAX (18%)</th>
              <th class="right" style="width: 15%;">AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
            <tr class="subtotal-row">
              <td>SUBTOTAL</td>
              <td class="center">${totalQuantity}</td>
              <td class="right">₹${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td class="right">₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              <td class="right">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <!-- BOTTOM SECTION -->
        <div class="bottom-section">
          <div class="left-col">
            <div style="font-weight: 800; font-size: 10px; margin-bottom: 3px;">TERMS AND CONDITIONS</div>
            <ol style="padding-left: 14px; color: #475569; font-size: 9.5px; line-height: 1.4;">
              <li>Eligible luxury items can be requested for return/exchange within 3 days of delivery.</li>
              <li>Original packaging, security tags, and certificate must remain intact.</li>
              <li>This is an authentic computer-generated tax invoice verified by Zivara Fashion.</li>
            </ol>
          </div>

          <div class="right-col">
            <table class="calc-table">
              <tr>
                <td style="color: #475569;">Taxable Amount:</td>
                <td><b>₹${taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></td>
              </tr>
              <tr>
                <td style="color: #475569;">IGST / GST @18%:</td>
                <td><b>₹${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b></td>
              </tr>
              <tr class="total-row">
                <td>Total Amount:</td>
                <td style="color: #D4AF37;">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </table>

            <div class="words-block">
              <span style="font-weight: 400; color: #64748b; font-size: 9.5px; display: block;">Total Amount (in words)</span>
              ${priceToWordsINR(grandTotal)}
            </div>

            <div class="sign-box">
              <div class="sign-title">AUTHORISED SIGNATORY FOR</div>
              <div style="font-weight: 800; font-size: 11px; color: #D4AF37;">Zivara Fashion </div>
            </div>
          </div>
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(invoiceHtml);
  printWindow.document.close();
};

// ==========================================================
// ORDERS CONTROLLER (WITH RETURN WINDOW & INVOICE CONTROLS)
// ==========================================================
let currentOrderSubTab = 'active';
const RETURN_PERIOD_DAYS = 3;

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

function checkReturnStatus(order) {
  const status = (order.status || '').toLowerCase();
  if (status !== 'delivered') {
    return { isDelivered: false, isExpired: false, daysLeft: null, hoursLeft: null };
  }

  const deliveredDate = order.delivered_at ? new Date(order.delivered_at) : new Date(order.created_at);
  const now = new Date();
  
  const diffMs = now - deliveredDate;
  const diffHours = diffMs / (1000 * 60 * 60);
  const totalAllowedHours = RETURN_PERIOD_DAYS * 24;

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
    return true;
  });

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
          <button onclick="viewOrderItems('${o.order_id}')" class="mt-1 text-[10px] text-gold-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer">
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
        
        <!-- SHIPROCKET & TRACKING -->
        <td class="p-3 font-mono text-[11px]">
          ${o.shiprocket_order_id ? `
            <div class="space-y-1">
              <div class="flex items-center gap-1.5">
                <span class="inline-block px-1.5 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-500/30 rounded font-bold text-[9px]">
                  SR ID: ${o.shiprocket_order_id}
                </span>
                ${o.shiprocket_shipment_id ? `<span class="text-[9px] text-slate-400 font-sans">#${o.shiprocket_shipment_id}</span>` : ''}
              </div>
              <div class="text-[10px] text-slate-300">
                AWB: <span class="text-white font-semibold">${o.awb_code || 'Assigned'}</span>
              </div>
              <button onclick="retryShiprocketOrder('${o.order_id}')" class="px-2 py-1 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded text-[9px] font-bold flex items-center gap-1 transition cursor-pointer mt-1">
                ⚡ Re-Push
              </button>
            </div>
          ` : `
            <div class="space-y-1">
              <span class="inline-block px-2 py-0.5 bg-amber-950/80 text-amber-400 border border-amber-500/30 rounded text-[10px] font-semibold">
                Pending Dispatch
              </span>
              <button onclick="retryShiprocketOrder('${o.order_id}')" class="block text-[10px] text-gold-400 hover:text-gold-300 underline font-bold transition cursor-pointer">
                ⚡ Push to Shiprocket
              </button>
            </div>
          `}
        </td>
        
        <!-- RETURN WINDOW -->
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

        <!-- UPDATE STATUS & DIRECT TAX INVOICE BUTTON -->
        <td class="p-3 text-right space-y-1.5">
          <select onchange="updateOrderStatus('${o.order_id}', this.value)" class="bg-noir-950 border border-gold-500 text-gold-400 rounded-lg px-2.5 py-1 text-[11px] font-bold cursor-pointer">
            ${['placed', 'paid', 'processing', 'dispatched', 'delivered', 'cancelled'].map(st => `
              <option value="${st}" ${status === st ? 'selected' : ''}>${st.toUpperCase()}</option>
            `).join('')}
          </select>
          <div>
            <button onclick="printAdminTaxInvoice('${o.order_id}')" class="px-2.5 py-1 rounded-lg bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[10px] font-bold transition inline-flex items-center gap-1 cursor-pointer">
              <i data-lucide="printer" class="w-3 h-3"></i>
              <span>Tax Invoice</span>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

window.retryShiprocketOrder = async function(orderId) {
  const order = cachedOrders.find(o => o.order_id === orderId);
  if (!order) return;
  if (!confirm(`Kya aap Order [${orderId}] ko Shiprocket par dispatch ke liye bhejna chahte hain?`)) return;

  try {
    const isCod = (order.payment_method === 'COD') || (order.razorpay_payment_id && order.razorpay_payment_id.startsWith('COD'));
    const res = await fetch(`${SUPABASE_URL}/functions/v1/super-function`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY, "Authorization": `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ ...order, payment_method: isCod ? "COD" : "Prepaid" })
    });
    const data = await res.json();
    if (data.order_id) {
      await db.from('orders').update({
        shiprocket_order_id: String(data.order_id),
        shiprocket_shipment_id: String(data.shipment_id || ''),
        awb_code: String(data.awb_code || '')
      }).eq('order_id', orderId);

      alert(`✅ Success! Shiprocket Order ID: ${data.order_id} generate ho gaya!`);
      fetchOrdersData();
    } else {
      alert("❌ Shiprocket Response: " + (data.message || JSON.stringify(data)));
    }
  } catch (err) {
    alert("Function request error: " + err.message);
  }
};

window.updateOrderStatus = async function(orderId, newStatus) {
  if (!confirm(`Status '${newStatus.toUpperCase()}' update karein?`)) return fetchOrdersData();
  try {
    const payload = { status: newStatus };
    if (newStatus === 'delivered') {
      payload.delivered_at = new Date().toISOString();
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

window.viewOrderItems = function(orderId) {
  const order = cachedOrders.find(o => o.order_id === orderId);
  if (!order) return;

  document.getElementById('modalOrderTitle').innerText = `Order: ${order.order_id}`;
  document.getElementById('modalOrderSub').innerText = `Customer: ${order.customer_name} | Total: ₹${Number(order.amount).toLocaleString('en-IN')}`;
  
  const printBtn = document.getElementById('modalPrintInvoiceBtn');
  if (printBtn) {
    printBtn.setAttribute('onclick', `printAdminTaxInvoice('${order.order_id}')`);
  }

  const items = Array.isArray(order.items) ? order.items : [];
  document.getElementById('modalOrderItemsList').innerHTML = items.map(it => `
    <div class="flex items-center gap-3.5 pt-3 pb-2">
      <img src="${it.thumbnail_url || it.image || 'Cover.png'}" class="w-14 h-16 object-cover rounded-xl bg-noir-950 border border-gold-500/30 shrink-0 shadow-md" onerror="this.src='Cover.png'" />
      <div class="flex-1 space-y-1">
        <h5 class="font-semibold text-white text-xs">${it.title}</h5>
        <div class="text-[10px] text-slate-400 font-mono">
          SKU: <b class="text-slate-200">${it.product_code || 'ZIV'}</b> 
          ${it.size ? `| Size: ${it.size}` : ''} 
          ${it.color ? `| Color: ${it.color}` : ''}
        </div>
        <div class="text-xs font-bold text-white pt-0.5">
          <span class="text-gold-400">₹${Number(it.price).toLocaleString('en-IN')}</span> 
          <span class="text-slate-400 font-normal">× ${it.quantity || 1} units</span>
        </div>
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

// ==========================================================
// COUPONS & DISCOUNTS CONTROLLER
// ==========================================================
function toggleDiscountTypeLabel() {
  const type = document.getElementById('couponType').value;
  const label = document.getElementById('couponValueLabel');
  if (label) {
    label.innerText = type === 'percentage' ? 'Discount Percentage (% OFF)' : 'Flat Discount Amount (₹ OFF)';
  }
}

async function fetchCouponsData() {
  if (!db) return;
  try {
    const { data: coupons, error } = await db.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn("Coupons fetch error:", error.message);
      return;
    }

    cachedCoupons = coupons || [];
    const activeCoupons = cachedCoupons.filter(c => c.is_active !== false);
    const badgeEl = document.getElementById('statTotalCoupons');
    if (badgeEl) badgeEl.innerText = activeCoupons.length;

    renderCouponsTable(cachedCoupons);
  } catch (err) {
    console.warn("Coupons error:", err);
  }
}

function renderCouponsTable(list) {
  const tbody = document.getElementById('couponsTableBody');
  if (!list || list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-slate-500">No promo coupons published yet. Create one above!</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => {
    const expiryStr = c.expiry_date ? new Date(c.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never';
    const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date();
    const discountDisplay = c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : `₹${c.discount_value} FLAT`;

    return `
      <tr class="hover:bg-noir-950/40 transition">
        <td class="p-3">
          <div class="font-mono font-bold text-gold-400 text-sm tracking-wider uppercase">${c.code}</div>
          <div class="text-[10px] text-slate-500">Created: ${new Date(c.created_at).toLocaleDateString('en-IN')}</div>
        </td>
        <td class="p-3">
          <span class="inline-block px-2 py-0.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 rounded-md font-bold text-xs font-mono">
            ${discountDisplay}
          </span>
        </td>
        <td class="p-3 text-[11px] text-slate-300">
          <div>Min Order: <b class="text-white">₹${c.min_order_amount || 0}</b></div>
          ${c.max_discount ? `<div class="text-slate-400 text-[10px]">Max Cap: ₹${c.max_discount}</div>` : ''}
        </td>
        <td class="p-3 font-mono text-[11px]">
          <span class="text-white font-bold">${c.times_used || 0}</span> / ${c.usage_limit || '∞'} used
        </td>
        <td class="p-3 text-[11px] font-mono ${isExpired ? 'text-rose-400 font-bold' : 'text-slate-300'}">
          ${expiryStr} ${isExpired ? '(Expired)' : ''}
        </td>
        <td class="p-3">
          <button onclick="toggleCouponStatus(${c.id}, ${c.is_active})" class="px-2.5 py-1 rounded-full text-[10px] font-bold ${c.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}">
            ${c.is_active ? 'Active' : 'Disabled'}
          </button>
        </td>
        <td class="p-3 text-right">
          <button onclick="startEditCoupon(${c.id})" class="text-gold-400 p-1.5 mr-1 hover:text-gold-300 cursor-pointer" title="Edit Coupon">
            <i data-lucide="edit" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteCoupon(${c.id})" class="text-rose-400 p-1.5 hover:text-rose-300 cursor-pointer" title="Delete Coupon">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

async function handleCreateOrUpdateCoupon(e) {
  e.preventDefault();
  const editId = document.getElementById('editCouponId').value;
  const btn = document.getElementById('couponSubmitBtn');
  const btnText = document.getElementById('couponSubmitBtnText');

  const payload = {
    code: document.getElementById('couponCode').value.trim().toUpperCase(),
    discount_type: document.getElementById('couponType').value,
    discount_value: parseFloat(document.getElementById('couponValue').value),
    min_order_amount: parseFloat(document.getElementById('couponMinOrder').value) || 0,
    max_discount: document.getElementById('couponMaxDiscount').value ? parseFloat(document.getElementById('couponMaxDiscount').value) : null,
    expiry_date: document.getElementById('couponExpiry').value || null,
    usage_limit: parseInt(document.getElementById('couponUsageLimit').value, 10) || 100,
    is_active: document.getElementById('couponActive').checked
  };

  btn.disabled = true;
  btnText.innerText = "Saving Coupon...";

  try {
    if (editId) {
      const { error } = await db.from('coupons').update(payload).eq('id', editId);
      if (error) throw error;
      alert(`✅ Coupon [${payload.code}] updated!`);
    } else {
      const { error } = await db.from('coupons').insert([payload]);
      if (error) throw error;
      alert(`✅ Coupon [${payload.code}] published successfully!`);

      // BROADCAST NOTIFICATION FOR NEW COUPON
      const discText = payload.discount_type === 'percentage' ? `${payload.discount_value}% OFF` : `Flat ₹${payload.discount_value} OFF`;
      sendBroadcastNotification(
        `🎁 Exclusive Offer: Use Code ${payload.code}!`,
        `Unlock ${discText} on your next order! Limited period offer. Tap to shop now.`,
        ""
      );
    }

    resetCouponForm();
    fetchCouponsData();
  } catch (err) {
    alert("❌ Error: " + err.message);
  } finally {
    btn.disabled = false;
    btnText.innerText = editId ? "Update Coupon Code" : "Publish Coupon Code";
    if (window.lucide) window.lucide.createIcons();
  }
}

window.startEditCoupon = function(id) {
  const item = cachedCoupons.find(c => c.id === id);
  if (!item) return;

  document.getElementById('editCouponId').value = item.id;
  document.getElementById('couponCode').value = item.code || '';
  document.getElementById('couponType').value = item.discount_type || 'percentage';
  document.getElementById('couponValue').value = item.discount_value || '';
  document.getElementById('couponMinOrder').value = item.min_order_amount || 0;
  document.getElementById('couponMaxDiscount').value = item.max_discount || '';
  document.getElementById('couponExpiry').value = item.expiry_date || '';
  document.getElementById('couponUsageLimit').value = item.usage_limit || 100;
  document.getElementById('couponActive').checked = item.is_active !== false;

  toggleDiscountTypeLabel();

  document.getElementById('couponFormHeading').innerHTML = `<i data-lucide="edit" class="w-4 h-4 text-gold-400"></i> Edit Coupon: ${item.code}`;
  document.getElementById('couponSubmitBtnText').innerText = "Update Coupon Code";
  document.getElementById('cancelCouponEditBtn').classList.remove('hidden');

  if (window.lucide) window.lucide.createIcons();
};

window.resetCouponForm = function() {
  document.getElementById('couponMasterForm').reset();
  document.getElementById('editCouponId').value = "";
  document.getElementById('couponActive').checked = true;
  document.getElementById('couponFormHeading').innerHTML = `<i data-lucide="tag" class="w-4 h-4"></i> Create Promotional Coupon Code`;
  document.getElementById('couponSubmitBtnText').innerText = "Publish Coupon Code";
  document.getElementById('cancelCouponEditBtn').classList.add('hidden');
  toggleDiscountTypeLabel();
  if (window.lucide) window.lucide.createIcons();
};

window.toggleCouponStatus = async function(id, currentStatus) {
  await db.from('coupons').update({ is_active: !currentStatus }).eq('id', id);
  fetchCouponsData();
};

window.deleteCoupon = async function(id) {
  if (!confirm("Kya aap sach me ye coupon delete karna chahte hain?")) return;
  await db.from('coupons').delete().eq('id', id);
  fetchCouponsData();
};

// ==========================================================
// USERS CONTROLLER
// ==========================================================
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
            <div>
              <div class="font-semibold text-white">${u.name || 'VIP Member'}</div>
              <span class="text-[9px] font-mono text-gold-400 uppercase bg-gold-500/10 px-1.5 py-0.2 rounded border border-gold-500/20">Privé Member</span>
            </div>
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

// ==========================================================
// HERO BANNERS CONTROLLER
// ==========================================================
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
        <button onclick="deleteBanner(${b.id})" class="text-rose-400 hover:text-rose-300 font-semibold cursor-pointer">Delete</button>
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

// ==========================================================
// MULTI-IMAGE HANDLERS
// ==========================================================
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

// ==========================================================
// MENUS CONTROLLER
// ==========================================================
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

// ==========================================================
// SUB-MENUS CONTROLLER
// ==========================================================
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

// ==========================================================
// INVENTORY & PRODUCTS CONTROLLER
// ==========================================================
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

      // BROADCAST NOTIFICATION FOR NEW PRODUCT
      sendBroadcastNotification(
        "✨ New Arrival at Zivara!",
        `${payload.title} is now live starting at ₹${payload.price.toLocaleString('en-IN')}. Tap to explore now!`,
        payload.thumbnail_url
      );
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
        <button onclick="startEditMenu(${m.id})" class="text-gold-400 p-1 mr-2 cursor-pointer"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
        <button onclick="deleteMenuRow(${m.id})" class="text-rose-400 p-1 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
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
        <button onclick="startEditSubMenu(${s.id})" class="text-gold-400 p-1 mr-2 cursor-pointer"><i data-lucide="edit" class="w-3.5 h-3.5"></i></button>
        <button onclick="deleteMenuRow(${s.id})" class="text-rose-400 p-1 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
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
            <button onclick="window.startEditProduct('${pKey}')" class="text-gold-400 p-1.5 mr-1 cursor-pointer"><i data-lucide="edit" class="w-4 h-4"></i></button>
            <button onclick="window.deleteProduct('${pKey}')" class="text-rose-400 p-1.5 cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
          </td>
        </tr>`;
    }).join('');
  }
  if (window.lucide) window.lucide.createIcons();
}

window.addEventListener('DOMContentLoaded', checkAdminSession);
