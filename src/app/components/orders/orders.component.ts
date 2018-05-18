import {Component, OnInit} from '@angular/core';
import {AngularFirestore} from 'angularfire2/firestore';
import {Order} from '../../models/order';
import {Payment} from '../../models/payment';
import {User} from '../../models/user';
import {Router} from '@angular/router';
import {IdserviceService} from '../../services/idservice.service';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit {

  ordersCollection: any;
  ordersChange: any;
  newOrders: any;
  shippedOrders: any;
  deliveredOrders: any;

  constructor(private db: AngularFirestore , private router: Router , private idservice: IdserviceService) {
    this.getOrders();
    this.getNewNumber();
    this.getDeliveredNumber();
    this.getShippedNumber();
  }

  ngOnInit() {
  }


  getOrders() {
    this.ordersChange = this.db.collection('orders').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Order;
        data.id = a.payload.doc.id;

        data.quantity = 0;
        data.amount = 0;
        this.db.collection('orders').doc(data.id).collection(data.id).snapshotChanges().subscribe(res => {
          return res.map(prds => {
            const pds = prds.payload.doc.data();
            data.quantity = data.quantity + pds.data.number;
          });
        });

     this.db.collection('users').doc(data.user_id).collection('payments').doc(data.id).snapshotChanges().subscribe(pay => {
       const payment = pay.payload.data() as Payment;
       data.amount = payment.price;
       data.brand = payment.charge.brand;
     });

     this.db.collection('users').doc(data.user_id).snapshotChanges().subscribe(us => {
       const user = us.payload.data() as User;
       data.user_name =  user.surname;
     });
        return data;
      });
    });


    this.ordersChange.subscribe(res => {
      this.ordersCollection = res;
    });
  }

  viewSummary(id) {
    this.idservice.passId(id);
    this.router.navigateByUrl('orders/order-summary/' + id);
  }

  getNewNumber() {
    this.db.collection('orders', ref => ref.where('status', '==', 'new')).valueChanges()
      .subscribe(res => {
        this.newOrders = res;
      });
  }

  getShippedNumber() {
    this.db.collection('orders', ref => ref.where('status', '==', 'shipped')).valueChanges()
      .subscribe(res => {
        this.shippedOrders = res;
      });
  }

  getDeliveredNumber() {
    this.db.collection('orders', ref => ref.where('status', '==', 'delivered')).valueChanges()
      .subscribe(res => {
        this.deliveredOrders = res;
      });
  }

  getOrdersByStatus(currentStatus) {
    this.ordersChange = this.db.collection('orders', ref => ref.where('status', '==', currentStatus)).snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Order;
        data.id = a.payload.doc.id;

        data.quantity = 0;
        data.amount = 0;
        this.db.collection('orders').doc(data.id).collection(data.id).snapshotChanges().subscribe(res => {
          return res.map(prds => {
            const pds = prds.payload.doc.data();
            data.quantity = data.quantity + pds.data.number;
          });
        });

        this.db.collection('users').doc(data.user_id).collection('payments').doc(data.id).snapshotChanges().subscribe(pay => {
          const payment = pay.payload.data() as Payment;
          data.amount = payment.price;
          data.brand = payment.charge.brand;
        });

        this.db.collection('users').doc(data.user_id).snapshotChanges().subscribe(us => {
          const user = us.payload.data() as User;
          data.user_name = user.surname;
        });
        return data;
      });
    });


    this.ordersChange.subscribe(res => {
      this.ordersCollection = res;
    });
  }

}
