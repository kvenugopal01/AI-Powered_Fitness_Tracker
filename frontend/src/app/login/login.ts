import { Component, inject, OnInit, PLATFORM_ID, NgZone } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';

declare const google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="logo">
          <span class="logo-icon">⚡</span>
          <h1>BFit</h1>
        </div>
        <p class="subtitle">AI-Powered Fitness Assistant</p>

        <form (ngSubmit)="onSubmit()" #authForm="ngForm">
          <h2 class="form-title">{{ isLogin ? 'Sign In' : 'Create Account' }}</h2>

          <div class="form-group" *ngIf="!isLogin">
            <label for="name">Full Name</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              [(ngModel)]="name" 
              required 
              placeholder="Enter your name"
              #nameInput="ngModel"
            />
          </div>

          <div class="form-group">
            <label for="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              [(ngModel)]="email" 
              required 
              email
              placeholder="name@example.com"
              #emailInput="ngModel"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              [(ngModel)]="password" 
              required 
              minlength="6"
              placeholder="••••••••"
              #passInput="ngModel"
            />
          </div>

          <button type="submit" class="submit-btn" [disabled]="!authForm.form.valid || isLoading">
            <span *ngIf="!isLoading">{{ isLogin ? 'Continue' : 'Create Account' }}</span>
            <div class="spinner" *ngIf="isLoading"></div>
          </button>
        </form>

        <div class="divider">
          <span>OR</span>
        </div>
        
        <div class="actions">
          <div id="google-login-btn"></div>
        </div>

        <div class="toggle-mode">
          <p>
            {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
            <button type="button" class="text-link" (click)="toggleMode()">
              {{ isLogin ? 'Sign Up' : 'Sign In' }}
            </button>
          </p>
        </div>

        <div class="footer">
          <p>By continuing, you agree to our Terms and Privacy Policy</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: white;
      font-family: 'Inter', sans-serif;
    }

    .login-card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(12px);
      padding: 2.5rem;
      border-radius: 24px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      text-align: center;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }

    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }

    .logo-icon {
      font-size: 2.5rem;
    }

    .logo h1 {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin: 0;
      background: linear-gradient(to right, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 1rem;
      margin-bottom: 2rem;
    }

    .form-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1.5rem;
      text-align: left;
    }

    .form-group {
      margin-bottom: 1.25rem;
      text-align: left;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      color: #cbd5e1;
    }

    .form-group input {
      width: 100%;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 0.75rem 1rem;
      color: white;
      font-size: 1rem;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .form-group input:focus {
      outline: none;
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
    }

    .submit-btn {
      width: 100%;
      background: linear-gradient(to right, #38bdf8, #818cf8);
      color: white;
      padding: 0.75rem;
      border-radius: 12px;
      border: none;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .submit-btn:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .divider {
      margin: 1.5rem 0;
      position: relative;
      text-align: center;
    }

    .divider::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      z-index: 1;
    }

    .divider span {
      background: #1e293b;
      padding: 0 0.75rem;
      color: #64748b;
      font-size: 0.75rem;
      position: relative;
      z-index: 2;
    }

    .actions {
      display: flex;
      justify-content: center;
      margin-bottom: 1.5rem;
    }

    .toggle-mode {
      margin-top: 1rem;
      color: #94a3b8;
    }

    .text-link {
      background: none;
      border: none;
      color: #38bdf8;
      font-weight: 600;
      cursor: pointer;
      padding: 0;
      margin-left: 0.25rem;
    }

    .text-link:hover {
      text-decoration: underline;
    }

    .footer {
      color: #64748b;
      font-size: 0.8rem;
      margin-top: 2rem;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class Login implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);

  isLogin = true;
  isLoading = false;
  name = '';
  email = '';
  password = '';

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      if (this.authService.isLoggedIn()) {
        this.router.navigate(['/dashboard']);
        return;
      }
      this.initGoogleLogin();
    }
  }

  toggleMode() {
    this.isLogin = !this.isLogin;
  }

  async onSubmit() {
    this.isLoading = true;
    try {
      if (this.isLogin) {
        await this.authService.login(this.email, this.password);
      } else {
        await this.authService.signup(this.name, this.email, this.password);
      }
    } catch (err: any) {
      const msg = err.error?.error || err.message || 'Authentication failed';
      const details = err.error?.details ? `\nDetails: ${err.error.details}` : '';
      alert(`${msg}${details}`);
    } finally {
      this.isLoading = false;
    }
  }

  private initGoogleLogin() {
    // Wait for the script to load
    const interval = setInterval(() => {
      if (typeof google !== 'undefined') {
        clearInterval(interval);
        
        google.accounts.id.initialize({
          client_id: '748319721374-i6mqls0qs7kmj0se7o3k9vulsght6dnd.apps.googleusercontent.com', 
          callback: (response: any) => {
            this.ngZone.run(() => {
              this.handleCredentialResponse(response);
            });
          }
        });

        google.accounts.id.renderButton(
          document.getElementById('google-login-btn'),
          { 
            theme: 'filled_blue', 
            size: 'large', 
            width: 340,
            shape: 'rectangular',
            text: 'continue_with'
          }
        );
      }
    }, 100);
  }

  private handleCredentialResponse(response: any) {
    this.isLoading = true;
    this.authService.loginWithGoogle(response.credential)
      .catch(err => {
        const msg = err.error?.error || err.message || 'Unknown error';
        const details = err.error?.details ? `\nDetails: ${err.error.details}` : '';
        alert(`Login failed: ${msg}${details}`);
        console.error('Full auth error:', err);
      })
      .finally(() => this.isLoading = false);
  }
}
