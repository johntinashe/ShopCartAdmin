import { Injectable } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth/';
import * as firebase from 'firebase/app';
import { Observable } from 'rxjs/observable';
import { Router } from '@angular/router';
import { Admin } from '../models/admin';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from 'angularfire2/firestore';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class AuthService  {

  public user: Observable<firebase.User>;
  admin?: Admin;
  id: string;
  public error?:  string;

  public signedInStream: Observable<boolean>;
  show = false;
  constructor(public authF: AngularFireAuth, private afs: AngularFirestore , private router: Router , public toast: ToastrService) {
      this.signedInStream = this.authF.authState
                        .map<firebase.User , boolean>((user: firebase.User) => {
                          return user != null ;
                        });
               this.user = this.authF.authState;         
  }

  login(email, password): any {
    this.authF.auth.signInWithEmailAndPassword(email, password)
      .then(value => {
        this.afs.collection('admins').doc(value.uid).valueChanges().subscribe(val => {
          this.admin = val;
            if (this.admin === null ) {
              this.authF.auth.signOut().then(res => {
                this.toast.warning('Sorry action not allowed');
              });
              return;
            } else {
              this.afs.collection('admins').doc(value.uid).set({
                last_login: firebase.firestore.FieldValue.serverTimestamp()
              } , { merge: true})
              .then(suc => {
                this.router.navigateByUrl('dashboard');
              })
              .catch(err => {
                 this.toast.error(err);
              });
            }

        });
        return value;
      })
      .catch(err => {
          this.toast.error(err);
      });

  }

  logout(): void {
    this.authF.auth.signOut().then(res => {
      this.router.navigateByUrl('login');
    });

  }

}
