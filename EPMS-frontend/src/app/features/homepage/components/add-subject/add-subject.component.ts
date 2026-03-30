import { Component, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SubjectService, SubjectRequest } from '../../services/subject.service';

@Component({
  selector: 'app-add-subject',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, TextareaModule],
  templateUrl: './add-subject.component.html',
  styleUrl: './add-subject.component.scss'
})
export class AddSubjectComponent {
  @Output() saved = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  name = '';
  description = '';
  saving = false;

  constructor(private subjectService: SubjectService) {}

  save() {
    if (!this.name.trim()) return;
    this.saving = true;
    const request: SubjectRequest = {
      name: this.name.trim(),
      description: this.description.trim()
    };
    this.subjectService.create(request).subscribe({
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
