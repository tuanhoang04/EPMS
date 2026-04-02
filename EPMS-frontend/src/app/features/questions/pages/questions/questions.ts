import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { QuestionService, QuestionResponse, Difficulty, QuestionPage } from '../../services/question.service';
import { SubjectService, SubjectResponse } from '../../../homepage/services/subject.service';
import { TopicService, TopicResponse } from '../../../homepage/services/topic.service';
import { AddQuestionModalComponent } from '../../components/add-question-modal/add-question-modal.component';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    BottomNavComponent,
    PaginationComponent,
    AddQuestionModalComponent,
    AutoCompleteModule,
    ButtonModule,
    TagModule,
  ],
  templateUrl: './questions.html',
  styleUrl: './questions.scss',
})
export class QuestionsPage implements OnInit {
  questions = signal<QuestionResponse[]>([]);
  page = signal<QuestionPage | null>(null);
  pageIndex = signal(0);
  pageSize = signal(10);
  pageSizeOptions = [10, 20, 50];

  subjects = signal<SubjectResponse[]>([]);
  topics = signal<TopicResponse[]>([]);
  allTopics = signal<TopicResponse[]>([]);
  loading = signal(false);
  showAddModal = signal(false);

  selectedSubject = signal<any | null>(null);
  selectedTopic = signal<any | null>(null);
  selectedDifficulty = signal<any | null>(null);

  filteredSubjects = signal<SubjectResponse[]>([]);
  filteredTopics = signal<TopicResponse[]>([]);
  filteredDifficulties = signal<{label: string, value: string | null}[]>([]);

  difficultyOptions = [
    { label: 'All Difficulties', value: null },
    ...Object.values(Difficulty).map(d => ({ label: d, value: d }))
  ];

  constructor(
    private questionService: QuestionService,
    private subjectService: SubjectService,
    private topicService: TopicService
  ) {
    // Reload questions when any filter changes
    effect(() => {
      this.loadQuestions();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.loadSubjects();
    this.loadAllTopics();
    this.loadQuestions();
  }

  loadSubjects() {
    this.subjectService.getAll(0, 1000).subscribe({
      next: (data) => {
        this.subjects.set(data.content);
        this.filteredSubjects.set(data.content);
      }
    });
  }

  loadAllTopics() {
    this.topicService.getAll().subscribe({
      next: (data) => {
        this.allTopics.set(data);
        if (!this.selectedSubject()) {
          this.topics.set(data);
          this.filteredTopics.set(data);
        }
      }
    });
  }

  loadQuestions() {
    this.loading.set(true);
    const subjectId = this.selectedSubject()?.id;
    const topicId = this.selectedTopic()?.id;
    const difficulty = this.selectedDifficulty()?.value;

    this.questionService.getAll(
      subjectId || undefined,
      topicId || undefined,
      difficulty || undefined,
      this.pageIndex(),
      this.pageSize()
    ).subscribe({
      next: (data) => {
        this.page.set(data);
        this.questions.set(data.content);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onPageChange(event: { page: number; rows: number }) {
    this.pageIndex.set(event.page);
    this.pageSize.set(event.rows);
    this.loadQuestions();
  }

  onSubjectChange(event: any) {
    const subject = event && typeof event === 'object' && 'id' in event ? event : null;
    this.selectedSubject.set(subject);
    this.selectedTopic.set(null); // Clear topic when subject changed

    if (subject) {
      this.topicService.getBySubjectId(subject.id).subscribe({
        next: (data) => {
          this.topics.set(data);
          this.filteredTopics.set(data);
        }
      });
    } else {
      this.topics.set(this.allTopics());
      this.filteredTopics.set(this.allTopics());
    }
  }

  onTopicChange(event: any) {
    const topic = event && typeof event === 'object' && 'id' in event ? event : null;
    this.selectedTopic.set(topic);
    if (topic) {
      if (!this.selectedSubject() || topic.subjectId !== this.selectedSubject().id) {
        const parentSubject = this.subjects().find(s => s.id === topic.subjectId);
        if (parentSubject) {
          this.selectedSubject.set(parentSubject);
          // Also update the topics list to show only those from this subject
          this.topicService.getBySubjectId(topic.subjectId).subscribe({
            next: (data) => {
              this.topics.set(data);
              this.filteredTopics.set(data);
            }
          });
        }
      }
    }
  }

  onDifficultyChange(event: any) {
    const difficulty = event && typeof event === 'object' && 'label' in event ? event : null;
    this.selectedDifficulty.set(difficulty);
  }

  searchSubjects(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    this.filteredSubjects.set(
      this.subjects().filter(s => s.name.toLowerCase().includes(query))
    );
  }

  searchTopics(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    this.filteredTopics.set(
      this.topics().filter(t => t.name.toLowerCase().includes(query))
    );
  }

  searchDifficulties(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    this.filteredDifficulties.set(
      this.difficultyOptions.filter(d => d.label.toLowerCase().includes(query))
    );
  }

  openAddModal() {
    this.showAddModal.set(true);
  }

  onModalSaved() {
    this.loadQuestions();
  }

  getDifficultySeverity(difficulty: Difficulty): "success" | "secondary" | "info" | "warn" | "danger" | "contrast" | undefined {
    switch (difficulty) {
      case Difficulty.BEGINNER: return 'info';
      case Difficulty.EASY: return 'success';
      case Difficulty.INTERMEDIATE: return 'warn';
      case Difficulty.ADVANCED: return 'danger';
      default: return 'secondary';
    }
  }
}
