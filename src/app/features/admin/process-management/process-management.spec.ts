import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProcessManagement } from './process-management';

describe('ProcessManagement', () => {
  let component: ProcessManagement;
  let fixture: ComponentFixture<ProcessManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProcessManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProcessManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
