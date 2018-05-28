import {Component, OnInit} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {Message} from '../../models/message';
import {Conversation} from '../../models/conversation';
import {AngularFirestore} from 'angularfire2/firestore';
import * as firebase from 'firebase/app';
import {User} from './../../models/user';

@Component({
  selector: 'app-messages',
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.css']
})
export class MessagesComponent implements OnInit  {
  title = 'Messages';
  conversations: Observable<Conversation[]>;
  messages: Observable<Message[]>;
  conversationsArray?: any;
  messagesArray?: any;

  array: Message[];
  user_id: string;
  searchterm: any;

  mes: Message = {
    message: '',
    messageId: 'customer_service',
    mId: 'customer_service',
    time: '',
    type: 'text',
    from: 'customer_service',
    seen: true,

  };
  srcImg: any;
  nm: any;

  constructor(private afs: AngularFirestore) {
  }

  ngOnInit() {
    this.getConversations();
  }

  getClickedUser(id) {
    this.afs.collection('users').doc(id).valueChanges().subscribe(user => {
      this.srcImg = user.thumb_image;
      this.nm = user.name;
    });
  }


  getConversations(): void {
  this.conversations = this.afs.collection('messages').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Conversation;
        data.userid = a.payload.doc.id;
        this.afs.collection('users').doc(data.userid).snapshotChanges().subscribe(user => {
          const u = user.payload.data() as User;
          data.username = u.name + ' ' + u.surname;
          data.userprofile_img = u.thumb_image;
        });
        return data;
      });
    });

    this.conversations.subscribe(convers => {
      this.conversationsArray = convers;
    });

  }

  getMessages(id: string): void {
    this.getClickedUser(id);
    this.messages = this.afs.collection('messages').doc(id).collection('userQueries', ref => ref.orderBy('time', 'desc'))
      .snapshotChanges().map(changes => {
        return changes.map(a => {
          const data = a.payload.doc.data() as Message;
          data.messageId = a.payload.doc.id;
          return data;
        });
      });

    this.messages.subscribe(mes => {
      this.messagesArray = mes;
    });
    this.user_id = id;
  }

  sendMessage(): void {
    const milliseconds = (new Date).getTime();
    this.mes.time = firebase.firestore.FieldValue.serverTimestamp();
    this.afs.collection('messages').doc(this.user_id).collection('userQueries')
      .add(this.mes)
      .then(res => {
        this.afs.collection('messages').doc(this.user_id).set({lastMsg: this.mes.message});
        this.mes.message = '';
      });
  }


}
