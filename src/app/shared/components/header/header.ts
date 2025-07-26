import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { AuthUser, USER_ROLES } from '../../../core/models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css']
})
export class Header implements OnInit {
  @Input() title: string = 'SOP Portal';
  @Input() showSidebarToggle: boolean = true;
  @Output() toggleSidebar = new EventEmitter<void>();

  currentUser: AuthUser | null = null;
  showUserMenu = false;
  showNotifications = false;
  notificationCount = 3; // Mock notification count

  readonly USER_ROLES = USER_ROLES;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to current user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showNotifications = false; // Close notifications if open
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showUserMenu = false; // Close user menu if open
  }

  closeDropdowns(): void {
    this.showUserMenu = false;
    this.showNotifications = false;
  }

  onChangePassword(): void {
    this.closeDropdowns();
    this.router.navigate(['/auth/change-password']);
  }

  onProfile(): void {
    this.closeDropdowns();
    this.router.navigate(['/profile']);
  }

  onLogout(): void {
    this.closeDropdowns();
    this.authService.logout();
  }

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  getUserRole(): string {
    return this.authService.getRoleDisplayName();
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return 'U';
    
    const names = this.currentUser.name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return this.currentUser.name[0].toUpperCase();
  }

  getRoleColor(): string {
    if (!this.currentUser) return 'bg-secondary-500';
    
    switch (this.currentUser.role) {
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
    if (!this.currentUser) return 'bg-secondary-100 text-secondary-800';
    
    switch (this.currentUser.role) {
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

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isManager(): boolean {
    return this.authService.isManager();
  }

  isEmployee(): boolean {
    return this.authService.isEmployee();
  }

  // Navigation methods
  navigateToHome(): void {
    this.closeDropdowns();
    
    if (this.isAdmin()) {
      this.router.navigate(['/admin']);
    } else if (this.isManager()) {
      this.router.navigate(['/manager']);
    } else {
      this.router.navigate(['/employee']);
    }
  }

  navigateToReports(): void {
    this.closeDropdowns();
    
    if (this.isAdmin()) {
      this.router.navigate(['/admin/reports']);
    } else if (this.isManager()) {
      this.router.navigate(['/manager/reports']);
    }
  }

  navigateToUsers(): void {
    if (this.isAdmin()) {
      this.closeDropdowns();
      this.router.navigate(['/admin/users']);
    }
  }

  // Mock notifications data
  getNotifications() {
    return [
      {
        id: 1,
        title: 'New Document Uploaded',
        message: 'A new document has been uploaded for Client ABC',
        time: '5 minutes ago',
        unread: true,
        icon: 'document',
        type: 'info'
      },
      {
        id: 2,
        title: 'Effort Assignment Updated',
        message: 'Your effort allocation has been modified',
        time: '2 hours ago',
        unread: true,
        icon: 'chart',
        type: 'warning'
      },
      {
        id: 3,
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight at 11 PM',
        time: '1 day ago',
        unread: false,
        icon: 'cog',
        type: 'info'
      }
    ];
  }

  markNotificationAsRead(notificationId: number): void {
    // Implementation for marking notification as read
    console.log('Marking notification as read:', notificationId);
  }

  clearAllNotifications(): void {
    // Implementation for clearing all notifications
    console.log('Clearing all notifications');
    this.notificationCount = 0;
    this.showNotifications = false;
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'document':
        return 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';
      case 'chart':
        return 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z';
      case 'cog':
        return 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z';
      default:
        return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
    }
  }
}