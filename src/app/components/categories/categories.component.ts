import {Component, OnInit} from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';
import { Category } from '../../models/category';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import 'rxjs/add/observable/combineLatest';
import swal from 'sweetalert2';
import { IdserviceService } from '../../services/idservice.service';
import { Route, Router } from '@angular/router';

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
  startAt = new Subject();
  endAt = new Subject();
  startobs = this.startAt.asObservable();
  endobs = this.endAt.asObservable();
  catImage: any;

  constructor(private afs: AngularFirestore , private idservice: IdserviceService , private route: Router) {
  }

  ngOnInit() {
    this.getCategories();
    Observable.combineLatest(this.startobs, this.endobs).subscribe((value) => {
      this.firequery(value[0], value[1]).subscribe((categoriesArray) => {
        this.categories = categoriesArray;
      });
    });
  }

  getCategories(): void {

    this.categoriesCollection = this.afs.collection('categories').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Category;
        data.id = a.payload.doc.id;
        return data;
      });
    });

    this.categoriesCollection.subscribe(categoriesArray => {
      this.categories = categoriesArray;
    });
  }

  search($event) {
    const q = $event.target.value;
    if (q !== '') {
      this.startAt.next(q);
      this.endAt.next(q + '\uf8ff');
    } else {
     this.getCategories();
    }
  }


  firequery(start, end) {
    return this.afs.collection('categories', ref => ref.limit(5).orderBy('name').startAt(start).endAt(end)).valueChanges();
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
    this.idservice.passId(id);
    this.route.navigate(['/categories/manage-category']);
  }


}
