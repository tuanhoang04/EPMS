import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SubjectService, SubjectResponse } from '../../services/subject.service';
import { TopicService, TopicResponse } from '../../services/topic.service';
import { HeaderComponent } from '../../../../shared/components/header/Header.component';
import { ButtonModule } from 'primeng/button';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { AddSubjectComponent } from '../../components/add-subject/add-subject.component';
import { AddTopicComponent } from '../../components/add-topic/add-topic.component';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@Component({
  selector: 'app-subject-detail',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    ButtonModule,
    ModalComponent,
    AddSubjectComponent,
    AddTopicComponent,
    ConfirmDialogModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './subject-detail.html',
  styleUrl: './subject-detail.scss',
})
export class SubjectDetail implements OnInit {
  subject = signal<SubjectResponse | null>(null);
  topics = signal<TopicResponse[]>([]);
  loading = signal(false);
  showEditModal = signal(false);
  showAddTopicModal = signal(false);
  topicToEdit = signal<TopicResponse | null>(null);

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private subjectService: SubjectService,
    private topicService: TopicService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadSubject(id);
      this.loadTopics(id);
    } else {
      this.router.navigate(['/']);
    }
  }

  loadSubject(id: string) {
    this.loading.set(true);
    this.subjectService.getById(id).subscribe({
      next: (data) => {
        this.subject.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
    });
  }

  loadTopics(subjectId: string) {
    this.topicService.getBySubjectId(subjectId).subscribe({
      next: (data) => {
        this.topics.set(data);
      },
    });
  }

  onSubjectSaved() {
    this.showEditModal.set(false);
    const id = this.subject()?.id;
    if (id) {
      this.loadSubject(id);
    }
  }

  onTopicSaved() {
    this.showAddTopicModal.set(false);
    this.topicToEdit.set(null);
    const id = this.subject()?.id;
    if (id) {
      this.loadTopics(id);
      this.loadSubject(id); // Reload subject to update topicCount
    }
  }

  openEditTopic(topic: TopicResponse) {
    this.topicToEdit.set(topic);
    this.showAddTopicModal.set(true);
  }

  confirmDeleteTopic(topic: TopicResponse) {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete topic "${topic.name}"? This will also delete ALL questions inside it.`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteTopic(topic.id);
      },
    });
  }

  deleteTopic(id: string) {
    this.topicService.delete(id).subscribe({
      next: () => {
        const subjectId = this.subject()?.id;
        if (subjectId) {
          this.loadTopics(subjectId);
          this.loadSubject(subjectId);
        }
      },
    });
  }

  onModalClosed() {
    this.showEditModal.set(false);
    this.showAddTopicModal.set(false);
    this.topicToEdit.set(null);
  }

  getSubjectImage(subject: SubjectResponse): string {
    return `https://picsum.photos/seed/${subject.id}/800/400`;
  }
}
