// src/app/features/manager/effort-assignment/manager-effort-assignment.ts
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { EffortAssignmentService } from '../../../core/services/effort-assignment';
import { UserService } from '../../../core/services/user';
import { ClientService } from '../../../core/services/client';
import { ProcessService } from '../../../core/services/process';
import { AuthService } from '../../../core/services/auth';

import { 
  EffortAssignmentDTO, 
  CreateEffortAssignmentRequest,
  UserDTO, 
  ClientDTO, 
  ProcessDTO 
} from '../../../core/models';

import { Header } from '../../../shared/components/header/header';
import { Sidebar } from '../../../shared/components/sidebar/sidebar';
import { Loading } from '../../../shared/components/loading/loading';
import { Modal } from '../../../shared/components/modal/modal';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';

interface AssignmentFilters {
  searchTerm: string;
  userId: number | null;
  clientId: number | null;
  processId: number | null;
  effortRange: {
    min: number;
    max: number;
  } | null;
}

interface UserEffortSummary {
  userId: number;
  userName: string;
  employeeCode: string;
  totalEffort: number;
  remainingCapacity: number;
  assignments: EffortAssignmentDTO[];
  isOverAllocated: boolean;
}

interface NewAssignmentForm {
  userId: number | null;
  clientId: number | null;
  processId: number | null;
  effortValue: number;
  isValid: boolean;
  errors: string[];
}

@Component({
  selector: 'app-manager-effort-assignment',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    Header, 
    Sidebar, 
    Loading, 
    Modal, 
    ConfirmDialog
  ],
  templateUrl: './manager-effort-assignment.html',
  styleUrls: ['./manager-effort-assignment.css']
})
export class ManagerEffortAssignment implements OnInit {
  // Data properties
  assignments: EffortAssignmentDTO[] = [];
  filteredAssignments: EffortAssignmentDTO[] = [];
  users: UserDTO[] = [];
  clients: ClientDTO[] = [];
  processes: ProcessDTO[] = [];
  userEffortSummaries: UserEffortSummary[] = [];
  deletedAssignments: EffortAssignmentDTO[] = [];

  // State properties
  isLoading = true;
  isSidebarOpen = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteConfirm = false;
  showRestoreConfirm = false;
  showDeletedAssignments = false;
  showUserDetailModal = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Filter properties
  filters: AssignmentFilters = {
    searchTerm: '',
    userId: null,
    clientId: null,
    processId: null,
    effortRange: null
  };

  // Form properties
  newAssignmentForm: NewAssignmentForm = {
    userId: null,
    clientId: null,
    processId: null,
    effortValue: 0.1,
    isValid: false,
    errors: []
  };

  editAssignmentForm: {
    assignment: EffortAssignmentDTO | null;
    effortValue: number;
    isValid: boolean;
    errors: string[];
  } = {
    assignment: null,
    effortValue: 0,
    isValid: false,
    errors: []
  };

  // Selection properties
  selectedAssignment: EffortAssignmentDTO | null = null;
  selectedUser: UserEffortSummary | null = null;
  selectedAssignments: Set<number> = new Set();

  // Pagination and sorting
  currentPage = 1;
  itemsPerPage = 15;
  totalItems = 0;
  totalPages = 0;
  sortBy: 'user' | 'client' | 'process' | 'effort' | 'date' = 'user';
  sortDirection: 'asc' | 'desc' = 'asc';

  // View mode
  viewMode: 'assignments' | 'users' = 'assignments';

