// src/app/shared/components/loading/loading.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type LoadingType = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl';
export type LoadingColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-loading',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading.html',
  styleUrl: './loading.css'
})
export class Loading {
  @Input() type: LoadingType = 'spinner';
  @Input() size: LoadingSize = 'md';
  @Input() color: LoadingColor = 'primary';
  @Input() text: string = '';
  @Input() showText: boolean = false;
  @Input() overlay: boolean = false;
  @Input() progress: number = 0;
  @Input() showProgress: boolean = false;
  @Input() containerClass: string = '';

  get textClass(): string {
    const colorClasses = {
      primary: 'text-primary-600',
      secondary: 'text-secondary-600',
      success: 'text-success-600',
      warning: 'text-warning-600',
      danger: 'text-danger-600'
    };
    return colorClasses[this.color];
  }

  getSpinnerSizeClass(): string {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12'
    };
    return sizeClasses[this.size];
  }

  getSpinnerClass(): string {
    const sizeClasses = {
      sm: 'h-4 w-4 border-2',
      md: 'h-6 w-6 border-2',
      lg: 'h-8 w-8 border-4',
      xl: 'h-12 w-12 border-4'
    };

    const colorClasses = {
      primary: 'border-primary-600 border-t-transparent',
      secondary: 'border-secondary-600 border-t-transparent',
      success: 'border-success-600 border-t-transparent',
      warning: 'border-warning-600 border-t-transparent',
      danger: 'border-danger-600 border-t-transparent'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]}`;
  }

  getDotClass(): string {
    const sizeClasses = {
      sm: 'h-1 w-1',
      md: 'h-2 w-2',
      lg: 'h-3 w-3',
      xl: 'h-4 w-4'
    };

    const colorClasses = {
      primary: 'bg-primary-600',
      secondary: 'bg-secondary-600',
      success: 'bg-success-600',
      warning: 'bg-warning-600',
      danger: 'bg-danger-600'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]}`;
  }

  getPulseClass(): string {
    const sizeClasses = {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12'
    };

    const colorClasses = {
      primary: 'bg-primary-600',
      secondary: 'bg-secondary-600',
      success: 'bg-success-600',
      warning: 'bg-warning-600',
      danger: 'bg-danger-600'
    };

    return `${sizeClasses[this.size]} ${colorClasses[this.color]}`;
  }
}