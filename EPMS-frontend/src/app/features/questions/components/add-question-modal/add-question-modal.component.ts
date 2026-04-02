import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { QuestionService } from '../../services/question.service';
import { SubjectService, SubjectResponse } from '../../../homepage/services/subject.service';
import { TopicService, TopicResponse } from '../../../homepage/services/topic.service';

export interface QuestionChoice {
  value: string;
  isAnswer: boolean;
}

export interface QuestionFormData {
  uid: number;
  questionText: string;
  difficulty: string | null;
  questionType: string;
  choices: QuestionChoice[];
  answer: string;
  imageBase64: string | null;
  imageFileName: string;
}

@Component({
  selector: 'app-add-question-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule, ModalComponent],
  templateUrl: './add-question-modal.component.html',
  styleUrl: './add-question-modal.component.scss',
})
export class AddQuestionModalComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() preSelectedSubjectId: string | null = null;
  @Input() preSelectedTopicId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  subjects: SubjectResponse[] = [];
  allTopics: TopicResponse[] = [];
  topics: TopicResponse[] = [];
  filteredSubjects: SubjectResponse[] = [];
  filteredTopics: TopicResponse[] = [];

  selectedSubject: SubjectResponse | null = null;
  selectedTopic: TopicResponse | null = null;

  forms: QuestionFormData[] = [];
  saving = false;

  readonly autocompletePanelStyle = { 'z-index': '1250' };

  private uidCounter = 1;

  readonly difficultyOptions = [
    { label: 'Very easy', value: 'BEGINNER' },
    { label: 'Easy', value: 'EASY' },
    { label: 'Medium', value: 'INTERMEDIATE' },
    { label: 'Hard', value: 'ADVANCED' },
  ];

  readonly questionTypeOptions = [
    { label: 'Multiple choice question', value: 'MULTIPLE_CHOICE' },
    { label: 'True/false question', value: 'TRUE_FALSE' },
    { label: 'Gap-filling', value: 'GAP_FILLING' },
    { label: 'Short answer', value: 'SHORT_ANSWER' },
  ];

  constructor(
    private questionService: QuestionService,
    private subjectService: SubjectService,
    private topicService: TopicService
  ) {}

  ngOnInit() {
    this.forms = [this.createEmptyForm()];

    this.subjectService.getAll(0, 1000).subscribe({
      next: (data) => {
        this.subjects = data.content;
        this.filteredSubjects = [...data.content];
        if (this.preSelectedSubjectId) {
          this.selectedSubject = data.content.find(s => s.id === this.preSelectedSubjectId) ?? null;
          if (this.selectedSubject) {
            this.loadTopicsForSubject(this.selectedSubject.id);
          }
        }
      }
    });

    this.topicService.getAll().subscribe({
      next: (data) => {
        this.allTopics = data;
        this.topics = data;
        this.filteredTopics = [...data];
        if (this.preSelectedTopicId) {
          this.selectedTopic = data.find(t => t.id === this.preSelectedTopicId) ?? null;
        }
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true && !changes['visible'].firstChange) {
      this.uidCounter = 1;
      this.forms = [this.createEmptyForm()];
      this.saving = false;
      this.selectedSubject = null;
      this.selectedTopic = null;
    }
  }

  private createEmptyForm(): QuestionFormData {
    return {
      uid: this.uidCounter++,
      questionText: '',
      difficulty: null,
      questionType: 'MULTIPLE_CHOICE',
      choices: [
        { value: '', isAnswer: false },
        { value: '', isAnswer: false },
        { value: '', isAnswer: false },
        { value: '', isAnswer: false },
      ],
      answer: '',
      imageBase64: null,
      imageFileName: '',
    };
  }

  isFormValid(form: QuestionFormData): boolean {
    if (!form.questionText.trim() || !form.difficulty) return false;
    switch (form.questionType) {
      case 'MULTIPLE_CHOICE': {
        const filled = form.choices.filter(c => c.value.trim());
        const hasAnswer = form.choices.some(c => c.isAnswer && c.value.trim());
        return filled.length >= 2 && hasAnswer;
      }
      case 'TRUE_FALSE':
        return form.answer === 'true' || form.answer === 'false';
      case 'GAP_FILLING':
      case 'SHORT_ANSWER':
        return form.answer.trim().length > 0;
      default:
        return false;
    }
  }

  onFieldChange(index: number) {
    if (index === this.forms.length - 1 && this.isFormValid(this.forms[index])) {
      this.forms = [...this.forms, this.createEmptyForm()];
    }
  }

  onQuestionTypeChange(form: QuestionFormData) {
    form.answer = '';
    form.choices = [
      { value: '', isAnswer: false },
      { value: '', isAnswer: false },
      { value: '', isAnswer: false },
      { value: '', isAnswer: false },
    ];
    const index = this.forms.indexOf(form);
    this.onFieldChange(index);
  }

  resetForm(index: number) {
    const uid = this.forms[index].uid;
    const fresh = this.createEmptyForm();
    fresh.uid = uid;
    this.forms = this.forms.map((f, i) => (i === index ? fresh : f));
  }

  deleteForm(index: number) {
    if (this.forms.length === 1) return;
    this.forms = this.forms.filter((_, i) => i !== index);
  }

  onImageSelected(event: Event, form: QuestionFormData) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      form.imageBase64 = reader.result as string;
      form.imageFileName = file.name;
      this.forms = [...this.forms];
    };
    reader.readAsDataURL(file);
  }

  triggerFileInput(inputEl: HTMLInputElement) {
    inputEl.click();
  }

  searchSubjects(event: AutoCompleteCompleteEvent) {
    const q = event.query.toLowerCase();
    this.filteredSubjects = this.subjects.filter(s => s.name.toLowerCase().includes(q));
  }

  searchTopics(event: AutoCompleteCompleteEvent) {
    const q = event.query.toLowerCase();
    this.filteredTopics = this.topics.filter(t => t.name.toLowerCase().includes(q));
  }

  onSubjectChange(event: any) {
    const subject = event && typeof event === 'object' && 'id' in event ? event : null;
    this.selectedSubject = subject;
    this.selectedTopic = null;
    if (subject) {
      this.loadTopicsForSubject(subject.id);
    } else {
      this.topics = this.allTopics;
      this.filteredTopics = [...this.allTopics];
    }
  }

  onTopicChange(event: any) {
    this.selectedTopic = event && typeof event === 'object' && 'id' in event ? event : null;
  }

  private loadTopicsForSubject(subjectId: string) {
    this.topicService.getBySubjectId(subjectId).subscribe({
      next: (data) => {
        this.topics = data;
        this.filteredTopics = [...data];
      }
    });
  }

  close() {
    this.closed.emit();
  }

  save() {
    if (!this.selectedTopic || this.saving) return;
    const valid = this.forms.filter(f => this.isFormValid(f));
    if (valid.length === 0) return;

    this.saving = true;
    const requests = valid.map(form => {
      const req: Parameters<QuestionService['create']>[0] = {
        questionText: form.questionText.trim(),
        difficulty: form.difficulty!,
        questionType: form.questionType,
        topicId: this.selectedTopic!.id,
        questionImageBase64: form.imageBase64,
        questionAnswer: null,
        questionChoices: null,
      };
      if (form.questionType === 'MULTIPLE_CHOICE') {
        req.questionChoices = JSON.stringify(form.choices.filter(c => c.value.trim()));
      } else {
        req.questionAnswer = form.answer;
      }
      return this.questionService.create(req);
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.closed.emit();
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  get validCount(): number {
    return this.forms.filter(f => this.isFormValid(f)).length;
  }

  get canSave(): boolean {
    return !!this.selectedTopic && this.validCount > 0 && !this.saving;
  }
}
