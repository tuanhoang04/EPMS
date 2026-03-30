import { Component, Input, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ModalComponent } from '../modal/modal.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    ModalComponent
  ],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent {
  @Input() visible = false;
  @Input() mode: 'login' | 'signup' = 'login';
  @Output() visibleChange = new EventEmitter<boolean>();

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  signupForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    firstName: ['', Validators.required],
    lastName: ['', Validators.required]
  });

  isSubmitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  get isLogin() { return this.mode === 'login'; }
  get isSignup() { return this.mode === 'signup'; }

  closable = computed(() => this.authService.isAuthenticated());

  switchMode() {
    this.mode = this.isLogin ? 'signup' : 'login';
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  onClose() {
    if (this.closable()) {
      this.visible = false;
      this.visibleChange.emit(false);
      this.errorMessage.set(null);
      this.successMessage.set(null);
    }
  }

  onSubmit() {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (this.isLogin) {
      this.login();
    } else {
      this.signup();
    }
  }

  private login() {
    if (this.loginForm.invalid) return;
    this.isSubmitting.set(true);
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.visible = false;
        this.visibleChange.emit(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set('Invalid email or password');
      }
    });
  }

  private signup() {
    if (this.signupForm.invalid) return;
    this.isSubmitting.set(true);
    this.authService.register(this.signupForm.value).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.mode = 'login';
        this.successMessage.set('Account created. Please sign in.');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error || 'Registration failed');
      }
    });
  }
}
