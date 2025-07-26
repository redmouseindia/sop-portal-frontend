import { TestBed } from '@angular/core/testing';

import { EffortAssignment } from './effort-assignment';

describe('EffortAssignment', () => {
  let service: EffortAssignment;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EffortAssignment);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
