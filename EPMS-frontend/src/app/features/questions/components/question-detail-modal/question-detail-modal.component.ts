import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TagModule } from 'primeng/tag';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { XmlEditorComponent } from '../../../../shared/components/xml-editor/xml-editor.component';
import { QuestionResponse, QuestionService, Difficulty } from '../../services/question.service';
import { SubjectResponse, SubjectService } from '../../../homepage/services/subject.service';
import { TopicResponse, TopicService } from '../../../homepage/services/topic.service';

interface QuestionChoice {
  value: string;
  isAnswer: boolean;
}

@Component({
  selector: 'app-question-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AutoCompleteModule, TagModule, ModalComponent, XmlEditorComponent],
  templateUrl: './question-detail-modal.component.html',
  styleUrl: './question-detail-modal.component.scss'
})
export class QuestionDetailModalComponent implements OnChanges {
  @Input() visible = false;
  @Input() question: QuestionResponse | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  saving = signal(false);
  deleting = signal(false);

  // Form fields
  questionText = signal('');
  answer = signal('');
  choices = signal<QuestionChoice[]>([]);
  difficulty = signal(Difficulty.BEGINNER);
  questionType = signal('MULTIPLE_CHOICE_ONE_RIGHT_CHOICE');
  selectedSubject = signal<SubjectResponse | null>(null);
  selectedTopic = signal<TopicResponse | null>(null);
  imageBase64 = signal<string | null>(null);
  imageFileName = signal<string | null>(null);

  subjects = signal<SubjectResponse[]>([]);
  topics = signal<TopicResponse[]>([]);
  filteredSubjects = signal<SubjectResponse[]>([]);
  filteredTopics = signal<TopicResponse[]>([]);

  difficultyOptions = [
    { label: 'Beginner', value: Difficulty.BEGINNER },
    { label: 'Easy', value: Difficulty.EASY },
    { label: 'Intermediate', value: Difficulty.INTERMEDIATE },
    { label: 'Advanced', value: Difficulty.ADVANCED }
  ];

  questionTypeOptions = [
    { label: 'Single Choice', value: 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' },
    { label: 'Multiple Choice', value: 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE' },
    { label: 'True / False', value: 'TRUE_FALSE' },
    { label: 'Gap Filling', value: 'GAP_FILLING' },
    { label: 'Short Answer', value: 'SHORT_ANSWER' }
  ];

  constructor(
    private questionService: QuestionService,
    private subjectService: SubjectService,
    private topicService: TopicService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['visible']?.currentValue === true && this.question) {
      this.loadData();
      this.populateForm();
    }
  }

  loadData() {
    this.subjectService.getAll(0, 1000).subscribe(data => {
      this.subjects.set(data.content);
    });
    this.topicService.getAll().subscribe(data => {
      this.topics.set(data);
      if (this.selectedSubject()) {
        this.filteredTopics.set(this.topics().filter(t => t.subjectId === this.selectedSubject()?.id));
      }
    });
  }

  populateForm() {
    if (!this.question) return;
    this.questionText.set(this.question.questionText);
    this.answer.set(this.question.questionAnswer || '');
    this.difficulty.set(this.question.difficulty);
    this.questionType.set(this.question.questionType);
    this.imageBase64.set(this.question.questionImageBase64 || null);

    if (this.question.questionChoices) {
      try {
        this.choices.set(JSON.parse(this.question.questionChoices));
      } catch (e) {
        this.choices.set([]);
      }
    } else {
      this.choices.set([]);
    }

    this.selectedSubject.set({ id: this.question.subjectId, name: this.question.subjectName } as SubjectResponse);
    this.selectedTopic.set({ id: this.question.topicId, name: this.question.topicName, subjectId: this.question.subjectId } as TopicResponse);
  }

  searchSubjects(event: any) {
    const query = (event.query || '').toLowerCase();
    this.filteredSubjects.set(this.subjects().filter(s => s.name.toLowerCase().includes(query)));
  }

  searchTopics(event: any) {
    const query = (event.query || '').toLowerCase();
    const baseList = this.selectedSubject()
      ? this.topics().filter(t => t.subjectId === this.selectedSubject()?.id)
      : this.topics();
    this.filteredTopics.set(baseList.filter(t => t.name.toLowerCase().includes(query)));
  }

  onSubjectChange(event: any) {
    if (event?.id) {
      this.selectedSubject.set(event);
      if (this.selectedTopic() && this.selectedTopic()?.subjectId !== event.id) {
        this.selectedTopic.set(null);
      }
    } else {
      this.selectedSubject.set(null);
    }
  }

  onTopicChange(event: any) {
    if (event?.id) {
      this.selectedTopic.set(event);
      if (!this.selectedSubject() || this.selectedSubject()?.id !== event.subjectId) {
        const sub = this.subjects().find(s => s.id === event.subjectId);
        if (sub) {
          this.selectedSubject.set(sub);
          // Update filtered topics to match the new subject
          this.filteredTopics.set(this.topics().filter(t => t.subjectId === sub.id));
        }
      }
    } else {
      this.selectedTopic.set(null);
    }
  }

  onQuestionTypeChange() {
    if (this.questionType().startsWith('MULTIPLE_CHOICE')) {
      if (this.choices().length < 2) {
        this.choices.set([
          { value: '', isAnswer: false },
          { value: '', isAnswer: false }
        ]);
      }
    } else {
      this.choices.set([]);
    }
  }

  addChoice() {
    this.choices.update(c => [...c, { value: '', isAnswer: false }]);
  }

  removeChoice(index: number) {
    this.choices.update(c => c.filter((_, i) => i !== index));
  }

  onChoiceAnswerChange(index: number) {
    if (this.questionType() === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE') {
      this.choices.update(choices => choices.map((c, i) => ({ ...c, isAnswer: i === index })));
    } else {
      this.choices.update(choices => choices.map((c, i) => i === index ? { ...c, isAnswer: !c.isAnswer } : c));
    }
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFileName.set(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        this.imageBase64.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput(inputEl: HTMLInputElement) {
    inputEl.click();
  }

  close() {
    this.closed.emit();
  }

  save() {
    if (!this.question || !this.selectedTopic()) return;
    this.saving.set(true);

    const request = {
      questionText: this.questionText(),
      questionAnswer: this.answer(),
      questionChoices: this.choices().length > 0 ? JSON.stringify(this.choices()) : null,
      questionImageBase64: this.imageBase64(),
      difficulty: this.difficulty(),
      questionType: this.questionType(),
      topicId: this.selectedTopic()!.id
    };

    // Note: QuestionService.update is not yet defined in the provided service,
    // but typically we'd use PUT /api/questions/{id}
    // I should check if it exists or add it.
    // Looking back at QuestionService, it only has getAll, getById, create, delete.
    // I'll assume I should add 'update' to QuestionService.

    this.questionService.update(this.question.id, request as any).subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
        this.close();
      },
      error: () => this.saving.set(false)
    });
  }

  delete() {
    if (!this.question) return;
    if (!confirm('Are you sure you want to delete this question?')) return;

    this.deleting.set(true);
    this.questionService.delete(this.question.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleted.emit();
        this.close();
      },
      error: () => this.deleting.set(false)
    });
  }
}
