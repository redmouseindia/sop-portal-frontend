import { TestBed } from '@angular/core/testing';

import { Process } from './process';

describe('Process', () => {
  let service: Process;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Process);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
