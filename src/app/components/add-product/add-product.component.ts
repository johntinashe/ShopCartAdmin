import { Component, OnInit } from '@angular/core';
import { Product } from '../../models/product';
import { ToastrService } from 'ngx-toastr';
import { AngularFirestore } from 'angularfire2/firestore';
import { Category } from './../../models/category';
import { FirebaseApp } from 'angularfire2';
import 'firebase/storage';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.css']
})
export class AddProductComponent implements OnInit {
  title = 'Add Product';
  uploadTask: any;
  img: any;
  th: any;

  product: Product = {
    product_name: '',
    product_id_sku: '',
    product_description: '',
    product_price: 0,
    product_quantity: 0,
    product_short_desc: '',
    product_status: false,
    product_category_id: '',
    supplier_id: '',
    product_image: '',
    product_thumb_image: ''
  };

  categoriesChange: any;
  categoriesArray: any;

  constructor(private toast: ToastrService , private afs: AngularFirestore,  private firebaseApp: FirebaseApp) {
    this.getCategories();
  }

  ngOnInit() {
  }

  setThumb(thumb) {
    if (thumb.length > 0) {
      this.product.product_thumb_image = 'default';
      this.th = thumb[0];
      console.log(this.product.product_thumb_image);
    }
  }

  setFull(full) {
    if (full.length > 0) {
      this.product.product_image = 'default';
      this.img = full[0];
      console.log(this.product.product_image);
    }
  }


  addProduct(prd) {
    if (prd.prodname !== '' && prd.price !== '' && prd.category !== '' && prd.status !== '' &&
    prd.qty !== '' && prd.shrt_desc !== '' && prd.long_desc !== '' && prd.supplier !== '' && prd.id_sku !== ''
  &&  this.product.product_image !== '' &&  this.product.product_thumb_image !== '' ) {

      if (prd.status === 'False') {
        this.product.product_status = false;
      } else {
        this.product.product_status = true;
      }

      const storageRef = this.firebaseApp.storage().ref();

      const n = prd.prodname;
      this.afs.collection('products').add(this.product).then(res => {
        this.toast.success('Product ' + n + ' has been added ');
        this.uploadTask = storageRef
        .child('products_images/' + res.id)
        .put(this.img).then(r => {
          this.afs.collection('products').doc(res.id).set({product_image: r.downloadURL}, {merge: true});
        });
         storageRef.child('products_thumb_images/' + res.id)
        .put(this.th).then(r2 => {
          this.afs.collection('products').doc(res.id).set({product_thumb_image: r2.downloadURL}, {merge: true});
        });
        this.product.product_name = '';
        this.product.product_price = 0;
        this.product.product_quantity = 0;
        this.product.product_id_sku = '';
        this.product.product_short_desc = '';
        this.product.product_description = '';
      })
      .catch( err => {
        this.toast.error('Sorry something happened');
      });

    } else {
     this.toast.error('Please enter all values !');
    }
  }


  getCategories() {
    this.categoriesChange = this.afs.collection('categories').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Category;
        data.id = a.payload.doc.id;
        return data;
      });
    });

    this.categoriesChange.subscribe(res => {
      this.categoriesArray = res;
    });
  }

}
