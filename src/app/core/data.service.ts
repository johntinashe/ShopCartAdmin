import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  QueryConstraint,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  getAggregateFromServer,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  sum,
  updateDoc,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { Storage, deleteObject, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { Observable, map } from 'rxjs';
import {
  Category,
  ChatMessage,
  Conversation,
  Customer,
  Order,
  OrderItem,
  OrderStatus,
  Product,
  Review,
  toMillis,
} from './models';

/**
 * All Firestore/Storage access for the dashboard. Every call runs inside an
 * injection context so AngularFire's zoneless wrappers behave correctly when
 * invoked from click handlers.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private fs = inject(Firestore);
  private storage = inject(Storage);
  private injector = inject(EnvironmentInjector);

  private run<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  private list$<T>(path: string, ...constraints: QueryConstraint[]): Observable<T[]> {
    return this.run(
      () => collectionData(query(collection(this.fs, path), ...constraints), { idField: 'id' }) as Observable<T[]>,
    );
  }

  private one$<T>(path: string, id: string): Observable<T | undefined> {
    return this.run(() => docData(doc(this.fs, path, id), { idField: 'id' }) as Observable<T | undefined>);
  }

  // --- Products -----------------------------------------------------------
  products$(): Observable<Product[]> {
    return this.list$<Product>('products', orderBy('product_name'));
  }

  product$(id: string): Observable<Product | undefined> {
    return this.one$<Product>('products', id);
  }

  newProductId(): string {
    return this.run(() => doc(collection(this.fs, 'products')).id);
  }

  saveProduct(product: Product): Promise<void> {
    const { id, ...data } = product;
    return this.run(() => setDoc(doc(this.fs, 'products', id), { ...data, id }, { merge: true }));
  }

  setProductStatus(id: string, active: boolean): Promise<void> {
    return this.run(() => updateDoc(doc(this.fs, 'products', id), { product_status: active }));
  }

  deleteProduct(id: string): Promise<void> {
    return this.run(() => deleteDoc(doc(this.fs, 'products', id)));
  }

  lowStock$(threshold = 5): Observable<Product[]> {
    return this.list$<Product>(
      'products',
      where('product_quantity', '<=', threshold),
      orderBy('product_quantity'),
      limit(8),
    );
  }

  // --- Categories ---------------------------------------------------------
  categories$(): Observable<Category[]> {
    return this.list$<Category>('categories', orderBy('name'));
  }

  saveCategory(category: Partial<Category> & { name: string }): Promise<void> {
    return this.run(async () => {
      const id = category.id || doc(collection(this.fs, 'categories')).id;
      const { id: _ignored, ...data } = category;
      await setDoc(doc(this.fs, 'categories', id), { ...data, id }, { merge: true });
    });
  }

  deleteCategory(id: string): Promise<void> {
    return this.run(() => deleteDoc(doc(this.fs, 'categories', id)));
  }

  async countProductsInCategory(categoryId: string): Promise<number> {
    return this.run(async () => {
      const snap = await getCountFromServer(
        query(collection(this.fs, 'products'), where('product_category_id', '==', categoryId)),
      );
      return snap.data().count;
    });
  }

  // --- Orders -------------------------------------------------------------
  orders$(status?: OrderStatus): Observable<Order[]> {
    return status
      ? this.list$<Order>('orders', where('status', '==', status), orderBy('placed_at', 'desc'), limit(200))
      : this.list$<Order>('orders', orderBy('placed_at', 'desc'), limit(200));
  }

  recentOrders$(count = 6): Observable<Order[]> {
    return this.list$<Order>('orders', orderBy('placed_at', 'desc'), limit(count));
  }

  customerOrders$(uid: string): Observable<Order[]> {
    return this.list$<Order>('orders', where('user_id', '==', uid), orderBy('placed_at', 'desc'));
  }

  order$(id: string): Observable<Order | undefined> {
    return this.one$<Order>('orders', id);
  }

  /** Orders from the 2018 app stored their items in orders/{id}/{id}. */
  async legacyOrderItems(orderId: string): Promise<OrderItem[]> {
    return this.run(async () => {
      const snap = await getDocs(collection(this.fs, 'orders', orderId, orderId));
      return snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const number = Number(data['number'] ?? 1);
        const total = Number(data['total_price'] ?? 0);
        return {
          product_id: d.id,
          product_name: String(data['product_name'] ?? d.id),
          product_price: number ? total / number : total,
          number,
          total_price: total,
        };
      });
    });
  }

  updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
    const stamp: Record<string, number> = { updated_at: Date.now() };
    if (status === 'shipped') stamp['shipped_at'] = Date.now();
    if (status === 'delivered') stamp['delivered_at'] = Date.now();
    if (status === 'cancelled') stamp['cancelled_at'] = Date.now();
    return this.run(() => updateDoc(doc(this.fs, 'orders', id), { status, ...stamp }));
  }

  // --- Stats --------------------------------------------------------------
  async count(path: string, ...constraints: QueryConstraint[]): Promise<number> {
    return this.run(async () => {
      const snap = await getCountFromServer(query(collection(this.fs, path), ...constraints));
      return snap.data().count;
    });
  }

  async revenue(): Promise<number> {
    return this.run(async () => {
      const snap = await getAggregateFromServer(
        query(collection(this.fs, 'orders'), where('status', 'in', ['new', 'shipped', 'delivered'])),
        { total: sum('amount') },
      );
      return snap.data().total ?? 0;
    });
  }

  // --- Customers ----------------------------------------------------------
  customers$(): Observable<Customer[]> {
    return this.list$<Customer>('users');
  }

  customer$(id: string): Observable<Customer | undefined> {
    return this.one$<Customer>('users', id);
  }

  // --- Reviews ------------------------------------------------------------
  latestReviews$(count = 5): Observable<Review[]> {
    return this.list$<Review>('reviews', orderBy('time', 'desc'), limit(count));
  }

  // --- Messages -----------------------------------------------------------
  conversations$(): Observable<Conversation[]> {
    // No orderBy: 2018 conversation docs have no `time` field and would be
    // filtered out by a server-side sort.
    return this.list$<Conversation>('messages').pipe(
      map((list) => [...list].sort((a, b) => toMillis(b.time) - toMillis(a.time))),
    );
  }

  conversation$(uid: string): Observable<Conversation | undefined> {
    return this.one$<Conversation>('messages', uid);
  }

  chat$(uid: string): Observable<ChatMessage[]> {
    return this.list$<ChatMessage>(`messages/${uid}/userQueries`, orderBy('time', 'asc'), limit(300));
  }

  sendMessage(uid: string, adminUid: string, text: string): Promise<void> {
    return this.run(async () => {
      const now = Date.now();
      await addDoc(collection(this.fs, 'messages', uid, 'userQueries'), {
        message: text,
        from: adminUid,
        time: now,
        seen: false,
        type: 'text',
      });
      await setDoc(
        doc(this.fs, 'messages', uid),
        { lastMsg: text, time: now, last_from: 'admin', unread_admin: 0 },
        { merge: true },
      );
    });
  }

  markCustomerMessagesSeen(uid: string): Promise<void> {
    return this.run(async () => {
      const unseen = await getDocs(
        query(collection(this.fs, 'messages', uid, 'userQueries'), where('from', '==', uid), where('seen', '==', false)),
      );
      const batch = writeBatch(this.fs);
      unseen.docs.forEach((d) => batch.update(d.ref, { seen: true }));
      batch.set(doc(this.fs, 'messages', uid), { unread_admin: 0 }, { merge: true });
      await batch.commit();
    });
  }

  // --- Storage ------------------------------------------------------------
  async uploadImage(folder: string, file: File): Promise<string> {
    return this.run(async () => {
      const safeName = file.name.replace(/[^\w.-]+/g, '_');
      const fileRef = ref(this.storage, `${folder}/${Date.now()}-${safeName}`);
      await uploadBytes(fileRef, file, { contentType: file.type });
      return getDownloadURL(fileRef);
    });
  }

  async deleteImageByUrl(url: string): Promise<void> {
    if (!url.includes('firebasestorage')) return;
    await this.run(() => deleteObject(ref(this.storage, url))).catch(() => undefined);
  }

  serverTime() {
    return serverTimestamp();
  }
}
