import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EffortAssignment } from './effort-assignment';

describe('EffortAssignment', () => {
  let component: EffortAssignment;
  let fixture: ComponentFixture<EffortAssignment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EffortAssignment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EffortAssignment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
