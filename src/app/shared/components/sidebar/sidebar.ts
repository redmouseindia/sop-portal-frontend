// src/app/shared/components/sidebar/sidebar.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth';
import { NavigationItem, USER_ROLES } from '../../../core/models/index';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit {
  @Input() isOpen = false;
  @Input() role: string = '';
  @Output() closeSidebar = new EventEmitter<void>();

  currentRoute = '';
  navigationItems: NavigationItem[] = [];

  readonly USER_ROLES = USER_ROLES;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Track current route for active menu highlighting
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });

    // Set initial route
    this.currentRoute = this.router.url;

    // Set navigation items based on user role
    this.setNavigationItems();
  }

  private setNavigationItems(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    switch (user.role) {
      case USER_ROLES.ADMIN:
        this.navigationItems = this.getAdminNavigation();
        break;
      case USER_ROLES.MANAGER:
        this.navigationItems = this.getManagerNavigation();
        break;
      case USER_ROLES.EMPLOYEE:
        this.navigationItems = this.getEmployeeNavigation();
        break;
      default:
        this.navigationItems = [];
    }
  }

  private getAdminNavigation(): NavigationItem[] {
    return [
      {
        label: 'Dashboard',
        route: '/admin',
        icon: 'home',
        roles: ['Admin']
      },
      {
        label: 'User Management',
        route: '/admin/users',
        icon: 'users',
        roles: ['Admin']
      },
      {
        label: 'Client Management',
        route: '/admin/clients',
        icon: 'office-building',
        roles: ['Admin']
      },
      {
        label: 'Process Management',
        route: '/admin/processes',
        icon: 'cog',
        roles: ['Admin']
      },
      {
        label: 'Document Management',
        route: '/admin/documents',
        icon: 'document',
        roles: ['Admin']
      },
      {
        label: 'HR Import',
        route: '/admin/hr-import',
        icon: 'upload',
        roles: ['Admin']
      },
      {
        label: 'Reports',
        route: '/admin/reports',
        icon: 'chart-bar',
        roles: ['Admin']
      },
      {
        label: 'Recycle Bin',
        route: '/admin/recycle-bin',
        icon: 'trash',
        roles: ['Admin']
      }
    ];
  }

  private getManagerNavigation(): NavigationItem[] {
    return [
      {
        label: 'Dashboard',
        route: '/manager',
        icon: 'home',
        roles: ['Manager']
      },
      {
        label: 'Effort Assignment',
        route: '/manager/effort-assignment',
        icon: 'chart-pie',
        roles: ['Manager']
      },
      {
        label: 'Reports',
        route: '/manager/reports',
        icon: 'chart-bar',
        roles: ['Manager']
      }
    ];
  }

  private getEmployeeNavigation(): NavigationItem[] {
    return [
      {
        label: 'Dashboard',
        route: '/employee',
        icon: 'home',
        roles: ['Employee']
      },
      {
        label: 'Documents',
        route: '/employee/documents',
        icon: 'document',
        roles: ['Employee']
      }
    ];
  }

  isRouteActive(route: string): boolean {
    if (route === '/admin' || route === '/manager' || route === '/employee') {
      return this.currentRoute === route;
    }
    return this.currentRoute.startsWith(route);
  }

  onNavigate(route: string): void {
    this.router.navigate([route]);
    this.closeSidebar.emit();
  }

  onCloseSidebar(): void {
    this.closeSidebar.emit();
  }

  getIconPath(iconName: string): string {
    const icons: { [key: string]: string } = {
      'home': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      'office-building': 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      'cog': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      'document': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'upload': 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
      'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      'chart-pie': 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z',
      'trash': 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
    };
    return icons[iconName] || icons['home'];
  }

  getUserInfo(): { name: string; role: string; employeeCode: string } {
    const user = this.authService.getCurrentUser();
    return {
      name: user?.name || '',
      role: user?.role || '',
      employeeCode: user?.employeeCode || ''
    };
  }

  getUserInitials(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.name) return 'U';
    
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.name[0].toUpperCase();
  }

  getRoleColor(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return 'bg-secondary-500';
    
    switch (user.role) {
      case USER_ROLES.ADMIN:
        return 'bg-danger-500';
      case USER_ROLES.MANAGER:
        return 'bg-warning-500';
      case USER_ROLES.EMPLOYEE:
        return 'bg-primary-500';
      default:
        return 'bg-secondary-500';
    }
  }

  getRoleBadgeColor(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return 'bg-secondary-100 text-secondary-800';
    
    switch (user.role) {
      case USER_ROLES.ADMIN:
        return 'bg-danger-100 text-danger-800';
      case USER_ROLES.MANAGER:
        return 'bg-warning-100 text-warning-800';
      case USER_ROLES.EMPLOYEE:
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-secondary-100 text-secondary-800';
    }
  }

  // Quick actions
  onProfile(): void {
    this.router.navigate(['/profile']);
    this.closeSidebar.emit();
  }

  onChangePassword(): void {
    this.router.navigate(['/auth/change-password']);
    this.closeSidebar.emit();
  }

  onLogout(): void {
    this.authService.logout();
    this.closeSidebar.emit();
  }

  // Get navigation summary for current role
  getNavigationSummary(): { total: number; current: string } {
    const activeItem = this.navigationItems.find(item => this.isRouteActive(item.route));
    return {
      total: this.navigationItems.length,
      current: activeItem?.label || 'Dashboard'
    };
  }

  // Check if user has access to specific navigation item
  hasAccessToItem(item: NavigationItem): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    
    return item.roles.includes(user.role as string);
  }

  // Get menu statistics for admin dashboard
  getMenuStats(): { adminItems: number; managerItems: number; employeeItems: number } {
    return {
      adminItems: this.getAdminNavigation().length,
      managerItems: this.getManagerNavigation().length,
      employeeItems: this.getEmployeeNavigation().length
    };
  }
}