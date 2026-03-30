import { Component, inject, signal, OnInit, effect, Output, EventEmitter } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { StatisticsService } from '../../../../core/services/statistics.service';
import { UserStatistics } from '../../../../core/models/statistics.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export default class ProfileComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private authService = inject(AuthService);
  private statisticsService = inject(StatisticsService);
  private location = inject(Location);

  user = this.authService.currentUser;
  statistics = signal<UserStatistics | null>(null);
  loading = signal(false);
  updating = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  editMode = signal(false);
  editForm = {
    firstName: '',
    lastName: ''
  };

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.fetchStatistics();
        const currentUser = this.user();
        if (currentUser) {
          this.editForm.firstName = currentUser.firstName;
          this.editForm.lastName = currentUser.lastName;
        }
      }
    });
  }

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.fetchStatistics();
      const currentUser = this.user();
      if (currentUser) {
        this.editForm.firstName = currentUser.firstName;
        this.editForm.lastName = currentUser.lastName;
      }
    }
  }

  fetchStatistics() {
    this.loading.set(true);
    this.statisticsService.getMyStatistics().subscribe({
      next: (stats) => {
        this.statistics.set(stats);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  toggleEdit() {
    this.editMode.set(!this.editMode());
    if (this.editMode()) {
      const currentUser = this.user();
      if (currentUser) {
        this.editForm.firstName = currentUser.firstName;
        this.editForm.lastName = currentUser.lastName;
      }
    }
  }

  updateProfile() {
    this.updating.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.authService.updateProfile(this.editForm).subscribe({
      next: () => {
        this.updating.set(false);
        this.editMode.set(false);
        this.successMessage.set('Profile updated successfully!');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        this.updating.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to update profile');
      }
    });
  }
}
