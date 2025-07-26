import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HrImport } from './hr-import';

describe('HrImport', () => {
  let component: HrImport;
  let fixture: ComponentFixture<HrImport>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HrImport]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HrImport);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
