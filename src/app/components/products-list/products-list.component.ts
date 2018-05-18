import {Component, OnInit} from '@angular/core';
import {AngularFirestore} from 'angularfire2/firestore';
import {Subscription} from 'rxjs/Subscription';
import {Product} from '../../models/product';
import {OnDestroy} from '@angular/core/src/metadata/lifecycle_hooks';
import {Router} from '@angular/router';
import {IdserviceService} from '../../services/idservice.service';
import swal from 'sweetalert2';
import {ToastrService} from 'ngx-toastr';
import {NotificationService} from './../../services/notification.service';

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.css']
})
export class ProductsListComponent implements OnInit , OnDestroy {

  prodSubscription: Subscription;
  productsArray: any;
  prodChange: any;
  newquantity: any;

  constructor(private db: AngularFirestore, private router: Router , private idservice: IdserviceService,
  private toast: ToastrService, private sendNoti: NotificationService) {
    this.getAllProducts();
  }

  ngOnInit() {
  }

  getAllProducts() {
    this.prodChange = this.db.collection('products').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Product;
        data.product_id = a.payload.doc.id;
        return data;
      });
    });

    this.prodSubscription = this.prodChange.subscribe(res => {
      this.productsArray = res;
    });

  }

  ngOnDestroy(): void {
    // this.prodSubscription.unsubscribe();
  }

  goToInfo(id) {
    this.router.navigateByUrl('/products/product-detail/' + id);
  }

  deleteProduct(id: string) {
    swal({
      title: 'Are you sure?',
      text: 'You won\'t be able to revert this!',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      confirmButtonClass: 'btn btn-success',
      cancelButtonClass: 'btn btn-danger',
      buttonsStyling: false,
      reverseButtons: true
    }).then((result) => {

      if (result.value) {
        this.db.collection('products').doc(id).delete()
          .then(res => {
            swal(
              'Deleted!',
              'Product has has been deleted.',
              'success'
            );
          })
          .catch(err => {
            swal({
              type: 'error',
              title: 'Oops...',
              text: 'Something went wrong! ' + err,
            });
          });
      } else {
        swal(
          'Cancelled',
          'All good... :)',
          'error'
        );
      }
    });
  }


  inputField(id) {
    console.log('input field clicked' , id);
    const i = document.getElementById(id);
    const inputNumber = (<HTMLInputElement>document.getElementById('quantity' + id));
    i.style.visibility = 'hidden';
    inputNumber.style.display = 'block';
    inputNumber.value = '' + parseInt(i.textContent , 10);
  }


  updateQuantity(id , old: number) {
    const i = document.getElementById(id);
    const inputNumber = (<HTMLInputElement>document.getElementById('quantity' + id));
    this.newquantity  = parseInt(inputNumber.value , 10);
    console.log('old', old);
    if (old === 0  && this.newquantity > 0 ) {
      if (this.newquantity != null && this.newquantity > -1 ) {

        this.db.collection('products').doc(id).set({product_quantity: this.newquantity}, {merge: true})
            .then(res => {
              this.toast.success('Quanty has been updated ');
              inputNumber.style.display = 'none';
              i.style.visibility = 'visible';
              this.sendNoti.sendNotification(id);
              this.newquantity = null;
            });
      }
    } else  if (this.newquantity > -1 ) {
      this.db.collection('products').doc(id).set({product_quantity: this.newquantity}, {merge: true})
      .then(res => {
        this.toast.success('Quantity has been updated ');
        inputNumber.style.display = 'none';
        i.style.visibility = 'visible';
        this.newquantity = null;
      });
    }
  }


}
