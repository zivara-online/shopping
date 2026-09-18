import { db, state, refreshIcons } from './config.js';

const RAZORPAY_TEST_KEY = "rzp_test_TdT5cFWtR6hAXj";

// 1. UPDATE CART BADGE ICON COUNT
export function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  const navBadge = document.getElementById('navCartBadge');
  const count = (state.cart || []).reduce((acc, item) => acc + (item.quantity || 1), 0);

  if (badge) badge.innerText = count;
  if (navBadge) navBadge.innerText = count;
}

// 2. ADD PRODUCT TO CART
export function addToCart(id, selectedSize = '', selectedColor = '') {
  const product = state.allProducts.find(p => p.product_id === id);
  if (!product) return;

  const idx = state.cart.findIndex(i => (i.id === id || i.product_id === id));
  if (idx > -1) {
    state.cart[idx].quantity += 1;
  } else {
    state.cart.push({
      id: product.product_id,
      product_id: product.product_id,
      product_code: product.product_code || 'ZIV',
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

// 5. CALCULATE TOTALS (SUBTOTAL, DISCOUNT, DELIVERY)
export function getCartSummary(couponDiscountRate = 0) {
  let rawTotal = 0;
  let finalPayable = 0;

  (state.cart || []).forEach(item => {
    const orig = item.original_price || item.originalPrice || item.price;
    rawTotal += Number(orig) * item.quantity;
    finalPayable += Number(item.price) * item.quantity;
  });

  let discount = rawTotal - finalPayable;
  if (couponDiscountRate > 0) {
    const couponCut = finalPayable * couponDiscountRate;
    discount += couponCut;
    finalPayable -= couponCut;
  }

  const deliveryFee = finalPayable >= 1499 || finalPayable === 0 ? 0 : 150;
  const totalAmount = finalPayable + deliveryFee;

  return {
    rawTotal: Math.round(rawTotal),
    discount: Math.round(discount),
    deliveryFee,
    totalAmount: Math.round(totalAmount)
  };
}

// 6. INITIATE RAZORPAY CHECKOUT & SAVE TO SUPABASE
export function initiateRazorpayPayment(customerDetails, couponDiscountRate = 0, onSuccessCallback) {
  const cartItems = JSON.parse(localStorage.getItem('zivara_cart')) || state.cart || [];
  if (cartItems.length === 0) {
    alert("Aapka shopping bag khali hai!");
    return;
  }

  const { totalAmount } = getCartSummary(couponDiscountRate);
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
          status: "paid"
        };

        // Save order to Supabase
        if (db) {
          const { error } = await db.from('orders').insert([orderPayload]);
          if (error) console.warn("Supabase order sync warning:", error.message);
        }

        // Clear bag
        state.cart = [];
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
