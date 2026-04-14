import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { TemplateService, TemplateResponse, TemplatePartResponse } from '../../services/template.service';
import { SubjectService, SubjectResponse } from '../../../homepage/services/subject.service';
import { TopicService, TopicResponse } from '../../../homepage/services/topic.service';
import { ExamPaperService } from '../../services/exam-paper.service';

export interface TemplatePartFormData {
  uid: number;
  title: string;
  numberOfQuestions: number;
  questionType: string | null;
  selectedTopics: TopicResponse[];
  filteredTopics: TopicResponse[];
  isValid: boolean;
}

@Component({
  selector: 'app-template-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule, ModalComponent],
  templateUrl: './template-detail-modal.component.html',
  styleUrl: './template-detail-modal.component.scss',
})
export class TemplateDetailModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() template: TemplateResponse | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  saving = signal(false);
  deleting = signal(false);
  generating = signal(false);

  templateTitle = '';
  selectedSubject: SubjectResponse | null = null;
  parts = signal<TemplatePartFormData[]>([]);

  subjects: SubjectResponse[] = [];
  filteredSubjects: SubjectResponse[] = [];
  topics: TopicResponse[] = [];

  private uidCounter = 1;

  questionTypes = [
    { label: 'Multiple Choice (One Right)', value: 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' },
    { label: 'Multiple Choice (Multiple Right)', value: 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE' },
    { label: 'True/False', value: 'TRUE_FALSE' },
    { label: 'Gap Filling', value: 'GAP_FILLING' },
    { label: 'Short Answer', value: 'SHORT_ANSWER' }
  ];

  constructor(
    private templateService: TemplateService,
    private subjectService: SubjectService,
    private topicService: TopicService,
    private examPaperService: ExamPaperService,
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true && this.template) {
      this.loadSubjects();
      this.populateForm();
    }
  }

  private loadSubjects() {
    this.subjectService.getAll(0, 1000).subscribe({
      next: (data) => {
        this.subjects = data.content;
        this.filteredSubjects = [...this.subjects];
        // Re-resolve selectedSubject from full list so autocomplete displays correctly
        if (this.template) {
          const found = this.subjects.find(s => s.id === this.template!.subjectId);
          if (found) this.selectedSubject = found;
        }
      }
    });
  }

  private loadTopics(subjectId: string) {
    this.topicService.getBySubjectId(subjectId).subscribe({
      next: (data) => {
        this.topics = data;
        this.parts.update(parts => parts.map(p => ({ ...p, filteredTopics: [...data] })));
      }
    });
  }

  private populateForm() {
    if (!this.template) return;
    this.uidCounter = 1;
    this.templateTitle = this.template.title;
    this.selectedSubject = { id: this.template.subjectId, name: this.template.subjectName } as SubjectResponse;

    const partForms: TemplatePartFormData[] = (this.template.parts ?? []).map(p => ({
      uid: this.uidCounter++,
      title: p.title,
      numberOfQuestions: p.numberOfQuestions,
      questionType: p.questionType,
      selectedTopics: p.topics.map(t => ({ id: t.id, name: t.name, subjectId: this.template!.subjectId }) as TopicResponse),
      filteredTopics: [],
      isValid: true
    }));

    // Always end with one empty part for adding
    partForms.push(this.createEmptyPart());
    this.parts.set(partForms);

    // Load topics for the subject
    if (this.template.subjectId) {
      this.loadTopics(this.template.subjectId);
    }
  }

  private createEmptyPart(): TemplatePartFormData {
    return {
      uid: this.uidCounter++,
      title: '',
      numberOfQuestions: 1,
      questionType: null,
      selectedTopics: [],
      filteredTopics: [...this.topics],
      isValid: false
    };
  }

  checkPartValidity(part: TemplatePartFormData) {
    const isValid = !!part.title.trim() &&
                    part.numberOfQuestions > 0 &&
                    part.selectedTopics.length > 0;

    if (part.isValid !== isValid) {
      part.isValid = isValid;
      this.parts.update(p => [...p]);
    }

    // Auto-add trailing empty part when last part becomes valid
    const all = this.parts();
    const lastPart = all[all.length - 1];
    if (lastPart?.isValid) {
      this.parts.update(p => [...p, this.createEmptyPart()]);
    }
  }

  onSubjectSelect(event: any) {
    const subject = event && 'originalEvent' in event ? event.value : event;
    this.selectedSubject = subject;
    if (subject) {
      this.loadTopics(subject.id);
      // Clear topics from all parts since subject changed
      this.parts.update(parts => parts.map(p => ({ ...p, selectedTopics: [], filteredTopics: [] })));
    }
  }

  onSubjectClear() {
    this.selectedSubject = null;
    this.topics = [];
    this.parts.update(parts => parts.map(p => ({ ...p, selectedTopics: [], filteredTopics: [] })));
  }

  searchSubjects(event: AutoCompleteCompleteEvent) {
    const q = event.query ? event.query.toLowerCase() : '';
    this.filteredSubjects = this.subjects.filter(s => s.name.toLowerCase().includes(q));
  }

  searchTopics(part: TemplatePartFormData, event: AutoCompleteCompleteEvent) {
    const q = event.query ? event.query.toLowerCase() : '';
    part.filteredTopics = this.topics.filter(t => t.name.toLowerCase().includes(q));
  }

  deletePart(index: number) {
    const all = this.parts();
    if (all.length === 1) {
      const uid = all[0].uid;
      const fresh = this.createEmptyPart();
      fresh.uid = uid;
      this.parts.set([fresh]);
      return;
    }
    this.parts.update(p => p.filter((_, i) => i !== index));
  }

  close() {
    this.closed.emit();
  }

  save() {
    if (!this.canSave || !this.template) return;
    this.saving.set(true);

    const validParts = this.parts().filter(p => p.isValid);
    const request = {
      title: this.templateTitle.trim(),
      subjectId: this.selectedSubject!.id,
      parts: validParts.map(p => ({
        title: p.title.trim(),
        numberOfQuestions: p.numberOfQuestions,
        questionType: p.questionType,
        topicIds: p.selectedTopics.map(t => t.id),
        difficulties: []
      }))
    };

    this.templateService.update(this.template.id, request as any).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.close();
      },
      error: () => this.saving.set(false)
    });
  }

  delete() {
    if (!this.template) return;
    if (!confirm('Are you sure you want to delete this template?')) return;

    this.deleting.set(true);
    this.templateService.delete(this.template.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleted.emit();
        this.close();
      },
      error: () => this.deleting.set(false)
    });
  }

  generate() {
    if (!this.template || this.generating()) return;
    this.generating.set(true);

    const title = this.templateTitle.trim() || this.template.title;
    this.examPaperService.generate(this.template.id, title).subscribe({
      next: (blob) => {
        this.generating.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.docx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.generating.set(false),
    });
  }

  get canSave(): boolean {
    return !!this.templateTitle.trim() &&
           !!this.selectedSubject &&
           this.parts().some(p => p.isValid) &&
           !this.saving();
  }
}
