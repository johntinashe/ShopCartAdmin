import { Component, OnInit } from '@angular/core';
import { IdserviceService } from './../../services/idservice.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-page-not-found',
  templateUrl: './page-not-found.component.html',
  styleUrls: ['./page-not-found.component.css']
})
export class PageNotFoundComponent implements OnInit {

  constructor(private idservice: IdserviceService , private route: Router) {
    this.idservice.passId('page_not_found');
   }

  ngOnInit() {
  }

  goToHome() {
    this.idservice.passId('');
    window.location.assign('/dashboard');
  }

}
