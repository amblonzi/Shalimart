import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

export interface Product {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  category: string;
  description?: string;
  images: string;
  stock: number;
  badge?: string;
  product_images?: { id: number; url: string; sort_order: number }[];
  average_rating?: number;
  review_count?: number;
}

export interface Review {
  id: number;
  rating: number;
  comment?: string;
  created_at: string;
  user_name?: string;
}

interface User {
  id: number;
  email: string;
  full_name: string;
  phone_number?: string;
  is_admin: boolean;
}

interface CartItem extends Product {
  quantity: number;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price_at_purchase: number;
  product?: Product;
}

export interface Order {
  id: number;
  total_amount: number;
  status: string;
  delivery_address?: string;
  delivery_phone?: string;
  created_at: string;
  items: OrderItem[];
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface StoreState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Cart (persisted to localStorage)
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  updateCartQty: (productId: number, delta: number) => void;
  clearCart: () => void;

  // Wishlist (synced with backend when logged in)
  wishlist: number[];
  setWishlist: (ids: number[]) => void;
  toggleWishlist: (productId: number) => void;

  // Toasts
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      setUser: (user) => set({ user }),

      // Cart
      cart: [],
      addToCart: (product) => {
        const state = get();
        const existing = state.cart.find(item => item.id === product.id);

        if (existing) {
          if (existing.quantity >= product.stock) {
            state.addToast(`Only ${product.stock} available in stock`, 'error');
            return;
          }
          set({
            cart: state.cart.map(item =>
              item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
            )
          });
        } else {
          if (product.stock <= 0) {
            state.addToast('This product is out of stock', 'error');
            return;
          }
          set({ cart: [...state.cart, { ...product, quantity: 1 }] });
        }
        state.addToast(`${product.name} added to cart`, 'success');
      },

      removeFromCart: (productId) => set((state) => ({
        cart: state.cart.filter(item => item.id !== productId)
      })),

      updateCartQty: (productId, delta) => set((state) => ({
        cart: state.cart.map(item =>
          item.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        ).filter(item => item.quantity > 0)
      })),

      clearCart: () => set({ cart: [] }),

      // Wishlist
      wishlist: [],
      setWishlist: (ids) => set({ wishlist: ids }),
      toggleWishlist: (productId) => {
        const state = get();
        const exists = state.wishlist.includes(productId);

        if (exists) {
          set({ wishlist: state.wishlist.filter(id => id !== productId) });
          if (state.user) {
            api.delete(`/wishlist/${productId}`).catch(() => {});
          }
        } else {
          set({ wishlist: [...state.wishlist, productId] });
          if (state.user) {
            api.post('/wishlist', { product_id: productId }).catch(() => {});
          }
        }
      },

      // Toasts
      toasts: [],
      addToast: (message, type = 'info') => {
        const id = Math.random().toString(36).substring(7);
        set((state) => ({
          toasts: [...state.toasts, { id, message, type }]
        }));
        setTimeout(() => {
          set((state) => ({
            toasts: state.toasts.filter(t => t.id !== id)
          }));
        }, 3000);
      },
      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      })),
    }),
    {
      name: 'shalimart-store',
      partialize: (state) => ({
        cart: state.cart,
        wishlist: state.wishlist,
      }),
    }
  )
);
