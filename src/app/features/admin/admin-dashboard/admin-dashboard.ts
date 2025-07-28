// src/app/features/admin/dashboard/admin-dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';

import { UserService } from '../../../core/services/user';
import { ClientService } from '../../../core/services/client';
import { ProcessService } from '../../../core/services/process';
import { DocumentService } from '../../../core/services/document';
import { EffortAssignmentService } from '../../../core/services/effort-assignment';
import { Loading } from '../../../shared/components/loading/loading';

interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalProcesses: number;
  totalDocuments: number;
  totalEffortAssignments: number;
  activeUsers: number;
  recentUploads: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, Loading],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;
  stats: DashboardStats = {
    totalUsers: 0,
    totalClients: 0,
    totalProcesses: 0,
    totalDocuments: 0,
    totalEffortAssignments: 0,
    activeUsers: 0,
    recentUploads: 0
  };

  quickActions: QuickAction[] = [
    {
      title: 'User Management',
      description: 'Manage system users and roles',
      icon: 'users',
      route: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      title: 'Client Management',
      description: 'Manage client organizations',
      icon: 'office-building',
      route: '/admin/clients',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      title: 'Process Management',
      description: 'Manage business processes',
      icon: 'cog',
      route: '/admin/processes',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      title: 'Document Management',
      description: 'Upload and manage documents',
      icon: 'document',
      route: '/admin/documents',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      title: 'HR Import',
      description: 'Import employee data from Excel',
      icon: 'upload',
      route: '/admin/hr-import',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    {
      title: 'Reports',
      description: 'View comprehensive reports',
      icon: 'chart-bar',
      route: '/admin/reports',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      title: 'Recycle Bin',
      description: 'Manage deleted items',
      icon: 'trash',
      route: '/admin/recycle-bin',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  ];

  constructor(
    private userService: UserService,
    private clientService: ClientService,
    private processService: ProcessService,
    private documentService: DocumentService,
    private effortAssignmentService: EffortAssignmentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.isLoading = true;

    forkJoin({
      users: this.userService.getAllUsers(),
      clients: this.clientService.getAllClients(),
      processes: this.processService.getAllProcesses(),
      documents: this.documentService.getAllDocuments(),
      assignments: this.effortAssignmentService.getAllAssignments()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (data) => {
        this.stats = {
          totalUsers: data.users.length,
          totalClients: data.clients.length,
          totalProcesses: data.processes.length,
          totalDocuments: data.documents.length,
          totalEffortAssignments: data.assignments.length,
          activeUsers: data.users.filter(u => !u.isDeleted).length,
          recentUploads: data.documents.filter(d => {
            const uploadDate = new Date(d.createdAt);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return uploadDate > weekAgo;
          }).length
        };
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  getIconPath(iconName: string): string {
    const icons: { [key: string]: string } = {
      'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      'office-building': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      'cog': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'document': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'upload': 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
      'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      'trash': 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
    };
    return icons[iconName] || icons['document'];
  }

  refreshData(): void {
    this.loadDashboardData();
  }
}