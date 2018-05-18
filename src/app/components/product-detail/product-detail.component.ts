import {Component, Input, OnInit} from '@angular/core';
import {AngularFirestore} from 'angularfire2/firestore';
import {ActivatedRoute} from '@angular/router';
import {Product} from '../../models/product';
import {Subscription} from 'rxjs/Subscription';
import {OnDestroy} from '@angular/core/src/metadata/lifecycle_hooks';
import {Review} from '../../models/review';

@Component({
  selector: 'app-product-detail',
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
})
export class ProductDetailComponent implements OnInit , OnDestroy {

  @Input() prodID: string;
  product: Product;
  prodSubcription: Subscription;
  prodChange: any;
  id: any;

  reviewsrSubscription: Subscription;
  reviewsArray: any;
  reviewsChange: any;
  reviewsCollection: any;
  revSub: Subscription;
  reviews: any;
  userName: any;
  userSub: Subscription;

  constructor(private db: AngularFirestore, private router: ActivatedRoute) {
    this.id = this.router.snapshot.params['id'];
    this.getProductInfo(this.id);
    this.getNumberOfReviews(this.id);
   }

  ngOnInit() {
  }

  getProductInfo(id) {
    this.prodChange = this.db.collection('products').doc(id).valueChanges();
    this.prodSubcription = this.prodChange.subscribe(res => {
      this.product = res;
    });
  }

  getNumberOfReviews(id) {
    this.reviewsChange = this.db.collection('reviews', ref => ref.where('prodId', '==', id)).valueChanges();
    this.reviewsrSubscription = this.reviewsChange.subscribe(res => {
      this.reviewsArray = res;
    });
  }

  ngOnDestroy(): void {
   // this.prodSubcription.unsubscribe();
   // this.reviewsrSubscription.unsubscribe();
   // this.userSub.unsubscribe();
   // this.revSub.unsubscribe();
  }


  getReviews() {
    this.reviewsCollection = this.db.collection('reviews', ref => ref.where('prodId', '==', this.id)).snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Review;
        this.userName = this.db.collection('users').doc(data.user_id).valueChanges();
        this.userSub = this.userName.subscribe(res => {
          data.user_name = res.name + ' ' + res.surname;
        });
        data.prodName = this.product.product_name;
        data.id = a.payload.doc.id;
        return data;
      });
    });

    this.revSub = this.reviewsCollection.subscribe(res => {
      this.reviews = res;
    });
  }

}
