// src/app/features/admin/user-management/user-management.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { UserService } from '../../../core/services/user';
import { UserDTO, User } from '../../../core/models';
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

  // Data
  users: UserDTO[] = [];
  filteredUsers: UserDTO[] = [];
  paginatedUsers: UserDTO[] = [];
  availableManagers: UserDTO[] = [];

  // UI State
  isLoading = false;
  isSubmitting = false;
  showUserModal = false;
  isEditMode = false;
  selectedUser: UserDTO | null = null;

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
          this.availableManagers = users.filter(u => u.role === 'Manager' || u.role === 'Admin');
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load users:', error);
          this.isLoading = false;
        }
      });
  }

  // Form Management
  private createUserForm(): FormGroup {
    return this.formBuilder.group({
      employeeCode: ['', [Validators.required]],
      name: ['', [Validators.required]],
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
    this.userForm.get('password')?.setValue('temp*123');
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
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.isEditMode = false;
    this.selectedUser = null;
    this.userForm.reset();
    this.isSubmitting = false;
  }

  // Form Submission
  onSubmitUser(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isSubmitting = true;
    const formData = this.userForm.value;

    if (this.isEditMode && this.selectedUser) {
      this.updateUser(formData);
    } else {
      this.createUser(formData);
    }
  }

  private createUser(userData: any): void {
    const user: User = {
      id: 0,
      employeeCode: userData.employeeCode,
      name: userData.name,
      email: userData.email,
      password: userData.password || 'temp*123',
      role: userData.role,
      managerCode: userData.managerCode || undefined,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.userService.createUser(user)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeUserModal();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Failed to create user:', error);
          this.isSubmitting = false;
        }
      });
  }

  private updateUser(userData: any): void {
    if (!this.selectedUser) return;

    const updateData = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      managerCode: userData.managerCode || undefined
    };

    this.userService.updateUser(this.selectedUser.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeUserModal();
          this.loadUsers();
        },
        error: (error) => {
          console.error('Failed to update user:', error);
          this.isSubmitting = false;
        }
      });
  }

  // User Actions
  deleteUser(user: UserDTO): void {
    // Use confirm dialog (implementation would depend on your modal service)
    if (confirm(`Are you sure you want to delete ${user.name}?`)) {
      this.userService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadUsers();
          },
          error: (error) => {
            console.error('Failed to delete user:', error);
          }
        });
    }
  }

  restoreUser(user: UserDTO): void {
    if (confirm(`Are you sure you want to restore ${user.name}?`)) {
      this.userService.restoreUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadUsers();
          },
          error: (error) => {
            console.error('Failed to restore user:', error);
          }
        });
    }
  }

  // Search and Filters
  private setupSearchDebounce(): void {
    const searchSubject = new Subject<string>();
    searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });

    // You would connect this to your search input
  }

  onSearch(): void {
    this.applyFilters();
  }

  onRoleFilter(): void {
    this.applyFilters();
  }

  onStatusFilter(): void {
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

    this.filteredUsers.sort((a, b) => {
      const aValue = this.getFieldValue(a, field);
      const bValue = this.getFieldValue(b, field);
      
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    this.updatePagination();
  }

  private getFieldValue(user: UserDTO, field: string): any {
    switch (field) {
      case 'employeeCode': return user.employeeCode;
      case 'name': return user.name;
      case 'role': return user.role;
      default: return '';
    }
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

  getStartIndex(): number {
    return this.filteredUsers.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredUsers.length);
  }

  // Utility Methods
  trackByUserId(index: number, user: UserDTO): number {
    return user.id;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
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
      case 'Admin': return 'bg-danger-500';
      case 'Manager': return 'bg-warning-500';
      case 'Employee': return 'bg-primary-500';
      default: return 'bg-secondary-500';
    }
  }

  getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'Admin': return 'bg-danger-100 text-danger-800';
      case 'Manager': return 'bg-warning-100 text-warning-800';
      case 'Employee': return 'bg-primary-100 text-primary-800';
      default: return 'bg-secondary-100 text-secondary-800';
    }
  }
}