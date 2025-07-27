// src/app/features/admin/admin.routes.ts
import { Routes } from '@angular/router';
import { adminGuard, adminChildGuard } from '../../core/guards/auth-guard';

export const adminRoutes: Routes = [
  {
    path: '',
    canActivate: [adminGuard],
    canActivateChild: [adminChildGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/admin-dashboard').then(m => m.AdminDashboard),
        title: 'Admin Dashboard - SOP Portal',
        data: { breadcrumb: 'Dashboard' }
      },
      {
        path: 'users',
        loadComponent: () => import('./user-management/user-management').then(m => m.UserManagement),
        title: 'User Management - SOP Portal',
        data: { breadcrumb: 'User Management' }
      },
      {
        path: 'clients',
        loadComponent: () => import('./client-management/client-management').then(m => m.ClientManagement),
        title: 'Client Management - SOP Portal',
        data: { breadcrumb: 'Client Management' }
      },
      {
        path: 'processes',
        loadComponent: () => import('./process-management/process-management').then(m => m.ProcessManagement),
        title: 'Process Management - SOP Portal',
        data: { breadcrumb: 'Process Management' }
      },
      {
        path: 'documents',
        loadComponent: () => import('./document-management/document-management').then(m => m.DocumentManagement),
        title: 'Document Management - SOP Portal',
        data: { breadcrumb: 'Document Management' }
      },
      {
        path: 'effort-assignments',
        loadComponent: () => import('./effort-assignment/effort-assignment').then(m => m.EffortAssignment),
        title: 'Effort Assignment - SOP Portal',
        data: { breadcrumb: 'Effort Assignment' }
      },
      {
        path: 'hr-import',
        loadComponent: () => import('./hr-import/hr-import').then(m => m.HRImport),
        title: 'HR Import - SOP Portal',
        data: { breadcrumb: 'HR Import' }
      },
      {
        path: 'reports',
        loadComponent: () => import('./reports/admin-reports').then(m => m.AdminReports),
        title: 'Admin Reports - SOP Portal',
        data: { breadcrumb: 'Reports' }
      },
      {
        path: 'recycle-bin',
        loadComponent: () => import('./recycle-bin/recycle-bin').then(m => m.RecycleBin),
        title: 'Recycle Bin - SOP Portal',
        data: { breadcrumb: 'Recycle Bin' }
      }
    ]
  }
];

// Export default for easier importing
export default adminRoutes;