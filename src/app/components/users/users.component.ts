import { Component, OnInit } from '@angular/core';
import { AfterViewInit } from '@angular/core/src/metadata/lifecycle_hooks';
import { Observable } from 'rxjs/Observable';
import { AngularFirestore } from 'angularfire2/firestore';
import { User } from '../../models/user';
import * as $ from 'jquery/dist/jquery.min.js';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit  {
  title = 'Users';

  users: Observable<User[]>;
  usersArray: any;


  constructor(private afs: AngularFirestore) {
  }

  ngOnInit() {
    this.getUsers();
  }

  getUsers(): any {
    this.users = this.afs.collection('users').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as User;
        data.id = a.payload.doc.id;
        return data;
      });
    });

    this.users.subscribe(userArray => {
      this.usersArray = userArray;
    });
}

}
