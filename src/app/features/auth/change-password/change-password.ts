// src/app/features/auth/change-password/change-password.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { ChangePasswordRequest, USER_ROLES } from '../../../core/models';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.html',
  styleUrls: ['./change-password.css']
})
export class ChangePassword implements OnInit {
  changePasswordForm: FormGroup;
  isLoading = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.changePasswordForm = this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Verify user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Clear any existing messages
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit(): void {
    if (this.changePasswordForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const changePasswordRequest: ChangePasswordRequest = {
      currentPassword: this.changePasswordForm.get('currentPassword')?.value,
      newPassword: this.changePasswordForm.get('newPassword')?.value
    };

    this.authService.changePassword(changePasswordRequest).subscribe({
      next: (success) => {
        this.isLoading = false;
        if (success) {
          this.successMessage = 'Password changed successfully!';
          
          // Reset form
          this.changePasswordForm.reset();
          
          // Redirect after showing success message
          setTimeout(() => {
            this.redirectToUserDashboard();
          }, 2000);
        } else {
          this.errorMessage = 'Failed to change password. Please try again.';
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error || 'Failed to change password. Please try again.';
        
        // Clear password fields on error
        this.changePasswordForm.patchValue({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    });
  }

  onCancel(): void {
    this.redirectToUserDashboard();
  }

  toggleCurrentPasswordVisibility(): void {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.changePasswordForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.changePasswordForm.controls).forEach(key => {
      const control = this.changePasswordForm.get(key);
      control?.markAsTouched();
    });
  }

  private passwordMatchValidator(control: AbstractControl): { [key: string]: boolean } | null {
    const newPassword = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!newPassword || !confirmPassword) {
      return null;
    }

    if (newPassword.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }

    return null;
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
}