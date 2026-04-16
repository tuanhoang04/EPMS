import { CommonModule } from '@angular/common';
import { Component, effect, OnInit, signal, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AddSubjectComponent } from '../../components/add-subject/add-subject.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { SubjectService, SubjectResponse, SubjectPage } from '../../services/subject.service';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-homepage',
  imports: [
    CommonModule,
    HeaderComponent,
    BottomNavComponent,
    ButtonModule,
    MenuModule,
    ModalComponent,
    AddSubjectComponent,
    PaginationComponent,
  ],
  templateUrl: './homepage.html',
  styleUrl: './homepage.scss',
})
export class Homepage implements OnInit {
  @ViewChild('subjectMenu') subjectMenu!: Menu;

  page = signal<SubjectPage | null>(null);

  viewMode = signal<'grid' | 'list'>('grid');
  showAddModal = signal(false);
  showEditModal = signal(false);
  selectedSubject = signal<SubjectResponse | null>(null);

  pageIndex = signal(0);
  pageSize = signal(16);
  readonly pageSizeOptions = [8, 16, 24, 32];

  subjectMenuItems: MenuItem[] = [
    {
      label: 'Edit',
      icon: 'pi pi-pencil',
      command: () => this.showEditModal.set(true)
    },
    {
      label: 'Delete',
      icon: 'pi pi-trash',
      styleClass: 'danger-item',
      command: () => this.deleteSubject()
    }
  ];

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
    this.subjectService.getAll(this.pageIndex(), this.pageSize()).subscribe({
      next: (data) => {
        this.page.set(data);
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

  openSubjectMenu(event: MouseEvent, subject: SubjectResponse) {
    this.selectedSubject.set(subject);
    this.subjectMenu.toggle(event);
  }

  deleteSubject() {
    const subject = this.selectedSubject();
    if (!subject) return;
    if (!confirm(`Delete "${subject.name}"?`)) return;
    this.subjectService.delete(subject.id).subscribe({
      next: () => {
        this.pageIndex.set(0);
        this.loadSubjects();
      }
    });
  }

  onSubjectSaved() {
    this.showAddModal.set(false);
    this.pageIndex.set(0);
    this.loadSubjects();
  }

  onEditSaved() {
    this.showEditModal.set(false);
    this.selectedSubject.set(null);
    this.loadSubjects();
  }

  onModalClosed() {
    this.showAddModal.set(false);
  }

  onEditModalClosed() {
    this.showEditModal.set(false);
    this.selectedSubject.set(null);
  }

  getSubjectImage(subject: SubjectResponse): string {
    return `https://picsum.photos/seed/${subject.id}/400/200`;
  }
}
