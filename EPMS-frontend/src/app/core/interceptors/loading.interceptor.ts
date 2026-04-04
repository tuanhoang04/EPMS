import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';
import { NotificationService } from '../services/notification.service';
import { catchError, finalize } from 'rxjs';
import { throwError } from 'rxjs';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  const notificationService = inject(NotificationService);

  loadingService.show();

  return next(req).pipe(
    catchError((error) => {
      // Don't show global notification for auth endpoints that have local handling
      const isAuthEndpoint = req.url.includes('/api/auth/login') || req.url.includes('/api/auth/signup') || req.url.includes('/api/auth/me');

      if (!isAuthEndpoint) {
        let errorMessage = 'Something went wrong. Please try again later.';
        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error && error.error.message) {
          errorMessage = error.error.message;
        }
        notificationService.showError(errorMessage);
      }

      return throwError(() => error);
    }),
    finalize(() => {
      loadingService.hide();
    })
  );
};
