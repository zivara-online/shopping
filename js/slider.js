import { db } from './config.js';

let heroBanners = [
  { image_url: 'Cover.png', title: 'Elegance is an Attitude.', subtitle: 'Curated Luxury Edit 2026' },
  { image_url: 'Cover2.png', title: 'Timeless Horology.', subtitle: 'Master Swiss Craftsmanship' },
  { image_url: 'Cover3.png', title: 'Bespoke Haute Couture.', subtitle: 'Tailored for Discerning Tastemakers' },
  { image_url: 'Cover4.png', title: 'Fine Solitaire & Jewelry.', subtitle: 'Handcrafted 18K Gold Statements' }
];

let currentBannerIdx = 0;
let bannerInterval = null;

export async function loadHeroBanners() {
  if (!db) return;
  try {
    const { data, error } = await db
      .from('hero_banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      heroBanners = data;
    }
  } catch (e) {
    console.warn("Using default banners fallback:", e);
  }
  initBannerCarousel();
}

function initBannerCarousel() {
  const track = document.getElementById('bannerSlidesTrack');
  const dotsContainer = document.getElementById('bannerDots');
  if (!track || heroBanners.length === 0) return;

  track.innerHTML = heroBanners.map((b, i) => `
    <div class="banner-slide absolute inset-0 w-full h-full bg-cover bg-center ${i === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}" 
         style="background-image: url('${b.image_url}');"></div>
  `).join('');

  dotsContainer.innerHTML = heroBanners.map((_, i) => `
    <button onclick="window.goToSlide(${i})" class="w-2 h-2 rounded-full transition-all duration-300 ${i === 0 ? 'bg-gold-400 w-6' : 'bg-white/40'}"></button>
  `).join('');

  if (bannerInterval) clearInterval(bannerInterval);
  bannerInterval = setInterval(nextSlide, 4000);
}

export function goToSlide(idx) {
  const slides = document.querySelectorAll('.banner-slide');
  const dots = document.getElementById('bannerDots')?.children;
  if (!slides.length) return;

  slides[currentBannerIdx].classList.remove('opacity-100', 'z-10');
  slides[currentBannerIdx].classList.add('opacity-0', 'z-0');
  if (dots && dots[currentBannerIdx]) {
    dots[currentBannerIdx].className = "w-2 h-2 rounded-full bg-white/40 transition-all duration-300";
  }

  currentBannerIdx = idx;

  slides[currentBannerIdx].classList.remove('opacity-0', 'z-0');
  slides[currentBannerIdx].classList.add('opacity-100', 'z-10');
  if (dots && dots[currentBannerIdx]) {
    dots[currentBannerIdx].className = "w-6 h-2 rounded-full bg-gold-400 transition-all duration-300";
  }

  const activeData = heroBanners[currentBannerIdx];
  if (activeData) {
    const titleEl = document.getElementById('bannerTitle');
    const subEl = document.getElementById('bannerSubtitle');
    if (titleEl && activeData.title) titleEl.innerText = activeData.title;
    if (subEl && activeData.subtitle) subEl.innerText = activeData.subtitle;
  }
}

export function nextSlide() {
  const nextIdx = (currentBannerIdx + 1) % heroBanners.length;
  goToSlide(nextIdx);
}
