import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  Process, 
  ProcessDTO, 
  ApiResponse,
  API_ENDPOINTS 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ProcessService {
  private readonly baseUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.PROCESSES}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all processes
   */
  getAllProcesses(): Observable<ProcessDTO[]> {
    return this.http.get<ApiResponse<ProcessDTO[]>>(this.baseUrl)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get processes');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get all processes error:', error);
          return throwError(() => error.message || 'Failed to get processes');
        })
      );
  }

  /**
   * Get process by ID
   */
  getProcessById(id: number): Observable<ProcessDTO> {
    return this.http.get<ApiResponse<ProcessDTO>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Process not found');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Get process by ID error:', error);
          return throwError(() => error.message || 'Failed to get process');
        })
      );
  }

  /**
   * Create new process (Admin only)
   */
  createProcess(process: Process): Observable<ProcessDTO> {
    // Remove fields that shouldn't be sent to backend
    const processPayload = {
      processCode: process.processCode,
      processName: process.processName,
      description: process.description
    };

    return this.http.post<ApiResponse<ProcessDTO>>(this.baseUrl, processPayload)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create process');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Create process error:', error);
          let errorMessage = 'Failed to create process';
          
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
   * Update process (Admin only)
   */
  updateProcess(id: number, process: Partial<Process>): Observable<boolean> {
    // Only send updateable fields
    const processPayload = {
      processName: process.processName,
      description: process.description
    };

    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, processPayload)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update process');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Update process error:', error);
          let errorMessage = 'Failed to update process';
          
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
   * Delete process (soft delete - Admin only)
   */
  deleteProcess(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete process');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Delete process error:', error);
          let errorMessage = 'Failed to delete process';
          
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
   * Restore process (Admin only)
   */
  restoreProcess(id: number): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/restore`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to restore process');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Restore process error:', error);
          return throwError(() => error.message || 'Failed to restore process');
        })
      );
  }

  /**
   * Get deleted processes (Admin only)
   */
  getDeletedProcesses(): Observable<ProcessDTO[]> {
    return this.http.get<ApiResponse<ProcessDTO[]>>(`${this.baseUrl}/deleted`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get deleted processes');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get deleted processes error:', error);
          return throwError(() => error.message || 'Failed to get deleted processes');
        })
      );
  }

  /**
   * Search processes by name or code
   */
  searchProcesses(searchTerm: string): Observable<ProcessDTO[]> {
    if (!searchTerm.trim()) {
      return this.getAllProcesses();
    }

    return this.getAllProcesses().pipe(
      map(processes => processes.filter(process => 
        process.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.processCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (process.description && process.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )),
      catchError(error => {
        console.error('Search processes error:', error);
        return throwError(() => error.message || 'Failed to search processes');
      })
    );
  }

  /**
   * Check if process code is available
   */
  checkProcessCodeAvailability(processCode: string, excludeProcessId?: number): Observable<boolean> {
    return this.getAllProcesses().pipe(
      map(processes => {
        const existingProcess = processes.find(p => 
          p.processCode.toLowerCase() === processCode.toLowerCase() && 
          p.id !== excludeProcessId
        );
        return !existingProcess; // Returns true if available
      }),
      catchError(error => {
        console.error('Check process code availability error:', error);
        return throwError(() => 'Failed to check process code availability');
      })
    );
  }

  /**
   * Check if process name is available
   */
  checkProcessNameAvailability(processName: string, excludeProcessId?: number): Observable<boolean> {
    return this.getAllProcesses().pipe(
      map(processes => {
        const existingProcess = processes.find(p => 
          p.processName.toLowerCase() === processName.toLowerCase() && 
          p.id !== excludeProcessId
        );
        return !existingProcess; // Returns true if available
      }),
      catchError(error => {
        console.error('Check process name availability error:', error);
        return throwError(() => 'Failed to check process name availability');
      })
    );
  }

  /**
   * Get process statistics
   */
  getProcessStats(): Observable<{ 
    total: number; 
    withDescription: number;
    withoutDescription: number;
    deleted: number;
  }> {
    return this.getAllProcesses().pipe(
      map(processes => {
        const stats = {
          total: processes.length,
          withDescription: processes.filter(p => p.description && p.description.trim()).length,
          withoutDescription: processes.filter(p => !p.description || !p.description.trim()).length,
          deleted: 0 // This would need the deleted processes count
        };
        return stats;
      }),
      catchError(error => {
        console.error('Get process stats error:', error);
        return throwError(() => error.message || 'Failed to get process statistics');
      })
    );
  }

  /**
   * Get processes for dropdown/select lists
   */
  getProcessesForDropdown(): Observable<{ value: number; label: string; description?: string }[]> {
    return this.getAllProcesses().pipe(
      map(processes => processes.map(process => ({
        value: process.id,
        label: `${process.processCode} - ${process.processName}`,
        description: process.description
      }))),
      catchError(error => {
        console.error('Get processes for dropdown error:', error);
        return throwError(() => error.message || 'Failed to get processes for dropdown');
      })
    );
  }

  /**
   * Get processes by client (would need effort assignments)
   */
  getProcessesByClient(clientId: number): Observable<ProcessDTO[]> {
    // This would typically require joining with effort_assignments table
    // For now, return all processes - implement with backend support
    return this.getAllProcesses();
  }

  /**
   * Get processes assigned to a user
   */
  getProcessesByUser(userId: number): Observable<ProcessDTO[]> {
    // This would typically require joining with effort_assignments table
    // For now, return all processes - implement with backend support
    return this.getAllProcesses();
  }

  /**
   * Validate process data before create/update
   */
  validateProcessData(process: Partial<Process>, isUpdate: boolean = false): string[] {
    const errors: string[] = [];

    if (!isUpdate && !process.processCode?.trim()) {
      errors.push('Process code is required');
    }

    if (!process.processName?.trim()) {
      errors.push('Process name is required');
    }

    // Validate process code format (alphanumeric, no spaces)
    if (process.processCode && !/^[A-Za-z0-9_-]+$/.test(process.processCode)) {
      errors.push('Process code must be alphanumeric with only underscores and hyphens allowed');
    }

    // Validate process name length
    if (process.processName && process.processName.length < 2) {
      errors.push('Process name must be at least 2 characters long');
    }

    if (process.processName && process.processName.length > 255) {
      errors.push('Process name must be less than 255 characters');
    }

    // Validate description length if provided
    if (process.description && process.description.length > 1000) {
      errors.push('Description must be less than 1000 characters');
    }

    return errors;
  }

  /**
   * Sort processes by different criteria
   */
  sortProcesses(processes: ProcessDTO[], sortBy: 'name' | 'code' | 'description', direction: 'asc' | 'desc' = 'asc'): ProcessDTO[] {
    return [...processes].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.processName.localeCompare(b.processName);
          break;
        case 'code':
          comparison = a.processCode.localeCompare(b.processCode);
          break;
        case 'description':
          const aDesc = a.description || '';
          const bDesc = b.description || '';
          comparison = aDesc.localeCompare(bDesc);
          break;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Filter processes by multiple criteria
   */
  filterProcesses(processes: ProcessDTO[], filters: {
    searchTerm?: string;
    hasDescription?: boolean;
  }): ProcessDTO[] {
    return processes.filter(process => {
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!process.processName.toLowerCase().includes(searchLower) &&
            !process.processCode.toLowerCase().includes(searchLower) &&
            !(process.description && process.description.toLowerCase().includes(searchLower))) {
          return false;
        }
      }
      
      // Description filter
      if (filters.hasDescription !== undefined) {
        const hasDesc = !!(process.description && process.description.trim());
        if (filters.hasDescription !== hasDesc) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Get recently created processes
   */
  getRecentProcesses(days: number = 30): Observable<ProcessDTO[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.getAllProcesses().pipe(
      map(processes => processes.filter(process => {
        // This would need createdAt field in ProcessDTO
        // For now, return all processes
        return true;
      })),
      catchError(error => {
        console.error('Get recent processes error:', error);
        return throwError(() => error.message || 'Failed to get recent processes');
      })
    );
  }

  /**
   * Get processes with effort assignments count
   */
  getProcessesWithAssignmentCount(): Observable<(ProcessDTO & { assignmentCount: number })[]> {
    // This would need backend support to join with effort_assignments
    return this.getAllProcesses().pipe(
      map(processes => processes.map(process => ({
        ...process,
        assignmentCount: 0 // Placeholder - implement with backend support
      }))),
      catchError(error => {
        console.error('Get processes with assignment count error:', error);
        return throwError(() => error.message || 'Failed to get processes with assignment count');
      })
    );
  }
}