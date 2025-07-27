// src/app/shared/components/modal/modal.ts
import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalType = 'default' | 'confirmation' | 'warning' | 'danger' | 'success';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.html',
  styleUrl: './modal.css'
})
export class Modal implements OnInit, OnDestroy, AfterViewInit {
  @Input() isOpen: boolean = false;
  @Input() title: string = '';
  @Input() size: ModalSize = 'md';
  @Input() type: ModalType = 'default';
  @Input() showHeader: boolean = true;
  @Input() showFooter: boolean = true;
  @Input() showCloseButton: boolean = true;
  @Input() showCancelButton: boolean = true;
  @Input() showConfirmButton: boolean = true;
  @Input() showBackdrop: boolean = true;
  @Input() closeOnBackdrop: boolean = true;
  @Input() closeOnEscape: boolean = true;
  @Input() cancelButtonText: string = 'Cancel';
  @Input() confirmButtonText: string = 'Confirm';
  @Input() confirmButtonLoading: boolean = false;
  @Input() confirmButtonDisabled: boolean = false;
  @Input() closeButtonLabel: string = 'Close modal';
  @Input() bodyClass: string = '';
  @Input() hasFooterContent: boolean = false;

  @Output() close = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
  @Output() backdropClick = new EventEmitter<void>();

  ariaLabelledBy: string = '';
  ariaDescribedBy: string = '';
  private originalOverflow: string = '';

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    // Generate unique IDs for accessibility
    this.ariaLabelledBy = `modal-title-${Math.random().toString(36).substr(2, 9)}`;
    this.ariaDescribedBy = `modal-body-${Math.random().toString(36).substr(2, 9)}`;

    // Handle escape key
    if (this.closeOnEscape) {
      document.addEventListener('keydown', this.handleEscapeKey);
    }
  }

  ngAfterViewInit(): void {
    if (this.isOpen) {
      this.handleModalOpen();
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleEscapeKey);
    this.restoreBodyOverflow();
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.handleModalOpen();
    } else {
      this.handleModalClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onBackdropClick(): void {
    this.backdropClick.emit();
    if (this.closeOnBackdrop) {
      this.onClose();
    }
  }

  getModalSizeClass(): string {
    const sizeClasses = {
      sm: 'sm:max-w-sm sm:w-full',
      md: 'sm:max-w-md sm:w-full',
      lg: 'sm:max-w-lg sm:w-full',
      xl: 'sm:max-w-xl sm:w-full',
      full: 'sm:max-w-full sm:w-full sm:h-full'
    };
    return sizeClasses[this.size];
  }

  getConfirmButtonClass(): string {
    const typeClasses = {
      default: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
      confirmation: 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
      warning: 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500',
      danger: 'bg-danger-600 hover:bg-danger-700 focus:ring-danger-500',
      success: 'bg-success-600 hover:bg-success-700 focus:ring-success-500'
    };
    
    const disabledClass = this.confirmButtonDisabled ? 'opacity-50 cursor-not-allowed' : '';
    return `${typeClasses[this.type]} ${disabledClass}`;
  }

  private handleEscapeKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.isOpen) {
      this.onClose();
    }
  };

  private handleModalOpen(): void {
    // Prevent body scroll
    this.originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus management
    setTimeout(() => {
      const modalElement = this.elementRef.nativeElement.querySelector('[role="dialog"]');
      if (modalElement) {
        modalElement.focus();
      }
    }, 100);
  }

  private handleModalClose(): void {
    this.restoreBodyOverflow();
  }

  private restoreBodyOverflow(): void {
    if (this.originalOverflow !== undefined) {
      document.body.style.overflow = this.originalOverflow;
    }
  }

  // Static methods for programmatic modal creation
  static confirm(config: {
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    type?: ModalType;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      // This would be implemented with a modal service
      // For now, just resolve false
      resolve(false);
    });
  }

  static alert(config: {
    title?: string;
    message?: string;
    confirmText?: string;
    type?: ModalType;
  }): Promise<void> {
    return new Promise((resolve) => {
      // This would be implemented with a modal service
      resolve();
    });
  }
}