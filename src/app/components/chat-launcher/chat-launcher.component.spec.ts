import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatLauncherComponent } from './chat-launcher.component';

describe('ChatLauncherComponent', () => {
  let component: ChatLauncherComponent;
  let fixture: ComponentFixture<ChatLauncherComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ChatLauncherComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ChatLauncherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
