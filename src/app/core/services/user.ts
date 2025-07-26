import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  User, 
  UserDTO, 
  ApiResponse,
  API_ENDPOINTS 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.USERS}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all users (Admin/Manager only)
   */
  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<ApiResponse<UserDTO[]>>(this.baseUrl)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get users');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get all users error:', error);
          return throwError(() => error.message || 'Failed to get users');
        })
      );
  }

  /**
   * Get user by ID
   */
  getUserById(id: number): Observable<UserDTO> {
    return this.http.get<ApiResponse<UserDTO>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'User not found');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Get user by ID error:', error);
          return throwError(() => error.message || 'Failed to get user');
        })
      );
  }

  /**
   * Create new user (Admin only)
   */
  createUser(user: User): Observable<UserDTO> {
    // Remove fields that shouldn't be sent to backend
    const userPayload = {
      employeeCode: user.employeeCode,
      name: user.name,
      email: user.email,
      password: user.password,
      role: user.role,
      managerCode: user.managerCode
    };

    return this.http.post<ApiResponse<UserDTO>>(this.baseUrl, userPayload)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create user');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Create user error:', error);
          let errorMessage = 'Failed to create user';
          
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
   * Update user (Admin only)
   */
  updateUser(id: number, user: Partial<User>): Observable<boolean> {
    // Only send updateable fields
    const userPayload = {
      name: user.name,
      email: user.email,
      role: user.role,
      managerCode: user.managerCode
    };

    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, userPayload)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update user');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Update user error:', error);
          let errorMessage = 'Failed to update user';
          
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
   * Delete user (soft delete - Admin only)
   */
  deleteUser(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete user');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Delete user error:', error);
          let errorMessage = 'Failed to delete user';
          
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
   * Restore user (Admin only)
   */
  restoreUser(id: number): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/restore`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to restore user');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Restore user error:', error);
          return throwError(() => error.message || 'Failed to restore user');
        })
      );
  }

  /**
   * Get deleted users (Admin only)
   */
  getDeletedUsers(): Observable<UserDTO[]> {
    return this.http.get<ApiResponse<UserDTO[]>>(`${this.baseUrl}/deleted`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get deleted users');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get deleted users error:', error);
          return throwError(() => error.message || 'Failed to get deleted users');
        })
      );
  }

  /**
   * Check if employee code is available
   */
  checkEmployeeCodeAvailability(employeeCode: string, excludeUserId?: number): Observable<boolean> {
    // This would need to be implemented in backend or we can check client-side
    return this.getAllUsers().pipe(
      map(users => {
        const existingUser = users.find(u => 
          u.employeeCode.toLowerCase() === employeeCode.toLowerCase() && 
          u.id !== excludeUserId
        );
        return !existingUser; // Returns true if available
      }),
      catchError(error => {
        console.error('Check employee code availability error:', error);
        return throwError(() => 'Failed to check employee code availability');
      })
    );
  }

  /**
   * Check if email is available
   */
  checkEmailAvailability(email: string, excludeUserId?: number): Observable<boolean> {
    // This would need to be implemented in backend or we can check client-side
    return this.getAllUsers().pipe(
      map(users => {
        const existingUser = users.find(u => 
          u.email.toLowerCase() === email.toLowerCase() && 
          u.id !== excludeUserId
        );
        return !existingUser; // Returns true if available
      }),
      catchError(error => {
        console.error('Check email availability error:', error);
        return throwError(() => 'Failed to check email availability');
      })
    );
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: string): Observable<UserDTO[]> {
    return this.getAllUsers().pipe(
      map(users => users.filter(user => user.role === role)),
      catchError(error => {
        console.error('Get users by role error:', error);
        return throwError(() => error.message || 'Failed to get users by role');
      })
    );
  }

  /**
   * Get managers (for dropdown lists)
   */
  getManagers(): Observable<UserDTO[]> {
    return this.getUsersByRole('Manager');
  }

  /**
   * Get users by manager code (subordinates)
   */
  getUsersByManagerCode(managerCode: string): Observable<UserDTO[]> {
    return this.getAllUsers().pipe(
      map(users => users.filter(user => user.managerCode === managerCode)),
      catchError(error => {
        console.error('Get users by manager code error:', error);
        return throwError(() => error.message || 'Failed to get subordinates');
      })
    );
  }

  /**
   * Search users by name or employee code
   */
  searchUsers(searchTerm: string): Observable<UserDTO[]> {
    if (!searchTerm.trim()) {
      return this.getAllUsers();
    }

    return this.getAllUsers().pipe(
      map(users => users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )),
      catchError(error => {
        console.error('Search users error:', error);
        return throwError(() => error.message || 'Failed to search users');
      })
    );
  }

  /**
   * Get user statistics
   */
  getUserStats(): Observable<{ total: number; byRole: { [key: string]: number } }> {
    return this.getAllUsers().pipe(
      map(users => {
        const stats = {
          total: users.length,
          byRole: users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number })
        };
        return stats;
      }),
      catchError(error => {
        console.error('Get user stats error:', error);
        return throwError(() => error.message || 'Failed to get user statistics');
      })
    );
  }

  /**
   * Validate user data before create/update
   */
  validateUserData(user: Partial<User>, isUpdate: boolean = false): string[] {
    const errors: string[] = [];

    if (!isUpdate && !user.employeeCode?.trim()) {
      errors.push('Employee code is required');
    }

    if (!user.name?.trim()) {
      errors.push('Name is required');
    }

    if (!user.email?.trim()) {
      errors.push('Email is required');
    } else if (!this.isValidEmail(user.email)) {
      errors.push('Invalid email format');
    }

    if (!isUpdate && !user.password?.trim()) {
      errors.push('Password is required');
    }

    if (!user.role?.trim()) {
      errors.push('Role is required');
    } else if (!['Admin', 'Manager', 'Employee'].includes(user.role)) {
      errors.push('Invalid role');
    }

    return errors;
  }

  /**
   * Helper method to validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}