import {Component, OnInit} from '@angular/core';
import {Category} from './../../models/category';
import {AngularFirestore} from 'angularfire2/firestore';
import {ToastrService} from 'ngx-toastr';
import {FirebaseApp} from 'angularfire2';
import 'firebase/storage';
import {ActivatedRoute} from '@angular/router';

@Component({
  selector: 'app-manage-category',
  templateUrl: './manage-category.component.html',
  styleUrls: ['./manage-category.component.css']
})
export class ManageCategoryComponent implements OnInit {

  title = 'Manage Category';

  category: Category = {
    name: '',
    catimage: '',
    active: false,
    description: ''
  };

  catChange: any;
  id = 'default';
  img: any;
  url: string;
  path:  any = '';
  imgSrc: any;
  newImg = false;

  constructor(private db: AngularFirestore, private router: ActivatedRoute, private toast: ToastrService,
              private firebaseApp: FirebaseApp) {

    this.id = this.router.snapshot.params['id'];
    console.log(this.id);
    if (this.id !== 'default' && this.id !== '' && this.id !== undefined) {
      this.getCategory();
    }
   }

  ngOnInit() {
  }

  setFull(full) {
    if (full.length > 0) {
      this.img = full[0];
      console.log( this.img);
      if (this.id !== '') {
        document.getElementById('prv').remove();
      }
      const prv = document.getElementById('prv');
      if (prv !== null) {
        prv.remove();
        console.log(prv);
      }
      const imgS = document.getElementById('addprv');
      const i = document.createElement('img');

      this.newImg = true;
      const reader  = new FileReader();
      reader.onloadend = function () {
        i.src = reader.result;
        i.id = 'prv';
        i.style.marginTop = '3.5em';
        i.style.height = '180px';
      };
      if (this.img !== null ) {
        reader.readAsDataURL(this.img);
        imgS.appendChild(i);
      } else {
        i.src = '';
      }
    }
  }

  addCategory(cat) {

    if (cat.name !== '' && cat.long_desc !== '' && cat.status !== '' && this.img !== null) {
      if (cat.status === 'False') {
         this.category.active = false;
       } else {
         this.category.active = true;
       }

       const storageRef = this.firebaseApp.storage().ref();
        this.db.collection('categories').add(this.category)
           .then(res => {
            storageRef.child('category_images/' + res.id)
            .put(this.img).then(r2 => {
              this.url = r2.downloadURL;
              this.db.collection('categories').doc(res.id).set({catimage: this.url}, {merge: true}).then(r => {
                this.toast.success('Category ' + this.category.name + ' has been added');
              });
            });
           });

    } else {
      this.toast.warning('Please enter all fields');
    }
  }

  editCategory(cat , id) {

    if (cat.name !== '' && cat.long_desc !== '' && cat.status !== '') {
      if (cat.status === 'False') {
         this.category.active = false;
       } else {
         this.category.active = true;
       }

       if (this.newImg) {
         if (this.category.catimage !== '') {
          const storageRef = this.firebaseApp.storage().ref();
          storageRef.child('category_images/' + this.id)
          .put(this.img).then(r2 => {
            this.url = r2.downloadURL;
            this.db.collection('categories').doc(this.id).set({image_url: this.url}, {merge: true}).then(res => {
              this.toast.success('Category ' + this.category.name + ' has been updated');
            });
            this.category.catimage = this.url;
            this.db.collection('categories').doc(this.id).set(this.category, {merge: true});
          });
         } else {
          this.toast.warning('Select an image first');
         }
       } else {
        this.db.collection('categories').doc(this.id).set(this.category, {merge: true});
        this.toast.success('Category details have been updated');
       }

    } else {
      this.toast.warning('Please enter all fields');
    }
  }

  btn(cat) {
    if (this.id === '') {
      this.addCategory(cat);
    } else {
      this.editCategory(cat , this.id);
    }
  }


  getCategory() {
    this.catChange = this.db.collection('categories').doc(this.id).valueChanges();
    this.catChange.subscribe(res => {
      this.category.name = res.name;
      this.category.description = res.description;
      this.category.catimage = res.catimage;
      this.category.active = res.active;
    });
  }

}
