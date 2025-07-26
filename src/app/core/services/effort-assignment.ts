import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  EffortAssignment,
  EffortAssignmentDTO, 
  CreateEffortAssignmentRequest,
  ApiResponse,
  API_ENDPOINTS 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class EffortAssignmentService {
  private readonly baseUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.EFFORT_ASSIGNMENTS}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all effort assignments (Admin/Manager only)
   */
  getAllAssignments(): Observable<EffortAssignmentDTO[]> {
    return this.http.get<ApiResponse<EffortAssignmentDTO[]>>(this.baseUrl)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get effort assignments');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get all assignments error:', error);
          return throwError(() => error.message || 'Failed to get effort assignments');
        })
      );
  }

  /**
   * Get user's effort assignments
   */
  getUserAssignments(userId: number): Observable<EffortAssignmentDTO[]> {
    return this.http.get<ApiResponse<EffortAssignmentDTO[]>>(`${this.baseUrl}/user/${userId}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get user assignments');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get user assignments error:', error);
          return throwError(() => error.message || 'Failed to get user assignments');
        })
      );
  }

  /**
   * Get user's total effort allocation
   */
  getUserTotalEffort(userId: number): Observable<number> {
    return this.http.get<ApiResponse<number>>(`${this.baseUrl}/user/${userId}/total-effort`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get user total effort');
          }
          return response.data || 0;
        }),
        catchError(error => {
          console.error('Get user total effort error:', error);
          return throwError(() => error.message || 'Failed to get user total effort');
        })
      );
  }

  /**
   * Create new effort assignment (Admin/Manager only)
   */
  createAssignment(request: CreateEffortAssignmentRequest): Observable<EffortAssignmentDTO> {
    // Validate effort value
    const validationError = this.validateEffortValue(request.effortValue);
    if (validationError) {
      return throwError(() => validationError);
    }

    return this.http.post<ApiResponse<EffortAssignmentDTO>>(this.baseUrl, request)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create effort assignment');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Create assignment error:', error);
          let errorMessage = 'Failed to create effort assignment';
          
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
   * Update effort assignment (Admin/Manager only)
   */
  updateAssignment(id: number, effortValue: number): Observable<boolean> {
    // Validate effort value
    const validationError = this.validateEffortValue(effortValue);
    if (validationError) {
      return throwError(() => validationError);
    }

    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, effortValue, {
      headers: { 'Content-Type': 'application/json' }
    })
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update effort assignment');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Update assignment error:', error);
          let errorMessage = 'Failed to update effort assignment';
          
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
   * Delete effort assignment (soft delete - Admin/Manager only)
   */
  deleteAssignment(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete effort assignment');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Delete assignment error:', error);
          let errorMessage = 'Failed to delete effort assignment';
          
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
   * Restore effort assignment (Admin/Manager only)
   */
  restoreAssignment(id: number): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/restore`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to restore effort assignment');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Restore assignment error:', error);
          return throwError(() => error.message || 'Failed to restore effort assignment');
        })
      );
  }

  /**
   * Get deleted effort assignments (Admin/Manager only)
   */
  getDeletedAssignments(): Observable<EffortAssignmentDTO[]> {
    return this.http.get<ApiResponse<EffortAssignmentDTO[]>>(`${this.baseUrl}/deleted`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get deleted assignments');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get deleted assignments error:', error);
          return throwError(() => error.message || 'Failed to get deleted assignments');
        })
      );
  }

  /**
   * Check if user can be assigned additional effort
   */
  canAssignEffort(userId: number, additionalEffort: number): Observable<boolean> {
    return this.getUserTotalEffort(userId).pipe(
      map(currentTotal => {
        const newTotal = currentTotal + additionalEffort;
        return newTotal <= 1.0;
      }),
      catchError(error => {
        console.error('Can assign effort error:', error);
        return throwError(() => error.message || 'Failed to check effort availability');
      })
    );
  }

  /**
   * Get remaining effort capacity for user
   */
  getRemainingEffortCapacity(userId: number): Observable<number> {
    return this.getUserTotalEffort(userId).pipe(
      map(currentTotal => {
        const remaining = 1.0 - currentTotal;
        return Math.max(0, remaining);
      }),
      catchError(error => {
        console.error('Get remaining effort capacity error:', error);
        return throwError(() => error.message || 'Failed to get remaining effort capacity');
      })
    );
  }

  /**
   * Get effort assignments by client
   */
  getAssignmentsByClient(clientId: number): Observable<EffortAssignmentDTO[]> {
    return this.getAllAssignments().pipe(
      map(assignments => assignments.filter(assignment => assignment.clientId === clientId)),
      catchError(error => {
        console.error('Get assignments by client error:', error);
        return throwError(() => error.message || 'Failed to get assignments by client');
      })
    );
  }

  /**
   * Get effort assignments by process
   */
  getAssignmentsByProcess(processId: number): Observable<EffortAssignmentDTO[]> {
    return this.getAllAssignments().pipe(
      map(assignments => assignments.filter(assignment => assignment.processId === processId)),
      catchError(error => {
        console.error('Get assignments by process error:', error);
        return throwError(() => error.message || 'Failed to get assignments by process');
      })
    );
  }

  /**
   * Get effort assignments by client and process
   */
  getAssignmentsByClientAndProcess(clientId: number, processId: number): Observable<EffortAssignmentDTO[]> {
    return this.getAllAssignments().pipe(
      map(assignments => assignments.filter(assignment => 
        assignment.clientId === clientId && assignment.processId === processId
      )),
      catchError(error => {
        console.error('Get assignments by client and process error:', error);
        return throwError(() => error.message || 'Failed to get assignments');
      })
    );
  }

  /**
   * Search effort assignments
   */
  searchAssignments(searchTerm: string): Observable<EffortAssignmentDTO[]> {
    if (!searchTerm.trim()) {
      return this.getAllAssignments();
    }

    return this.getAllAssignments().pipe(
      map(assignments => assignments.filter(assignment => 
        assignment.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.processName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.assignedByName.toLowerCase().includes(searchTerm.toLowerCase())
      )),
      catchError(error => {
        console.error('Search assignments error:', error);
        return throwError(() => error.message || 'Failed to search assignments');
      })
    );
  }

  /**
   * Get effort assignment statistics
   */
  getAssignmentStats(): Observable<{
    totalAssignments: number;
    totalUsers: number;
    averageEffortPerUser: number;
    fullyAllocatedUsers: number;
    unallocatedUsers: number;
    byClient: { [key: string]: { assignments: number; totalEffort: number } };
    byProcess: { [key: string]: { assignments: number; totalEffort: number } };
  }> {
    return this.getAllAssignments().pipe(
      map(assignments => {
        const userEfforts = assignments.reduce((acc, assignment) => {
          if (!acc[assignment.userId]) {
            acc[assignment.userId] = { total: 0, userName: assignment.userName };
          }
          acc[assignment.userId].total += assignment.effortValue;
          return acc;
        }, {} as { [key: number]: { total: number; userName: string } });

        const totalUsers = Object.keys(userEfforts).length;
        const fullyAllocatedUsers = Object.values(userEfforts).filter(u => u.total >= 1.0).length;
        const totalEffort = Object.values(userEfforts).reduce((sum, u) => sum + u.total, 0);

        const byClient = assignments.reduce((acc, assignment) => {
          if (!acc[assignment.clientName]) {
            acc[assignment.clientName] = { assignments: 0, totalEffort: 0 };
          }
          acc[assignment.clientName].assignments++;
          acc[assignment.clientName].totalEffort += assignment.effortValue;
          return acc;
        }, {} as { [key: string]: { assignments: number; totalEffort: number } });

        const byProcess = assignments.reduce((acc, assignment) => {
          if (!acc[assignment.processName]) {
            acc[assignment.processName] = { assignments: 0, totalEffort: 0 };
          }
          acc[assignment.processName].assignments++;
          acc[assignment.processName].totalEffort += assignment.effortValue;
          return acc;
        }, {} as { [key: string]: { assignments: number; totalEffort: number } });

        return {
          totalAssignments: assignments.length,
          totalUsers,
          averageEffortPerUser: totalUsers > 0 ? totalEffort / totalUsers : 0,
          fullyAllocatedUsers,
          unallocatedUsers: 0, // Would need all users count to calculate
          byClient,
          byProcess
        };
      }),
      catchError(error => {
        console.error('Get assignment stats error:', error);
        return throwError(() => error.message || 'Failed to get assignment statistics');
      })
    );
  }

  /**
   * Get users with effort allocation summary
   */
  getUsersWithEffortSummary(): Observable<{
    userId: number;
    userName: string;
    employeeCode: string;
    totalEffort: number;
    remainingCapacity: number;
    assignments: EffortAssignmentDTO[];
  }[]> {
    return this.getAllAssignments().pipe(
      map(assignments => {
        const userMap = assignments.reduce((acc, assignment) => {
          if (!acc[assignment.userId]) {
            acc[assignment.userId] = {
              userId: assignment.userId,
              userName: assignment.userName,
              employeeCode: assignment.employeeCode,
              totalEffort: 0,
              remainingCapacity: 0,
              assignments: []
            };
          }
          acc[assignment.userId].totalEffort += assignment.effortValue;
          acc[assignment.userId].assignments.push(assignment);
          return acc;
        }, {} as { [key: number]: any });

        // Calculate remaining capacity
        Object.values(userMap).forEach((user: any) => {
          user.remainingCapacity = Math.max(0, 1.0 - user.totalEffort);
        });

        return Object.values(userMap);
      }),
      catchError(error => {
        console.error('Get users with effort summary error:', error);
        return throwError(() => error.message || 'Failed to get users with effort summary');
      })
    );
  }

  /**
   * Validate effort value
   */
  validateEffortValue(effortValue: number): string | null {
    if (effortValue < 0) {
      return 'Effort value cannot be negative';
    }

    if (effortValue > 1.0) {
      return 'Effort value cannot exceed 1.0';
    }

    if (effortValue === 0) {
      return 'Effort value must be greater than 0';
    }

    // Check for reasonable precision (max 2 decimal places)
    const decimalPlaces = (effortValue.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      return 'Effort value can have maximum 2 decimal places';
    }

    return null; // No validation errors
  }

  /**
   * Validate effort assignment data
   */
  validateAssignmentData(assignment: CreateEffortAssignmentRequest): string[] {
    const errors: string[] = [];

    if (!assignment.userId) {
      errors.push('User is required');
    }

    if (!assignment.clientId) {
      errors.push('Client is required');
    }

    if (!assignment.processId) {
      errors.push('Process is required');
    }

    const effortError = this.validateEffortValue(assignment.effortValue);
    if (effortError) {
      errors.push(effortError);
    }

    return errors;
  }

  /**
   * Sort assignments by different criteria
   */
  sortAssignments(assignments: EffortAssignmentDTO[], sortBy: 'user' | 'client' | 'process' | 'effort' | 'date', direction: 'asc' | 'desc' = 'asc'): EffortAssignmentDTO[] {
    return [...assignments].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'user':
          comparison = a.userName.localeCompare(b.userName);
          break;
        case 'client':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'process':
          comparison = a.processName.localeCompare(b.processName);
          break;
        case 'effort':
          comparison = a.effortValue - b.effortValue;
          break;
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Filter assignments by multiple criteria
   */
  filterAssignments(assignments: EffortAssignmentDTO[], filters: {
    userId?: number;
    clientId?: number;
    processId?: number;
    minEffort?: number;
    maxEffort?: number;
    searchTerm?: string;
    dateRange?: { start: Date; end: Date };
  }): EffortAssignmentDTO[] {
    return assignments.filter(assignment => {
      // User filter
      if (filters.userId && assignment.userId !== filters.userId) {
        return false;
      }
      
      // Client filter
      if (filters.clientId && assignment.clientId !== filters.clientId) {
        return false;
      }
      
      // Process filter
      if (filters.processId && assignment.processId !== filters.processId) {
        return false;
      }
      
      // Effort range filter
      if (filters.minEffort !== undefined && assignment.effortValue < filters.minEffort) {
        return false;
      }
      
      if (filters.maxEffort !== undefined && assignment.effortValue > filters.maxEffort) {
        return false;
      }
      
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!assignment.userName.toLowerCase().includes(searchLower) &&
            !assignment.employeeCode.toLowerCase().includes(searchLower) &&
            !assignment.clientName.toLowerCase().includes(searchLower) &&
            !assignment.processName.toLowerCase().includes(searchLower) &&
            !assignment.assignedByName.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Date range filter
      if (filters.dateRange) {
        const assignmentDate = new Date(assignment.createdAt);
        if (assignmentDate < filters.dateRange.start || assignmentDate > filters.dateRange.end) {
          return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Format effort value for display
   */
  formatEffortValue(effortValue: number): string {
    return `${(effortValue * 100).toFixed(1)}%`;
  }

  /**
   * Get effort color based on value (for UI)
   */
  getEffortColor(effortValue: number): string {
    if (effortValue <= 0.25) return 'text-green-600';
    if (effortValue <= 0.5) return 'text-yellow-600';
    if (effortValue <= 0.75) return 'text-orange-600';
    return 'text-red-600';
  }
}