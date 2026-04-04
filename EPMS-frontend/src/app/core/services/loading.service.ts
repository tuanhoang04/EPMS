import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private activeRequestCount = 0;
  isLoading = signal<boolean>(false);

  show() {
    this.activeRequestCount++;
    if (this.activeRequestCount > 0) {
      this.isLoading.set(true);
    }
  }

  hide() {
    if (this.activeRequestCount > 0) {
      this.activeRequestCount--;
    }
    if (this.activeRequestCount === 0) {
      this.isLoading.set(false);
    }
  }
}
