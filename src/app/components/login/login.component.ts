import { Component, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AngularFireAuth } from 'angularfire2/auth';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit , OnDestroy {
  show = false;
  streamSub: Subscription;

  constructor(public authService: AuthService, private authF: AngularFireAuth, private router: Router , private toast: ToastrService) {

    this.streamSub = this.authService.signedInStream.subscribe(res => {
      console.log(this.authService.admin);
      if (!res) {
        this.show = true;
      } else {
        console.log(this.authService.admin);
        if (this.authService.admin !== null && this.authService.user !== null) {
           this.router.navigateByUrl('dashboard');
        }
      }
      console.log('result ' + res);
    });
  }

  ngOnInit() {
  }

  loginAdmin(vals) {
   this.authService.login(vals.email, vals.password);
  }

  ngOnDestroy (): void {
    this.streamSub.unsubscribe();
  }


}
