import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { XmlEditorComponent } from '../../../../shared/components/xml-editor/xml-editor.component';
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
  selectedSubject: SubjectResponse | null;
  selectedTopic: TopicResponse | null;
  filteredSubjects: SubjectResponse[];
  filteredTopics: TopicResponse[];
}

@Component({
  selector: 'app-add-question-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule, ModalComponent, XmlEditorComponent],
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

  forms = signal<QuestionFormData[]>([]);
  saving = signal(false);

  private uidCounter = 1;

  readonly difficultyOptions = [
    { label: 'Beginner', value: 'BEGINNER' },
    { label: 'Easy', value: 'EASY' },
    { label: 'Intermediate', value: 'INTERMEDIATE' },
    { label: 'Advanced', value: 'ADVANCED' },
  ];

  readonly questionTypeOptions = [
    { label: 'Multiple choice (one answer)', value: 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' },
    { label: 'Multiple choice (multiple answers)', value: 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE' },
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
    this.forms.set([this.createEmptyForm()]);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true) {
      this.uidCounter = 1;
      this.forms.set([this.createEmptyForm()]);
      this.saving.set(false);
      this.loadData();
    }
  }

  private loadData() {
    this.subjectService.getAll(0, 1000).subscribe({
      next: (data) => {
        this.subjects = data.content;
        for (const form of this.forms()) {
          form.filteredSubjects = [...data.content];
        }

        if (this.preSelectedSubjectId) {
          const found = data.content.find(s => s.id === this.preSelectedSubjectId);
          if (found) {
            this.forms()[0].selectedSubject = found;
            this.loadTopicsForForm(this.forms()[0], found.id);
          }
        }

        this.forms.update(f => [...f]);
      }
    });

    this.topicService.getAll().subscribe({
      next: (data) => {
        this.allTopics = data;
        for (const form of this.forms()) {
          if (!form.selectedSubject) {
            form.filteredTopics = [...data];
          }
        }

        if (this.preSelectedTopicId) {
          const found = data.find(t => t.id === this.preSelectedTopicId);
          if (found) {
            this.forms()[0].selectedTopic = found;
            if (!this.forms()[0].selectedSubject) {
              const sub = this.subjects.find(s => s.id === found.subjectId);
              if (sub) {
                this.forms()[0].selectedSubject = sub;
                this.loadTopicsForForm(this.forms()[0], sub.id);
              }
            }
          }
        }

        this.forms.update(f => [...f]);
      }
    });
  }

  private createEmptyForm(copyFrom?: QuestionFormData): QuestionFormData {
    return {
      uid: this.uidCounter++,
      questionText: '',
      difficulty: null,
      questionType: 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE',
      choices: [
        { value: '', isAnswer: false },
        { value: '', isAnswer: false },
      ],
      answer: '',
      imageBase64: null,
      imageFileName: '',
      selectedSubject: copyFrom?.selectedSubject ?? null,
      selectedTopic: copyFrom?.selectedTopic ?? null,
      filteredSubjects: [...this.subjects],
      filteredTopics: copyFrom?.selectedSubject
        ? this.allTopics.filter(t => t.subjectId === copyFrom.selectedSubject!.id)
        : [...this.allTopics],
    };
  }

  isFormValid(form: QuestionFormData): boolean {
    if (!form.questionText.trim() || !form.difficulty || !form.selectedTopic) return false;
    switch (form.questionType) {
      case 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE':
      case 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE': {
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
    if (index === this.forms().length - 1 && this.isFormValid(this.forms()[index])) {
      this.forms.update(f => [...f, this.createEmptyForm(this.forms()[index])]);
    }
  }

  onChoiceAnswerChange(form: QuestionFormData, choiceIndex: number, formIndex: number) {
    if (form.questionType === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE') {
      form.choices.forEach((c, i) => c.isAnswer = i === choiceIndex);
    } else {
      form.choices[choiceIndex].isAnswer = !form.choices[choiceIndex].isAnswer;
    }
    this.onFieldChange(formIndex);
  }

  onQuestionTypeChange(form: QuestionFormData) {
    form.answer = '';
    form.choices = [
      { value: '', isAnswer: false },
      { value: '', isAnswer: false },
    ];
    const index = this.forms().indexOf(form);
    this.onFieldChange(index);
  }

  addChoice(form: QuestionFormData, formIndex: number) {
    form.choices = [...form.choices, { value: '', isAnswer: false }];
    this.onFieldChange(formIndex);
  }

  removeChoice(form: QuestionFormData, choiceIndex: number, formIndex: number) {
    if (form.choices.length <= 2) return;
    form.choices = form.choices.filter((_, i) => i !== choiceIndex);
    this.onFieldChange(formIndex);
  }

  resetForm(index: number) {
    const uid = this.forms()[index].uid;
    const fresh = this.createEmptyForm();
    fresh.uid = uid;
    this.forms.update(forms => forms.map((f, i) => (i === index ? fresh : f)));
  }

  deleteForm(index: number) {
    if (this.forms().length === 1) return;
    this.forms.update(forms => forms.filter((_, i) => i !== index));
  }

  onImageSelected(event: Event, form: QuestionFormData) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      form.imageBase64 = reader.result as string;
      form.imageFileName = file.name;
      this.forms.update(f => [...f]);
    };
    reader.readAsDataURL(file);
  }

  triggerFileInput(inputEl: HTMLInputElement) {
    inputEl.click();
  }

  searchSubjectsForForm(form: QuestionFormData, event: AutoCompleteCompleteEvent) {
    const q = event.query ? event.query.toLowerCase() : '';
    form.filteredSubjects = this.subjects.filter(s => s.name.toLowerCase().includes(q));
  }

  searchTopicsForForm(form: QuestionFormData, event: AutoCompleteCompleteEvent) {
    const q = event.query ? event.query.toLowerCase() : '';
    const pool = form.selectedSubject
      ? this.allTopics.filter(t => t.subjectId === form.selectedSubject!.id)
      : this.allTopics;
    form.filteredTopics = pool.filter(t => t.name.toLowerCase().includes(q));
  }

  onSubjectChangeForForm(form: QuestionFormData, event: any) {
    const subject = event && typeof event === 'object' && 'id' in event ? event : null;
    form.selectedSubject = subject;
    form.selectedTopic = null;
    if (subject) {
      this.loadTopicsForForm(form, subject.id);
    } else {
      form.filteredTopics = [...this.allTopics];
      this.forms.update(f => [...f]);
    }
  }

  onTopicChangeForForm(form: QuestionFormData, event: any) {
    const topic = event && typeof event === 'object' && 'id' in event ? event : null;
    form.selectedTopic = topic;

    if (topic) {
      if (!form.selectedSubject || topic.subjectId !== form.selectedSubject.id) {
        const parentSubject = this.subjects.find(s => s.id === topic.subjectId);
        if (parentSubject) {
          form.selectedSubject = parentSubject;
          // Also update the topics list to show only those from this subject
          this.loadTopicsForForm(form, topic.subjectId);
        }
      }
    }

    const index = this.forms().indexOf(form);
    this.onFieldChange(index);
  }

  private loadTopicsForForm(form: QuestionFormData, subjectId: string) {
    this.topicService.getBySubjectId(subjectId).subscribe({
      next: (data) => {
        form.filteredTopics = data;
        this.forms.update(f => [...f]);
      }
    });
  }

  close() {
    this.closed.emit();
  }

  save() {
    if (this.saving()) return;
    const valid = this.forms().filter(f => this.isFormValid(f));
    if (valid.length === 0) return;

    this.saving.set(true);
    const requests = valid.map(form => {
      const req: Parameters<QuestionService['create']>[0] = {
        questionText: form.questionText.trim(),
        difficulty: form.difficulty!,
        questionType: form.questionType,
        topicId: form.selectedTopic!.id,
        questionImageBase64: form.imageBase64,
        questionAnswer: null,
        questionChoices: null,
      };
      if (form.questionType === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' || form.questionType === 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE') {
        req.questionChoices = JSON.stringify(form.choices.filter(c => c.value.trim()));
      } else {
        req.questionAnswer = form.answer;
      }
      return this.questionService.create(req);
    });

    forkJoin(requests).subscribe({
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

  get validCount(): number {
    return this.forms().filter(f => this.isFormValid(f)).length;
  }

  get canSave(): boolean {
    return this.validCount > 0 && !this.saving();
  }
}
