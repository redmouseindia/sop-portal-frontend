// src/app/features/admin/client-management/client-management.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { ClientService } from '../../../core/services/client';
import { ClientDTO, Client, CLIENT_CATEGORIES } from '../../../core/models';
import { Loading } from '../../../shared/components/loading/loading';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-client-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Loading,
    Modal,
    ConfirmDialog
  ],
  templateUrl: './client-management.html',
  styleUrl: './client-management.css'
})
export class ClientManagement implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Data
  clients: ClientDTO[] = [];
  filteredClients: ClientDTO[] = [];
  paginatedClients: ClientDTO[] = [];

  // UI State
  isLoading = false;
  isSubmitting = false;
  showClientModal = false;
  showConfirmDialog = false;
  isEditMode = false;
  selectedClient: ClientDTO | null = null;
  clientToDelete: ClientDTO | null = null;

  // Form
  clientForm: FormGroup;

  // Filters and Search
  searchTerm = '';
  selectedCategory = '';
  selectedStatus = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Sorting
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Constants
  readonly CLIENT_CATEGORIES = CLIENT_CATEGORIES;
  readonly categoryOptions = [
    { value: CLIENT_CATEGORIES.ABA, label: 'ABA' },
    { value: CLIENT_CATEGORIES.NON_ABA, label: 'NON-ABA' }
  ];

  constructor(
    private clientService: ClientService,
    private formBuilder: FormBuilder
  ) {
    this.clientForm = this.createClientForm();
  }

  ngOnInit(): void {
    this.loadClients();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data Loading
  loadClients(): void {
    this.isLoading = true;
    this.clientService.getAllClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (clients) => {
          this.clients = clients;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load clients:', error);
          this.isLoading = false;
          // TODO: Show error notification
        }
      });
  }

  // Form Management
  private createClientForm(): FormGroup {
    return this.formBuilder.group({
      clientCode: ['', [
        Validators.required, 
        Validators.pattern(/^[A-Za-z0-9]+$/),
        Validators.maxLength(50)
      ]],
      clientName: ['', [
        Validators.required, 
        Validators.minLength(2), 
        Validators.maxLength(255)
      ]],
      category: ['', [Validators.required]]
    });
  }

  // Modal Management
  openCreateClientModal(): void {
    this.isEditMode = false;
    this.selectedClient = null;
    this.clientForm.reset();
    this.showClientModal = true;
  }

  editClient(client: ClientDTO): void {
    this.isEditMode = true;
    this.selectedClient = client;
    this.clientForm.patchValue({
      clientCode: client.clientCode,
      clientName: client.clientName,
      category: client.category
    });
    
    // Disable client code field in edit mode
    this.clientForm.get('clientCode')?.disable();
    this.showClientModal = true;
  }

  closeClientModal(): void {
    this.showClientModal = false;
    this.isEditMode = false;
    this.selectedClient = null;
    this.clientForm.reset();
    this.clientForm.get('clientCode')?.enable();
    this.isSubmitting = false;
  }

  // Form Submission
  onSubmitClient(): void {
    if (this.clientForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // Additional validation
    const formData = this.clientForm.getRawValue();
    const validationErrors = this.validateClientData(formData);
    
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.selectedClient) {
      this.updateClient(formData);
    } else {
      this.createClient(formData);
    }
  }

  private createClient(clientData: any): void {
    const client: Client = {
      id: 0,
      clientCode: clientData.clientCode.trim().toUpperCase(),
      clientName: clientData.clientName.trim(),
      category: clientData.category,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.clientService.createClient(client)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdClient) => {
          console.log('Client created successfully:', createdClient);
          this.closeClientModal();
          this.loadClients();
          // TODO: Show success notification
        },
        error: (error) => {
          console.error('Failed to create client:', error);
          this.isSubmitting = false;
          // TODO: Show error notification
        }
      });
  }

  private updateClient(clientData: any): void {
    if (!this.selectedClient) return;

    const updateData = {
      clientName: clientData.clientName.trim(),
      category: clientData.category
    };

    this.clientService.updateClient(this.selectedClient.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('Client updated successfully');
            this.closeClientModal();
            this.loadClients();
            // TODO: Show success notification
          }
        },
        error: (error) => {
          console.error('Failed to update client:', error);
          this.isSubmitting = false;
          // TODO: Show error notification
        }
      });
  }

  // Client Actions
  deleteClient(client: ClientDTO): void {
    this.clientToDelete = client;
    this.showConfirmDialog = true;
  }

  confirmDeleteClient(): void {
    if (!this.clientToDelete) return;

    this.clientService.deleteClient(this.clientToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('Client deleted successfully');
            this.loadClients();
            // TODO: Show success notification
          }
          this.showConfirmDialog = false;
          this.clientToDelete = null;
        },
        error: (error) => {
          console.error('Failed to delete client:', error);
          this.showConfirmDialog = false;
          this.clientToDelete = null;
          // TODO: Show error notification
        }
      });
  }

  cancelDeleteClient(): void {
    this.showConfirmDialog = false;
    this.clientToDelete = null;
  }

  restoreClient(client: ClientDTO): void {
    this.clientService.restoreClient(client.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('Client restored successfully');
            this.loadClients();
            // TODO: Show success notification
          }
        },
        error: (error) => {
          console.error('Failed to restore client:', error);
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

  onCategoryFilter(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilter(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.clients];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(client =>
        client.clientName.toLowerCase().includes(term) ||
        client.clientCode.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (this.selectedCategory) {
      filtered = filtered.filter(client => client.category === this.selectedCategory);
    }

    // Status filter
    if (this.selectedStatus) {
      if (this.selectedStatus === 'active') {
        filtered = filtered.filter(client => !client.isDeleted);
      } else if (this.selectedStatus === 'deleted') {
        filtered = filtered.filter(client => client.isDeleted);
      }
    }

    // Apply sorting
    if (this.sortField) {
      this.sortClients(filtered);
    }

    this.filteredClients = filtered;
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

  private sortClients(clients: ClientDTO[]): void {
    clients.sort((a, b) => {
      const aValue = this.getFieldValue(a, this.sortField);
      const bValue = this.getFieldValue(b, this.sortField);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private getFieldValue(client: ClientDTO, field: string): any {
    switch (field) {
      case 'clientCode': return client.clientCode.toLowerCase();
      case 'clientName': return client.clientName.toLowerCase();
      case 'category': return client.category.toLowerCase();
      default: return '';
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // Pagination
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredClients.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    this.updatePaginatedClients();
  }

  private updatePaginatedClients(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedClients = this.filteredClients.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedClients();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedClients();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedClients();
    }
  }

  getStartIndex(): number {
    return this.filteredClients.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredClients.length);
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
  trackByClientId(index: number, client: ClientDTO): number {
    return client.id;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.clientForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.clientForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${this.getFieldDisplayName(fieldName)} is required`;
    if (errors['minlength']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `${this.getFieldDisplayName(fieldName)} must be less than ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) return `${this.getFieldDisplayName(fieldName)} must be alphanumeric only`;
    
    return 'Invalid value';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      clientCode: 'Client code',
      clientName: 'Client name',
      category: 'Category'
    };
    return displayNames[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.clientForm.controls).forEach(key => {
      const control = this.clientForm.get(key);
      control?.markAsTouched();
    });
  }

  getCategoryBadgeColor(category: string): string {
    switch (category) {
      case CLIENT_CATEGORIES.ABA: 
        return 'bg-blue-100 text-blue-800';
      case CLIENT_CATEGORIES.NON_ABA: 
        return 'bg-purple-100 text-purple-800';
      default: 
        return 'bg-gray-100 text-gray-800';
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case CLIENT_CATEGORIES.ABA: 
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'; // Check circle
      case CLIENT_CATEGORIES.NON_ABA: 
        return 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'; // Office building
      default: 
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // Information circle
    }
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
  private validateClientData(clientData: any): string[] {
    const errors: string[] = [];

    // Client code validation
    if (!clientData.clientCode?.trim()) {
      errors.push('Client code is required');
    } else if (!/^[A-Za-z0-9]+$/.test(clientData.clientCode)) {
      errors.push('Client code must be alphanumeric only');
    } else if (clientData.clientCode.length > 50) {
      errors.push('Client code must be 50 characters or less');
    }

    // Client name validation
    if (!clientData.clientName?.trim()) {
      errors.push('Client name is required');
    } else if (clientData.clientName.trim().length < 2) {
      errors.push('Client name must be at least 2 characters');
    } else if (clientData.clientName.length > 255) {
      errors.push('Client name must be 255 characters or less');
    }

    // Category validation
    if (!clientData.category) {
      errors.push('Category is required');
    } else if (!Object.values(CLIENT_CATEGORIES).includes(clientData.category)) {
      errors.push('Invalid category selected');
    }

    return errors;
  }

  // Statistics
  getClientStats(): { 
    total: number; 
    active: number; 
    deleted: number; 
    byCategory: { [key: string]: number } 
  } {
    const stats = {
      total: this.clients.length,
      active: this.clients.filter(c => !c.isDeleted).length,
      deleted: this.clients.filter(c => c.isDeleted).length,
      byCategory: this.clients.reduce((acc, client) => {
        if (!client.isDeleted) {
          acc[client.category] = (acc[client.category] || 0) + 1;
        }
        return acc;
      }, {} as { [key: string]: number })
    };
    return stats;
  }

  // Export functionality
  exportClients(): void {
    const exportData = this.filteredClients.map(client => ({
      'Client Code': client.clientCode,
      'Client Name': client.clientName,
      'Category': client.category,
      'Status': client.isDeleted ? 'Deleted' : 'Active',
      'Deleted By': client.deletedByName || '',
      'Deleted At': client.deletedAt ? new Date(client.deletedAt).toLocaleDateString() : ''
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
    link.download = `clients_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // Quick Actions
  viewClientDocuments(client: ClientDTO): void {
    // TODO: Navigate to documents filtered by this client
    console.log('View documents for client:', client.clientCode);
  }

  viewClientAssignments(client: ClientDTO): void {
    // TODO: Navigate to effort assignments filtered by this client
    console.log('View assignments for client:', client.clientCode);
  }

  // Bulk Actions
  getSelectedClients(): ClientDTO[] {
    // TODO: Implement if bulk selection is needed
    return [];
  }

  bulkDeleteClients(): void {
    // TODO: Implement bulk delete functionality
    console.log('Bulk delete clients');
  }

  bulkRestoreClients(): void {
    // TODO: Implement bulk restore functionality
    console.log('Bulk restore clients');
  }
}