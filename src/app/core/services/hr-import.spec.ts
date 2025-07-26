import { TestBed } from '@angular/core/testing';

import { HrImport } from './hr-import';

describe('HrImport', () => {
  let service: HrImport;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HrImport);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
