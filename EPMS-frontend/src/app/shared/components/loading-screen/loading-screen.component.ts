import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-screen',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule],
  template: `
    <div class="loading-overlay" *ngIf="isLoading()">
      <div class="loading-content">
        <p-progressSpinner ariaLabel="loading"></p-progressSpinner>
        <p>Loading...</p>
      </div>
    </div>
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;

      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    .loading-content {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    p {
      font-family: var(--font-family, sans-serif);
      color: #333;
      font-weight: 500;
    }
  `]
})
export class LoadingScreenComponent {
  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);

  isLoading = computed(() => this.authService.isInitialLoading() || this.loadingService.isLoading());
}
