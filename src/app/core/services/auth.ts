import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { 
  LoginRequest, 
  LoginResponse, 
  AuthUser, 
  ChangePasswordRequest, 
  UserRole,
  ApiResponse,
  API_ENDPOINTS,
  USER_ROLES 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'sop_portal_token';
  private readonly USER_KEY = 'sop_portal_user';

  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Check if user is already logged in on service initialization
    this.loadStoredUser();
  }

  /**
   * Login user with employee code and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    const url = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`;
    
    return this.http.post<ApiResponse<LoginResponse>>(url, credentials)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Login failed');
          }
          return response.data;
        }),
        tap(loginResponse => {
          this.setAuthData(loginResponse);
        }),
        catchError(error => {
          console.error('Login error:', error);
          let errorMessage = 'Login failed';
          
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
   * Change user password
   */
  changePassword(changePasswordRequest: ChangePasswordRequest): Observable<boolean> {
    const url = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.AUTH.CHANGE_PASSWORD}`;
    
    return this.http.post<ApiResponse<boolean>>(url, changePasswordRequest)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Password change failed');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Change password error:', error);
          let errorMessage = 'Password change failed';
          
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
   * Logout user and clear stored data
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/auth/login']);
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get stored JWT token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    
    if (!token || !user) {
      return false;
    }

    // Check if token is expired
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenPayload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      
      if (currentTime >= expirationTime) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error parsing token:', error);
      this.logout();
      return false;
    }
  }

  /**
   * Check if current user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.role === role;
  }

  /**
   * Check if current user has any of the specified roles
   */
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.hasRole(USER_ROLES.ADMIN);
  }

  /**
   * Check if current user is manager
   */
  isManager(): boolean {
    return this.hasRole(USER_ROLES.MANAGER);
  }

  /**
   * Check if current user is employee
   */
  isEmployee(): boolean {
    return this.hasRole(USER_ROLES.EMPLOYEE);
  }

  /**
   * Check if current user is manager or admin
   */
  isManagerOrAdmin(): boolean {
    return this.hasAnyRole([USER_ROLES.MANAGER, USER_ROLES.ADMIN]);
  }

  /**
   * Get user's display name
   */
  getUserDisplayName(): string {
    const user = this.getCurrentUser();
    return user ? `${user.name} (${user.employeeCode})` : '';
  }

  /**
   * Get user's role display name
   */
  getRoleDisplayName(): string {
    const user = this.getCurrentUser();
    return user?.role || '';
  }

  /**
   * Get user's employee code
   */
  getUserEmployeeCode(): string {
    const user = this.getCurrentUser();
    return user?.employeeCode || '';
  }

  /**
   * Get user's ID
   */
  getUserId(): number | null {
    const user = this.getCurrentUser();
    return user?.id || null;
  }

  /**
   * Get user's email
   */
  getUserEmail(): string {
    const user = this.getCurrentUser();
    return user?.email || '';
  }

  /**
   * Get user's manager code
   */
  getUserManagerCode(): string | null {
    const user = this.getCurrentUser();
    return user?.managerCode || null;
  }

  /**
   * Set authentication data after successful login
   */
  private setAuthData(loginResponse: LoginResponse): void {
    // Store token and user data in localStorage
    localStorage.setItem(this.TOKEN_KEY, loginResponse.token);
    
    // Convert UserDTO to AuthUser for consistency
    const authUser: AuthUser = {
      id: loginResponse.user.id,
      employeeCode: loginResponse.user.employeeCode,
      name: loginResponse.user.name,
      email: loginResponse.user.email,
      role: loginResponse.user.role,
      managerCode: loginResponse.user.managerCode
    };
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(authUser));

    // Update subjects
    this.currentUserSubject.next(authUser);
    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Load stored user data on service initialization
   */
  private loadStoredUser(): void {
    const storedUser = localStorage.getItem(this.USER_KEY);
    const storedToken = localStorage.getItem(this.TOKEN_KEY);

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser) as AuthUser;
        
        // Check if token is still valid
        if (this.isTokenValid(storedToken)) {
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        } else {
          // Token expired, clear stored data
          this.logout();
        }
      } catch (error) {
        console.error('Error loading stored user:', error);
        this.logout();
      }
    }
  }

  /**
   * Check if token is still valid
   */
  private isTokenValid(token: string): boolean {
    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      const expirationTime = tokenPayload.exp * 1000;
      const currentTime = Date.now();
      
      return currentTime < expirationTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * Refresh user data (useful after profile updates)
   */
  refreshUserData(): void {
    // In a real application, you might want to fetch updated user data from the server
    // For now, we'll just reload from localStorage
    this.loadStoredUser();
  }

  /**
   * Check if user can access a specific route based on roles
   */
  canAccessRoute(allowedRoles: string[]): boolean {
    if (!this.isAuthenticated()) {
      return false;
    }
    
    return this.hasAnyRole(allowedRoles);
  }

  /**
   * Get token expiration time
   */
  getTokenExpirationTime(): Date | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      return new Date(tokenPayload.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token will expire soon (within 1 hour)
   */
  isTokenExpiringSoon(): boolean {
    const expirationTime = this.getTokenExpirationTime();
    if (!expirationTime) return true;

    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    const currentTime = Date.now();
    
    return (expirationTime.getTime() - currentTime) < oneHour;
  }

  /**
   * Auto-logout warning for token expiration
   */
  startTokenExpirationCheck(): void {
    // Check every minute if token is expiring soon
    setInterval(() => {
      if (this.isAuthenticated() && this.isTokenExpiringSoon()) {
        console.warn('Token expiring soon. Consider implementing refresh token logic.');
        // You could show a warning dialog here
      }
    }, 60000); // Check every minute
  }
}