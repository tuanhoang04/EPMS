import { CommonModule } from '@angular/common';
import { Component, effect, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AddSubjectComponent } from '../../components/add-subject/add-subject.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SubjectService, SubjectResponse, SubjectPage } from '../../services/subject.service';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-homepage',
  imports: [
    CommonModule,
    HeaderComponent,
    BottomNavComponent,
    ButtonModule,
    ModalComponent,
    AddSubjectComponent,
    PaginationComponent,
  ],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})
export class Homepage implements OnInit {
  page = signal<SubjectPage | null>(null);
  loading = signal(false);

  viewMode = signal<'grid' | 'list'>('grid');
  showAddModal = signal(false);

  pageIndex = signal(0);
  pageSize = signal(16);
  readonly pageSizeOptions = [8, 16, 24, 32];

  constructor(
    private subjectService: SubjectService,
    private authService: AuthService,
    private router: Router
  ) {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.loadSubjects();
      }
    });
  }

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.loadSubjects();
    }
  }

  loadSubjects() {
    this.loading.set(true);
    this.subjectService.getAll(this.pageIndex(), this.pageSize()).subscribe({
      next: (data) => {
        this.page.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onPageChange(event: { page?: number; rows?: number }) {
    this.pageIndex.set(event.page ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    this.loadSubjects();
  }

  toggleView() {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
  }

  goToDetail(id: string) {
    this.router.navigate(['/subjects', id]);
  }

  onSubjectSaved() {
    this.showAddModal.set(false);
    this.pageIndex.set(0);
    this.loadSubjects();
  }

  onModalClosed() {
    this.showAddModal.set(false);
  }

  getSubjectImage(subject: SubjectResponse): string {
    return `https://picsum.photos/seed/${subject.id}/400/200`;
  }
}
