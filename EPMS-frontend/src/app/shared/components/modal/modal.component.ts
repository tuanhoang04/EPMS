import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() closable = true;
  @Input() size: 'default' | 'large' = 'default';
  @Input() closeOnBackdrop = false;
  @Output() closed = new EventEmitter<void>();

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
