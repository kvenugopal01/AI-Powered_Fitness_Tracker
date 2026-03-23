import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { GeminiService, PostureAnalysis } from '../services/geminiService';

@Component({
  selector: 'app-posture-checker',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './posture-checker.html',
  styleUrl: './posture-checker.css'
})
export class PostureChecker {
  private geminiService = inject(GeminiService);

  isAnalyzing = signal(false);
  analysisResult = signal<PostureAnalysis | null>(null);
  previewUrl = signal<string | null>(null);

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result as string;
      if (result) {
        this.previewUrl.set(result);
        const base64 = result.split(',')[1];
        this.analyzePosture(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  async analyzePosture(base64: string) {
    this.isAnalyzing.set(true);
    this.analysisResult.set(null);
    try {
      const result = await this.geminiService.analyzePosture(base64);
      this.analysisResult.set(result);
    } catch (error) {
      console.error("Failed to analyze posture:", error);
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  reset() {
    this.previewUrl.set(null);
    this.analysisResult.set(null);
    this.isAnalyzing.set(false);
  }
}
