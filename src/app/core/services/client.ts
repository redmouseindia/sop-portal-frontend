import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  Client, 
  ClientDTO, 
  ApiResponse,
  API_ENDPOINTS,
  CLIENT_CATEGORIES 
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private readonly baseUrl = `${API_ENDPOINTS.BASE_URL}${API_ENDPOINTS.CLIENTS}`;

  constructor(private http: HttpClient) {}

  /**
   * Get all clients
   */
  getAllClients(): Observable<ClientDTO[]> {
    return this.http.get<ApiResponse<ClientDTO[]>>(this.baseUrl)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get clients');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get all clients error:', error);
          return throwError(() => error.message || 'Failed to get clients');
        })
      );
  }

  /**
   * Get client by ID
   */
  getClientById(id: number): Observable<ClientDTO> {
    return this.http.get<ApiResponse<ClientDTO>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Client not found');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Get client by ID error:', error);
          return throwError(() => error.message || 'Failed to get client');
        })
      );
  }

  /**
   * Create new client (Admin only)
   */
  createClient(client: Client): Observable<ClientDTO> {
    // Remove fields that shouldn't be sent to backend
    const clientPayload = {
      clientCode: client.clientCode,
      clientName: client.clientName,
      category: client.category
    };

    return this.http.post<ApiResponse<ClientDTO>>(this.baseUrl, clientPayload)
      .pipe(
        map(response => {
          if (!response.success || !response.data) {
            throw new Error(response.message || 'Failed to create client');
          }
          return response.data;
        }),
        catchError(error => {
          console.error('Create client error:', error);
          let errorMessage = 'Failed to create client';
          
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
   * Update client (Admin only)
   */
  updateClient(id: number, client: Partial<Client>): Observable<boolean> {
    // Only send updateable fields
    const clientPayload = {
      clientName: client.clientName,
      category: client.category
    };

    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${id}`, clientPayload)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to update client');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Update client error:', error);
          let errorMessage = 'Failed to update client';
          
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
   * Delete client (soft delete - Admin only)
   */
  deleteClient(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/${id}`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to delete client');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Delete client error:', error);
          let errorMessage = 'Failed to delete client';
          
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
   * Restore client (Admin only)
   */
  restoreClient(id: number): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.baseUrl}/${id}/restore`, {})
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to restore client');
          }
          return response.data || false;
        }),
        catchError(error => {
          console.error('Restore client error:', error);
          return throwError(() => error.message || 'Failed to restore client');
        })
      );
  }

  /**
   * Get deleted clients (Admin only)
   */
  getDeletedClients(): Observable<ClientDTO[]> {
    return this.http.get<ApiResponse<ClientDTO[]>>(`${this.baseUrl}/deleted`)
      .pipe(
        map(response => {
          if (!response.success) {
            throw new Error(response.message || 'Failed to get deleted clients');
          }
          return response.data || [];
        }),
        catchError(error => {
          console.error('Get deleted clients error:', error);
          return throwError(() => error.message || 'Failed to get deleted clients');
        })
      );
  }

  /**
   * Get clients by category
   */
  getClientsByCategory(category: string): Observable<ClientDTO[]> {
    return this.getAllClients().pipe(
      map(clients => clients.filter(client => client.category === category)),
      catchError(error => {
        console.error('Get clients by category error:', error);
        return throwError(() => error.message || 'Failed to get clients by category');
      })
    );
  }

  /**
   * Get ABA clients
   */
  getABAClients(): Observable<ClientDTO[]> {
    return this.getClientsByCategory(CLIENT_CATEGORIES.ABA);
  }

  /**
   * Get NON-ABA clients
   */
  getNonABAClients(): Observable<ClientDTO[]> {
    return this.getClientsByCategory(CLIENT_CATEGORIES.NON_ABA);
  }

  /**
   * Search clients by name or code
   */
  searchClients(searchTerm: string): Observable<ClientDTO[]> {
    if (!searchTerm.trim()) {
      return this.getAllClients();
    }

    return this.getAllClients().pipe(
      map(clients => clients.filter(client => 
        client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.clientCode.toLowerCase().includes(searchTerm.toLowerCase())
      )),
      catchError(error => {
        console.error('Search clients error:', error);
        return throwError(() => error.message || 'Failed to search clients');
      })
    );
  }

  /**
   * Check if client code is available
   */
  checkClientCodeAvailability(clientCode: string, excludeClientId?: number): Observable<boolean> {
    return this.getAllClients().pipe(
      map(clients => {
        const existingClient = clients.find(c => 
          c.clientCode.toLowerCase() === clientCode.toLowerCase() && 
          c.id !== excludeClientId
        );
        return !existingClient; // Returns true if available
      }),
      catchError(error => {
        console.error('Check client code availability error:', error);
        return throwError(() => 'Failed to check client code availability');
      })
    );
  }

  /**
   * Check if client name is available
   */
  checkClientNameAvailability(clientName: string, excludeClientId?: number): Observable<boolean> {
    return this.getAllClients().pipe(
      map(clients => {
        const existingClient = clients.find(c => 
          c.clientName.toLowerCase() === clientName.toLowerCase() && 
          c.id !== excludeClientId
        );
        return !existingClient; // Returns true if available
      }),
      catchError(error => {
        console.error('Check client name availability error:', error);
        return throwError(() => 'Failed to check client name availability');
      })
    );
  }

  /**
   * Get client statistics
   */
  getClientStats(): Observable<{ 
    total: number; 
    byCategory: { [key: string]: number };
    deleted: number;
  }> {
    return this.getAllClients().pipe(
      map(clients => {
        const stats = {
          total: clients.length,
          byCategory: clients.reduce((acc, client) => {
            acc[client.category] = (acc[client.category] || 0) + 1;
            return acc;
          }, {} as { [key: string]: number }),
          deleted: 0 // This would need the deleted clients count
        };
        return stats;
      }),
      catchError(error => {
        console.error('Get client stats error:', error);
        return throwError(() => error.message || 'Failed to get client statistics');
      })
    );
  }

  /**
   * Get clients for dropdown/select lists
   */
  getClientsForDropdown(): Observable<{ value: number; label: string; category: string }[]> {
    return this.getAllClients().pipe(
      map(clients => clients.map(client => ({
        value: client.id,
        label: `${client.clientCode} - ${client.clientName}`,
        category: client.category
      }))),
      catchError(error => {
        console.error('Get clients for dropdown error:', error);
        return throwError(() => error.message || 'Failed to get clients for dropdown');
      })
    );
  }

  /**
   * Validate client data before create/update
   */
  validateClientData(client: Partial<Client>, isUpdate: boolean = false): string[] {
    const errors: string[] = [];

    if (!isUpdate && !client.clientCode?.trim()) {
      errors.push('Client code is required');
    }

    if (!client.clientName?.trim()) {
      errors.push('Client name is required');
    }

    if (!client.category?.trim()) {
      errors.push('Category is required');
    } else if (!Object.values(CLIENT_CATEGORIES).includes(client.category as any)) {
      errors.push('Invalid category. Must be ABA or NON-ABA');
    }

    // Validate client code format (alphanumeric, no spaces)
    if (client.clientCode && !/^[A-Za-z0-9]+$/.test(client.clientCode)) {
      errors.push('Client code must be alphanumeric with no spaces');
    }

    // Validate client name length
    if (client.clientName && client.clientName.length < 2) {
      errors.push('Client name must be at least 2 characters long');
    }

    if (client.clientName && client.clientName.length > 255) {
      errors.push('Client name must be less than 255 characters');
    }

    return errors;
  }

  /**
   * Get available categories for dropdown
   */
  getAvailableCategories(): { value: string; label: string }[] {
    return [
      { value: CLIENT_CATEGORIES.ABA, label: 'ABA' },
      { value: CLIENT_CATEGORIES.NON_ABA, label: 'NON-ABA' }
    ];
  }

  /**
   * Sort clients by different criteria
   */
  sortClients(clients: ClientDTO[], sortBy: 'name' | 'code' | 'category', direction: 'asc' | 'desc' = 'asc'): ClientDTO[] {
    return [...clients].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.clientName.localeCompare(b.clientName);
          break;
        case 'code':
          comparison = a.clientCode.localeCompare(b.clientCode);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Filter clients by multiple criteria
   */
  filterClients(clients: ClientDTO[], filters: {
    category?: string;
    searchTerm?: string;
  }): ClientDTO[] {
    return clients.filter(client => {
      // Category filter
      if (filters.category && client.category !== filters.category) {
        return false;
      }
      
      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        if (!client.clientName.toLowerCase().includes(searchLower) &&
            !client.clientCode.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }
}