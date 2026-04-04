import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { TemplateService, TemplateResponse, TemplatePage } from '../../services/template.service';
import { SubjectService, SubjectResponse } from '../../../homepage/services/subject.service';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { AddTemplateModalComponent } from '../../components/add-template-modal/add-template-modal.component';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    BottomNavComponent,
    PaginationComponent,
    AutoCompleteModule,
    ButtonModule,
    CardModule,
    AddTemplateModalComponent,
  ],
  templateUrl: './templates-page.component.html',
  styleUrl: './templates-page.component.scss',
})
export class TemplatesPage implements OnInit {
  templates = signal<TemplateResponse[]>([]);
  page = signal<TemplatePage | null>(null);
  pageIndex = signal(0);
  pageSize = signal(10);
  pageSizeOptions = [10, 20, 50];

  subjects = signal<SubjectResponse[]>([]);
  showAddModal = signal(false);

  selectedSubject = signal<any | null>(null);
  filteredSubjects = signal<SubjectResponse[]>([]);

  constructor(
    private templateService: TemplateService,
    private subjectService: SubjectService,
  ) {
    effect(() => {
      this.selectedSubject();
      this.pageIndex();
      this.pageSize();

      this.loadTemplates();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.loadSubjects();
  }

  loadSubjects() {
    this.subjectService.getAll(0, 1000).subscribe({
      next: (data) => {
        this.subjects.set(data.content);
        this.filteredSubjects.set(data.content);
      }
    });
  }

  loadTemplates() {
    const subjectId = this.selectedSubject()?.id;

    this.templateService.getAll(
      subjectId || undefined,
      this.pageIndex(),
      this.pageSize()
    ).subscribe({
      next: (data) => {
        this.page.set(data);
        this.templates.set(data.content);
      },
      error: (err) => {
        console.error('Error loading templates', err);
      }
    });
  }

  onPageChange(event: { page: number; rows: number }) {
    this.pageIndex.set(event.page);
    this.pageSize.set(event.rows);
  }

  onSubjectChange(event: any) {
    const subject = event && typeof event === 'object' && 'id' in event ? event : null;
    this.selectedSubject.set(subject);
    this.pageIndex.set(0);
  }

  searchSubjects(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    this.filteredSubjects.set(
      this.subjects().filter(s => s.name.toLowerCase().includes(query))
    );
  }

  openAddModal() {
    this.showAddModal.set(true);
  }

  onModalSaved() {
    this.loadTemplates();
  }
}
