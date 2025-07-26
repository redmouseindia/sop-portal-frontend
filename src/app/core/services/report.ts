import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  ManagerReportDTO,
  AdminReportDTO,
  ApiResponse,
  API_ENDPOINTS 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private readonly managerReportUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.REPORTS.MANAGER}`;
  private readonly adminReportUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.REPORTS.ADMIN}`;
  private readonly managerExportUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.REPORTS.MANAGER_EXPORT}`;
  private readonly adminExportUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.REPORTS.ADMIN_EXPORT}`;

  constructor(private http: HttpClient) {}

  /**
   * Get manager report (Manager role only)
   */
  getManagerReport(): Observable<ManagerReportDTO[]> {
    return this.http.get<ApiResponse<ManagerReportDTO[]>>(this.managerReportUrl)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get manager report');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get manager report error:', error);
          return throwError(() => error.message || 'Failed to get manager report');
        })
      );
  }

  /**
   * Get admin report (Admin role only)
   */
  getAdminReport(): Observable<AdminReportDTO> {
    return this.http.get<ApiResponse<AdminReportDTO>>(this.adminReportUrl)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to get admin report');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Get admin report error:', error);
          return throwError(() => error.message || 'Failed to get admin report');
        })
      );
  }

  /**
   * Export manager report to Excel (Manager role only)
   */
  exportManagerReport(): Observable<Blob> {
    return this.http.get(this.managerExportUrl, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Export manager report error:', error);
        let errorMessage = 'Failed to export manager report';
        
        if (error.status === 403) {
          errorMessage = 'You do not have permission to export this report';
        } else if (error.status === 404) {
          errorMessage = 'Report export endpoint not found';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Export admin report to Excel (Admin role only)
   */
  exportAdminReport(): Observable<Blob> {
    return this.http.get(this.adminExportUrl, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Export admin report error:', error);
        let errorMessage = 'Failed to export admin report';
        
        if (error.status === 403) {
          errorMessage = 'You do not have permission to export this report';
        } else if (error.status === 404) {
          errorMessage = 'Report export endpoint not found';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Download manager report Excel file
   */
  downloadManagerReport(): void {
    this.exportManagerReport().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ManagerReport_${this.getCurrentDateString()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download manager report error:', error);
        // Handle error (show notification, etc.)
      }
    });
  }

  /**
   * Download admin report Excel file
   */
  downloadAdminReport(): void {
    this.exportAdminReport().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `AdminReport_${this.getCurrentDateString()}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download admin report error:', error);
        // Handle error (show notification, etc.)
      }
    });
  }

  /**
   * Get manager report summary
   */
  getManagerReportSummary(): Observable<{
    totalEmployees: number;
    totalEffortAllocations: number;
    averageEffortPerEmployee: number;
    fullyAllocatedEmployees: number;
    underAllocatedEmployees: number;
    clientDistribution: { [key: string]: number };
    processDistribution: { [key: string]: number };
  }> {
    return this.getManagerReport().pipe(
      map(reportData => {
        const employeeMap = new Map<string, { totalEffort: number; employeeCode: string }>();
        const clientDistribution: { [key: string]: number } = {};
        const processDistribution: { [key: string]: number } = {};

        // Process each assignment
        reportData.forEach(assignment => {
          // Track employee efforts
          const key = assignment.employeeCode;
          if (!employeeMap.has(key)) {
            employeeMap.set(key, { totalEffort: 0, employeeCode: assignment.employeeCode });
          }
          employeeMap.get(key)!.totalEffort += assignment.effortValue;

          // Track client distribution
          clientDistribution[assignment.clientName] = (clientDistribution[assignment.clientName] || 0) + 1;

          // Track process distribution
          processDistribution[assignment.processName] = (processDistribution[assignment.processName] || 0) + 1;
        });

        const employees = Array.from(employeeMap.values());
        const totalEmployees = employees.length;
        const fullyAllocatedEmployees = employees.filter(emp => emp.totalEffort >= 1.0).length;
        const underAllocatedEmployees = employees.filter(emp => emp.totalEffort < 1.0).length;
        const totalEffort = employees.reduce((sum, emp) => sum + emp.totalEffort, 0);
        const averageEffortPerEmployee = totalEmployees > 0 ? totalEffort / totalEmployees : 0;

        return {
          totalEmployees,
          totalEffortAllocations: reportData.length,
          averageEffortPerEmployee,
          fullyAllocatedEmployees,
          underAllocatedEmployees,
          clientDistribution,
          processDistribution
        };
      }),
      catchError(error => {
        console.error('Get manager report summary error:', error);
        return throwError(() => error.message || 'Failed to get manager report summary');
      })
    );
  }

  /**
   * Get admin report summary
   */
  getAdminReportSummary(): Observable<{
    totalUsers: number;
    totalClients: number;
    totalProcesses: number;
    totalDocuments: number;
    totalEffortAllocations: number;
    totalDocumentSize: number;
    documentsByMimeType: { [key: string]: number };
    effortByClient: { [key: string]: number };
    effortByProcess: { [key: string]: number };
    userRoleDistribution: { [key: string]: number };
  }> {
    return this.getAdminReport().pipe(
      map(reportData => {
        const documentsByMimeType: { [key: string]: number } = {};
        const effortByClient: { [key: string]: number } = {};
        const effortByProcess: { [key: string]: number } = {};
        const userRoleDistribution: { [key: string]: number } = {};

        // Process documents
        reportData.documentMetadata.forEach(doc => {
          documentsByMimeType[doc.mimeType] = (documentsByMimeType[doc.mimeType] || 0) + 1;
        });

        // Process effort allocations
        reportData.effortAllocations.forEach(effort => {
          effortByClient[effort.clientName] = (effortByClient[effort.clientName] || 0) + effort.effortValue;
          effortByProcess[effort.processName] = (effortByProcess[effort.processName] || 0) + effort.effortValue;
        });

        const totalDocumentSize = reportData.documentMetadata.reduce((sum, doc) => sum + doc.fileSize, 0);
        const uniqueUsers = new Set(reportData.effortAllocations.map(e => e.userId)).size;
        const uniqueClients = new Set(reportData.effortAllocations.map(e => e.clientId)).size;
        const uniqueProcesses = new Set(reportData.effortAllocations.map(e => e.processId)).size;

        return {
          totalUsers: uniqueUsers,
          totalClients: uniqueClients,
          totalProcesses: uniqueProcesses,
          totalDocuments: reportData.documentMetadata.length,
          totalEffortAllocations: reportData.effortAllocations.length,
          totalDocumentSize,
          documentsByMimeType,
          effortByClient,
          effortByProcess,
          userRoleDistribution // Would need user data to calculate
        };
      }),
      catchError(error => {
        console.error('Get admin report summary error:', error);
        return throwError(() => error.message || 'Failed to get admin report summary');
      })
    );
  }

  /**
   * Get effort allocation trends (placeholder for future enhancement)
   */
  getEffortAllocationTrends(days: number = 30): Observable<{
    date: string;
    totalEffort: number;
    newAssignments: number;
    modifiedAssignments: number;
  }[]> {
    // This would need backend support for historical data
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }

  /**
   * Get top performers report
   */
  getTopPerformersReport(): Observable<{
    employeeCode: string;
    employeeName: string;
    totalEffort: number;
    clientCount: number;
    processCount: number;
    utilizationRate: number;
  }[]> {
    return this.getManagerReport().pipe(
      map(reportData => {
        const employeeMap = new Map<string, {
          employeeCode: string;
          employeeName: string;
          totalEffort: number;
          clients: Set<string>;
          processes: Set<string>;
        }>();

        // Aggregate data by employee
        reportData.forEach(assignment => {
          const key = assignment.employeeCode;
          if (!employeeMap.has(key)) {
            employeeMap.set(key, {
              employeeCode: assignment.employeeCode,
              employeeName: assignment.employeeName,
              totalEffort: 0,
              clients: new Set(),
              processes: new Set()
            });
          }

          const employee = employeeMap.get(key)!;
          employee.totalEffort += assignment.effortValue;
          employee.clients.add(assignment.clientName);
          employee.processes.add(assignment.processName);
        });

        // Convert to array and calculate utilization
        return Array.from(employeeMap.values())
          .map(emp => ({
            employeeCode: emp.employeeCode,
            employeeName: emp.employeeName,
            totalEffort: emp.totalEffort,
            clientCount: emp.clients.size,
            processCount: emp.processes.size,
            utilizationRate: emp.totalEffort // Already a decimal (0.0 - 1.0)
          }))
          .sort((a, b) => b.utilizationRate - a.utilizationRate); // Sort by utilization descending
      }),
      catchError(error => {
        console.error('Get top performers report error:', error);
        return throwError(() => error.message || 'Failed to get top performers report');
      })
    );
  }

  /**
   * Get client utilization report
   */
  getClientUtilizationReport(): Observable<{
    clientName: string;
    totalEffort: number;
    employeeCount: number;
    processCount: number;
    documentCount: number;
    averageEffortPerEmployee: number;
  }[]> {
    return this.getAdminReport().pipe(
      map(reportData => {
        const clientMap = new Map<string, {
          clientName: string;
          totalEffort: number;
          employees: Set<number>;
          processes: Set<number>;
          documentCount: number;
        }>();

        // Process effort allocations
        reportData.effortAllocations.forEach(effort => {
          const key = effort.clientName;
          if (!clientMap.has(key)) {
            clientMap.set(key, {
              clientName: effort.clientName,
              totalEffort: 0,
              employees: new Set(),
              processes: new Set(),
              documentCount: 0
            });
          }

          const client = clientMap.get(key)!;
          client.totalEffort += effort.effortValue;
          client.employees.add(effort.userId);
          client.processes.add(effort.processId);
        });

        // Process documents
        reportData.documentMetadata.forEach(doc => {
          const client = clientMap.get(doc.clientName);
          if (client) {
            client.documentCount++;
          }
        });

        // Convert to array with calculated metrics
        return Array.from(clientMap.values())
          .map(client => ({
            clientName: client.clientName,
            totalEffort: client.totalEffort,
            employeeCount: client.employees.size,
            processCount: client.processes.size,
            documentCount: client.documentCount,
            averageEffortPerEmployee: client.employees.size > 0 ? client.totalEffort / client.employees.size : 0
          }))
          .sort((a, b) => b.totalEffort - a.totalEffort); // Sort by total effort descending
      }),
      catchError(error => {
        console.error('Get client utilization report error:', error);
        return throwError(() => error.message || 'Failed to get client utilization report');
      })
    );
  }

  /**
   * Get process efficiency report
   */
  getProcessEfficiencyReport(): Observable<{
    processName: string;
    totalEffort: number;
    employeeCount: number;
    clientCount: number;
    documentCount: number;
    averageEffortPerClient: number;
  }[]> {
    return this.getAdminReport().pipe(
      map(reportData => {
        const processMap = new Map<string, {
          processName: string;
          totalEffort: number;
          employees: Set<number>;
          clients: Set<number>;
          documentCount: number;
        }>();

        // Process effort allocations
        reportData.effortAllocations.forEach(effort => {
          const key = effort.processName;
          if (!processMap.has(key)) {
            processMap.set(key, {
              processName: effort.processName,
              totalEffort: 0,
              employees: new Set(),
              clients: new Set(),
              documentCount: 0
            });
          }

          const process = processMap.get(key)!;
          process.totalEffort += effort.effortValue;
          process.employees.add(effort.userId);
          process.clients.add(effort.clientId);
        });

        // Process documents
        reportData.documentMetadata.forEach(doc => {
          const process = processMap.get(doc.processName);
          if (process) {
            process.documentCount++;
          }
        });

        // Convert to array with calculated metrics
        return Array.from(processMap.values())
          .map(process => ({
            processName: process.processName,
            totalEffort: process.totalEffort,
            employeeCount: process.employees.size,
            clientCount: process.clients.size,
            documentCount: process.documentCount,
            averageEffortPerClient: process.clients.size > 0 ? process.totalEffort / process.clients.size : 0
          }))
          .sort((a, b) => b.totalEffort - a.totalEffort); // Sort by total effort descending
      }),
      catchError(error => {
        console.error('Get process efficiency report error:', error);
        return throwError(() => error.message || 'Failed to get process efficiency report');
      })
    );
  }

  /**
   * Format effort value for display in reports
   */
  formatEffortValue(effortValue: number): string {
    return `${(effortValue * 100).toFixed(1)}%`;
  }

  /**
   * Format file size for display in reports
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get current date string for file naming
   */
  private getCurrentDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
  }

  /**
   * Get report generation metadata
   */
  getReportMetadata(): {
    generatedAt: Date;
    generatedBy: string;
    reportTypes: string[];
    lastRefresh: Date;
  } {
    return {
      generatedAt: new Date(),
      generatedBy: 'Current User', // Would get from auth service
      reportTypes: ['Manager Report', 'Admin Report'],
      lastRefresh: new Date()
    };
  }

  /**
   * Check if user can access reports
   */
  canAccessManagerReports(): boolean {
    // This would check user permissions
    // Will be handled by backend authorization
    return true;
  }

  /**
   * Check if user can access admin reports
   */
  canAccessAdminReports(): boolean {
    // This would check user permissions
    // Will be handled by backend authorization
    return true;
  }

  /**
   * Refresh report data (trigger backend recalculation if needed)
   */
  refreshReportData(): Observable<boolean> {
    // This would trigger backend to refresh cached report data
    // For now, just return success
    return new Observable(observer => {
      observer.next(true);
      observer.complete();
    });
  }
}