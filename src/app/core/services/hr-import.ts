import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  HRImportRequest,
  HREmployeeData,
  ApiResponse,
  API_ENDPOINTS 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class HRImportService {
  private readonly baseUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.HR_IMPORT.IMPORT}`;
  private readonly templateUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.HR_IMPORT.TEMPLATE}`;

  constructor(private http: HttpClient) {}

  /**
   * Import HR data from Excel file (Admin only)
   */
  importHRData(file: File): Observable<string> {
    // Validate file before upload
    const validationError = this.validateHRFile(file);
    if (validationError) {
      return throwError(() => validationError);
    }

    const formData = new FormData();
    formData.append('excelFile', file);

    return this.http.post<ApiResponse<string>>(this.baseUrl, formData)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to import HR data');
          }
          return response.data || response.message || 'HR data imported successfully';
        }),
        catchError(error => {
          console.error('HR import error:', error);
          let errorMessage = 'Failed to import HR data';
          
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.errors && error.error.errors.length > 0) {
            errorMessage = error.error.errors.join(', ');
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          return throwError(() => errorMessage);
        })
      );
  }

  /**
   * Import HR data with progress tracking
   */
  importHRDataWithProgress(file: File): Observable<{
    type: 'progress' | 'success';
    progress?: number;
    result?: string;
  }> {
    // Validate file before upload
    const validationError = this.validateHRFile(file);
    if (validationError) {
      return throwError(() => validationError);
    }

    const formData = new FormData();
    formData.append('excelFile', file);

    return this.http.post<ApiResponse<string>>(this.baseUrl, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map(event => {
        if (event.type === HttpEventType.UploadProgress) {
          const progress = event.total ? Math.round(100 * event.loaded / event.total) : 0;
          return { type: 'progress' as const, progress };
        } else if (event.type === HttpEventType.Response) {
          const response = event.body as ApiResponse<string>;
          if (!response.success) {
            throw new Error(response.message || 'Failed to import HR data');
          }
          return { 
            type: 'success' as const, 
            result: response.data || response.message || 'HR data imported successfully' 
          };
        } else {
          return { type: 'progress' as const, progress: 0 };
        }
      }),
      catchError(error => {
        console.error('HR import with progress error:', error);
        let errorMessage = 'Failed to import HR data';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Download HR import template
   */
  downloadTemplate(): Observable<Blob> {
    return this.http.get(this.templateUrl, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Download template error:', error);
        let errorMessage = 'Failed to download template';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        return throwError(() => errorMessage);
      })
    );
  }

  /**
   * Download template with automatic file save
   */
  downloadTemplateFile(): void {
    this.downloadTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'HR_Import_Template.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Download template error:', error);
        // Handle error (show notification, etc.)
      }
    });
  }

  /**
   * Validate HR Excel file
   */
  validateHRFile(file: File): string | null {
    // Check if file is provided
    if (!file) {
      return 'Please select a file to upload';
    }

    // Check file extension
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      return `Invalid file type. Please upload an Excel file (${allowedExtensions.join(', ')})`;
    }

    // Check file size (max 10MB for HR files)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'File size exceeds maximum limit of 10MB';
    }

    // Check file name
    if (file.name.length > 255) {
      return 'File name is too long (maximum 255 characters)';
    }

    return null; // No validation errors
  }

  /**
   * Parse and validate HR data from file content (client-side preview)
   * Note: This would require a library like SheetJS to read Excel files in browser
   */
  previewHRData(file: File): Observable<{
    isValid: boolean;
    errors: string[];
    data: HREmployeeData[];
    summary: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
    };
  }> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // This would require SheetJS library implementation
          // For now, return a placeholder response
          const result = {
            isValid: true,
            errors: [],
            data: [] as HREmployeeData[],
            summary: {
              totalRows: 0,
              validRows: 0,
              invalidRows: 0
            }
          };
          
          observer.next(result);
          observer.complete();
        } catch (error) {
          observer.error('Failed to parse Excel file');
        }
      };
      
      reader.onerror = () => {
        observer.error('Failed to read file');
      };
      
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Validate HR employee data structure
   */
  validateHREmployeeData(data: HREmployeeData[]): {
    isValid: boolean;
    errors: string[];
    validRows: HREmployeeData[];
    invalidRows: { row: number; data: HREmployeeData; errors: string[] }[];
  } {
    const errors: string[] = [];
    const validRows: HREmployeeData[] = [];
    const invalidRows: { row: number; data: HREmployeeData; errors: string[] }[] = [];

    if (!data || data.length === 0) {
      return {
        isValid: false,
        errors: ['No data found in the file'],
        validRows: [],
        invalidRows: []
      };
    }

    data.forEach((employee, index) => {
      const rowErrors = this.validateEmployeeRow(employee);
      
      if (rowErrors.length === 0) {
        validRows.push(employee);
      } else {
        invalidRows.push({
          row: index + 2, // +2 because Excel rows start at 1 and we skip header
          data: employee,
          errors: rowErrors
        });
        errors.push(...rowErrors.map(error => `Row ${index + 2}: ${error}`));
      }
    });

    return {
      isValid: invalidRows.length === 0,
      errors,
      validRows,
      invalidRows
    };
  }

  /**
   * Validate individual employee row
   */
  private validateEmployeeRow(employee: HREmployeeData): string[] {
    const errors: string[] = [];

    // Validate employee code
    if (!employee.employeeCode?.trim()) {
      errors.push('Employee code is required');
    } else if (!/^[A-Za-z0-9]+$/.test(employee.employeeCode)) {
      errors.push('Employee code must be alphanumeric');
    } else if (employee.employeeCode.length > 50) {
      errors.push('Employee code must be 50 characters or less');
    }

    // Validate employee name
    if (!employee.employeeName?.trim()) {
      errors.push('Employee name is required');
    } else if (employee.employeeName.length < 2) {
      errors.push('Employee name must be at least 2 characters');
    } else if (employee.employeeName.length > 255) {
      errors.push('Employee name must be 255 characters or less');
    }

    // Validate manager code (optional)
    if (employee.managerCode) {
      if (!/^[A-Za-z0-9]+$/.test(employee.managerCode)) {
        errors.push('Manager code must be alphanumeric');
      } else if (employee.managerCode.length > 50) {
        errors.push('Manager code must be 50 characters or less');
      }
    }

    // Check for circular reference (employee cannot be their own manager)
    if (employee.managerCode && employee.employeeCode === employee.managerCode) {
      errors.push('Employee cannot be their own manager');
    }

    return errors;
  }

  /**
   * Get HR import guidelines
   */
  getImportGuidelines(): {
    title: string;
    description: string;
    requirements: string[];
    columns: { name: string; description: string; required: boolean; example: string }[];
    notes: string[];
  } {
    return {
      title: 'HR Data Import Guidelines',
      description: 'Import employee data from Excel files to bulk create/update user accounts.',
      requirements: [
        'File must be in Excel format (.xlsx or .xls)',
        'Maximum file size: 10MB',
        'First row must contain column headers',
        'Required columns: employee_code, employee_name',
        'Optional columns: manager_code'
      ],
      columns: [
        {
          name: 'employee_code',
          description: 'Unique alphanumeric identifier for the employee',
          required: true,
          example: 'EMP001'
        },
        {
          name: 'employee_name',
          description: 'Full name of the employee',
          required: true,
          example: 'John Doe'
        },
        {
          name: 'manager_code',
          description: 'Employee code of the direct manager (optional)',
          required: false,
          example: 'MGR001'
        }
      ],
      notes: [
        'Existing users will be updated with new information',
        'New users will be created with default password "temp*123"',
        'Users not in the import file will be soft-deleted (except Admin users)',
        'Email addresses will be auto-generated as employeecode@company.com',
        'All imported users will have "Employee" role by default',
        'Manager hierarchy will be established based on manager_code',
        'Import process creates a backup before making changes'
      ]
    };
  }

  /**
   * Format import result for display
   */
  formatImportResult(result: string): {
    success: boolean;
    processed: number;
    created: number;
    updated: number;
    deleted: number;
    message: string;
  } {
    // Parse the result string from backend
    // Example: "HR Import completed successfully. Processed: 150, Created: 25, Updated: 100, Soft Deleted: 10"
    
    const defaultResult = {
      success: true,
      processed: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      message: result
    };

    try {
      const processedMatch = result.match(/Processed:\s*(\d+)/);
      const createdMatch = result.match(/Created:\s*(\d+)/);
      const updatedMatch = result.match(/Updated:\s*(\d+)/);
      const deletedMatch = result.match(/(?:Soft\s+)?Deleted:\s*(\d+)/);

      return {
        success: result.toLowerCase().includes('success'),
        processed: processedMatch ? parseInt(processedMatch[1]) : 0,
        created: createdMatch ? parseInt(createdMatch[1]) : 0,
        updated: updatedMatch ? parseInt(updatedMatch[1]) : 0,
        deleted: deletedMatch ? parseInt(deletedMatch[1]) : 0,
        message: result
      };
    } catch (error) {
      console.error('Error parsing import result:', error);
      return defaultResult;
    }
  }

  /**
   * Get import history (placeholder - would need backend support)
   */
  getImportHistory(): Observable<{
    id: number;
    importDate: Date;
    fileName: string;
    importedBy: string;
    processed: number;
    created: number;
    updated: number;
    deleted: number;
    status: 'success' | 'failed' | 'partial';
  }[]> {
    // This would need backend implementation
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }

  /**
   * Validate import permissions
   */
  canImportHRData(): boolean {
    // This would check user permissions
    // For now, assume only Admin can import
    return true; // Will be handled by backend authorization
  }

  /**
   * Get sample HR data for template
   */
  getSampleHRData(): HREmployeeData[] {
    return [
      {
        employeeCode: 'EMP001',
        employeeName: 'John Doe',
        managerCode: 'MGR001'
      },
      {
        employeeCode: 'EMP002',
        employeeName: 'Jane Smith',
        managerCode: 'MGR001'
      },
      {
        employeeCode: 'MGR001',
        employeeName: 'Manager Name',
        managerCode: 'ADMIN001'
      },
      {
        employeeCode: 'ADMIN001',
        employeeName: 'Admin User',
        managerCode: undefined
      }
    ];
  }

  /**
   * Export current users to Excel format (for backup before import)
   */
  exportCurrentUsers(): Observable<Blob> {
    // This would need backend implementation to export current users
    return throwError(() => 'Export functionality not yet implemented');
  }
}