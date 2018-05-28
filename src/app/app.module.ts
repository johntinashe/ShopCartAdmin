import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {IdserviceService} from './services/idservice.service';
import {AngularFireAuthModule} from 'angularfire2/auth';
import {RouterModule, Routes} from '@angular/router';
import {AngularFireModule} from 'angularfire2';
import {environment} from '../environments/environment.prod';
import {AuthService} from './services/auth.service';
import {FormsModule} from '@angular/forms';
import {AngularFirestoreModule} from 'angularfire2/firestore';
import {ToastrModule, ToastrService} from 'ngx-toastr';
import {AppComponent} from './app.component';
import {NavbarComponent} from './components/navbar/navbar.component';
import {SidebarComponent} from './components/sidebar/sidebar.component';
import {CategoriesComponent} from './components/categories/categories.component';
import {DashboardComponent} from './components/dashboard/dashboard.component';
import {LoginComponent} from './components/login/login.component';
import {MessagesComponent} from './components/messages/messages.component';
import {UsersComponent} from './components/users/users.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {CategoryService} from './services/category.service';
import {ChatLauncherComponent} from './components/chat-launcher/chat-launcher.component';
import {AuthGuard} from './services/auth.guard';
import {ProductsListComponent} from './components/products-list/products-list.component';
import {AddProductComponent} from './components/add-product/add-product.component';
import {HeaderComponent} from './components/header/header.component';
import {UserProfileComponent} from './components/user-profile/user-profile.component';
import {ProductDetailComponent} from './components/product-detail/product-detail.component';
import {NgxPaginationModule} from 'ngx-pagination';
import {ManageCategoryComponent} from './components/manage-category/manage-category.component';
import {TruncateModule} from 'ng2-truncate';
import {NotificationService} from './services/notification.service';
import {PageNotFoundComponent} from './components/page-not-found/page-not-found.component';
import {OrdersComponent} from './components/orders/orders.component';
import {OrderSummaryComponent} from './components/order-summary/order-summary.component';
import {EditProductComponent} from './components/edit-product/edit-product.component';
import {Ng2SearchPipeModule} from 'ng2-search-filter';

const appRoutes: Routes = [
  {path: 'login', component: LoginComponent},
  {path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard]},
  {path: 'categories', component: CategoriesComponent, canActivate: [AuthGuard]},
  {path: 'users', component: UsersComponent, canActivate: [AuthGuard]},
  {path: '', redirectTo: 'dashboard', pathMatch: 'full', canActivate: [AuthGuard]},
  {path: 'messages', component: MessagesComponent, canActivate: [AuthGuard]},
  {path: 'products', component: ProductsListComponent, canActivate: [AuthGuard]},
  {path: 'products/edit-product/:id', component: EditProductComponent, canActivate: [AuthGuard]},
  {path: 'products/add-product', component: AddProductComponent, canActivate: [AuthGuard]},
  {path: 'users/user-profile/:id', component: UserProfileComponent, canActivate: [AuthGuard]},
  {path: 'products/product-detail/:id', component: ProductDetailComponent, canActivate: [AuthGuard]},
  {path: 'categories/manage-category', component: ManageCategoryComponent, canActivate: [AuthGuard]},
  {path: 'categories/manage-category/:id', component: ManageCategoryComponent, canActivate: [AuthGuard]},
  {path: 'page_not_found' , component: PageNotFoundComponent , canActivate: [AuthGuard]},
  {path: 'orders' , component: OrdersComponent , canActivate: [AuthGuard]},
  {path: 'orders/order-summary/:id', component: OrderSummaryComponent, canActivate: [AuthGuard]},
  {path: '**', redirectTo: 'page_not_found'}

];

@NgModule({
  declarations: [
    AppComponent,
    NavbarComponent,
    SidebarComponent,
    CategoriesComponent,
    DashboardComponent,
    LoginComponent,
    MessagesComponent,
    UsersComponent,
    ChatLauncherComponent,
    ProductsListComponent,
    AddProductComponent,
    HeaderComponent,
    UserProfileComponent,
    ProductDetailComponent,
    ManageCategoryComponent,
    PageNotFoundComponent,
    OrdersComponent,
    OrderSummaryComponent,
    EditProductComponent
  ],
  imports: [
  BrowserModule,
    AngularFireModule.initializeApp(environment.firebase, 'ShopCartAdmin'),
    AngularFirestoreModule,
    RouterModule.forRoot(appRoutes),
    FormsModule,
    AngularFireAuthModule,
    BrowserAnimationsModule, // required animations module
    ToastrModule.forRoot(),
    NgxPaginationModule,
    TruncateModule,
    Ng2SearchPipeModule
  ],
  providers: [AuthService, ToastrService, CategoryService, AuthGuard, IdserviceService,
  NotificationService],
  bootstrap: [AppComponent]
})
export class AppModule { }
