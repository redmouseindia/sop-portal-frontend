// src/app/features/admin/hr-import/hr-import.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { HRImportService } from '../../../core/services/hr-import';
import { Loading } from '../../../shared/components/loading/loading';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { HREmployeeData } from '../../../core/models';

interface ImportProgress {
  type: 'progress' | 'success';
  progress?: number;
  result?: string;
}

interface ImportResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  deleted: number;
  message: string;
}

@Component({
  selector: 'app-hr-import',
  standalone: true,
  imports: [CommonModule, FormsModule, Loading, Modal, ConfirmDialog],
  templateUrl: './hr-import.component.html',
  styleUrl: './hr-import.component.css'
})
export class HrImport implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();

  // Loading states
  isLoading = false;
  isDownloadingTemplate = false;
  isImporting = false;
  importProgress = 0;

  // File handling
  selectedFile: File | null = null;
  dragOver = false;

  // Import results
  lastImportResult: ImportResult | null = null;
  showImportResult = false;

  // Preview data
  previewData: HREmployeeData[] = [];
  showPreview = false;
  isValidatingFile = false;

  // Modal states
  showConfirmImport = false;
  showImportGuidelines = false;

  // Guidelines and help - Initialize as empty object, will be set in ngOnInit
  guidelines: any = {};

  constructor(
    private hrImportService: HRImportService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Initialize guidelines after service is available
    this.guidelines = this.hrImportService.getImportGuidelines();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // File selection and handling
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFileSelection(input.files[0]);
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.handleFileSelection(event.dataTransfer.files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  private handleFileSelection(file: File): void {
    // Validate file
    const validationError = this.hrImportService.validateHRFile(file);
    if (validationError) {
      this.showError(validationError);
      return;
    }

    this.selectedFile = file;
    this.previewFile();
  }

  // File operations
  clearSelectedFile(): void {
    this.selectedFile = null;
    this.previewData = [];
    this.showPreview = false;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  selectFile(): void {
    this.fileInput?.nativeElement.click();
  }

  // File preview
  previewFile(): void {
    if (!this.selectedFile) return;

    this.isValidatingFile = true;
    this.hrImportService.previewHRData(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.previewData = result.data;
          this.showPreview = true;
          this.isValidatingFile = false;
          
          if (!result.isValid) {
            this.showError(`File validation failed: ${result.errors.join(', ')}`);
          }
        },
        error: (error) => {
          this.isValidatingFile = false;
          this.showError(`Failed to preview file: ${error}`);
        }
      });
  }

  // Import operations
  confirmImport(): void {
    if (!this.selectedFile) return;
    this.showConfirmImport = true;
  }

  onImportConfirmed(): void {
    this.showConfirmImport = false;
    this.performImport();
  }

  onImportCanceled(): void {
    this.showConfirmImport = false;
  }

  private performImport(): void {
    if (!this.selectedFile) return;

    this.isImporting = true;
    this.importProgress = 0;

    this.hrImportService.importHRDataWithProgress(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (progress: ImportProgress) => {
          if (progress.type === 'progress') {
            this.importProgress = progress.progress || 0;
          } else if (progress.type === 'success') {
            this.handleImportSuccess(progress.result || '');
          }
        },
        error: (error) => {
          this.isImporting = false;
          this.showError(`Import failed: ${error}`);
        }
      });
  }

  private handleImportSuccess(result: string): void {
    this.isImporting = false;
    this.lastImportResult = this.hrImportService.formatImportResult(result);
    this.showImportResult = true;
    this.clearSelectedFile();
  }

  // Template operations
  downloadTemplate(): void {
    this.isDownloadingTemplate = true;
    this.hrImportService.downloadTemplateFile();
    
    // Reset loading state after a delay (since download is automatic)
    setTimeout(() => {
      this.isDownloadingTemplate = false;
    }, 2000);
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return extension === 'xlsx' || extension === 'xls' ? 'table_chart' : 'insert_drive_file';
  }

  private showError(message: string): void {
    // In a real app, you might use a notification service
    alert(message);
  }

  // Modal handlers
  closeImportResult(): void {
    this.showImportResult = false;
    this.lastImportResult = null;
  }

  showGuidelines(): void {
    this.showImportGuidelines = true;
  }

  closeGuidelines(): void {
    this.showImportGuidelines = false;
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/admin']);
  }

  // Getters for template
  get hasValidFile(): boolean {
    return !!this.selectedFile && !this.isValidatingFile;
  }

  get canImport(): boolean {
    return this.hasValidFile && !this.isImporting && !this.isLoading;
  }

  get importButtonText(): string {
    if (this.isImporting) {
      return `Importing... ${this.importProgress}%`;
    }
    return 'Import HR Data';
  }

  get importButtonClass(): string {
    const baseClass = 'px-6 py-3 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    if (!this.canImport) {
      return `${baseClass} bg-gray-300 text-gray-500 cursor-not-allowed`;
    }
    
    return `${baseClass} bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 transform hover:scale-105`;
  }
}