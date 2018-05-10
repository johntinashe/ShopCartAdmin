import { Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import { Observable } from 'rxjs/Observable';
import { Category } from '../models/category';

@Injectable()
export class CategoryService {
  category: Observable<Category>;
  categories: Observable<Category[]>;

  constructor(private afs: AngularFirestore) { }

  getCategoryName(id) {
    this.category = this.afs.collection('categories').doc(id).valueChanges();
    return this.category;
  }

  getProducts(id) {
    this.categories = this.afs.collection('categories').doc(id).collection('products').valueChanges();
    return this.categories;
  }

}
