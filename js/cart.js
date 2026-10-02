import { db, state, refreshIcons } from './config.js';

const RAZORPAY_TEST_KEY = "rzp_test_TdT5cFWtR6hAXj";

// Active Coupon State
export let activeCoupon = null;

// 1. UPDATE CART BADGE ICON COUNT
export function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  const navBadge = document.getElementById('navCartBadge');
  const count = (state.cart || []).reduce((acc, item) => acc + (item.quantity || 1), 0);

  if (badge) badge.innerText = count;
  if (navBadge) navBadge.innerText = count;
}

// 2. ADD PRODUCT TO CART (Category menu_code ke sath)
export function addToCart(id, selectedSize = '', selectedColor = '') {
  const product = (state.allProducts || []).find(p => p.product_id === id);
  if (!product) return;

  const idx = state.cart.findIndex(i => (i.id === id || i.product_id === id));
  if (idx > -1) {
    state.cart[idx].quantity += 1;
  } else {
    state.cart.push({
      id: product.product_id,
      product_id: product.product_id,
      product_code: product.product_code || 'ZIV',
      menu_code: String(product.menu_code || '').trim(), // Category Reference
      title: product.title,
      price: Number(product.price),
      original_price: product.original_price ? Number(product.original_price) : null,
      thumbnail_url: product.thumbnail_url || product.image_url || 'Cover.png',
      size: selectedSize,
      color: selectedColor,
      quantity: 1
    });
  }

  localStorage.setItem('zivara_cart', JSON.stringify(state.cart));
  updateCartBadge();
  alert(`"${product.title}" added to your shopping bag!`);
}

// 3. CHANGE ITEM QUANTITY (+ / -)
export function changeQuantity(id, delta) {
  const itemIndex = state.cart.findIndex(i => (i.id === id || i.product_id === id));
  if (itemIndex > -1) {
    state.cart[itemIndex].quantity += delta;
    if (state.cart[itemIndex].quantity <= 0) {
      state.cart.splice(itemIndex, 1);
    }
    localStorage.setItem('zivara_cart', JSON.stringify(state.cart));
    updateCartBadge();
  }
}

// 4. REMOVE ITEM FROM CART
export function removeFromCart(id) {
  state.cart = state.cart.filter(i => (i.id !== id && i.product_id !== id));
  localStorage.setItem('zivara_cart', JSON.stringify(state.cart));
  updateCartBadge();
}

// 5. VALIDATE & APPLY CATEGORY-SPECIFIC COUPON
export async function applyCouponCode(codeString) {
  if (!codeString || !codeString.trim()) {
    return { success: false, message: "Kripya coupon code enter karein!" };
  }

  const qCode = codeString.trim().toUpperCase();
  const cartItems = state.cart || [];

  if (cartItems.length === 0) {
    return { success: false, message: "Aapka shopping bag khali hai!" };
  }

  try {
    const { data: coupons, error } = await db
      .from('coupons')
      .select('*')
      .eq('code', qCode)
      .eq('is_active', true)
      .limit(1);

    if (error || !coupons || coupons.length === 0) {
      return { success: false, message: "Invalid ya expired coupon code!" };
    }

    const coupon = coupons[0];

    // Expiry Check
    if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
      return { success: false, message: "Yeh coupon code expire ho chuka hai!" };
    }

    // Usage Limit Check
    if (coupon.usage_limit && coupon.times_used >= coupon.usage_limit) {
      return { success: false, message: "Yeh coupon code limit exceed kar chuka hai!" };
    }

    // Category / Menu Restriction Check
    const targetMenu = String(coupon.applicable_menu || 'all').trim();
    let eligibleItems = cartItems;

    if (targetMenu !== 'all') {
      eligibleItems = cartItems.filter(item => String(item.menu_code || '').trim() === targetMenu);
      if (eligibleItems.length === 0) {
        return { 
          success: false, 
          message: `Yeh coupon sirf specific category products par lagu hota hai! Aapke bag me is category ka product nahi hai.` 
        };
      }
    }

    // Eligible Amount Check (Min Order)
    const eligibleAmount = eligibleItems.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);
    if (coupon.min_order_amount && eligibleAmount < Number(coupon.min_order_amount)) {
      return { 
        success: false, 
        message: `Min. order amount ₹${coupon.min_order_amount} hona chahiye is category ke products par!` 
      };
    }

    activeCoupon = coupon;
    return { success: true, coupon, message: `Coupon [${coupon.code}] successfully apply ho gaya!` };
  } catch (err) {
    return { success: false, message: "Coupon error: " + err.message };
  }
}

