import {Component, OnInit} from '@angular/core';
import {AuthService} from '../../services/auth.service';
import {OnDestroy} from '@angular/core/src/metadata/lifecycle_hooks';
import {AngularFirestore} from 'angularfire2/firestore';
import {Notification} from './../../models/notification';
import {Subscription} from 'rxjs/Subscription';
import {IdserviceService} from './../../services/idservice.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit , OnDestroy {

  hide = true;
  noti: any;
  prod: any;
  productSubcription: Subscription;
  notificationSubcritption: Subscription;
  notisArray: Array<Notification>;

  constructor(private auth: AuthService, private db: AngularFirestore, private idservice: IdserviceService,
              private router: Router) {
    this.getNotifications();
  }

  ngOnInit() {
    this.idservice.currentMessage.subscribe(res => {
      if (res === 'page_not_found') {
        this.hide = false;
      }
    });
  }

  logout(): void {
    this.auth.logout();
  }

  getNotifications() {
    this.noti = this.db.collection('notifications').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Notification;
        data.product_id = a.payload.doc.id;
        this.prod = this.db.collection('products').doc(data.product_id).valueChanges();
        this.productSubcription = this.prod.subscribe(res => {
          data.product_name = res.product_name;
          data.product_thumb = res.product_thumb_image;
        });
          return data;
      });
    });

    this.notificationSubcritption = this.noti.subscribe(res => {
      this.notisArray = res;
    });
  }

  ngOnDestroy(): void {
  //  this.notificationSubcritption.unsubscribe();
  //  this.productSubcription.unsubscribe();
  }

  viewItem(id) {
    this.router.navigateByUrl('/products/product-detail');
  }





}
