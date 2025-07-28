// src/app/features/employee/pages/employee-dashboard/employee-dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../../../core/services/auth';
import { DocumentService } from '../../../../core/services/document';
import { EffortAssignmentService } from '../../../../core/services/effort-assignment';
import { 
  AuthUser, 
  DocumentDTO, 
  EffortAssignmentDTO 
} from '../../../../core/models';
import { Loading } from '../../../../shared/components/loading/loading';

interface DashboardStats {
  totalDocuments: number;
  recentDocuments: number;
  totalClients: number;
  totalProcesses: number;
  totalEffortAllocated: number;
  documentsThisWeek: number;
  documentsThisMonth: number;
}

interface ClientSummary {
  clientName: string;
  documentCount: number;
  effortValue: number;
  processes: string[];
  lastActivity: Date;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, Loading],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.css']
})
export class EmployeeDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentUser: AuthUser | null = null;
  isLoading = true;
  
  // Dashboard data
  stats: DashboardStats = {
    totalDocuments: 0,
    recentDocuments: 0,
    totalClients: 0,
    totalProcesses: 0,
    totalEffortAllocated: 0,
    documentsThisWeek: 0,
    documentsThisMonth: 0
  };
  
  recentDocuments: DocumentDTO[] = [];
  clientSummaries: ClientSummary[] = [];
  effortAssignments: EffortAssignmentDTO[] = [];
  
  constructor(
    private authService: AuthService,
    private documentService: DocumentService,
    private effortAssignmentService: EffortAssignmentService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDashboardData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private loadDashboardData(): void {
    this.isLoading = true;
    
    if (!this.currentUser) {
      this.isLoading = false;
      return;
    }
    
    // Load user documents and effort assignments in parallel
    forkJoin({
      documents: this.documentService.getUserDocuments(),
      assignments: this.effortAssignmentService.getUserAssignments(this.currentUser.id)
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: ({ documents, assignments }) => {
        this.processDocuments(documents);
        this.processEffortAssignments(assignments);
        this.generateClientSummaries(documents, assignments);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }
  
  private processDocuments(documents: DocumentDTO[]): void {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    this.stats.totalDocuments = documents.length;
    
    // Count recent documents
    this.stats.recentDocuments = documents.filter(doc => 
      new Date(doc.createdAt) > oneDayAgo
    ).length;
    
    this.stats.documentsThisWeek = documents.filter(doc => 
      new Date(doc.createdAt) > oneWeekAgo
    ).length;
    
    this.stats.documentsThisMonth = documents.filter(doc => 
      new Date(doc.createdAt) > oneMonthAgo
    ).length;
    
    // Get unique clients and processes
    this.stats.totalClients = new Set(documents.map(doc => doc.clientId)).size;
    this.stats.totalProcesses = new Set(documents.map(doc => doc.processId)).size;
    
    // Get recent documents (last 10)
    this.recentDocuments = documents
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }
  
  private processEffortAssignments(assignments: EffortAssignmentDTO[]): void {
    this.effortAssignments = assignments;
    
    // Calculate total effort allocated
    this.stats.totalEffortAllocated = assignments.reduce((total, assignment) => 
      total + assignment.effortValue, 0
    );
  }
  
  private generateClientSummaries(documents: DocumentDTO[], assignments: EffortAssignmentDTO[]): void {
    const clientMap = new Map<string, ClientSummary>();
    
    // Initialize with effort assignments
    assignments.forEach(assignment => {
      if (!clientMap.has(assignment.clientName)) {
        clientMap.set(assignment.clientName, {
          clientName: assignment.clientName,
          documentCount: 0,
          effortValue: 0,
          processes: [],
          lastActivity: new Date(assignment.createdAt)
        });
      }
      
      const summary = clientMap.get(assignment.clientName)!;
      summary.effortValue += assignment.effortValue;
      
      if (!summary.processes.includes(assignment.processName)) {
        summary.processes.push(assignment.processName);
      }
    });
    
    // Add document counts and update last activity
    documents.forEach(doc => {
      const summary = clientMap.get(doc.clientName);
      if (summary) {
        summary.documentCount++;
        const docDate = new Date(doc.createdAt);
        if (docDate > summary.lastActivity) {
          summary.lastActivity = docDate;
        }
      }
    });
    
    this.clientSummaries = Array.from(clientMap.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }
  
  // Navigation methods
  navigateToDocuments(): void {
    this.router.navigate(['/employee/documents']);
  }
  
  navigateToClientDocuments(clientName: string): void {
    this.router.navigate(['/employee/documents'], {
      queryParams: { client: clientName }
    });
  }
  
  downloadDocument(document: DocumentDTO): void {
    this.documentService.downloadDocumentWithFilename(
      document.id,
      document.documentName
    );
  }
  
  // Utility methods
  formatFileSize(bytes: number): string {
    return this.documentService.formatFileSize(bytes);
  }
  
  getFileIcon(mimeType: string): string {
    return this.documentService.getFileIcon(mimeType);
  }
  
  formatDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else {
      return `${Math.floor(diffDays / 30)} months ago`;
    }
  }
  
  formatEffortValue(effortValue: number): string {
    return this.effortAssignmentService.formatEffortValue(effortValue);
  }
  
  getEffortColor(effortValue: number): string {
    return this.effortAssignmentService.getEffortColor(effortValue);
  }
  
  getWelcomeMessage(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    } else if (hour < 17) {
      return 'Good afternoon';
    } else {
      return 'Good evening';
    }
  }
  
  refreshDashboard(): void {
    this.loadDashboardData();
  }
}