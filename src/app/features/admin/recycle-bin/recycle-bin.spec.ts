import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecycleBin } from './recycle-bin';

describe('RecycleBin', () => {
  let component: RecycleBin;
  let fixture: ComponentFixture<RecycleBin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecycleBin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecycleBin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
