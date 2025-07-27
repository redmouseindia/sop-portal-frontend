// src/app/features/admin/process-management/process-management.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ProcessService } from '../../../core/services/process';
import { ProcessDTO, Process } from '../../../core/models';
import { Loading } from '../../../shared/components/loading/loading';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-process-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Loading,
    Modal,
    ConfirmDialog
  ],
  templateUrl: './process-management.html',
  styleUrl: './process-management.css'
})
export class ProcessManagement implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Data
  processes: ProcessDTO[] = [];
  filteredProcesses: ProcessDTO[] = [];
  paginatedProcesses: ProcessDTO[] = [];

  // UI State
  isLoading = false;
  isSubmitting = false;
  showProcessModal = false;
  showConfirmDialog = false;
  isEditMode = false;
  selectedProcess: ProcessDTO | null = null;
  processToDelete: ProcessDTO | null = null;

  // Form
  processForm: FormGroup;

  // Filters and Search
  searchTerm = '';
  selectedStatus = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Sorting
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(
    private processService: ProcessService,
    private formBuilder: FormBuilder
  ) {
    this.processForm = this.createProcessForm();
  }

  ngOnInit(): void {
    this.loadProcesses();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data Loading
  loadProcesses(): void {
    this.isLoading = true;
    this.processService.getAllProcesses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (processes) => {
          this.processes = processes;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load processes:', error);
          this.isLoading = false;
          // TODO: Show error notification
        }
      });
  }

  // Form Management
  private createProcessForm(): FormGroup {
    return this.formBuilder.group({
      processCode: ['', [
        Validators.required, 
        Validators.pattern(/^[A-Za-z0-9_-]+$/),
        Validators.maxLength(50)
      ]],
      processName: ['', [
        Validators.required, 
        Validators.minLength(2), 
        Validators.maxLength(255)
      ]],
      description: ['', [Validators.maxLength(1000)]]
    });
  }

  // Modal Management
  openCreateProcessModal(): void {
    this.isEditMode = false;
    this.selectedProcess = null;
    this.processForm.reset();
    this.showProcessModal = true;
  }

  editProcess(process: ProcessDTO): void {
    this.isEditMode = true;
    this.selectedProcess = process;
    this.processForm.patchValue({
      processCode: process.processCode,
      processName: process.processName,
      description: process.description
    });
    
    // Disable process code field in edit mode
    this.processForm.get('processCode')?.disable();
    this.showProcessModal = true;
  }

  closeProcessModal(): void {
    this.showProcessModal = false;
    this.isEditMode = false;
    this.selectedProcess = null;
    this.processForm.reset();
    this.processForm.get('processCode')?.enable();
    this.isSubmitting = false;
  }

  // Form Submission
  onSubmitProcess(): void {
    if (this.processForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // Additional validation
    const formData = this.processForm.getRawValue();
    const validationErrors = this.validateProcessData(formData);
    
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.selectedProcess) {
      this.updateProcess(formData);
    } else {
      this.createProcess(formData);
    }
  }

  private createProcess(processData: any): void {
    const process: Process = {
      id: 0,
      processCode: processData.processCode.trim().toUpperCase(),
      processName: processData.processName.trim(),
      description: processData.description?.trim() || undefined,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.processService.createProcess(process)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdProcess) => {
          console.log('Process created successfully:', createdProcess);
          this.closeProcessModal();
          this.loadProcesses();
          // TODO: Show success notification
        },
        error: (error) => {
          console.error('Failed to create process:', error);
          this.isSubmitting = false;
          // TODO: Show error notification
        }
      });
  }

  private updateProcess(processData: any): void {
    if (!this.selectedProcess) return;

    const updateData = {
      processName: processData.processName.trim(),
      description: processData.description?.trim() || undefined
    };

    this.processService.updateProcess(this.selectedProcess.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('Process updated successfully');
            this.closeProcessModal();
            this.loadProcesses();
            // TODO: Show success notification
          }
        },
        error: (error) => {
          console.error('Failed to update process:', error);
          this.isSubmitting = false;
          // TODO: Show error notification
        }
      });
  }

  // Process Actions
  deleteProcess(process: ProcessDTO): void {
    this.processToDelete = process;
    this.showConfirmDialog = true;
  }

  confirmDeleteProcess(): void {
    if (!this.processToDelete) return;

    this.processService.deleteProcess(this.processToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('Process deleted successfully');
            this.loadProcesses();
            // TODO: Show success notification
          }
          this.showConfirmDialog = false;
          this.processToDelete = null;
        },
        error: (error) => {
          console.error('Failed to delete process:', error);
          this.showConfirmDialog = false;
          this.processToDelete = null;
          // TODO: Show error notification
        }
      });
  }

  cancelDeleteProcess(): void {
    this.showConfirmDialog = false;
    this.processToDelete = null;
  }

  restoreProcess(process: ProcessDTO): void {
    this.processService.restoreProcess(process.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('Process restored successfully');
            this.loadProcesses();
            // TODO: Show success notification
          }
        },
        error: (error) => {
          console.error('Failed to restore process:', error);
          // TODO: Show error notification
        }
      });
  }

  // Search and Filters
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchTerm = searchTerm;
        this.applyFilters();
      });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onStatusFilter(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.processes];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(process =>
        process.processName.toLowerCase().includes(term) ||
        process.processCode.toLowerCase().includes(term) ||
        (process.description && process.description.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (this.selectedStatus) {
      if (this.selectedStatus === 'active') {
        filtered = filtered.filter(process => !process.isDeleted);
      } else if (this.selectedStatus === 'deleted') {
        filtered = filtered.filter(process => process.isDeleted);
      }
    }

    // Apply sorting
    if (this.sortField) {
      this.sortProcesses(filtered);
    }

    this.filteredProcesses = filtered;
    this.updatePagination();
  }

  // Sorting
  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  private sortProcesses(processes: ProcessDTO[]): void {
    processes.sort((a, b) => {
      const aValue = this.getFieldValue(a, this.sortField);
      const bValue = this.getFieldValue(b, this.sortField);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private getFieldValue(process: ProcessDTO, field: string): any {
    switch (field) {
      case 'processCode': return process.processCode.toLowerCase();
      case 'processName': return process.processName.toLowerCase();
      case 'description': return (process.description || '').toLowerCase();
      default: return '';
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // Pagination
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredProcesses.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    this.updatePaginatedProcesses();
  }

  private updatePaginatedProcesses(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedProcesses = this.filteredProcesses.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedProcesses();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedProcesses();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedProcesses();
    }
  }

  getStartIndex(): number {
    return this.filteredProcesses.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredProcesses.length);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Utility Methods
  trackByProcessId(index: number, process: ProcessDTO): number {
    return process.id;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.processForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.processForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${this.getFieldDisplayName(fieldName)} is required`;
    if (errors['minlength']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `${this.getFieldDisplayName(fieldName)} must be less than ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) return `${this.getFieldDisplayName(fieldName)} must be alphanumeric with only underscores and hyphens allowed`;
    
    return 'Invalid value';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      processCode: 'Process code',
      processName: 'Process name',
      description: 'Description'
    };
    return displayNames[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.processForm.controls).forEach(key => {
      const control = this.processForm.get(key);
      control?.markAsTouched();
    });
  }

  getStatusBadgeColor(isDeleted: boolean): string {
    return isDeleted 
      ? 'bg-red-100 text-red-800'
      : 'bg-green-100 text-green-800';
  }

  getStatusText(isDeleted: boolean): string {
    return isDeleted ? 'Deleted' : 'Active';
  }

  // Validation
  private validateProcessData(processData: any): string[] {
    const errors: string[] = [];

    // Process code validation
    if (!processData.processCode?.trim()) {
      errors.push('Process code is required');
    } else if (!/^[A-Za-z0-9_-]+$/.test(processData.processCode)) {
      errors.push('Process code must be alphanumeric with only underscores and hyphens allowed');
    } else if (processData.processCode.length > 50) {
      errors.push('Process code must be 50 characters or less');
    }

    // Process name validation
    if (!processData.processName?.trim()) {
      errors.push('Process name is required');
    } else if (processData.processName.trim().length < 2) {
      errors.push('Process name must be at least 2 characters');
    } else if (processData.processName.length > 255) {
      errors.push('Process name must be 255 characters or less');
    }

    // Description validation (optional)
    if (processData.description && processData.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }

    return errors;
  }

  // Statistics
  getProcessStats(): { 
    total: number; 
    active: number; 
    deleted: number; 
    withDescription: number;
  } {
    const stats = {
      total: this.processes.length,
      active: this.processes.filter(p => !p.isDeleted).length,
      deleted: this.processes.filter(p => p.isDeleted).length,
      withDescription: this.processes.filter(p => p.description && p.description.trim()).length
    };
    return stats;
  }

  // Export functionality
  exportProcesses(): void {
    const exportData = this.filteredProcesses.map(process => ({
      'Process Code': process.processCode,
      'Process Name': process.processName,
      'Description': process.description || '',
      'Status': process.isDeleted ? 'Deleted' : 'Active',
      'Deleted By': process.deletedByName || '',
      'Deleted At': process.deletedAt ? new Date(process.deletedAt).toLocaleDateString() : ''
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
      )
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `processes_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Quick Actions
  viewProcessDocuments(process: ProcessDTO): void {
    // TODO: Navigate to documents filtered by this process
    console.log('View documents for process:', process.processCode);
  }

  viewProcessAssignments(process: ProcessDTO): void {
    // TODO: Navigate to effort assignments filtered by this process
    console.log('View assignments for process:', process.processCode);
  }
}