// 6. CALCULATE TOTALS WITH CATEGORY DISCOUNT LOGIC
export function getCartSummary(couponObj = activeCoupon) {
  let rawTotal = 0;
  let finalPayable = 0;
  const cartItems = state.cart || [];

  cartItems.forEach(item => {
    const orig = item.original_price || item.price;
    rawTotal += Number(orig) * (item.quantity || 1);
    finalPayable += Number(item.price) * (item.quantity || 1);
  });

  let couponCut = 0;

  if (couponObj) {
    const targetMenu = String(couponObj.applicable_menu || 'all').trim();
    
    // Sirf valid category ke products ka total calculate hoga
    const eligibleTotal = cartItems
      .filter(item => targetMenu === 'all' || String(item.menu_code || '').trim() === targetMenu)
      .reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);

    if (eligibleTotal > 0) {
      if (couponObj.discount_type === 'percentage') {
        couponCut = (eligibleTotal * Number(couponObj.discount_value)) / 100;
      } else {
        couponCut = Number(couponObj.discount_value);
      }

      // Max discount cap check
      if (couponObj.max_discount && couponCut > Number(couponObj.max_discount)) {
        couponCut = Number(couponObj.max_discount);
      }

      // Discount total payable se zyada nahi ho sakta
      couponCut = Math.min(couponCut, finalPayable);
    }
  }

  const discount = (rawTotal - finalPayable) + couponCut;
  finalPayable = Math.max(0, finalPayable - couponCut);

  const deliveryFee = finalPayable >= 1499 || finalPayable === 0 ? 0 : 150;
  const totalAmount = finalPayable + deliveryFee;

  return {
    rawTotal: Math.round(rawTotal),
    discount: Math.round(discount),
    couponDiscount: Math.round(couponCut),
    deliveryFee,
    totalAmount: Math.round(totalAmount)
  };
}

// 7. INITIATE RAZORPAY CHECKOUT & SAVE TO SUPABASE
export function initiateRazorpayPayment(customerDetails, appliedCoupon = activeCoupon, onSuccessCallback) {
  const cartItems = JSON.parse(localStorage.getItem('zivara_cart')) || state.cart || [];
  if (cartItems.length === 0) {
    alert("You Shopping Bag is Empty!");
    return;
  }

  const { totalAmount, couponDiscount } = getCartSummary(appliedCoupon);
  const amountInPaise = Math.round(totalAmount * 100);

  const options = {
    key: RAZORPAY_TEST_KEY,
    amount: amountInPaise,
    currency: "INR",
    name: "Zivara Maison",
    description: "Luxury Order Payment",
    image: "Logo.png",
    handler: async function (response) {
      try {
        const orderPayload = {
          order_id: "ZIV-ORD-" + Date.now(),
          razorpay_payment_id: response.razorpay_payment_id,
          customer_name: customerDetails.name || "Customer",
          customer_email: customerDetails.email || "guest@zivara.com",
          customer_phone: customerDetails.phone || "9999999999",
          shipping_address: customerDetails.address || "India",
          items: cartItems,
          amount: totalAmount,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          coupon_discount: couponDiscount,
          status: "paid"
        };

        // Save order to Supabase
        if (db) {
          const { error } = await db.from('orders').insert([orderPayload]);
          if (error) console.warn("Supabase order sync warning:", error.message);

          // Update coupon usage count
          if (appliedCoupon && appliedCoupon.id) {
            await db.from('coupons').update({
              times_used: (appliedCoupon.times_used || 0) + 1
            }).eq('id', appliedCoupon.id);
          }
        }

        // Clear bag & state
        state.cart = [];
        activeCoupon = null;
        localStorage.removeItem('zivara_cart');
        updateCartBadge();

        if (typeof onSuccessCallback === 'function') {
          onSuccessCallback(response, orderPayload);
        } else {
          alert(`🎉 Payment Successful!\nPayment ID: ${response.razorpay_payment_id}\nOrder ID: ${orderPayload.order_id}`);
          window.location.href = "index.html";
        }
      } catch (err) {
        console.error("Order processing error:", err);
        alert("Payment successful but database sync failed: " + err.message);
      }
    },
    prefill: {
      name: customerDetails.name || "",
      email: customerDetails.email || "",
      contact: customerDetails.phone || ""
    },
    theme: {
      color: "#D4AF37" // Luxury Gold
    },
    modal: {
      ondismiss: function () {
        console.log("Customer closed the checkout window.");
      }
    }
  };

  if (window.Razorpay) {
    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (res) {
      alert("Payment Failed: " + res.error.description);
    });
    rzp.open();
  } else {
    alert("Razorpay checkout SDK load nahi hua hai. Kripya page refresh karein.");
  }
}
