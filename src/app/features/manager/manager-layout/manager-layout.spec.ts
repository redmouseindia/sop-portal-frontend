import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerLayout } from './manager-layout';

describe('ManagerLayout', () => {
  let component: ManagerLayout;
  let fixture: ComponentFixture<ManagerLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerLayout]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
