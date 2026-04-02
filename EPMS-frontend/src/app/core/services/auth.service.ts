import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, UserInfo, UpdateProfileRequest } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:8080/api/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private platformId = inject(PLATFORM_ID);

  currentUser = signal<UserInfo | null>(null);
  isAuthenticated = signal<boolean>(false);
  isInitialLoading = signal<boolean>(false);

  constructor(private http: HttpClient) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
    }
  }

  private loadUserFromStorage() {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token) {
      this.isInitialLoading.set(true);
      this.http.get<UserInfo>(`${this.apiUrl}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this.isAuthenticated.set(true);
          this.isInitialLoading.set(false);
        },
        error: () => {
          this.logout();
          this.isInitialLoading.set(false);
        }
      });
    }
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap((res) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
        }
        this.currentUser.set(res.user);
        this.isAuthenticated.set(true);
      })
    );
  }

  register(request: RegisterRequest): Observable<string> {
    return this.http.post(`${this.apiUrl}/signup`, request, { responseType: 'text' });
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
  }

  updateProfile(request: UpdateProfileRequest): Observable<UserInfo> {
    return this.http.put<UserInfo>(`${this.apiUrl}/profile`, request).pipe(
      tap((user) => {
        this.currentUser.set(user);
      })
    );
  }

  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }
}
