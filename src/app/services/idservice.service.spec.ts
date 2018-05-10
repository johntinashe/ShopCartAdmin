import { TestBed, inject } from '@angular/core/testing';

import { IdserviceService } from './idservice.service';

describe('IdserviceService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [IdserviceService]
    });
  });

  it('should be created', inject([IdserviceService], (service: IdserviceService) => {
    expect(service).toBeTruthy();
  }));
});
