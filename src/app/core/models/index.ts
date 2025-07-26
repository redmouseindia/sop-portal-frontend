// ===================================
// SOP Portal - Complete TypeScript Models
// Matches Backend API exactly
// ===================================

// ===================================
// ENUMS
// ===================================
export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  Employee = 'Employee'
}

export enum ClientCategory {
  ABA = 'ABA',
  NON_ABA = 'NON-ABA'
}

// ===================================
// USER MODELS
// ===================================
export interface User {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  password: string;  // Plain text in backend
  role: string;
  managerCode?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDTO {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  managerCode?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedByName?: string;
}

// ===================================
// CLIENT MODELS
// ===================================
export interface Client {
  id: number;
  clientCode: string;
  clientName: string;
  category: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientDTO {
  id: number;
  clientCode: string;
  clientName: string;
  category: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedByName?: string;
}

// ===================================
// PROCESS MODELS
// ===================================
export interface Process {
  id: number;
  processCode: string;
  processName: string;
  description?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessDTO {
  id: number;
  processCode: string;
  processName: string;
  description?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedByName?: string;
}

// ===================================
// DOCUMENT MODELS
// ===================================
export interface Document {
  id: number;
  documentName: string;  // Backend uses document_name
  filePath: string;
  fileSize: number;
  mimeType: string;
  clientId: number;
  processId: number;
  uploadedBy: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;
  createdAt: Date;
  updatedAt: Date;
  // Navigation properties
  client?: Client;
  process?: Process;
  uploadedByUser?: User;
}

export interface DocumentDTO {
  id: number;
  documentName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  clientId: number;
  processId: number;
  clientName: string;
  processName: string;
  uploadedByName: string;
  createdAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedByName?: string;
}

export interface FileUploadRequest {
  file: File;
  clientId: number;
  processId: number;
}

// ===================================
// EFFORT ASSIGNMENT MODELS
// ===================================
export interface EffortAssignment {
  id: number;
  userId: number;
  clientId: number;
  processId: number;
  effortValue: number;
  assignedBy: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: number;
  createdAt: Date;
  updatedAt: Date;
  // Navigation properties
  user?: User;
  client?: Client;
  process?: Process;
  assignedByUser?: User;
}

export interface EffortAssignmentDTO {
  id: number;
  userId: number;
  clientId: number;
  processId: number;
  effortValue: number;
  userName: string;
  employeeCode: string;
  clientName: string;
  processName: string;
  assignedByName: string;
  createdAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedByName?: string;
}

export interface CreateEffortAssignmentRequest {
  userId: number;
  clientId: number;
  processId: number;
  effortValue: number;
}

// ===================================
// AUTHENTICATION MODELS
// ===================================
export interface LoginRequest {
  employeeCode: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserDTO;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthUser {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  role: string;
  managerCode?: string;
}

// ===================================
// HR IMPORT MODELS
// ===================================
export interface HRImportRequest {
  excelFile: File;
}

export interface HREmployeeData {
  employeeCode: string;
  employeeName: string;
  managerCode?: string;
}

export interface HRImportBackup {
  id: number;
  backupData: string;
  importDate: Date;
  importedBy?: number;
}

// ===================================
// REPORT MODELS
// ===================================
export interface ManagerReportDTO {
  employeeCode: string;
  employeeName: string;
  clientCode: string;
  clientName: string;
  processName: string;
  effortValue: number;
  assignedByName: string;
  assignedDate: Date;
}

export interface AdminReportDTO {
  effortAllocations: EffortAssignmentDTO[];
  documentMetadata: DocumentDTO[];
}

// ===================================
// RECYCLE BIN MODELS
// ===================================
export interface RecycleBinSummaryDTO {
  deletedUsersCount: number;
  deletedClientsCount: number;
  deletedProcessesCount: number;
  deletedDocumentsCount: number;
  deletedAssignmentsCount: number;
  totalDeletedItems: number;
}

export interface DeletionAudit {
  id: number;
  tableName: string;
  recordId: number;
  deletedBy: number;
  deletedAt: Date;
  deletionReason?: string;
  originalData?: string;
  operationType: string;
}

// ===================================
// API RESPONSE WRAPPER
// ===================================
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors: string[];
}

// ===================================
// PAGINATION MODELS
// ===================================
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginationParams {
  pageNumber: number;
  pageSize: number;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

// ===================================
// UI SPECIFIC MODELS
// ===================================
export interface NavigationItem {
  label: string;
  route: string;
  icon: string;
  roles: UserRole[];
  children?: NavigationItem[];
}

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  type?: 'text' | 'number' | 'date' | 'badge' | 'actions';
}

export interface ModalConfig {
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  backdrop?: boolean;
}

export interface NotificationConfig {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  autoClose?: boolean;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'number' | 'file';
  required?: boolean;
  options?: { value: any; label: string }[];
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

// ===================================
// CONSTANTS
// ===================================
export const API_ENDPOINTS = {
  BASE_URL: 'https://localhost:7278/api',
  AUTH: {
    LOGIN: '/Auth/login',
    CHANGE_PASSWORD: '/Auth/change-password'
  },
  USERS: '/Users',
  CLIENTS: '/Clients',
  PROCESSES: '/Processes',
  DOCUMENTS: '/Documents',
  EFFORT_ASSIGNMENTS: '/EffortAssignments',
  REPORTS: {
    MANAGER: '/Reports/manager',
    ADMIN: '/Reports/admin',
    MANAGER_EXPORT: '/Reports/manager/export',
    ADMIN_EXPORT: '/Reports/admin/export'
  },
  HR_IMPORT: {
    IMPORT: '/HRImport/import',
    TEMPLATE: '/HRImport/template'
  },
  RECYCLE_BIN: '/RecycleBin'
} as const;

export const USER_ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee'
} as const;

export const CLIENT_CATEGORIES = {
  ABA: 'ABA',
  NON_ABA: 'NON-ABA'
} as const;

export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 52428800, // 50MB
  ALLOWED_EXTENSIONS: [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', 
    '.ppt', '.pptx', '.txt', '.jpg', '.jpeg', 
    '.png', '.gif'
  ]
} as const;