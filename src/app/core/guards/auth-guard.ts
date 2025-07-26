import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { CanActivateFn, CanActivateChildFn } from '@angular/router';
import { AuthService } from '../services/auth';
import { USER_ROLES } from '../models';

/**
 * Auth Guard - Protects routes that require authentication
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  } else {
    // Store the attempted URL for redirecting after login
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }
};

/**
 * Auth Guard for child routes
 */
export const authChildGuard: CanActivateChildFn = (childRoute, state) => {
  return authGuard(childRoute, state);
};

/**
 * Admin Guard - Only allows Admin users
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }

  if (authService.isAdmin()) {
    return true;
  } else {
    // Redirect to dashboard with access denied message
    router.navigate(['/dashboard'], {
      queryParams: { 
        error: 'access-denied',
        message: 'Admin access required' 
      }
    });
    return false;
  }
};

/**
 * Admin Child Guard
 */
export const adminChildGuard: CanActivateChildFn = (childRoute, state) => {
  return adminGuard(childRoute, state);
};

/**
 * Manager Guard - Only allows Manager and Admin users
 */
export const managerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }

  if (authService.isManagerOrAdmin()) {
    return true;
  } else {
    // Redirect to dashboard with access denied message
    router.navigate(['/dashboard'], {
      queryParams: { 
        error: 'access-denied',
        message: 'Manager or Admin access required' 
      }
    });
    return false;
  }
};

/**
 * Manager Child Guard
 */
export const managerChildGuard: CanActivateChildFn = (childRoute, state) => {
  return managerGuard(childRoute, state);
};

/**
 * Employee Guard - Allows all authenticated users (Admin, Manager, Employee)
 */
export const employeeGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  } else {
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }
};

/**
 * Employee Child Guard
 */
export const employeeChildGuard: CanActivateChildFn = (childRoute, state) => {
  return employeeGuard(childRoute, state);
};

/**
 * Login Guard - Prevents authenticated users from accessing login page
 */
export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Get user role and redirect to appropriate dashboard
    const user = authService.getCurrentUser();
    if (user) {
      switch (user.role) {
        case USER_ROLES.ADMIN:
          router.navigate(['/admin']);
          break;
        case USER_ROLES.MANAGER:
          router.navigate(['/manager']);
          break;
        case USER_ROLES.EMPLOYEE:
          router.navigate(['/employee']);
          break;
        default:
          router.navigate(['/dashboard']);
          break;
      }
    } else {
      router.navigate(['/dashboard']);
    }
    return false;
  }
  return true;
};

/**
 * Role-based Guard - Generic guard that accepts allowed roles
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: state.url } 
      });
      return false;
    }

    if (authService.canAccessRoute(allowedRoles)) {
      return true;
    } else {
      router.navigate(['/dashboard'], {
        queryParams: { 
          error: 'access-denied',
          message: `Required roles: ${allowedRoles.join(', ')}` 
        }
      });
      return false;
    }
  };
};

/**
 * Self or Admin Guard - Allows users to access their own data or admin to access any data
 */
export const selfOrAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }

  const currentUserId = authService.getUserId();
  const routeUserId = Number(route.paramMap.get('userId') || route.paramMap.get('id'));

  // Allow admin to access any user's data
  if (authService.isAdmin()) {
    return true;
  }

  // Allow users to access their own data
  if (currentUserId === routeUserId) {
    return true;
  }

  // Deny access
  router.navigate(['/dashboard'], {
    queryParams: { 
      error: 'access-denied',
      message: 'You can only access your own data' 
    }
  });
  return false;
};

/**
 * Manager Hierarchy Guard - Allows managers to access their subordinates' data
 */
export const managerHierarchyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }

  // Admin can access everything
  if (authService.isAdmin()) {
    return true;
  }

  const currentUserId = authService.getUserId();
  const routeUserId = Number(route.paramMap.get('userId') || route.paramMap.get('id'));

  // Users can access their own data
  if (currentUserId === routeUserId) {
    return true;
  }

  // Managers can access subordinates (this would need additional API call to verify hierarchy)
  if (authService.isManager()) {
    // TODO: Implement hierarchy check via API call
    // For now, allow manager access
    return true;
  }

  // Deny access for employees trying to access other users' data
  router.navigate(['/dashboard'], {
    queryParams: { 
      error: 'access-denied',
      message: 'Access denied to this user data' 
    }
  });
  return false;
};

/**
 * Class-based guards for compatibility with older Angular versions
 */
import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardClass implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkAuth(state.url);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkAuth(state.url);
  }

  private checkAuth(url: string): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    } else {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: url } 
      });
      return false;
    }
  }
}

@Injectable({
  providedIn: 'root'
})
export class AdminGuardClass implements CanActivate, CanActivateChild {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkAdminAccess(state.url);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.checkAdminAccess(state.url);
  }

  private checkAdminAccess(url: string): boolean {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { 
        queryParams: { returnUrl: url } 
      });
      return false;
    }

    if (this.authService.isAdmin()) {
      return true;
    } else {
      this.router.navigate(['/dashboard'], {
        queryParams: { 
          error: 'access-denied',
          message: 'Admin access required' 
        }
      });
      return false;
    }
  }
}