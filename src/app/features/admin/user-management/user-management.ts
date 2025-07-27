// src/app/features/admin/user-management/user-management.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { UserService } from '../../../core/services/user';
import { UserDTO, User, USER_ROLES } from '../../../core/models';
import { Loading } from '../../../shared/components/loading/loading';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    Loading,
    Modal,
    ConfirmDialog
  ],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css'
})
export class UserManagement implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // Data
  users: UserDTO[] = [];
  filteredUsers: UserDTO[] = [];
  paginatedUsers: UserDTO[] = [];
  availableManagers: UserDTO[] = [];

  // UI State
  isLoading = false;
  isSubmitting = false;
  showUserModal = false;
  showConfirmDialog = false;
  isEditMode = false;
  selectedUser: UserDTO | null = null;
  userToDelete: UserDTO | null = null;

  // Form
  userForm: FormGroup;

  // Filters and Search
  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Sorting
  sortField = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Constants
  readonly USER_ROLES = USER_ROLES;

  constructor(
    private userService: UserService,
    private formBuilder: FormBuilder
  ) {
    this.userForm = this.createUserForm();
  }

  ngOnInit(): void {
    this.loadUsers();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data Loading
  loadUsers(): void {
    this.isLoading = true;
    this.userService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.users = users;
          this.availableManagers = users.filter(u => 
            !u.isDeleted && (u.role === USER_ROLES.MANAGER || u.role === USER_ROLES.ADMIN)
          );
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load users:', error);
          this.isLoading = false;
          // TODO: Show error notification
        }
      });
  }

  // Form Management
  private createUserForm(): FormGroup {
    return this.formBuilder.group({
      employeeCode: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9]+$/)]],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
      managerCode: [''],
      password: ['']
    });
  }

  // Modal Management
  openCreateUserModal(): void {
    this.isEditMode = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.userForm.patchValue({
      password: 'temp*123'
    });
    this.showUserModal = true;
  }

  editUser(user: UserDTO): void {
    this.isEditMode = true;
    this.selectedUser = user;
    this.userForm.patchValue({
      employeeCode: user.employeeCode,
      name: user.name,
      email: user.email,
      role: user.role,
      managerCode: user.managerCode || ''
    });
    
    // Disable employee code field in edit mode
    this.userForm.get('employeeCode')?.disable();
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.isEditMode = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.userForm.get('employeeCode')?.enable();
    this.isSubmitting = false;
  }

  // Form Submission
  onSubmitUser(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    // Additional validation
    const formData = this.userForm.getRawValue();
    const validationErrors = this.validateUserData(formData);
    
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return;
    }

    this.isSubmitting = true;

    if (this.isEditMode && this.selectedUser) {
      this.updateUser(formData);
    } else {
      this.createUser(formData);
    }
  }

  private createUser(userData: any): void {
    const user: User = {
      id: 0,
      employeeCode: userData.employeeCode.trim(),
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: userData.password || 'temp*123',
      role: userData.role,
      managerCode: userData.managerCode?.trim() || undefined,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.userService.createUser(user)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdUser) => {
          console.log('User created successfully:', createdUser);
          this.closeUserModal();
          this.loadUsers();
          // TODO: Show success notification
        },
        error: (error) => {
          console.error('Failed to create user:', error);
          this.isSubmitting = false;
          // TODO: Show error notification
        }
      });
  }

  private updateUser(userData: any): void {
    if (!this.selectedUser) return;

    const updateData = {
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      role: userData.role,
      managerCode: userData.managerCode?.trim() || undefined
    };

    this.userService.updateUser(this.selectedUser.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('User updated successfully');
            this.closeUserModal();
            this.loadUsers();
            // TODO: Show success notification
          }
        },
        error: (error) => {
          console.error('Failed to update user:', error);
          this.isSubmitting = false;
          // TODO: Show error notification
        }
      });
  }

  // User Actions
  deleteUser(user: UserDTO): void {
    if (user.role === USER_ROLES.ADMIN) {
      // TODO: Show notification that admin users cannot be deleted
      console.warn('Admin users cannot be deleted');
      return;
    }

    this.userToDelete = user;
    this.showConfirmDialog = true;
  }

  confirmDeleteUser(): void {
    if (!this.userToDelete) return;

    this.userService.deleteUser(this.userToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('User deleted successfully');
            this.loadUsers();
            // TODO: Show success notification
          }
          this.showConfirmDialog = false;
          this.userToDelete = null;
        },
        error: (error) => {
          console.error('Failed to delete user:', error);
          this.showConfirmDialog = false;
          this.userToDelete = null;
          // TODO: Show error notification
        }
      });
  }

  cancelDeleteUser(): void {
    this.showConfirmDialog = false;
    this.userToDelete = null;
  }

  restoreUser(user: UserDTO): void {
    this.userService.restoreUser(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            console.log('User restored successfully');
            this.loadUsers();
            // TODO: Show success notification
          }
        },
        error: (error) => {
          console.error('Failed to restore user:', error);
          // TODO: Show error notification
        }
      });
  }

  // Search and Filters
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.searchTerm = searchTerm;
        this.applyFilters();
      });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onRoleFilter(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  onStatusFilter(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filtered = [...this.users];

    // Search filter
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.employeeCode.toLowerCase().includes(term)
      );
    }

    // Role filter
    if (this.selectedRole) {
      filtered = filtered.filter(user => user.role === this.selectedRole);
    }

    // Status filter
    if (this.selectedStatus) {
      if (this.selectedStatus === 'active') {
        filtered = filtered.filter(user => !user.isDeleted);
      } else if (this.selectedStatus === 'deleted') {
        filtered = filtered.filter(user => user.isDeleted);
      }
    }

    // Apply sorting
    if (this.sortField) {
      this.sortUsers(filtered);
    }

    this.filteredUsers = filtered;
    this.updatePagination();
  }

  // Sorting
  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  private sortUsers(users: UserDTO[]): void {
    users.sort((a, b) => {
      const aValue = this.getFieldValue(a, this.sortField);
      const bValue = this.getFieldValue(b, this.sortField);
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  private getFieldValue(user: UserDTO, field: string): any {
    switch (field) {
      case 'employeeCode': return user.employeeCode.toLowerCase();
      case 'name': return user.name.toLowerCase();
      case 'email': return user.email.toLowerCase();
      case 'role': return user.role.toLowerCase();
      case 'createdAt': return user.createdAt ? new Date(user.createdAt).getTime() : 0;
      default: return '';
    }
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return '';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  // Pagination
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    this.currentPage = Math.min(this.currentPage, this.totalPages || 1);
    this.updatePaginatedUsers();
  }

  private updatePaginatedUsers(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePaginatedUsers();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePaginatedUsers();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedUsers();
    }
  }

  getStartIndex(): number {
    return this.filteredUsers.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredUsers.length);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Utility Methods
  trackByUserId(index: number, user: UserDTO): number {
    return user.id;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${this.getFieldDisplayName(fieldName)} is required`;
    if (errors['email']) return 'Please enter a valid email address';
    if (errors['minlength']) return `${this.getFieldDisplayName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    if (errors['maxlength']) return `${this.getFieldDisplayName(fieldName)} must be less than ${errors['maxlength'].requiredLength} characters`;
    if (errors['pattern']) return `${this.getFieldDisplayName(fieldName)} contains invalid characters`;
    
    return 'Invalid value';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      employeeCode: 'Employee code',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      managerCode: 'Manager code',
      password: 'Password'
    };
    return displayNames[fieldName] || fieldName;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      control?.markAsTouched();
    });
  }

  getUserInitials(name: string): string {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  getRoleColor(role: string): string {
    switch (role) {
      case USER_ROLES.ADMIN: return 'bg-danger-500';
      case USER_ROLES.MANAGER: return 'bg-warning-500';
      case USER_ROLES.EMPLOYEE: return 'bg-primary-500';
      default: return 'bg-secondary-500';
    }
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case USER_ROLES.ADMIN: return 'bg-danger-100 text-danger-800';
      case USER_ROLES.MANAGER: return 'bg-warning-100 text-warning-800';
      case USER_ROLES.EMPLOYEE: return 'bg-primary-100 text-primary-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  }

  getStatusBadgeColor(isDeleted: boolean): string {
    return isDeleted 
      ? 'bg-danger-100 text-danger-800'
      : 'bg-success-100 text-success-800';
  }

  getStatusText(isDeleted: boolean): string {
    return isDeleted ? 'Deleted' : 'Active';
  }

  // Validation
  private validateUserData(userData: any): string[] {
    const errors: string[] = [];

    // Employee code validation
    if (!userData.employeeCode?.trim()) {
      errors.push('Employee code is required');
    } else if (!/^[A-Za-z0-9]+$/.test(userData.employeeCode)) {
      errors.push('Employee code must be alphanumeric');
    }

    // Name validation
    if (!userData.name?.trim()) {
      errors.push('Name is required');
    } else if (userData.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    // Email validation
    if (!userData.email?.trim()) {
      errors.push('Email is required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Invalid email format');
    }

    // Role validation
    if (!userData.role) {
      errors.push('Role is required');
    } else if (!Object.values(USER_ROLES).includes(userData.role)) {
      errors.push('Invalid role');
    }

    return errors;
  }

  // Statistics
  getUserStats(): { total: number; active: number; deleted: number; byRole: { [key: string]: number } } {
    const stats = {
      total: this.users.length,
      active: this.users.filter(u => !u.isDeleted).length,
      deleted: this.users.filter(u => u.isDeleted).length,
      byRole: this.users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number })
    };
    return stats;
  }

  // Export functionality
  exportUsers(): void {
    const exportData = this.filteredUsers.map(user => ({
      'Employee Code': user.employeeCode,
      'Name': user.name,
      'Email': user.email,
      'Role': user.role,
      'Manager Code': user.managerCode || '',
      'Status': user.isDeleted ? 'Deleted' : 'Active',
      'Created Date': user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => `"${(row as any)[header] || ''}"`).join(',')
      )
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}