  constructor(
    private effortAssignmentService: EffortAssignmentService,
    private userService: UserService,
    private clientService: ClientService,
    private processService: ProcessService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // Load all required data in parallel
      const [assignments, users, clients, processes] = await Promise.all([
        this.effortAssignmentService.getAllAssignments().toPromise(),
        this.userService.getAllUsers().toPromise(),
        this.clientService.getAllClients().toPromise(),
        this.processService.getAllProcesses().toPromise()
      ]);

      this.assignments = assignments || [];
      this.users = (users || []).filter(u => !u.isDeleted);
      this.clients = (clients || []).filter(c => !c.isDeleted);
      this.processes = (processes || []).filter(p => !p.isDeleted);
      
      this.generateUserEffortSummaries();
      this.applyFilters();
      this.calculatePagination();
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.error = 'Failed to load effort assignments. Please refresh the page.';
    } finally {
      this.isLoading = false;
    }
  }

  // Generate user effort summaries
  generateUserEffortSummaries(): void {
    const userMap = new Map<number, UserEffortSummary>();

    // Initialize all users
    this.users.forEach(user => {
      userMap.set(user.id, {
        userId: user.id,
        userName: user.name,
        employeeCode: user.employeeCode,
        totalEffort: 0,
        remainingCapacity: 1.0,
        assignments: [],
        isOverAllocated: false
      });
    });

    // Add assignments to users
    this.assignments.filter(a => !a.isDeleted).forEach(assignment => {
      const userSummary = userMap.get(assignment.userId);
      if (userSummary) {
        userSummary.assignments.push(assignment);
        userSummary.totalEffort += assignment.effortValue;
      }
    });

    // Calculate remaining capacity and over-allocation
    userMap.forEach(summary => {
      summary.remainingCapacity = Math.max(0, 1.0 - summary.totalEffort);
      summary.isOverAllocated = summary.totalEffort > 1.0;
    });

    this.userEffortSummaries = Array.from(userMap.values())
      .sort((a, b) => a.userName.localeCompare(b.userName));
  }

  // Filter and search methods
  applyFilters(): void {
    let filtered = [...this.assignments.filter(a => !a.isDeleted)];

    // Apply search filter
    if (this.filters.searchTerm.trim()) {
      const searchLower = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(assignment => 
        assignment.userName.toLowerCase().includes(searchLower) ||
        assignment.employeeCode.toLowerCase().includes(searchLower) ||
        assignment.clientName.toLowerCase().includes(searchLower) ||
        assignment.processName.toLowerCase().includes(searchLower) ||
        assignment.assignedByName.toLowerCase().includes(searchLower)
      );
    }

    // Apply user filter
    if (this.filters.userId) {
      filtered = filtered.filter(assignment => assignment.userId === this.filters.userId);
    }

    // Apply client filter
    if (this.filters.clientId) {
      filtered = filtered.filter(assignment => assignment.clientId === this.filters.clientId);
    }

    // Apply process filter
    if (this.filters.processId) {
      filtered = filtered.filter(assignment => assignment.processId === this.filters.processId);
    }

    // Apply effort range filter
    if (this.filters.effortRange) {
      filtered = filtered.filter(assignment => 
        assignment.effortValue >= this.filters.effortRange!.min &&
        assignment.effortValue <= this.filters.effortRange!.max
      );
    }

    // Apply sorting
    filtered = this.effortAssignmentService.sortAssignments(filtered, this.sortBy, this.sortDirection);

    this.filteredAssignments = filtered;
    this.totalItems = filtered.length;
    this.calculatePagination();
    this.currentPage = 1; // Reset to first page when filters change
  }

  clearFilters(): void {
    this.filters = {
      searchTerm: '',
      userId: null,
      clientId: null,
      processId: null,
      effortRange: null
    };
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  // Create assignment methods
  openCreateModal(): void {
    this.resetCreateForm();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetCreateForm();
  }

  resetCreateForm(): void {
    this.newAssignmentForm = {
      userId: null,
      clientId: null,
      processId: null,
      effortValue: 0.1,
      isValid: false,
      errors: []
    };
  }

  onCreateFormChange(): void {
    this.validateCreateForm();
  }

  validateCreateForm(): void {
    const form = this.newAssignmentForm;
    const errors: string[] = [];

    // Validate required fields
    if (!form.userId) errors.push('Please select a user');
    if (!form.clientId) errors.push('Please select a client');
    if (!form.processId) errors.push('Please select a process');

    // Validate effort value
    if (form.effortValue <= 0) {
      errors.push('Effort value must be greater than 0');
    } else if (form.effortValue > 1.0) {
      errors.push('Effort value cannot exceed 1.0');
    }

    // Check for duplicate assignment
    if (form.userId && form.clientId && form.processId) {
      const existingAssignment = this.assignments.find(a => 
        !a.isDeleted && 
        a.userId === form.userId && 
        a.clientId === form.clientId && 
        a.processId === form.processId
      );
      if (existingAssignment) {
        errors.push('This user is already assigned to this client-process combination');
      }
    }

    // Check total effort constraint
    if (form.userId && form.effortValue > 0) {
      const userSummary = this.userEffortSummaries.find(u => u.userId === form.userId);
      if (userSummary && (userSummary.totalEffort + form.effortValue) > 1.0) {
        const available = userSummary.remainingCapacity;
        errors.push(`User only has ${(available * 100).toFixed(1)}% effort capacity remaining`);
      }
    }

    form.errors = errors;
    form.isValid = errors.length === 0;
  }

  async createAssignment(): Promise<void> {
    if (!this.newAssignmentForm.isValid) return;

    try {
      const request: CreateEffortAssignmentRequest = {
        userId: this.newAssignmentForm.userId!,
        clientId: this.newAssignmentForm.clientId!,
        processId: this.newAssignmentForm.processId!,
        effortValue: this.newAssignmentForm.effortValue
      };

      const newAssignment = await this.effortAssignmentService.createAssignment(request).toPromise();
      
      if (newAssignment) {
        this.assignments.push(newAssignment);
        this.generateUserEffortSummaries();
        this.applyFilters();
        this.showSuccess('Effort assignment created successfully!');
        this.closeCreateModal();
      }
    } catch (error) {
      console.error('Create assignment error:', error);
      this.showError(error || 'Failed to create effort assignment.');
    }
  }

  // Edit assignment methods
  openEditModal(assignment: EffortAssignmentDTO): void {
    this.editAssignmentForm = {
      assignment: assignment,
      effortValue: assignment.effortValue,
      isValid: true,
      errors: []
    };
    this.validateEditForm();
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editAssignmentForm = {
      assignment: null,
      effortValue: 0,
      isValid: false,
      errors: []
    };
  }

  onEditFormChange(): void {
    this.validateEditForm();
  }

  validateEditForm(): void {
    const form = this.editAssignmentForm;
    const errors: string[] = [];

    if (!form.assignment) {
      errors.push('No assignment selected');
      form.errors = errors;
      form.isValid = false;
      return;
    }

    // Validate effort value
    if (form.effortValue <= 0) {
      errors.push('Effort value must be greater than 0');
    } else if (form.effortValue > 1.0) {
      errors.push('Effort value cannot exceed 1.0');
    }

    // Check total effort constraint (excluding current assignment)
    if (form.effortValue > 0) {
      const userSummary = this.userEffortSummaries.find(u => u.userId === form.assignment!.userId);
      if (userSummary) {
        const currentEffortWithoutThis = userSummary.totalEffort - form.assignment.effortValue;
        const newTotal = currentEffortWithoutThis + form.effortValue;
        
        if (newTotal > 1.0) {
          const available = 1.0 - currentEffortWithoutThis;
          errors.push(`Maximum effort value for this user is ${(available * 100).toFixed(1)}%`);
        }
      }
    }

    form.errors = errors;
    form.isValid = errors.length === 0;
  }

  async updateAssignment(): Promise<void> {
    if (!this.editAssignmentForm.isValid || !this.editAssignmentForm.assignment) return;

    try {
      const success = await this.effortAssignmentService.updateAssignment(
        this.editAssignmentForm.assignment.id,
        this.editAssignmentForm.effortValue
      ).toPromise();

      if (success) {
        // Update the assignment in the local array
        const index = this.assignments.findIndex(a => a.id === this.editAssignmentForm.assignment!.id);
        if (index !== -1) {
          this.assignments[index].effortValue = this.editAssignmentForm.effortValue;
        }

        this.generateUserEffortSummaries();
        this.applyFilters();
        this.showSuccess('Effort assignment updated successfully!');
        this.closeEditModal();
      }
    } catch (error) {
      console.error('Update assignment error:', error);
      this.showError(error || 'Failed to update effort assignment.');
    }
  }

  // Delete and restore methods
  confirmDelete(assignment: EffortAssignmentDTO): void {
    this.selectedAssignment = assignment;
    this.showDeleteConfirm = true;
  }

  async deleteAssignment(): Promise<void> {
    if (!this.selectedAssignment) return;

    try {
      const success = await this.effortAssignmentService.deleteAssignment(this.selectedAssignment.id).toPromise();
      
      if (success) {
        // Mark as deleted in local array
        const index = this.assignments.findIndex(a => a.id === this.selectedAssignment!.id);
        if (index !== -1) {
          this.assignments[index].isDeleted = true;
        }

        this.generateUserEffortSummaries();
        this.applyFilters();
        this.showSuccess('Effort assignment deleted successfully!');
      }
    } catch (error) {
      console.error('Delete assignment error:', error);
      this.showError(error || 'Failed to delete effort assignment.');
    } finally {
      this.showDeleteConfirm = false;
      this.selectedAssignment = null;
    }
  }

  async loadDeletedAssignments(): Promise<void> {
    if (this.showDeletedAssignments) {
      this.showDeletedAssignments = false;
      return;
    }

    this.isLoading = true;
    try {
      this.deletedAssignments = await this.effortAssignmentService.getDeletedAssignments().toPromise() || [];
      this.showDeletedAssignments = true;
    } catch (error) {
      console.error('Error loading deleted assignments:', error);
      this.showError('Failed to load deleted assignments.');
    } finally {
      this.isLoading = false;
    }
  }

  confirmRestore(assignment: EffortAssignmentDTO): void {
    this.selectedAssignment = assignment;
    this.showRestoreConfirm = true;
  }

  async restoreAssignment(): Promise<void> {
    if (!this.selectedAssignment) return;

    try {
      const success = await this.effortAssignmentService.restoreAssignment(this.selectedAssignment.id).toPromise();
      
      if (success) {
        // Remove from deleted assignments and reload active assignments
        this.deletedAssignments = this.deletedAssignments.filter(a => a.id !== this.selectedAssignment!.id);
        await this.loadInitialData();
        this.showSuccess('Effort assignment restored successfully!');
      }
    } catch (error) {
      console.error('Restore assignment error:', error);
      this.showError(error || 'Failed to restore effort assignment.');
    } finally {
      this.showRestoreConfirm = false;
      this.selectedAssignment = null;
    }
  }

  // User detail methods
  viewUserDetails(userSummary: UserEffortSummary): void {
    this.selectedUser = userSummary;
    this.showUserDetailModal = true;
  }

  closeUserDetailModal(): void {
    this.showUserDetailModal = false;
    this.selectedUser = null;
  }

  // Bulk operations
  toggleAssignmentSelection(assignmentId: number): void {
    if (this.selectedAssignments.has(assignmentId)) {
      this.selectedAssignments.delete(assignmentId);
    } else {
      this.selectedAssignments.add(assignmentId);
    }
  }

  toggleAllAssignments(): void {
    const currentPageAssignments = this.getPaginatedAssignments();
    const allSelected = currentPageAssignments.every(assignment => this.selectedAssignments.has(assignment.id));
    
    if (allSelected) {
      currentPageAssignments.forEach(assignment => this.selectedAssignments.delete(assignment.id));
    } else {
      currentPageAssignments.forEach(assignment => this.selectedAssignments.add(assignment.id));
    }
  }

  async bulkDelete(): Promise<void> {
    if (this.selectedAssignments.size === 0) return;

    const confirmMessage = `Are you sure you want to delete ${this.selectedAssignments.size} assignment(s)?`;
    if (!confirm(confirmMessage)) return;

    this.isLoading = true;
    
    try {
      const deletePromises = Array.from(this.selectedAssignments).map(id =>
        this.effortAssignmentService.deleteAssignment(id).toPromise()
      );
      
      await Promise.all(deletePromises);
      
      // Mark assignments as deleted
      this.assignments.forEach(assignment => {
        if (this.selectedAssignments.has(assignment.id)) {
          assignment.isDeleted = true;
        }
      });

      this.selectedAssignments.clear();
      this.generateUserEffortSummaries();
      this.applyFilters();
      
      this.showSuccess('Assignments deleted successfully!');
    } catch (error) {
      console.error('Bulk delete error:', error);
      this.showError('Failed to delete some assignments.');
    } finally {
      this.isLoading = false;
    }
  }

  // View mode methods
  switchViewMode(mode: 'assignments' | 'users'): void {
    this.viewMode = mode;
    this.clearFilters();
  }

  // Pagination methods
  calculatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
  }

  getPaginatedAssignments(): EffortAssignmentDTO[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredAssignments.slice(startIndex, endIndex);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Sorting methods
  sortAssignments(sortBy: 'user' | 'client' | 'process' | 'effort' | 'date'): void {
    if (this.sortBy === sortBy) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = sortBy;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(column: string): string {
    if (this.sortBy !== column) {
      return 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4'; // Sort icon
    }
    
    return this.sortDirection === 'asc' 
      ? 'M3 4l6 6l6-6' // Up arrow
      : 'M3 20l6-6l6 6'; // Down arrow
  }

  // Utility methods
  formatEffortValue(effortValue: number): string {
    return this.effortAssignmentService.formatEffortValue(effortValue);
  }

  getEffortColor(effortValue: number): string {
    return this.effortAssignmentService.getEffortColor(effortValue);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUserRemainingCapacity(userId: number): number {
    const userSummary = this.userEffortSummaries.find(u => u.userId === userId);
    return userSummary ? userSummary.remainingCapacity : 1.0;
  }

  getSelectedUserName(): string {
    if (!this.newAssignmentForm.userId) return '';
    const user = this.users.find(u => u.id === this.newAssignmentForm.userId);
    return user ? user.name : '';
  }

  getSelectedClientName(): string {
    if (!this.newAssignmentForm.clientId) return '';
    const client = this.clients.find(c => c.id === this.newAssignmentForm.clientId);
    return client ? client.clientName : '';
  }

  getSelectedProcessName(): string {
    if (!this.newAssignmentForm.processId) return '';
    const process = this.processes.find(p => p.id === this.newAssignmentForm.processId);
    return process ? process.processName : '';
  }

  // UI state methods
  onToggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  onCloseSidebar(): void {
    this.isSidebarOpen = false;
  }

  showError(message: string): void {
    this.error = message;
    this.successMessage = null;
    setTimeout(() => this.error = null, 5000);
  }

  showSuccess(message: string): void {
    this.successMessage = message;
    this.error = null;
    setTimeout(() => this.successMessage = null, 5000);
  }

  clearMessages(): void {
    this.error = null;
    this.successMessage = null;
  }

  // Selection state methods
  isAllCurrentPageSelected(): boolean {
    const currentPageAssignments = this.getPaginatedAssignments();
    return currentPageAssignments.length > 0 && 
           currentPageAssignments.every(assignment => this.selectedAssignments.has(assignment.id));
  }

  isSomeCurrentPageSelected(): boolean {
    const currentPageAssignments = this.getPaginatedAssignments();
    return currentPageAssignments.some(assignment => this.selectedAssignments.has(assignment.id));
  }

  getPageInfo(): string {
    const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
    return `${startItem}-${endItem} of ${this.totalItems}`;
  }

  // Navigation methods
  navigateToHome(): void {
    this.router.navigate(['/manager']);
  }

  trackByAssignmentId(index: number, assignment: EffortAssignmentDTO): number {
    return assignment.id;
  }

  trackByUserId(index: number, user: UserEffortSummary): number {
    return user.userId;
  }
}