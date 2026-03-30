import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AddSubjectComponent } from '../../components/add-subject/add-subject.component';
import { SubjectService, SubjectResponse, SubjectPage } from '../../services/subject.service';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';

@Component({
  selector: 'app-homepage',
  imports: [
    CommonModule,
    HeaderComponent,
    ButtonModule,
    PaginatorModule,
    ModalComponent,
    AddSubjectComponent,
  ],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})
export class Homepage implements OnInit {
  page: SubjectPage | null = null;
  loading = false;

  viewMode: 'grid' | 'list' = 'grid';
  showAddModal = false;

  pageIndex = 0;
  pageSize = 16;
  readonly pageSizeOptions = [8, 16, 24, 32];

  constructor(private subjectService: SubjectService) {}

  ngOnInit() {
    this.loadSubjects();
  }

  loadSubjects() {
    this.loading = true;
    this.subjectService.getAll(this.pageIndex, this.pageSize).subscribe({
      next: (data) => {
        this.page = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onPageChange(event: { page?: number; rows?: number }) {
    this.pageIndex = event.page ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
    this.loadSubjects();
  }

  toggleView() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  onSubjectSaved() {
    this.showAddModal = false;
    this.pageIndex = 0;
    this.loadSubjects();
  }

  onModalClosed() {
    this.showAddModal = false;
  }

  getSubjectImage(subject: SubjectResponse): string {
    return `https://picsum.photos/seed/${subject.id}/400/200`;
  }
}
