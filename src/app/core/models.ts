// Firestore document shapes. Field names match the 2018 data so existing
// products, users and orders keep working.

export type OrderStatus =
  | 'pending_payment'
  | 'payment_failed'
  | 'new'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const FULFILMENT_STATUSES: OrderStatus[] = ['new', 'shipped', 'delivered', 'cancelled'];

/** Firestore Timestamp, epoch millis, or Date. */
export type DateLike = number | Date | { toMillis(): number } | null | undefined;

export interface Product {
  id: string;
  product_name: string;
  product_category_id: string;
  product_id_sku?: string;
  product_price: number;
  product_short_desc?: string;
  product_description?: string;
  product_featured?: boolean;
  product_quantity: number;
  product_status: boolean;
  product_image?: string;
  product_thumb_image?: string;
  product_rating?: number;
  product_review_count?: number;
  product_ingredients?: string;
  product_nutritional_facts?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  catimage?: string;
  number_of_product?: number;
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  product_thumb_image?: string;
  product_price: number;
  number: number;
  total_price: number;
}

export interface Order {
  id: string;
  user_id: string;
  user_name?: string;
  delivery_address?: string;
  items?: OrderItem[];
  amount?: number;
  quantity?: number;
  status: OrderStatus;
  placed_at: number;
  paid_at?: number;
  shipped_at?: number;
  delivered_at?: number;
  cancelled_at?: number;
  payment?: {
    provider?: string;
    method?: string;
    status?: string;
    paynow_reference?: string | null;
  };
}

export interface Customer {
  id: string;
  name?: string;
  surname?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  membership?: string;
  image?: string;
  thumb_image?: string;
  created?: DateLike | string;
}

export interface Review {
  id: string;
  prodId: string;
  prodName?: string;
  user_id: string;
  user_name?: string;
  review: string;
  rating: number;
  time: DateLike;
}

export interface Conversation {
  id: string;
  username?: string;
  userprofile_img?: string;
  lastMsg?: string;
  time?: DateLike;
  unread_admin?: number;
}

export interface ChatMessage {
  id: string;
  message: string;
  from: string;
  time: DateLike;
  seen?: boolean;
  type?: string;
}

export interface Admin {
  name?: string;
  surname?: string;
  role?: string;
  image?: string;
  last_login?: DateLike;
}

export function toMillis(value: DateLike | string): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Date.parse(value) || 0;
  if (value instanceof Date) return value.getTime();
  return value.toMillis();
}

export function fullName(c: { name?: string; surname?: string } | null | undefined): string {
  return [c?.name, c?.surname].filter(Boolean).join(' ') || 'Unnamed customer';
}
