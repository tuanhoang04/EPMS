import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    MenuModule,
  ],
  templateUrl: './Header.component.html',
  styleUrls: ['./Header.component.scss']
})
export class HeaderComponent implements OnInit {

  /** The title displayed on the left side of the header */
  @Input() pageTitle: string = 'EPMS Homepage';

  /** Controls which menu items are shown. Pass false to hide an item. */
  @Input() showLogin: boolean = true;
  @Input() showLogout: boolean = true;
  @Input() showProfile: boolean = true;
  @Input() showSignIn: boolean = true;
  @Input() showSignUp: boolean = true;

  profileMenuItems: MenuItem[] = [];

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.buildMenuItems();
  }

  private buildMenuItems(): void {
    const items: MenuItem[] = [];

    if (this.showProfile) {
      items.push({
        label: 'Profile',
        icon: 'pi pi-user',
        command: () => this.onProfile()
      });
    }

    if (this.showLogin || this.showSignIn) {
      items.push({ separator: true });
    }

    if (this.showLogin) {
      items.push({
        label: 'Log In',
        icon: 'pi pi-sign-in',
        command: () => this.onLogin()
      });
    }

    if (this.showSignIn) {
      items.push({
        label: 'Sign In',
        icon: 'pi pi-key',
        command: () => this.onSignIn()
      });
    }

    if (this.showSignUp) {
      items.push({
        label: 'Sign Up',
        icon: 'pi pi-user-plus',
        command: () => this.onSignUp()
      });
    }

    if (this.showLogout) {
      items.push({ separator: true });
      items.push({
        label: 'Log Out',
        icon: 'pi pi-sign-out',
        styleClass: 'logout-item',
        command: () => this.onLogout()
      });
    }

    this.profileMenuItems = items;
  }

  onProfile(): void {
    this.router.navigate(['/profile']);
  }

  onLogin(): void {
    this.router.navigate(['/login']);
  }

  onSignIn(): void {
    this.router.navigate(['/sign-in']);
  }

  onSignUp(): void {
    this.router.navigate(['/sign-up']);
  }

  onLogout(): void {
    // Add your logout logic here (clear token, call auth service, etc.)
    console.log('User logged out');
    this.router.navigate(['/login']);
  }
}