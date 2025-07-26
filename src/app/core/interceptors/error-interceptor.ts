import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth';
import { ApiResponse } from '../models';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = '';
      let errorDetails: string[] = [];

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Client Error: ${error.error.message}`;
      } else {
        // Server-side error - handle your backend's ApiResponse format
        const apiError = error.error as ApiResponse<any>;
        
        switch (error.status) {
          case 400:
            // Bad Request - extract message from ApiResponse
            errorMessage = apiError?.message || 'Bad request. Please check your input.';
            errorDetails = apiError?.errors || [];
            break;
          
          case 401:
            // Unauthorized - auto logout
            errorMessage = apiError?.message || 'Your session has expired. Please log in again.';
            authService.logout();
            break;
          
          case 403:
            // Forbidden
            errorMessage = apiError?.message || 'You do not have permission to access this resource.';
            break;
          
          case 404:
            // Not Found
            errorMessage = apiError?.message || 'The requested resource was not found.';
            break;
          
          case 409:
            // Conflict
            errorMessage = apiError?.message || 'A conflict occurred while processing your request.';
            errorDetails = apiError?.errors || [];
            break;
          
          case 422:
            // Unprocessable Entity (Validation errors)
            errorMessage = apiError?.message || 'Validation failed.';
            errorDetails = apiError?.errors || [];
            break;
          
          case 500:
            // Internal Server Error
            errorMessage = apiError?.message || 'An internal server error occurred. Please try again later.';
            errorDetails = apiError?.errors || [];
            break;
          
          case 503:
            // Service Unavailable
            errorMessage = apiError?.message || 'The service is temporarily unavailable. Please try again later.';
            break;
          
          default:
            errorMessage = apiError?.message || `Server Error: ${error.status} - ${error.statusText}`;
            errorDetails = apiError?.errors || [];
            break;
        }
      }

      console.error('HTTP Error:', {
        status: error.status,
        statusText: error.statusText,
        message: errorMessage,
        details: errorDetails,
        error: error.error,
        url: req.url
      });

      // Return the formatted error
      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        details: errorDetails,
        originalError: error
      }));
    })
  );
};

/**
 * Alternative class-based interceptor if needed for older Angular versions
 */
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = '';
        let errorDetails: string[] = [];

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = `Client Error: ${error.error.message}`;
        } else {
          // Server-side error - handle your backend's ApiResponse format
          const apiError = error.error as ApiResponse<any>;
          
          switch (error.status) {
            case 400:
              errorMessage = apiError?.message || 'Bad request. Please check your input.';
              errorDetails = apiError?.errors || [];
              break;
            
            case 401:
              errorMessage = apiError?.message || 'Your session has expired. Please log in again.';
              this.authService.logout();
              break;
            
            case 403:
              errorMessage = apiError?.message || 'You do not have permission to access this resource.';
              break;
            
            case 404:
              errorMessage = apiError?.message || 'The requested resource was not found.';
              break;
            
            case 409:
              errorMessage = apiError?.message || 'A conflict occurred while processing your request.';
              errorDetails = apiError?.errors || [];
              break;
            
            case 422:
              errorMessage = apiError?.message || 'Validation failed.';
              errorDetails = apiError?.errors || [];
              break;
            
            case 500:
              errorMessage = apiError?.message || 'An internal server error occurred. Please try again later.';
              errorDetails = apiError?.errors || [];
              break;
            
            case 503:
              errorMessage = apiError?.message || 'The service is temporarily unavailable. Please try again later.';
              break;
            
            default:
              errorMessage = apiError?.message || `Server Error: ${error.status} - ${error.statusText}`;
              errorDetails = apiError?.errors || [];
              break;
          }
        }

        console.error('HTTP Error:', {
          status: error.status,
          statusText: error.statusText,
          message: errorMessage,
          details: errorDetails,
          error: error.error,
          url: request.url
        });

        return throwError(() => ({
          status: error.status,
          message: errorMessage,
          details: errorDetails,
          originalError: error
        }));
      })
    );
  }
}