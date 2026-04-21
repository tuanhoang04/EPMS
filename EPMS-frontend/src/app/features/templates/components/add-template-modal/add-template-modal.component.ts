import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { TemplateService } from '../../services/template.service';
import { SubjectService, SubjectResponse } from '../../../homepage/services/subject.service';
import { TopicService, TopicResponse } from '../../../homepage/services/topic.service';

export interface DifficultyFormRow {
  difficulty: string;
  difficultyValue: number;
}

export interface TemplatePartFormData {
  uid: number;
  title: string;
  numberOfQuestions: number;
  questionType: string | null;
  selectedTopics: TopicResponse[];
  filteredTopics: TopicResponse[];
  difficulties: DifficultyFormRow[];
  isValid: boolean;
}

const ALL_DIFFICULTIES = [
  { value: 'BEGINNER',     label: 'Beginner' },
  { value: 'EASY',         label: 'Easy' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED',     label: 'Advanced' },
];

@Component({
  selector: 'app-add-template-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule, ModalComponent],
  templateUrl: './add-template-modal.component.html',
  styleUrl: './add-template-modal.component.scss',
})
export class AddTemplateModalComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() preSelectedSubjectId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  subjects: SubjectResponse[] = [];
  filteredSubjects: SubjectResponse[] = [];
  selectedSubject: SubjectResponse | null = null;
  templateTitle = '';

  topics: TopicResponse[] = [];
  parts = signal<TemplatePartFormData[]>([]);
  saving = signal(false);

  allDifficulties = ALL_DIFFICULTIES;

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
    private topicService: TopicService
  ) {
    effect(() => {
      const currentParts = this.parts();
      if (currentParts.length > 0) {
        const lastPart = currentParts[currentParts.length - 1];
        if (lastPart.isValid) {
          this.addEmptyPart();
        }
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.loadSubjects();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.resetAll();
      this.loadSubjects();
    }
  }

  private resetAll() {
    this.uidCounter = 1;
    this.templateTitle = '';
    this.selectedSubject = null;
    this.parts.set([this.createEmptyPart()]);
    this.saving.set(false);
    this.topics = [];
  }

  private loadSubjects() {
    this.subjectService.getAll(0, 1000).subscribe({
      next: (data) => {
        this.subjects = data.content;
        this.filteredSubjects = [...this.subjects];
        if (this.preSelectedSubjectId) {
          const found = this.subjects.find(s => s.id === this.preSelectedSubjectId);
          if (found) {
            this.selectedSubject = found;
            this.loadTopics(found.id);
          }
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

  private createEmptyPart(): TemplatePartFormData {
    return {
      uid: this.uidCounter++,
      title: '',
      numberOfQuestions: 1,
      questionType: null,
      selectedTopics: [],
      filteredTopics: [...this.topics],
      difficulties: [],
      isValid: false
    };
  }

  private addEmptyPart() {
    this.parts.update(p => [...p, this.createEmptyPart()]);
  }

  checkPartValidity(part: TemplatePartFormData) {
    const isValid = !!part.title.trim() &&
                    part.numberOfQuestions > 0 &&
                    part.selectedTopics.length > 0;

    if (part.isValid !== isValid) {
      part.isValid = isValid;
      this.parts.update(p => [...p]);
    }
  }

  // ── Difficulty helpers ──────────────────────────────────────────────────────

  availableDifficultiesFor(part: TemplatePartFormData) {
    const used = new Set(part.difficulties.map(d => d.difficulty));
    return ALL_DIFFICULTIES.filter(d => !used.has(d.value));
  }

  addDifficulty(part: TemplatePartFormData) {
    const available = this.availableDifficultiesFor(part);
    if (available.length === 0) return;
    part.difficulties = [...part.difficulties, { difficulty: available[0].value, difficultyValue: 0 }];
    this.parts.update(p => [...p]);
  }

  removeDifficulty(part: TemplatePartFormData, index: number) {
    part.difficulties = part.difficulties.filter((_, i) => i !== index);
    this.parts.update(p => [...p]);
  }

  onDifficultyLevelChange(part: TemplatePartFormData, row: DifficultyFormRow, newValue: string) {
    const alreadyUsed = part.difficulties.some(d => d !== row && d.difficulty === newValue);
    if (!alreadyUsed) {
      row.difficulty = newValue;
      this.parts.update(p => [...p]);
    }
  }

  difficultyTotal(part: TemplatePartFormData): number {
    return part.difficulties.reduce((sum, d) => sum + (d.difficultyValue || 0), 0);
  }

  difficultyLabelFor(value: string): string {
    return ALL_DIFFICULTIES.find(d => d.value === value)?.label ?? value;
  }

  // ── Subject / topic autocomplete ────────────────────────────────────────────

  onSubjectSelect(event: any) {
    const subject = event && 'originalEvent' in event ? event.value : event;
    this.selectedSubject = subject;
    if (subject) {
      this.loadTopics(subject.id);
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
    if (this.parts().length === 1) {
      const uid = this.parts()[0].uid;
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
    if (!this.canSave) return;

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
        difficulties: p.difficulties.map(d => ({ difficulty: d.difficulty, difficultyValue: d.difficultyValue }))
      }))
    };

    this.templateService.create(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.closed.emit();
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  get canSave(): boolean {
    return !!this.templateTitle.trim() &&
           !!this.selectedSubject &&
           this.parts().some(p => p.isValid) &&
           !this.parts().some(p => this.difficultyTotal(p) > 100) &&
           !this.saving();
  }
}
