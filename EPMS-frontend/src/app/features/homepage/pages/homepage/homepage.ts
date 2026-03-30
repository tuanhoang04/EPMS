import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AddSubjectComponent } from '../../components/add-subject/add-subject.component';
import { SubjectService, SubjectResponse } from '../../services/subject.service';
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
  subjects: SubjectResponse[] = [];
  loading = false;

  viewMode: 'grid' | 'list' = 'grid';
  showAddModal = false;

  currentPage = 0;
  pageSize = 8;
  readonly pageSizeOptions = [4, 8, 12, 20];

  constructor(private subjectService: SubjectService) {}

  ngOnInit() {
    this.loadSubjects();
  }

  loadSubjects() {
    this.loading = true;
    this.subjectService.getAll().subscribe({
      next: (data) => {
        this.subjects = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  get pagedSubjects(): SubjectResponse[] {
    const start = this.currentPage * this.pageSize;
    return this.subjects.slice(start, start + this.pageSize);
  }

  onPageChange(event: { page?: number; rows?: number }) {
    this.currentPage = event.page ?? 0;
    this.pageSize = event.rows ?? this.pageSize;
  }

  toggleView() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  onSubjectSaved() {
    this.showAddModal = false;
    this.loadSubjects();
  }

  onModalClosed() {
    this.showAddModal = false;
  }

  getSubjectImage(subject: SubjectResponse): string {
    return `https://picsum.photos/seed/${subject.id}/400/200`;
  }
}
