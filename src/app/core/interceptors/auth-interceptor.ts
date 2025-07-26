import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { API_ENDPOINTS } from '../models';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Get the auth token from the service
  const token = authService.getToken();
  
  // Check if we're making a request to our API and if we have a token
  if (token && isApiUrl(req.url)) {
    // Clone the request and add the authorization header
    const authReq = req.clone({
      setHeaders: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return next(authReq);
  }

  return next(req);
};

/**
 * Check if the request URL is for our API
 */
function isApiUrl(url: string): boolean {
  return url.startsWith(API_ENDPOINTS.BASE_URL);
}

/**
 * Alternative class-based interceptor if needed for older Angular versions
 */
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get the auth token from the service
    const token = this.authService.getToken();
    
    // Check if we're making a request to our API and if we have a token
    if (token && this.isApiUrl(request.url)) {
      // Clone the request and add the authorization header
      request = request.clone({
        setHeaders: {
          'Authorization': `Bearer ${token}`
        }
      });
    }

    return next.handle(request);
  }

  /**
   * Check if the request URL is for our API
   */
  private isApiUrl(url: string): boolean {
    return url.startsWith(API_ENDPOINTS.BASE_URL);
  }
}