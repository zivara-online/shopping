const SUPABASE_URL = "https://ybybvetysdqpfbvfznoq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieWJ2ZXR5c2RxcGZidmZ6bm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyODkyNDAsImV4cCI6MjEwNDg2NTI0MH0.wipbN28UaIRdiqwdoIMnmXeagXB1vKvS7B8quvlgcLo";

export const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const state = {
  allProducts: [],
  menuSubmenuList: [],
  activeMenuId: null,
  activeSubmenuId: null,
  cart: JSON.parse(localStorage.getItem('zivara_cart')) || []
};

export function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}
