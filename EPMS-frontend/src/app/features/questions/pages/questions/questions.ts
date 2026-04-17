import { Component, OnInit, OnDestroy, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { BottomNavComponent } from '../../../../shared/components/bottom-nav/bottom-nav.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';
import { QuestionService, QuestionResponse, Difficulty, QuestionPage } from '../../services/question.service';
import { SubjectService, SubjectResponse } from '../../../homepage/services/subject.service';
import { TopicService, TopicResponse } from '../../../homepage/services/topic.service';
import { AddQuestionModalComponent } from '../../components/add-question-modal/add-question-modal.component';
import { QuestionDetailModalComponent } from '../../components/question-detail-modal/question-detail-modal.component';
import { AutoCompleteModule, AutoCompleteCompleteEvent } from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { XmlRenderPipe } from '../../../../shared/pipes/xml-render.pipe';

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
    QuestionDetailModalComponent,
    AutoCompleteModule,
    ButtonModule,
    TagModule,
    XmlRenderPipe,
  ],
  templateUrl: './questions.html',
  styleUrl: './questions.scss',
})
export class QuestionsPage implements OnInit, OnDestroy {
  questions = signal<QuestionResponse[]>([]);
  page = signal<QuestionPage | null>(null);
  pageIndex = signal(0);
  pageSize = signal(10);
  pageSizeOptions = [10, 20, 50];
  viewMode = signal<'grid' | 'list'>('list');

  subjects = signal<SubjectResponse[]>([]);
  topics = signal<TopicResponse[]>([]);
  allTopics = signal<TopicResponse[]>([]);
  showAddModal = signal(false);
  showDetailModal = signal(false);
  showFilterSheet = signal(false);
  selectedDetailQuestion = signal<QuestionResponse | null>(null);

  activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedSubject()) count++;
    if (this.selectedTopic()) count++;
    if (this.selectedDifficulty()) count++;
    if (this.selectedQuestionType()) count++;
    return count;
  });

  searchQuery = signal('');
  private searchDebounceTimer: any = null;

  selectedSubject = signal<any | null>(null);
  selectedTopic = signal<any | null>(null);
  selectedDifficulty = signal<any | null>(null);
  selectedQuestionType = signal<any | null>(null);

  filteredSubjects = signal<SubjectResponse[]>([]);
  filteredTopics = signal<TopicResponse[]>([]);
  filteredDifficulties = signal<{label: string, value: string | null}[]>([]);
  filteredQuestionTypes = signal<{label: string, value: string | null}[]>([]);

  difficultyOptions = [
    { label: 'All Difficulties', value: null },
    ...Object.values(Difficulty).map(d => ({ label: d, value: d }))
  ];

  questionTypeOptions = [
    { label: 'All Types', value: null },
    { label: 'Single Choice', value: 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' },
    { label: 'Multiple Choice', value: 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE' },
    { label: 'True / False', value: 'TRUE_FALSE' },
    { label: 'Gap Filling', value: 'GAP_FILLING' },
    { label: 'Short Answer', value: 'SHORT_ANSWER' },
  ];

  constructor(
    private questionService: QuestionService,
    private subjectService: SubjectService,
    private topicService: TopicService,
    private route: ActivatedRoute
  ) {
    // Reload questions when any filter changes
    effect(() => {
      // Access signals to ensure tracking
      this.selectedSubject();
      this.selectedTopic();
      this.selectedDifficulty();
      this.selectedQuestionType();
      this.searchQuery();
      this.pageIndex();
      this.pageSize();

      this.loadQuestions();
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.loadSubjects();
    this.loadAllTopics();
    this.checkQueryParams();
    // loadQuestions() is called automatically by the effect in constructor
  }

  private checkQueryParams() {
    const subjectId = this.route.snapshot.queryParamMap.get('subjectId');
    const topicId = this.route.snapshot.queryParamMap.get('topicId');

    if (subjectId) {
      this.subjectService.getById(subjectId).subscribe({
        next: (subject) => {
          this.selectedSubject.set(subject);

          if (topicId) {
            this.topicService.getBySubjectId(subjectId).subscribe({
              next: (topics) => {
                this.topics.set(topics);
                this.filteredTopics.set(topics);
                const topic = topics.find(t => t.id === topicId);
                if (topic) {
                  this.selectedTopic.set(topic);
                }
              }
            });
          } else {
            this.topicService.getBySubjectId(subjectId).subscribe({
              next: (topics) => {
                this.topics.set(topics);
                this.filteredTopics.set(topics);
              }
            });
          }
        }
      });
    }
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
    const subjectId = this.selectedSubject()?.id;
    const topicId = this.selectedTopic()?.id;
    const difficultyValue = this.selectedDifficulty()?.value;
    const questionTypeValue = this.selectedQuestionType()?.value;
    const search = this.searchQuery().trim() || undefined;

    this.questionService.getAll(
      subjectId || undefined,
      topicId || undefined,
      difficultyValue || undefined,
      questionTypeValue || undefined,
      this.pageIndex(),
      this.pageSize(),
      search
    ).subscribe({
      next: (data) => {
        this.page.set(data);
        this.questions.set(data.content);
      }
    });
  }

  onSearchInput(value: string) {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    this.searchDebounceTimer = setTimeout(() => {
      this.pageIndex.set(0);
      this.searchQuery.set(value);
    }, 350);
  }

  ngOnDestroy() {
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
  }

  clearAllFilters() {
    this.selectedSubject.set(null);
    this.selectedTopic.set(null);
    this.selectedDifficulty.set(null);
    this.selectedQuestionType.set(null);
    this.topics.set(this.allTopics());
    this.filteredTopics.set(this.allTopics());
    this.pageIndex.set(0);
  }

  onPageChange(event: { page: number; rows: number }) {
    this.pageIndex.set(event.page);
    this.pageSize.set(event.rows);
  }

  onSubjectChange(event: any) {
    const item = event && 'originalEvent' in event ? event.value : event;
    const subject = item && typeof item === 'object' && 'id' in item ? item : null;
    this.selectedSubject.set(subject);
    this.selectedTopic.set(null); // Clear topic when subject changed
    this.pageIndex.set(0); // Reset to first page

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
    const item = event && 'originalEvent' in event ? event.value : event;
    const topic = item && typeof item === 'object' && 'id' in item ? item : null;
    this.selectedTopic.set(topic);
    this.pageIndex.set(0); // Reset to first page

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
    // (onSelect) passes AutoCompleteSelectEvent { value: item, originalEvent }; (onClear) passes null
    const item = event && 'originalEvent' in event ? event.value : event;
    const difficulty = item && typeof item === 'object' && 'value' in item ? item : null;
    this.selectedDifficulty.set(difficulty);
    this.pageIndex.set(0);
  }

  onQuestionTypeChange(event: any) {
    const item = event && 'originalEvent' in event ? event.value : event;
    const questionType = item && typeof item === 'object' && 'value' in item ? item : null;
    this.selectedQuestionType.set(questionType);
    this.pageIndex.set(0);
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

  searchQuestionTypes(event: AutoCompleteCompleteEvent) {
    const query = event.query.toLowerCase();
    this.filteredQuestionTypes.set(
      this.questionTypeOptions.filter(t => t.label.toLowerCase().includes(query))
    );
  }

  toggleView() {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
  }

  openAddModal() {
    this.showAddModal.set(true);
  }

  openDetail(question: QuestionResponse) {
    this.selectedDetailQuestion.set(question);
    this.showDetailModal.set(true);
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

  getQuestionTypeLabel(type: string) {
    switch (type) {
      case 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE': return 'Single Choice';
      case 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE': return 'Multiple Choice';
      case 'TRUE_FALSE': return 'True / False';
      case 'GAP_FILLING': return 'Gap Filling';
      case 'SHORT_ANSWER': return 'Short Answer';
      default: return type;
    }
  }

  getFormattedAnswer(q: QuestionResponse): string {
    if (q.questionType === 'MULTIPLE_CHOICE_ONE_RIGHT_CHOICE' || q.questionType === 'MULTIPLE_CHOICE_MULTIPLE_RIGHT_CHOICE') {
      if (!q.questionChoices) return 'No choices';
      try {
        const choices = JSON.parse(q.questionChoices) as { value: string; isAnswer: boolean }[];
        return choices.filter(c => c.isAnswer).map(c => c.value).join(', ');
      } catch (e) {
        return 'Invalid choices format';
      }
    }
    if (q.questionType === 'TRUE_FALSE') {
      return q.questionAnswer === 'true' ? 'True' : 'False';
    }
    return q.questionAnswer;
  }
}
