import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AngularFirestore } from 'angularfire2/firestore';
import { IdserviceService } from './../../services/idservice.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit  {
  user?: any;
  hide = true;

  constructor(private auth: AuthService , private afs: AngularFirestore , private idservice: IdserviceService) {
    this.auth.authF.authState.subscribe(user => {
     if (user != null ) {
       this.afs.collection('admins').doc(user.uid).valueChanges()
         .subscribe(admin => {
           this.user = admin;
         });
     }
    });
    this.idservice.currentMessage.subscribe(res => {
      if (res === 'page_not_found') {
        this.hide = false;
      }
    });


  }

  ngOnInit() {
  }



}
