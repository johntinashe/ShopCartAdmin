import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { User } from '../../models/user';
import { AuthService } from '../../services/auth.service';
import { AngularFirestore } from 'angularfire2/firestore';
import { AfterViewInit, OnDestroy } from '@angular/core/src/metadata/lifecycle_hooks';
import { Review } from '../../models/review';
import { Subscription } from 'rxjs/Subscription';
import { Product } from '../../models/product';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit , OnDestroy {

  private numberOfUser: Observable<User[]>;
  public nb?: any;
  private reviewsCollection: Observable<Review[]>;
  public reviews?: any;
  public userName?: Observable<User>;
  public productName?: Observable<Product>;
  public revSub: Subscription;
  private userSub: Subscription;
  private prodSub: Subscription;
  private clickedSub: Subscription;
  public userClicked?: Observable<User>;


  user: User = {
    name: '',
    membership: '',
    address: '',
    phoneNumber: ''
  };
  constructor(private authService: AuthService, private afs: AngularFirestore) {
    this.getNumberOfUsers();
    this.getReviews();
  }

  ngOnInit() {
  }



  getNumberOfUsers() {
    this.numberOfUser = this.afs.collection('users').valueChanges();
    this.numberOfUser.subscribe(UsersArray => {
      this.nb = UsersArray;
    });
  }

  getReviews() {
    this.reviewsCollection = this.afs.collection('reviews', ref => ref.orderBy('time', 'desc').limit(4)).snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Review;
        this.userName = this.afs.collection('users').doc(data.user_id).valueChanges();
        this.userSub = this.userName.subscribe(res => {
          data.user_name = res.name + ' ' + res.surname;
        });
        this.productName = this.afs.collection('products').doc(data.prodId).valueChanges();
        this.prodSub = this.productName.subscribe(res => {
          data.prodName = res.product_name;
        });
        data.id = a.payload.doc.id;
        return data;
      });
    });

    this.revSub = this.reviewsCollection.subscribe(res => {
      this.reviews = res;
    });
  }

  ngOnDestroy(): void {
   // this.revSub.unsubscribe();
   // this.userSub.unsubscribe();
  //  this.prodSub.unsubscribe();
  }

  viewUser(id: string) {
   this.userClicked = this.afs.collection('users').doc(id).valueChanges();
   this.clickedSub = this.userClicked.subscribe(res => {
     this.user.name = res.name + ' ' + res.surname;
     this.user.address = res.address;
     this.user.phoneNumber = res.phoneNumber;
     this.user.membership = res.membership;
   });
  }





}
