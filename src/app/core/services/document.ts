import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  Document, 
  DocumentDTO, 
  FileUploadRequest,
  ApiResponse,
  API_ENDPOINTS,
  FILE_SIZE_LIMITS 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly baseUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.DOCUMENTS}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all documents (Admin gets all, others get only accessible documents)
   */
  getAllDocuments(): Observable<DocumentDTO[]> {
    return this.http.get<ApiResponse<DocumentDTO[]>>(this.baseUrl)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get documents');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get all documents error:', error);
          return throwError(() => error.message || 'Failed to get documents');
        })
      );
  }

  /**
   * Get user-accessible documents (based on effort assignments)
   */
  getUserDocuments(): Observable<DocumentDTO[]> {
    // Backend automatically filters based on user's effort assignments
    return this.getAllDocuments();
  }

  /**
   * Upload document (Admin only)
   */
  uploadDocument(uploadRequest: FileUploadRequest): Observable<DocumentDTO> {
    // Validate file before upload
    const validationError = this.validateFile(uploadRequest.file);
    if (validationError) {
      return throwError(() => validationError);
    }

    const formData = new FormData();
    formData.append('file', uploadRequest.file);
    formData.append('clientId', uploadRequest.clientId.toString());
    formData.append('processId', uploadRequest.processId.toString());

    return this.http.post<ApiResponse<DocumentDTO>>(`${this.baseUrl}/upload`, formData)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to upload document');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Upload document error:', error);
          let errorMessage = 'Failed to upload document';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errors && error.error.errors.length > 0) {
            errorMessage = error.error.errors.join(', ');
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          return throwError(() => errorMessage);
        })
      );
  }

  /**
   * Upload document with progress tracking
   */
  uploadDocumentWithProgress(uploadRequest: FileUploadRequest): Observable<{
    type: 'progress' | 'success';
    progress?: number;
    document?: DocumentDTO;
  }> {
    // Validate file before upload
    const validationError = this.validateFile(uploadRequest.file);
    if (validationError) {
      return throwError(() => validationError);
    }

    const formData = new FormData();
    formData.append('file', uploadRequest.file);
    formData.append('clientId', uploadRequest.clientId.toString());
    formData.append('processId', uploadRequest.processId.toString());

    return this.http.post<ApiResponse<DocumentDTO>>(`${this.baseUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
          return { type: 'progress' as const, progress };
        } else if (event.type === HttpEventType.Response) {
          const response = event.body as ApiResponse<DocumentDTO>;
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to upload document');
          }
          return { type: 'success' as const, document: response.data };
        } else {
          return { type: 'progress' as const, progress: 0 };
        }
      }),
      catchError(error => {
        console.error('Upload document with progress error:', error);
        let errorMessage = 'Failed to upload document';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Download document
   */
  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${documentId}/download`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Download document error:', error);
        let errorMessage = 'Failed to download document';
        
        if (error.status === 403) {
          errorMessage = 'You do not have permission to download this document';
        } else if (error.status === 404) {
          errorMessage = 'Document not found';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Download document with filename
   */
  downloadDocumentWithFilename(documentId: number, filename: string): void {
    this.downloadDocument(documentId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download error:', error);
        // Handle error (show notification, etc.)
      }
    });
  }

  /**
   * Delete document (soft delete - Admin only)
   */
  deleteDocument(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete document');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Delete document error:', error);
          let errorMessage = 'Failed to delete document';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          return throwError(() => errorMessage);
        })
      );
  }

  /**
   * Restore document (Admin only)
   */
  restoreDocument(id: number): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/restore`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to restore document');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Restore document error:', error);
          return throwError(() => error.message || 'Failed to restore document');
        })
      );
  }

  /**
   * Get deleted documents (Admin only)
   */
  getDeletedDocuments(): Observable<DocumentDTO[]> {
    return this.http.get<ApiResponse<DocumentDTO[]>>(`${this.baseUrl}/deleted`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get deleted documents');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get deleted documents error:', error);
          return throwError(() => error.message || 'Failed to get deleted documents');
        })
      );
  }

  /**
   * Get documents by client
   */
  getDocumentsByClient(clientId: number): Observable<DocumentDTO[]> {
    return this.getAllDocuments().pipe(
      map(documents => documents.filter(doc => doc.clientId === clientId)),
      catchError(error => {
        console.error('Get documents by client error:', error);
        return throwError(() => error.message || 'Failed to get documents by client');
      })
    );
  }

  /**
   * Get documents by process
   */
  getDocumentsByProcess(processId: number): Observable<DocumentDTO[]> {
    return this.getAllDocuments().pipe(
      map(documents => documents.filter(doc => doc.processId === processId)),
      catchError(error => {
        console.error('Get documents by process error:', error);
        return throwError(() => error.message || 'Failed to get documents by process');
      })
    );
  }

  /**
   * Get documents by client and process
   */
  getDocumentsByClientAndProcess(clientId: number, processId: number): Observable<DocumentDTO[]> {
    return this.getAllDocuments().pipe(
      map(documents => documents.filter(doc => 
        doc.clientId === clientId && doc.processId === processId
      )),
      catchError(error => {
        console.error('Get documents by client and process error:', error);
        return throwError(() => error.message || 'Failed to get documents');
      })
    );
  }

  /**
   * Search documents
   */
  searchDocuments(searchTerm: string): Observable<DocumentDTO[]> {
    if (!searchTerm.trim()) {
      return this.getAllDocuments();
    }

    return this.getAllDocuments().pipe(
      map(documents => documents.filter(doc => 
        doc.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.uploadedByName.toLowerCase().includes(searchTerm.toLowerCase())
      )),
      catchError(error => {
        console.error('Search documents error:', error);
        return throwError(() => error.message || 'Failed to search documents');
      })
    );
  }

  /**
   * Get document statistics
   */
  getDocumentStats(): Observable<{
    total: number;
    totalSize: number;
    byClient: { [key: string]: number };
    byProcess: { [key: string]: number };
    byMimeType: { [key: string]: number };
    deleted: number;
  }> {
    return this.getAllDocuments().pipe(
      map(documents => {
        const stats = {
          total: documents.length,
          totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0),
          byClient: documents.reduce((acc, doc) => {
            acc[doc.clientName] = (acc[doc.clientName] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number }),
          byProcess: documents.reduce((acc, doc) => {
            acc[doc.processName] = (acc[doc.processName] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number }),
          byMimeType: documents.reduce((acc, doc) => {
            acc[doc.mimeType] = (acc[doc.mimeType] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number }),
          deleted: 0 // This would need the deleted documents count
        };
        return stats;
      }),
      catchError(error => {
        console.error('Get document stats error:', error);
        return throwError(() => error.message || 'Failed to get document statistics');
      })
    );
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): string | null {
    // Check file size
    if (file.size > FILE_SIZE_LIMITS.MAX_FILE_SIZE) {
      const maxSizeMB = FILE_SIZE_LIMITS.MAX_FILE_SIZE / (1024 * 1024);
      return `File size exceeds maximum limit of ${maxSizeMB}MB`;
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!FILE_SIZE_LIMITS.ALLOWED_EXTENSIONS.includes(fileExtension as any)) {
      return `File type not allowed. Allowed types: ${FILE_SIZE_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`;
    }

    // Check file name
    if (!file.name.trim()) {
      return 'File name is required';
    }

    if (file.name.length > 255) {
      return 'File name is too long (maximum 255 characters)';
    }

    return null; // No validation errors
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file icon based on mime type
   */
  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table_chart';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'slideshow';
    if (mimeType.includes('text')) return 'text_snippet';
    return 'insert_drive_file';
  }

  /**
   * Check if file is an image
   */
  isImageFile(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  /**
   * Check if file can be previewed in browser
   */
  canPreviewInBrowser(mimeType: string): boolean {
    const previewableMimeTypes = [
      'application/pdf',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json'
    ];
    
    return mimeType.startsWith('image/') || previewableMimeTypes.includes(mimeType);
  }

  /**
   * Sort documents by different criteria
   */
  sortDocuments(documents: DocumentDTO[], sortBy: 'name' | 'size' | 'date' | 'client' | 'process', direction: 'asc' | 'desc' = 'asc'): DocumentDTO[] {
    return [...documents].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.documentName.localeCompare(b.documentName);
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'client':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'process':
          comparison = a.processName.localeCompare(b.processName);
          break;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Filter documents by multiple criteria
   */
  filterDocuments(documents: DocumentDTO[], filters: {
    clientId?: number;
    processId?: number;
    mimeType?: string;
    searchTerm?: string;
    dateRange?: { start: Date; end: Date };
  }): DocumentDTO[] {
    return documents.filter(document => {
      // Client filter
      if (filters.clientId && document.clientId !== filters.clientId) {
        return false;
      }
      
      // Process filter
      if (filters.processId && document.processId !== filters.processId) {
        return false;
      }
      
      // MIME type filter
      if (filters.mimeType && !document.mimeType.includes(filters.mimeType)) {
        return false;
      }
      
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!document.documentName.toLowerCase().includes(searchLower) &&
            !document.clientName.toLowerCase().includes(searchLower) &&
            !document.processName.toLowerCase().includes(searchLower) &&
            !document.uploadedByName.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateRange) {
        const docDate = new Date(document.createdAt);
        if (docDate < filters.dateRange.start || docDate > filters.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }
}