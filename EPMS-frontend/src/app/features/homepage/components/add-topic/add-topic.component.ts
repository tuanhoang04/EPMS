import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TopicService, TopicRequest, TopicResponse } from '../../services/topic.service';

@Component({
  selector: 'app-add-topic',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TextareaModule],
  templateUrl: './add-topic.component.html',
  styleUrl: './add-topic.component.scss'
})
export class AddTopicComponent implements OnInit {
  @Input() subjectId!: string;
  @Input() topicToEdit: TopicResponse | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  name = '';
  description = '';
  saving = false;

  constructor(private topicService: TopicService) {}

  ngOnInit() {
    if (this.topicToEdit) {
      this.name = this.topicToEdit.name;
      this.description = this.topicToEdit.description;
    }
  }

  save() {
    if (!this.name.trim()) return;
    this.saving = true;
    const request: TopicRequest = {
      name: this.name.trim(),
      description: this.description.trim(),
      subjectId: this.subjectId
    };

    const action = this.topicToEdit
      ? this.topicService.update(this.topicToEdit.id, request)
      : this.topicService.create(request);

    action.subscribe({
      next: () => {
        this.saving = false;
        this.name = '';
        this.description = '';
        this.saved.emit();
      },
      error: () => {
        this.saving = false;
      }
    });
  }

  cancel() {
    this.cancelled.emit();
  }
}
