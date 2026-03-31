import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule, PaginatorModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss'
})
export class PaginationComponent {
  @Input() rows = 10;
  @Input() totalRecords = 0;
  @Input() rowsPerPageOptions: number[] = [10, 20, 30];
  @Input() first = 0;

  @Output() onPageChange = new EventEmitter<{ page: number; rows: number }>();

  handlePageChange(event: any) {
    this.onPageChange.emit({
      page: event.page,
      rows: event.rows
    });
  }
}
