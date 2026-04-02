import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, ButtonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() closable = true;
  @Input() size: 'default' | 'large' = 'default';
  @Input() closeOnBackdrop = false;
  @Input() saveLabel?: string;
  @Input() saveDisabled = false;
  @Input() saveSaving = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saveClicked = new EventEmitter<void>();

  close() {
    if (this.closable) {
      this.closed.emit();
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (this.closable && this.closeOnBackdrop && (event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close();
    }
  }
}
