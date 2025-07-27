// src/app/features/admin/document-management/document-management.ts
import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { DocumentService } from '../../../core/services/document';
import { ClientService } from '../../../core/services/client';
import { ProcessService } from '../../../core/services/process';
import { AuthService } from '../../../core/services/auth';


import { 
  DocumentDTO, 
  ClientDTO, 
  ProcessDTO, 
  FileUploadRequest,
  API_ENDPOINTS 
} from '../../../core/models';

import { Header } from '../../../shared/components/header/header';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { Loading } from '../../../shared/components/loading/loading';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

interface DocumentFilters {
  searchTerm: string;
  clientId: number | null;
  processId: number | null;
  mimeType: string;
  dateRange: {
    start: string;
    end: string;
  } | null;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  uploadedFile: File | null;
  selectedClientId: number | null;
  selectedProcessId: number | null;
}

@Component({
  selector: 'app-document-management',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    Header, 
    Sidebar, 
    Loading, 
    Modal, 
    ConfirmDialog
  ],
  templateUrl: './document-management.html',
  styleUrls: ['./document-management.css']
})
export class DocumentManagement implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // Data properties
  documents: DocumentDTO[] = [];
  filteredDocuments: DocumentDTO[] = [];
  clients: ClientDTO[] = [];
  processes: ProcessDTO[] = [];
  deletedDocuments: DocumentDTO[] = [];

  // State properties
  isLoading = true;
  isSidebarOpen = false;
  showUploadModal = false;
  showDeleteConfirm = false;
  showRestoreConfirm = false;
  showDeletedDocuments = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Filter properties
  filters: DocumentFilters = {
    searchTerm: '',
    clientId: null,
    processId: null,
    mimeType: '',
    dateRange: null
  };

  // Upload properties
  uploadState: UploadState = {
    isUploading: false,
    progress: 0,
    uploadedFile: null,
    selectedClientId: null,
    selectedProcessId: null
  };

  // Selection properties
  selectedDocument: DocumentDTO | null = null;
  selectedDocuments: Set<number> = new Set();

  // Pagination and sorting
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  sortBy: 'name' | 'size' | 'date' | 'client' | 'process' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  constructor(
    private documentService: DocumentService,
    private clientService: ClientService,
    private processService: ProcessService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // Load all required data in parallel
      const [documents, clients, processes] = await Promise.all([
        this.documentService.getAllDocuments().toPromise(),
        this.clientService.getAllClients().toPromise(),
        this.processService.getAllProcesses().toPromise()
      ]);

      this.documents = documents || [];
      this.clients = clients || [];
      this.processes = processes || [];
      
      this.applyFilters();
      this.calculatePagination();
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.error = 'Failed to load documents. Please refresh the page.';
    } finally {
      this.isLoading = false;
    }
  }

  // Filter and search methods
  applyFilters(): void {
    let filtered = [...this.documents];

    // Apply search filter
    if (this.filters.searchTerm.trim()) {
      const searchLower = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.documentName.toLowerCase().includes(searchLower) ||
        doc.clientName.toLowerCase().includes(searchLower) ||
        doc.processName.toLowerCase().includes(searchLower) ||
        doc.uploadedByName.toLowerCase().includes(searchLower)
      );
    }

    // Apply client filter
    if (this.filters.clientId) {
      filtered = filtered.filter(doc => doc.clientId === this.filters.clientId);
    }

    // Apply process filter
    if (this.filters.processId) {
      filtered = filtered.filter(doc => doc.processId === this.filters.processId);
    }

    // Apply MIME type filter
    if (this.filters.mimeType) {
      filtered = filtered.filter(doc => doc.mimeType.includes(this.filters.mimeType));
    }

    // Apply date range filter
    if (this.filters.dateRange?.start && this.filters.dateRange?.end) {
      const startDate = new Date(this.filters.dateRange.start);
      const endDate = new Date(this.filters.dateRange.end + 'T23:59:59');
      
      filtered = filtered.filter(doc => {
        const docDate = new Date(doc.createdAt);
        return docDate >= startDate && docDate <= endDate;
      });
    }

    // Apply sorting
    filtered = this.documentService.sortDocuments(filtered, this.sortBy, this.sortDirection);

    this.filteredDocuments = filtered;
    this.totalItems = filtered.length;
    this.calculatePagination();
    this.currentPage = 1; // Reset to first page when filters change
  }

  clearFilters(): void {
    this.filters = {
      searchTerm: '',
      clientId: null,
      processId: null,
      mimeType: '',
      dateRange: null
    };
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  // Upload methods
  openUploadModal(): void {
    this.resetUploadState();
    this.showUploadModal = true;
  }

  closeUploadModal(): void {
    this.showUploadModal = false;
    this.resetUploadState();
  }

  resetUploadState(): void {
    this.uploadState = {
      isUploading: false,
      progress: 0,
      uploadedFile: null,
      selectedClientId: null,
      selectedProcessId: null
    };
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      // Validate file before setting
      const validationError = this.documentService.validateFile(file);
      if (validationError) {
        this.showError(validationError);
        target.value = ''; // Clear the input
        return;
      }
      
      this.uploadState.uploadedFile = file;
    }
  }

  async uploadDocument(): Promise<void> {
    if (!this.uploadState.uploadedFile || !this.uploadState.selectedClientId || !this.uploadState.selectedProcessId) {
      this.showError('Please select a file, client, and process.');
      return;
    }

    this.uploadState.isUploading = true;
    this.uploadState.progress = 0;

    try {
      const uploadRequest: FileUploadRequest = {
        file: this.uploadState.uploadedFile,
        clientId: this.uploadState.selectedClientId,
        processId: this.uploadState.selectedProcessId
      };

      // Use upload with progress tracking
      this.documentService.uploadDocumentWithProgress(uploadRequest).subscribe({
        next: (event) => {
          if (event.type === 'progress') {
            this.uploadState.progress = event.progress || 0;
          } else if (event.type === 'success' && event.document) {
            this.documents.unshift(event.document);
            this.applyFilters();
            this.showSuccess('Document uploaded successfully!');
            this.closeUploadModal();
          }
        },
        error: (error) => {
          console.error('Upload error:', error);
          this.showError(error || 'Failed to upload document.');
          this.uploadState.isUploading = false;
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      this.showError('Failed to upload document.');
      this.uploadState.isUploading = false;
    }
  }

  // Download methods
  downloadDocument(document: DocumentDTO): void {
    this.documentService.downloadDocumentWithFilename(document.id, document.documentName);
  }

  // Delete and restore methods
  confirmDelete(document: DocumentDTO): void {
    this.selectedDocument = document;
    this.showDeleteConfirm = true;
  }

  async deleteDocument(): Promise<void> {
    if (!this.selectedDocument) return;

    try {
      const success = await this.documentService.deleteDocument(this.selectedDocument.id).toPromise();
      
      if (success) {
        // Remove from current documents list
        this.documents = this.documents.filter(d => d.id !== this.selectedDocument!.id);
        this.applyFilters();
        this.showSuccess('Document deleted successfully!');
      } else {
        this.showError('Failed to delete document.');
      }
    } catch (error) {
      console.error('Delete error:', error);
      this.showError('Failed to delete document.');
    } finally {
      this.showDeleteConfirm = false;
      this.selectedDocument = null;
    }
  }

  async loadDeletedDocuments(): Promise<void> {
    if (this.showDeletedDocuments) {
      this.showDeletedDocuments = false;
      return;
    }

    this.isLoading = true;
    try {
      this.deletedDocuments = await this.documentService.getDeletedDocuments().toPromise() || [];
      this.showDeletedDocuments = true;
    } catch (error) {
      console.error('Error loading deleted documents:', error);
      this.showError('Failed to load deleted documents.');
    } finally {
      this.isLoading = false;
    }
  }

  confirmRestore(document: DocumentDTO): void {
    this.selectedDocument = document;
    this.showRestoreConfirm = true;
  }

  async restoreDocument(): Promise<void> {
    if (!this.selectedDocument) return;

    try {
      const success = await this.documentService.restoreDocument(this.selectedDocument.id).toPromise();
      
      if (success) {
        // Remove from deleted documents and reload active documents
        this.deletedDocuments = this.deletedDocuments.filter(d => d.id !== this.selectedDocument!.id);
        await this.loadInitialData();
        this.showSuccess('Document restored successfully!');
      } else {
        this.showError('Failed to restore document.');
      }
    } catch (error) {
      console.error('Restore error:', error);
      this.showError('Failed to restore document.');
    } finally {
      this.showRestoreConfirm = false;
      this.selectedDocument = null;
    }
  }

  // Bulk operations
  toggleDocumentSelection(documentId: number): void {
    if (this.selectedDocuments.has(documentId)) {
      this.selectedDocuments.delete(documentId);
    } else {
      this.selectedDocuments.add(documentId);
    }
  }

  toggleAllDocuments(): void {
    const currentPageDocuments = this.getPaginatedDocuments();
    const allSelected = currentPageDocuments.every(doc => this.selectedDocuments.has(doc.id));
    
    if (allSelected) {
      currentPageDocuments.forEach(doc => this.selectedDocuments.delete(doc.id));
    } else {
      currentPageDocuments.forEach(doc => this.selectedDocuments.add(doc.id));
    }
  }

  async bulkDelete(): Promise<void> {
    if (this.selectedDocuments.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${this.selectedDocuments.size} document(s)?`;
    if (!confirm(confirmMessage)) return;

    this.isLoading = true;
    
    try {
      const deletePromises = Array.from(this.selectedDocuments).map(id =>
        this.documentService.deleteDocument(id).toPromise()
      );
      
      await Promise.all(deletePromises);
      
      // Remove deleted documents from the list
      this.documents = this.documents.filter(d => !this.selectedDocuments.has(d.id));
      this.selectedDocuments.clear();
      this.applyFilters();
      
      this.showSuccess('Documents deleted successfully!');
    } catch (error) {
      console.error('Bulk delete error:', error);
      this.showError('Failed to delete some documents.');
    } finally {
      this.isLoading = false;
    }
  }

  // Pagination methods
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
  }

  getPaginatedDocuments(): DocumentDTO[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredDocuments.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Sorting methods
  sortDocuments(sortBy: 'name' | 'size' | 'date' | 'client' | 'process'): void {
    if (this.sortBy === sortBy) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) {
      return 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'; // Sort icon
    }
    
    return this.sortDirection === 'asc' 
      ? 'M3 4l6 6l6-6' // Up arrow
      : 'M3 20l6-6l6 6'; // Down arrow
  }

  // Utility methods
  formatFileSize(bytes: number): string {
    return this.documentService.formatFileSize(bytes);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canPreviewInBrowser(mimeType: string): boolean {
    return this.documentService.canPreviewInBrowser(mimeType);
  }

  // UI state methods
  onToggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  onCloseSidebar(): void {
    this.isSidebarOpen = false;
  }

  showError(message: string): void {
    this.error = message;
    this.successMessage = null;
    setTimeout(() => this.error = null, 5000);
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.error = null;
    setTimeout(() => this.successMessage = null, 5000);
  }

  clearMessages(): void {
    this.error = null;
    this.successMessage = null;
  }

  // Navigation methods
  navigateToHome(): void {
    this.router.navigate(['/admin']);
  }

  isAllCurrentPageSelected(): boolean {
    const currentPageDocuments = this.getPaginatedDocuments();
    return currentPageDocuments.length > 0 && 
           currentPageDocuments.every(doc => this.selectedDocuments.has(doc.id));
  }

  isSomeCurrentPageSelected(): boolean {
    const currentPageDocuments = this.getPaginatedDocuments();
    return currentPageDocuments.some(doc => this.selectedDocuments.has(doc.id));
  }

  getPageInfo(): string {
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `${startItem}-${endItem} of ${this.totalItems}`;
  }

  getSelectedClientName(): string {
    if (!this.uploadState.selectedClientId) return '';
    const client = this.clients.find(c => c.id === this.uploadState.selectedClientId);
    return client ? client.clientName : '';
  }

  getSelectedProcessName(): string {
    if (!this.uploadState.selectedProcessId) return '';
    const process = this.processes.find(p => p.id === this.uploadState.selectedProcessId);
    return process ? process.processName : '';
  }

  
trackByDocumentId(index: number, document: DocumentDTO): number {
  return document.id;
}

// Update the component to add missing functionality:

// Add date range filter methods
setDateRangeFilter(startDate: string, endDate: string): void {
  this.filters.dateRange = {
    start: startDate,
    end: endDate
  };
  this.applyFilters();
}

clearDateRangeFilter(): void {
  this.filters.dateRange = null;
  this.applyFilters();
}

// Add file type detection for better icons
getFileTypeFromMimeType(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  return 'default';
}

// Enhanced file icon method
getFileIcon(mimeType: string): string {
  const fileType = this.getFileTypeFromMimeType(mimeType);
  
  const iconPaths: { [key: string]: string } = {
    'pdf': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    'image': 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    'document': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    'spreadsheet': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    'presentation': 'M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1h-2a1 1 0 01-1-1V4M7 4H5a1 1 0 00-1 1v14a1 1 0 001 1h2M7 4h10M7 8h10M7 12h10M7 16h10',
    'default': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
  };
  
  return iconPaths[fileType] || iconPaths['default'];
}

// Add advanced search functionality
performAdvancedSearch(): void {
  // This could be expanded to include more complex search logic
  this.applyFilters();
}

// Add document statistics
getDocumentStatistics(): {
  totalCount: number;
  totalSize: number;
  byFileType: { [key: string]: number };
  byClient: { [key: string]: number };
  averageFileSize: number;
} {
  const stats = {
    totalCount: this.documents.length,
    totalSize: this.documents.reduce((sum, doc) => sum + doc.fileSize, 0),
    byFileType: {} as { [key: string]: number },
    byClient: {} as { [key: string]: number },
    averageFileSize: 0
  };

  // Calculate file type distribution
  this.documents.forEach(doc => {
    const fileType = this.getFileTypeFromMimeType(doc.mimeType);
    stats.byFileType[fileType] = (stats.byFileType[fileType] || 0) + 1;
    stats.byClient[doc.clientName] = (stats.byClient[doc.clientName] || 0) + 1;
  });

  // Calculate average file size
  stats.averageFileSize = stats.totalCount > 0 ? stats.totalSize / stats.totalCount : 0;

  return stats;
}

// Add export functionality
exportDocumentList(): void {
  const csvContent = this.generateCSVContent();
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `documents_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

private generateCSVContent(): string {
  const headers = ['Document Name', 'Client', 'Process', 'File Size', 'Uploaded By', 'Upload Date', 'File Type'];
  const csvRows = [headers.join(',')];

  this.filteredDocuments.forEach(doc => {
    const row = [
      `"${doc.documentName.replace(/"/g, '""')}"`,
      `"${doc.clientName.replace(/"/g, '""')}"`,
      `"${doc.processName.replace(/"/g, '""')}"`,
      this.formatFileSize(doc.fileSize),
      `"${doc.uploadedByName.replace(/"/g, '""')}"`,
      this.formatDate(doc.createdAt),
      this.getFileTypeFromMimeType(doc.mimeType)
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

// Add keyboard shortcuts support
@HostListener('document:keydown', ['$event'])
handleKeyboardShortcuts(event: KeyboardEvent): void {
  // Ctrl+U for upload
  if (event.ctrlKey && event.key === 'u') {
    event.preventDefault();
    this.openUploadModal();
  }
  
  // Ctrl+F for search focus
  if (event.ctrlKey && event.key === 'f') {
    event.preventDefault();
    const searchInput = document.querySelector('input[placeholder="Search documents..."]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  }
  
  // Escape to close modals
  if (event.key === 'Escape') {
    this.closeUploadModal();
    this.showDeleteConfirm = false;
    this.showRestoreConfirm = false;
  }
}

// Add drag and drop support for file uploads
@HostListener('dragover', ['$event'])
onDragOver(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

@HostListener('dragleave', ['$event'])
onDragLeave(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
}

@HostListener('drop', ['$event'])
onDrop(event: DragEvent): void {
  event.preventDefault();
  event.stopPropagation();
  
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    const validationError = this.documentService.validateFile(file);
    
    if (validationError) {
      this.showError(validationError);
      return;
    }
    
    this.uploadState.uploadedFile = file;
    if (!this.showUploadModal) {
      this.openUploadModal();
    }
  }
}

// Add document preview functionality
previewDocument(document: DocumentDTO): void {
  if (this.canPreviewInBrowser(document.mimeType)) {
    const previewUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.DOCUMENTS}/${document.id}/download`;
    window.open(previewUrl, '_blank');
  } else {
    this.showError('Preview not available for this file type.');
  }
}

// Add refresh functionality
async refreshDocuments(): Promise<void> {
  await this.loadInitialData();
  this.showSuccess('Documents refreshed successfully!');
}

// Add validation for upload form
isUploadFormValid(): boolean {
  return !!(
    this.uploadState.uploadedFile &&
    this.uploadState.selectedClientId &&
    this.uploadState.selectedProcessId
  );
}

// Add method to get upload validation errors
getUploadValidationErrors(): string[] {
  const errors: string[] = [];
  
  if (!this.uploadState.uploadedFile) {
    errors.push('Please select a file to upload');
  }
  
  if (!this.uploadState.selectedClientId) {
    errors.push('Please select a client');
  }
  
  if (!this.uploadState.selectedProcessId) {
    errors.push('Please select a process');
  }
  
  return errors;
}

// Add method to handle file input click
triggerFileInput(): void {
  this.fileInput.nativeElement.click();
}

// Add method to format dates consistently
formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  });
}

// Add method to check if user can perform bulk operations
canPerformBulkOperations(): boolean {
  return this.selectedDocuments.size > 0 && this.authService.isAdmin();
}

// Add method to get file extension
getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

// Add method to validate file extension
isValidFileExtension(filename: string): boolean {
  const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png', 'gif'];
  const extension = this.getFileExtension(filename);
  return validExtensions.includes(extension);
}


}