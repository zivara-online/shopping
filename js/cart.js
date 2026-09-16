import { state } from './config.js';

export function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (badge) {
    badge.innerText = state.cart.reduce((acc, item) => acc + item.quantity, 0);
  }
}

export function addToCart(id) {
  const product = state.allProducts.find(p => p.product_id === id);
  if (!product) return;

  const idx = state.cart.findIndex(i => i.id === id);
  if (idx > -1) {
    state.cart[idx].quantity += 1;
  } else {
    state.cart.push({
      id: product.product_id,
      title: product.title,
      price: Number(product.price),
      originalPrice: product.original_price ? Number(product.original_price) : null,
      image: product.thumbnail_url || product.image_url || 'Cover.png',
      quantity: 1
    });
  }
  localStorage.setItem('zivara_cart', JSON.stringify(state.cart));
  updateCartBadge();
}
