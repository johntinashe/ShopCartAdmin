import {Component, OnInit} from '@angular/core';
import {AngularFirestore} from 'angularfire2/firestore';
import {Category} from '../../models/category';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/combineLatest';
import swal from 'sweetalert2';
import {IdserviceService} from '../../services/idservice.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.css']
})
export class CategoriesComponent implements OnInit {
  title = 'Categories';
  categoriesCollection: Observable<Category[]>;
  categories: any;
  searchterm: string;

  constructor(private afs: AngularFirestore , private idservice: IdserviceService , private route: Router) {
  }

  ngOnInit() {
    this.getCategories();
  }

  getCategories(): void {

    this.categoriesCollection = this.afs.collection('categories').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Category;
        data.id = a.payload.doc.id;

        this.afs.collection('products', ref => ref.where('product_category_id', '==', data.id))
          .valueChanges().subscribe(prods => {
          data.number_of_product = prods.length;
        });
        return data;
      });
    });

    this.categoriesCollection.subscribe(categoriesArray => {
      this.categories = categoriesArray;
    });
  }

  deleteCategory(id: string) {
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
        this.afs.collection('categories').doc(id).delete()
          .then(res => {
            swal(
              'Deleted!',
              'Category has has been deleted.',
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

  editCategory(id) {
    this.route.navigate(['/categories/manage-category/' + id]);
  }


}
