// src/app/shared/components/confirm-dialog/confirm-dialog.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal, ModalSize, ModalType } from '../modal/modal';

export interface ConfirmDialogConfig {
  title?: string;
  message?: string;
  details?: string;
  warnings?: string[];
  confirmText?: string;
  cancelText?: string;
  type?: ModalType;
  size?: ModalSize;
  showIcon?: boolean;
  showCloseButton?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  requireConfirmation?: boolean;
  confirmationText?: string;
  requireTypedConfirmation?: boolean;
  typedConfirmationText?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css'
})
export class ConfirmDialog implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() title: string = 'Confirm Action';
  @Input() message: string = 'Are you sure you want to proceed?';
  @Input() details: string = '';
  @Input() warnings: string[] = [];
  @Input() confirmText: string = 'Confirm';
  @Input() cancelText: string = 'Cancel';
  @Input() type: ModalType = 'confirmation';
  @Input() size: ModalSize = 'md';
  @Input() showIcon: boolean = true;
  @Input() showCloseButton: boolean = true;
  @Input() closeOnBackdrop: boolean = false;
  @Input() closeOnEscape: boolean = true;
  @Input() requireConfirmation: boolean = false;
  @Input() confirmationText: string = '';
  @Input() requireTypedConfirmation: boolean = false;
  @Input() typedConfirmationText: string = '';

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  isLoading: boolean = false;
  confirmationChecked: boolean = false;
  typedConfirmationInput: string = '';

  ngOnInit(): void {
    // Reset confirmation states when dialog opens
    if (this.isOpen) {
      this.confirmationChecked = false;
      this.typedConfirmationInput = '';
      this.isLoading = false;
    }
  }

  ngOnChanges(): void {
    if (this.isOpen) {
      this.confirmationChecked = false;
      this.typedConfirmationInput = '';
      this.isLoading = false;
    }
  }

  onConfirm(): void {
    // Check confirmation requirements
    if (this.requireConfirmation && !this.confirmationChecked) {
      return;
    }

    if (this.requireTypedConfirmation && this.typedConfirmationInput !== this.typedConfirmationText) {
      return;
    }

    this.isLoading = true;
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
    this.resetDialog();
  }

  onClose(): void {
    this.close.emit();
    this.resetDialog();
  }

  get canConfirm(): boolean {
    if (this.isLoading) {
      return false;
    }

    if (this.requireConfirmation && !this.confirmationChecked) {
      return false;
    }

    if (this.requireTypedConfirmation && this.typedConfirmationInput !== this.typedConfirmationText) {
      return false;
    }

    return true;
  }

  private resetDialog(): void {
    this.confirmationChecked = false;
    this.typedConfirmationInput = '';
    this.isLoading = false;
  }

  // Static method to create a simple confirm dialog
  static confirm(config: ConfirmDialogConfig): Promise<boolean> {
    return new Promise((resolve) => {
      // This would be implemented with a dialog service
      // For now, just resolve false
      resolve(false);
    });
  }

  // Static method to create a delete confirmation dialog
  static confirmDelete(itemName: string, itemType: string = 'item'): Promise<boolean> {
    return ConfirmDialog.confirm({
      title: `Delete ${itemType}`,
      message: `Are you sure you want to delete "${itemName}"?`,
      details: 'This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      showIcon: true,
      warnings: ['This action is permanent and cannot be undone']
    });
  }

  // Static method to create a destructive action confirmation
  static confirmDestructive(config: {
    title: string;
    message: string;
    itemName?: string;
    confirmText?: string;
    warnings?: string[];
  }): Promise<boolean> {
    return ConfirmDialog.confirm({
      title: config.title,
      message: config.message,
      confirmText: config.confirmText || 'Proceed',
      cancelText: 'Cancel',
      type: 'danger',
      showIcon: true,
      warnings: config.warnings || ['This action may have permanent consequences'],
      requireTypedConfirmation: !!config.itemName,
      typedConfirmationText: config.itemName || ''
    });
  }

  // Static method to create a save confirmation dialog
  static confirmSave(hasUnsavedChanges: boolean = true): Promise<boolean> {
    if (!hasUnsavedChanges) {
      return Promise.resolve(true);
    }

    return ConfirmDialog.confirm({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Do you want to save them before proceeding?',
      confirmText: 'Save Changes',
      cancelText: 'Discard Changes',
      type: 'warning',
      showIcon: true
    });
  }

  // Static method to create a leave page confirmation
  static confirmLeave(): Promise<boolean> {
    return ConfirmDialog.confirm({
      title: 'Leave Page?',
      message: 'You have unsaved changes. Are you sure you want to leave this page?',
      details: 'Your changes will be lost if you leave without saving.',
      confirmText: 'Leave Page',
      cancelText: 'Stay on Page',
      type: 'warning',
      showIcon: true,
      warnings: ['Unsaved changes will be lost']
    });
  }

  // Static method to create a bulk action confirmation
  static confirmBulkAction(action: string, count: number, itemType: string = 'items'): Promise<boolean> {
    return ConfirmDialog.confirm({
      title: `${action} ${count} ${itemType}`,
      message: `Are you sure you want to ${action.toLowerCase()} ${count} ${itemType}?`,
      confirmText: action,
      cancelText: 'Cancel',
      type: count > 10 ? 'warning' : 'confirmation',
      showIcon: true,
      warnings: count > 10 ? [`This will affect ${count} ${itemType}`] : undefined
    });
  }
}