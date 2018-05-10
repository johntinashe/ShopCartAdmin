import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Message } from '../../models/message';
import { Conversation } from '../../models/conversation';
import { AngularFirestore } from 'angularfire2/firestore';
import { AfterViewInit } from '@angular/core/src/metadata/lifecycle_hooks';
import { firestore } from 'firebase/app';
import * as firebase from 'firebase/app';

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

  mes: Message = {
    message: '',
    messageId: 'customer_service',
    mId: 'customer_service',
    time: '',
    type: 'text',
    from: 'customer_service',
    seen: true,

  };

  constructor(private afs: AngularFirestore) {
  }

  ngOnInit() {
    this.getConversations();
  }



  getConversations(): void {
  this.conversations = this.afs.collection('messages').snapshotChanges().map(changes => {
      return changes.map(a => {
        const data = a.payload.doc.data() as Conversation;
        data.userid = a.payload.doc.id;
        return data;
      });
    });

    this.conversations.subscribe(convers => {
      this.conversationsArray = convers;
    });


  }

  getMessages(id: string): void {
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
        this.mes.message = '';
      });
  }


}
