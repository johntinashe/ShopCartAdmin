import {Component, OnDestroy, OnInit} from '@angular/core';
import {AngularFirestore} from 'angularfire2/firestore';
import {Subscription} from 'rxjs/Subscription';
import {ActivatedRoute, Router} from '@angular/router';
import {Favorite} from '../../models/favorite';
import {IdserviceService} from '../../services/idservice.service';
import {User} from '../../models/user';
import {ToastrService} from 'ngx-toastr';
import swal from 'sweetalert2';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.css']
})
export class UserProfileComponent implements OnInit , OnDestroy {

  userChange: any;
  userSubcription: Subscription;
  user: any;
  id: any;

  favChange: any;
  favSub: Subscription;
  favoritesArray: any;
  favCollection: any;
  arrSubscription: Subscription;

  us: User = {
    name: '',
    surname: '',
    membership: '',
    address: '',
    phoneNumber: 's'
  };

  constructor(private db: AngularFirestore , private router: ActivatedRoute ,
    private route: Router,
    private idservice: IdserviceService,
    private toast: ToastrService) {
    this.id = router.snapshot.params['id'];
    this.getUserInfo(this.id);
    this.getFavorites();
   }

  ngOnInit() {
  }

  getUserInfo(id) {
   this.userChange = this.db.collection('users').doc(id).valueChanges();
   this.userSubcription = this.userChange.subscribe(res => {
     this.user = res;
     if (res == null) {
       swal('Error!', 'Sorry no user found!', 'error')
         .catch((err) => {
         });
     }
   });
  }

  getFavorites() {
    this.favCollection = this.db.collection('users').doc(this.id).collection('favorites').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Favorite;
        this.favChange = this.db.collection('products').doc(data.product_id).valueChanges();
         this.favSub = this.favChange.subscribe(res => {
          data.product_name = res.product_name;
          data.product_price = res.product_price;
           data.product_image = res.product_thumb_image;
        });
        data.product_id = a.payload.doc.id;
        return data;
      });
    });

    this.arrSubscription = this.favCollection.subscribe(res => {
      this.favoritesArray = res;
    });

  }

  ngOnDestroy(): void {
   // this.arrSubscription.unsubscribe();
  //  this.favSub.unsubscribe();
  //  this.userSubcription.unsubscribe();
  }

  goToInfo(id) {
    this.idservice.passId(id);
    this.route.navigateByUrl('/products/product-detail/' + id);
  }

  getSettingsInfo() {
    this.us.name = this.user.name;
    this.us.address = this.user.address;
    this.us.surname = this.user.surname;
    this.us.phoneNumber = this.user.phoneNumber;
    this.us.membership = this.user.membership;
  }
  updateInfo() {
    if (this.us.name === '' || this.us.surname === '' || this.us.phoneNumber === '' || this.us.address === ''
     || this.us.membership === '' ) {
       this.toast.warning('All fields are required');
    } else {
      this.db.collection('users').doc(this.id)
         .set(this.us, {merge: true})
         .then(res => {
           this.toast.success('User info has been updated');
         })
         .catch(err => {
           this.toast.error('Sorry something happened ', err);
         });
    }
  }
}
