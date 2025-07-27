// src/app/features/admin/admin-layout/admin-layout.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Header } from '../../../shared/components/header/header';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Header,
    Sidebar
  ],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayout implements OnInit, OnDestroy {
  sidebarOpen = false;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Verify admin access (additional security check)
    if (!this.authService.isAdmin()) {
      console.error('Unauthorized access to admin layout');
      this.authService.logout();
      return;
    }

    // Listen for authentication changes
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (!user || !this.authService.isAdmin()) {
          this.authService.logout();
        }
      });

    // Handle responsive sidebar behavior
    this.handleResponsiveSidebar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  closeSidebar(): void {
    this.sidebarOpen = false;
  }

  private handleResponsiveSidebar(): void {
    // Close sidebar on mobile by default
    if (window.innerWidth < 1024) {
      this.sidebarOpen = false;
    } else {
      this.sidebarOpen = true;
    }

    // Listen for window resize events
    window.addEventListener('resize', () => {
      if (window.innerWidth >= 1024) {
        this.sidebarOpen = true;
      } else {
        this.sidebarOpen = false;
      }
    });
  }
}