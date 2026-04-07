import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GeminiService } from '../services/geminiService';

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

@Component({
  selector: 'app-aicoach',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './aicoach.html',
  styleUrl: './aicoach.css'
})
export class AiCoach {
  private geminiService = inject(GeminiService);
  
  messages = signal<Message[]>([
    { role: 'ai', text: 'Hello! I am your BFit AI Coach. How can I help you with your fitness journey today?', timestamp: new Date() }
  ]);
  
  userInput = signal('');
  isLoading = signal(false);

  async sendMessage() {
    const text = this.userInput().trim();
    if (!text || this.isLoading()) return;

    // Add user message
    this.messages.update(msgs => [...msgs, { role: 'user', text, timestamp: new Date() }]);
    this.userInput.set('');
    this.isLoading.set(true);

    try {
      const response = await this.geminiService.generateResponse(text);
      this.messages.update(msgs => [...msgs, { role: 'ai', text: response, timestamp: new Date() }]);
    } catch {
      this.messages.update(msgs => [...msgs, { role: 'ai', text: 'Sorry, I encountered an error. Please try again.', timestamp: new Date() }]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
