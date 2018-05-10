import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OnDestroy } from '@angular/core/src/metadata/lifecycle_hooks';
import { Subscription } from 'rxjs/Subscription';
import { AngularFirestore } from 'angularfire2/firestore';
import { Order } from '../../models/order';
import { Payment } from '../../models/payment';
import { User } from '../../models/user';
import { IdserviceService } from './../../services/idservice.service';
import { OrderItem } from './../../models/orderItem';
import { Product } from '../../models/product';

@Component({
  selector: 'app-order-summary',
  templateUrl: './order-summary.component.html',
  styleUrls: ['./order-summary.component.css']
})
export class OrderSummaryComponent implements OnInit , OnDestroy {

  id = '';
  sub: Subscription;

  orderChange: any;
  order?: any;

  user?: User;
  payment?: Payment;
  prdSub: any;
  productsList?: any;

  constructor(private idservice: IdserviceService , private db: AngularFirestore) {
    this.sub = this.idservice.currentMessage.subscribe(res => {
      this.id = res;
      if (this.id !== '') {
        this.getOrderSummary();
        this.getOrderProducts();
      }
    });
  }

  ngOnInit() {
  }

  getOrderSummary() {
    this.orderChange = this.db.collection('orders').doc(this.id).snapshotChanges().map(a => {

        const data = a.payload.data() as Order;
        data.id = a.payload.id;

      this.db.collection('users').doc(data.user_id).collection('payments').doc(this.id).snapshotChanges().subscribe(pay => {
       const payment = pay.payload.data() as Payment;
       this.payment = payment;
     });

     this.db.collection('users').doc(data.user_id).snapshotChanges().subscribe(us => {
       const user = us.payload.data() as User;
       this.user = user;
     });
        return data;
    });


    this.orderChange.subscribe(res => {
      this.order = res;
    });
  }


  getOrderProducts() {

   this.prdSub = this.db.collection('orders').doc(this.id).collection(this.id).snapshotChanges().map(res => {
      return res.map(prds => {
        const pds = prds.payload.doc.data() as OrderItem;
        pds.pId = prds.payload.doc.id;

        this.db.collection('products').doc(pds.id).snapshotChanges().subscribe(a => {
          console.log('product' , a);
          const p = a.payload.data() as Product;
          pds.product_price = p.product_price;
          pds.product_name = p.product_name;
        });

        return pds;
      });
    });

    this.prdSub.subscribe(res => {
      this.productsList = res;
    });

  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

}
