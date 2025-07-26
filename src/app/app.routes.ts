import { Routes } from '@angular/router';
import { 
  authGuard, 
  adminGuard, 
  managerGuard, 
  employeeGuard, 
  loginGuard 
} from './core/guards/auth-guard';

export const routes: Routes = [
  // Default redirect to login
  {
    path: '',
    redirectTo: '/auth/login',
    pathMatch: 'full'
  },

  // Authentication routes
  {
    path: 'auth',
    canActivate: [loginGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login').then(c => c.Login)
      },
      {
        path: 'change-password',
        canActivate: [authGuard],
        loadComponent: () => import('./features/auth/change-password/change-password').then(c => c.ChangePassword)
      }
    ]
  },

  // Admin routes
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () => import('./features/admin/admin-layout/admin-layout').then(c => c.AdminLayout),
    children: [
      {
        path: '',
        redirectTo: 'users',
        pathMatch: 'full'
      },
      {
        path: 'users',
        loadComponent: () => import('./features/admin/user-management/user-management').then(c => c.UserManagement)
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/admin/client-management/client-management').then(c => c.ClientManagement)
      },
      {
        path: 'processes',
        loadComponent: () => import('./features/admin/process-management/process-management').then(c => c.ProcessManagement)
      },
      {
        path: 'documents',
        loadComponent: () => import('./features/admin/document-management/document-management').then(c => c.DocumentManagement)
      },
      {
        path: 'hr-import',
        loadComponent: () => import('./features/admin/hr-import/hr-import').then(c => c.HrImport)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/admin/admin-reports/admin-reports').then(c => c.AdminReports)
      },
      {
        path: 'recycle-bin',
        loadComponent: () => import('./features/admin/recycle-bin/recycle-bin').then(c => c.RecycleBin)
      }
    ]
  },

  // Manager routes
  {
    path: 'manager',
    canActivate: [managerGuard],
    canActivateChild: [managerGuard],
    loadComponent: () => import('./features/manager/manager-layout/manager-layout').then(c => c.ManagerLayout),
    children: [
      {
        path: '',
        redirectTo: 'effort-assignment',
        pathMatch: 'full'
      },
      {
        path: 'effort-assignment',
        loadComponent: () => import('./features/manager/effort-assignment/effort-assignment').then(c => c.EffortAssignment)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/manager/manager-reports/manager-reports').then(c => c.ManagerReports)
      }
    ]
  },

  // Employee routes
  {
    path: 'employee',
    canActivate: [employeeGuard],
    canActivateChild: [employeeGuard],
    loadComponent: () => import('./features/employee/employee-layout/employee-layout').then(c => c.EmployeeLayout),
    children: [
      {
        path: '',
        redirectTo: 'documents',
        pathMatch: 'full'
      },
      {
        path: 'documents',
        loadComponent: () => import('./features/employee/document-viewer/document-viewer').then(c => c.DocumentViewer)
      }
    ]
  },

  // Wildcard route - must be last
  {
    path: '**',
    redirectTo: '/auth/login'
  }
];