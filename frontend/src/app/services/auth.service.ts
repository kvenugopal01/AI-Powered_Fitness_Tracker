import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  currentUser = signal<User | null>(null);
  token = signal<string | null>(null);

  constructor() {
    if (this.isBrowser) {
      const savedToken = localStorage.getItem('bfit_token');
      if (savedToken) {
        this.token.set(savedToken);
        this.loadCurrentUser();
      }
    }
  }

  async loginWithGoogle(idToken: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string; user: User }>('/api/auth/google', { idToken })
      );
      this.setSession(res.token, res.user);
      this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error('Login failed', err);
      throw err;
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string; user: User }>('/api/auth/login', { email, password })
      );
      this.setSession(res.token, res.user);
      this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error('Login failed', err);
      throw err;
    }
  }

  async signup(name: string, email: string, password: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.post<{ token: string; user: User }>('/api/auth/signup', { name, email, password })
      );
      this.setSession(res.token, res.user);
      this.router.navigate(['/dashboard']);
    } catch (err) {
      console.error('Signup failed', err);
      throw err;
    }
  }

  private async loadCurrentUser(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: User }>('/api/auth/me')
      );
      this.currentUser.set(res.user);
    } catch (err) {
      console.error('Failed to load user', err);
      this.logout();
    }
  }

  private setSession(token: string, user: User): void {
    this.token.set(token);
    this.currentUser.set(user);
    if (this.isBrowser) {
      localStorage.setItem('bfit_token', token);
    }
  }

  logout(): void {
    this.token.set(null);
    this.currentUser.set(null);
    if (this.isBrowser) {
      localStorage.removeItem('bfit_token');
    }
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!this.token();
  }
}
