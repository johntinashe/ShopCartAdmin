import { Inject , Injectable } from '@angular/core';
import { AngularFirestore } from 'angularfire2/firestore';

@Injectable()
export class NotificationService {

  constructor(private db: AngularFirestore) {
  }


  sendNotification(id) {
    this.db.collection('notifications').doc(id).delete()
        .then(res => {
        });
  }

}
