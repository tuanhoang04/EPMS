import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalComponent } from '../auth-modal/auth-modal.component';
import { ModalComponent } from '../modal/modal.component';
import ProfileComponent from '../../../features/profile/pages/profile/profile';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    MenuModule,
    AuthModalComponent,
    ModalComponent,
    ProfileComponent
  ],
  templateUrl: './Header.component.html',
  styleUrls: ['./Header.component.scss']
})
export class HeaderComponent implements OnInit {
  private router = inject(Router);
  authService = inject(AuthService);

  /** The title displayed on the left side of the header */
  @Input() pageTitle: string = 'EPMS Homepage';

  /** Controls which menu items are shown. Pass false to hide an item. */
  @Input() showProfile: boolean = true;

  profileMenuItems: MenuItem[] = [];
  authModalVisible = signal(false);
  authModalMode = signal<'login' | 'signup'>('login');
  profileModalVisible = signal(false);

  constructor() {
    effect(() => {
      if (!this.authService.isAuthenticated()) {
        this.authModalMode.set('login');
        this.authModalVisible.set(true);
      } else {
        this.authModalVisible.set(false);
      }
    });

    effect(() => {
      // Rebuild menu items when auth state changes
      this.authService.isAuthenticated();
      this.buildMenuItems();
    });
  }

  ngOnInit(): void {
    this.buildMenuItems();
  }

  private buildMenuItems(): void {
    const items: MenuItem[] = [];
    const isAuthenticated = this.authService.isAuthenticated();

    if (isAuthenticated) {
      if (this.showProfile) {
        items.push({
          label: 'Profile',
          icon: 'pi pi-user',
          command: () => this.onProfile()
        });
      }
      items.push({ separator: true });
      items.push({
        label: 'Log Out',
        icon: 'pi pi-sign-out',
        styleClass: 'logout-item',
        command: () => this.onLogout()
      });
    } else {
      items.push({
        label: 'Sign In',
        icon: 'pi pi-sign-in',
        command: () => this.onSignIn()
      });
      items.push({
        label: 'Sign Up',
        icon: 'pi pi-user-plus',
        command: () => this.onSignUp()
      });
    }

    this.profileMenuItems = items;
  }

  onProfile(): void {
    this.profileModalVisible.set(true);
  }

  onHome(): void {
    this.router.navigate(['/']);
  }

  onSignIn(): void {
    this.authModalMode.set('login');
    this.authModalVisible.set(true);
  }

  onSignUp(): void {
    this.authModalMode.set('signup');
    this.authModalVisible.set(true);
  }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/']);
  }
}
