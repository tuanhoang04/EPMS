import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private messageService = inject(MessageService);

  showSuccess(message: string, summary: string = 'Success') {
    this.messageService.add({ severity: 'success', summary, detail: message });
  }

  showError(message: string, summary: string = 'Error') {
    this.messageService.add({ severity: 'error', summary, detail: message });
  }

  showInfo(message: string, summary: string = 'Info') {
    this.messageService.add({ severity: 'info', summary, detail: message });
  }

  showWarning(message: string, summary: string = 'Warning') {
    this.messageService.add({ severity: 'warn', summary, detail: message });
  }
}
