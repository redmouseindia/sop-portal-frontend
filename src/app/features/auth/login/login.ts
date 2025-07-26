import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { LoginRequest, USER_ROLES } from '../../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  showPassword = false;
  errorMessage = '';
  successMessage = '';
  returnUrl = '';
  isDevelopment = true; // Set to false in production

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.formBuilder.group({
      employeeCode: ['', [Validators.required]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    // Get return URL from route parameters or default to appropriate dashboard
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
    
    // Clear any existing error/success messages
    this.errorMessage = '';
    this.successMessage = '';

    // If already authenticated, redirect to appropriate dashboard
    if (this.authService.isAuthenticated()) {
      this.redirectToUserDashboard();
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const loginRequest: LoginRequest = {
      employeeCode: this.loginForm.get('employeeCode')?.value.trim(),
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Login successful! Redirecting...';
        
        // Short delay to show success message
        setTimeout(() => {
          if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.redirectToUserDashboard();
          }
        }, 1000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error || 'Login failed. Please try again.';
        
        // Clear password field on error
        this.loginForm.patchValue({ password: '' });
        
        // Focus on employee code field
        setTimeout(() => {
          const employeeCodeField = document.getElementById('employeeCode');
          if (employeeCodeField) {
            employeeCodeField.focus();
          }
        }, 100);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private redirectToUserDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }

    switch (user.role) {
      case USER_ROLES.ADMIN:
        this.router.navigate(['/admin']);
        break;
      case USER_ROLES.MANAGER:
        this.router.navigate(['/manager']);
        break;
      case USER_ROLES.EMPLOYEE:
        this.router.navigate(['/employee']);
        break;
      default:
        this.router.navigate(['/auth/login']);
        break;
    }
  }

  // Development helper methods (remove in production)
  fillAdminCredentials(): void {
    if (this.isDevelopment) {
      this.loginForm.patchValue({
        employeeCode: 'ADMIN001',
        password: 'temp*123'
      });
    }
  }

  fillManagerCredentials(): void {
    if (this.isDevelopment) {
      this.loginForm.patchValue({
        employeeCode: 'MGR001',
        password: 'temp*123'
      });
    }
  }

  fillEmployeeCredentials(): void {
    if (this.isDevelopment) {
      this.loginForm.patchValue({
        employeeCode: 'EMP001',
        password: 'temp*123'
      });
    }
  }
}

