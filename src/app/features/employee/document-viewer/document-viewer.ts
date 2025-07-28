// src/app/features/employee/pages/employee-documents/employee-documents.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DocumentService } from '../../../core/services/document';
import { AuthService } from '../../../core/services/auth';
import { DocumentDTO, AuthUser } from '../../../core/models';
import { Loading } from '../../../shared/components/loading/loading';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

interface DocumentFilter {
  search: string;
  clientName: string;
  processName: string;
  mimeType: string;
  sortBy: 'name' | 'size' | 'date' | 'client' | 'process';
  sortDirection: 'asc' | 'desc';
}

@Component({
  selector: 'app-employee-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, Loading, Modal, ConfirmDialog],
  templateUrl: './employee-documents.component.html',
  styleUrls: ['./employee-documents.component.css']
})
export class DocumentViewer implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  documents: DocumentDTO[] = [];
  filteredDocuments: DocumentDTO[] = [];
  currentUser: AuthUser | null = null;
  
  // UI state
  isLoading = true;
  isDownloading = false;
  showPreviewModal = false;
  selectedDocument: DocumentDTO | null = null;
  previewContent: string | null = null;
  
  // Filter and search
  filter: DocumentFilter = {
    search: '',
    clientName: '',
    processName: '',
    mimeType: '',
    sortBy: 'date',
    sortDirection: 'desc'
  };
  
  // Filter options
  availableClients: string[] = [];
  availableProcesses: string[] = [];
  availableMimeTypes: { value: string; label: string }[] = [];
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 12;
  totalPages = 1;
  
  constructor(
    private documentService: DocumentService,
    private authService: AuthService
  ) {}
  
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDocuments();
    this.setupFilterChangeHandling();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private setupFilterChangeHandling(): void {
    // Create observables for search input debouncing
    const searchSubject = new Subject<string>();
    
    searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.applyFilters();
    });
    
    // Store reference for search input
    (this as any).searchSubject = searchSubject;
  }
  
  loadDocuments(): void {
    this.isLoading = true;
    
    this.documentService.getUserDocuments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documents) => {
          this.documents = documents;
          this.extractFilterOptions();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading documents:', error);
          this.isLoading = false;
          // Handle error appropriately
        }
      });
  }
  
  private extractFilterOptions(): void {
    // Extract unique client names
    this.availableClients = [...new Set(this.documents.map(doc => doc.clientName))].sort();
    
    // Extract unique process names
    this.availableProcesses = [...new Set(this.documents.map(doc => doc.processName))].sort();
    
    // Extract unique mime types with friendly labels
    const mimeTypes = [...new Set(this.documents.map(doc => doc.mimeType))];
    this.availableMimeTypes = mimeTypes.map(mimeType => ({
      value: mimeType,
      label: this.getMimeTypeLabel(mimeType)
    })).sort((a, b) => a.label.localeCompare(b.label));
  }
  

  onSearchChange(searchTerm: string): void {
    this.filter.search = searchTerm;
    (this as any).searchSubject.next(searchTerm);
  }
  
  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }
  
  onSortChange(sortBy: string): void {
    if (this.filter.sortBy === sortBy) {
      this.filter.sortDirection = this.filter.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.filter.sortBy = sortBy as any;
      this.filter.sortDirection = 'asc';
    }
    this.applyFilters();
  }
  
  private applyFilters(): void {
    let filtered = [...this.documents];
    
    // Apply search filter
    if (this.filter.search.trim()) {
      const searchTerm = this.filter.search.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.documentName.toLowerCase().includes(searchTerm) ||
        doc.clientName.toLowerCase().includes(searchTerm) ||
        doc.processName.toLowerCase().includes(searchTerm) ||
        doc.uploadedByName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply client filter
    if (this.filter.clientName) {
      filtered = filtered.filter(doc => doc.clientName === this.filter.clientName);
    }
    
    // Apply process filter
    if (this.filter.processName) {
      filtered = filtered.filter(doc => doc.processName === this.filter.processName);
    }
    
    // Apply mime type filter
    if (this.filter.mimeType) {
      filtered = filtered.filter(doc => doc.mimeType === this.filter.mimeType);
    }
    
    // Apply sorting
    filtered = this.documentService.sortDocuments(filtered, this.filter.sortBy, this.filter.sortDirection);
    
    this.filteredDocuments = filtered;
    this.calculatePagination();
  }
  
  private calculatePagination(): void {
    this.totalPages = Math.ceil(this.filteredDocuments.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }
  
  get paginatedDocuments(): DocumentDTO[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredDocuments.slice(startIndex, endIndex);
  }
  
  get totalDocuments(): number {
    return this.filteredDocuments.length;
  }
  
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }
  
  clearFilters(): void {
    this.filter = {
      search: '',
      clientName: '',
      processName: '',
      mimeType: '',
      sortBy: 'date',
      sortDirection: 'desc'
    };
    this.currentPage = 1;
    this.applyFilters();
  }
  
  downloadDocument(document: DocumentDTO): void {
    this.isDownloading = true;
    
    this.documentService.downloadDocumentWithFilename(
      document.id,
      document.documentName
    );
    
    // Reset downloading state after a delay
    setTimeout(() => {
      this.isDownloading = false;
    }, 2000);
  }
  
  previewDocument(document: DocumentDTO): void {
    this.selectedDocument = document;
    
    if (this.documentService.canPreviewInBrowser(document.mimeType)) {
      this.showPreviewModal = true;
      this.loadPreviewContent(document);
    } else {
      // For non-previewable files, just download them
      this.downloadDocument(document);
    }
  }
  
  private loadPreviewContent(document: DocumentDTO): void {
    if (document.mimeType === 'text/plain') {
      // For text files, we could potentially load and display content
      // For now, we'll just show document info
      this.previewContent = `Document: ${document.documentName}\nSize: ${this.formatFileSize(document.fileSize)}\nType: ${document.mimeType}`;
    } else {
      // For other previewable files (PDF, images), show basic info
      this.previewContent = null;
    }
  }
  
  closePreviewModal(): void {
    this.showPreviewModal = false;
    this.selectedDocument = null;
    this.previewContent = null;
  }
  
  formatFileSize(bytes: number): string {
    return this.documentService.formatFileSize(bytes);
  }
  
  getFileIcon(mimeType: string): string {
    return this.documentService.getFileIcon(mimeType);
  }
  
  isImageFile(mimeType: string): boolean {
    return this.documentService.isImageFile(mimeType);
  }
  
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return `${Math.floor(diffDays / 30)} months ago`;
    }
  }
  
  getSortIcon(columnName: string): string {
    if (this.filter.sortBy !== columnName) {
      return 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'; // sort icon
    }
    
    if (this.filter.sortDirection === 'asc') {
      return 'M3 4h13M3 8h9m-9 4h6m4 0l4-4m-4 4l4 4'; // sort up
    } else {
      return 'M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4'; // sort down
    }
  }
  
  refreshDocuments(): void {
    this.loadDocuments();
  }
  
  // Helper method for pagination
  getPageNumbers(): number[] {
    const pageNumbers: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    // Adjust startPage if we're near the end
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  }
  
  // Helper method for tracking documents in ngFor
  trackByDocumentId(index: number, document: DocumentDTO): number {
    return document.id;
  }
  
  // Helper method to get mime type label (public version)
  getMimeTypeLabel(mimeType: string): string {
    const mimeTypeLabels: { [key: string]: string } = {
      'application/pdf': 'PDF Documents',
      'application/msword': 'Word Documents',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Documents',
      'application/vnd.ms-excel': 'Excel Spreadsheets',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheets',
      'application/vnd.ms-powerpoint': 'PowerPoint Presentations',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentations',
      'text/plain': 'Text Files',
      'image/jpeg': 'JPEG Images',
      'image/jpg': 'JPEG Images',
      'image/png': 'PNG Images',
      'image/gif': 'GIF Images'
    };
    
    return mimeTypeLabels[mimeType] || mimeType;
  }
}