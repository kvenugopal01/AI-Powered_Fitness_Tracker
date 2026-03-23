import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// ── Types ──────────────────────────────────────────

export interface UserProfile {
  name: string;
  age: number;
  height: number;
  weight: number;
  calorieGoal: number;
  proteinGoal: number;
  waterGoal: number;
  stepGoal: number;
  goals?: string;
}

export interface AIExercise {
  name: string;
  sets: number;
  reps: number | string;
  duration: number;
  calories: number;
}

export interface MealAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  analysis: string;
}

export interface PostureAnalysis {
  isCorrect: boolean;
  feedback: string;
  suggestions: string[];
}

export interface ExerciseGuide {
  instructions: string;
  youtubeQuery: string;
  recommendedReps: string;
  recommendedSets: string;
}

// ── Service ──────────────────────────────────────────

const AI = '/api/ai';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private http = inject(HttpClient);

  private async post<T = any>(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<T> {
    try {
      return await firstValueFrom(
        this.http.post<T>(`${AI}/${endpoint}`, body)
      );
    } catch (err: any) {
      console.error(`AI API error at /${endpoint}:`, err);
      throw err;
    }
  }

  /** General chat / Q-A. */
  async generateResponse(
    prompt: string,
    systemInstruction?: string
  ): Promise<string> {
    try {
      const data = await this.post<{ text: string }>('chat', {
        prompt,
        systemInstruction,
      });
      return data.text ?? "I'm sorry, I couldn't generate a response at this time.";
    } catch (error) {
      console.error('GeminiService.generateResponse error:', error);
      return 'An error occurred while connecting to the AI coach. Please try again later.';
    }
  }

  /** Free-text workout plan narrative. */
  async generateWorkoutPlan(
    goals: string,
    profile: { age: number; height: number; weight: number }
  ): Promise<string> {
    try {
      const data = await this.post<{ text: string }>('workout-plan', {
        goals,
        profile,
      });
      return data.text ?? 'Could not generate a workout plan.';
    } catch (error) {
      console.error('GeminiService.generateWorkoutPlan error:', error);
      return 'An error occurred while generating the workout plan. Please try again.';
    }
  }

  /** Structured workout — returns an array of exercises. */
  async generateStructuredWorkout(
    profile: UserProfile,
    goals: string
  ): Promise<AIExercise[]> {
    try {
      const data = await this.post<{ exercises: AIExercise[] }>(
        'workout-structured',
        { profile, goals }
      );
      return data.exercises ?? [];
    } catch (error) {
      console.error('GeminiService.generateStructuredWorkout error:', error);
      return [];
    }
  }

  /** Nutrition analysis from a text meal log. */
  async analyzeNutrition(
    mealLog: string,
    profile: UserProfile
  ): Promise<{ advice: string; itemsToRemove: string[] }> {
    try {
      return await this.post<{ advice: string; itemsToRemove: string[] }>(
        'nutrition',
        { mealLog, profile }
      );
    } catch (error) {
      console.error('GeminiService.analyzeNutrition error:', error);
      return { advice: 'Could not analyze diet.', itemsToRemove: [] };
    }
  }

  /** Analyze a meal from a base64 photo. */
  async analyzeMealPhoto(base64Image: string): Promise<MealAnalysis> {
    try {
      return await this.post<MealAnalysis>('meal-photo', { base64Image });
    } catch (error) {
      console.error('GeminiService.analyzeMealPhoto error:', error);
      throw error;
    }
  }

  /** Analyze posture from a base64 photo. */
  async analyzePosture(base64Image: string): Promise<PostureAnalysis> {
    try {
      return await this.post<PostureAnalysis>('posture', { base64Image });
    } catch (error) {
      console.error('GeminiService.analyzePosture error:', error);
      throw error;
    }
  }

  /** Step-by-step guide for a named exercise. */
  async getExerciseGuide(
    exerciseName: string,
    workoutDetails?: string
  ): Promise<ExerciseGuide> {
    try {
      return await this.post<ExerciseGuide>('exercise-guide', {
        exerciseName,
        workoutDetails,
      });
    } catch (error) {
      console.error('GeminiService.getExerciseGuide error:', error);
      return {
        instructions: 'Could not load instructions.',
        youtubeQuery: exerciseName,
        recommendedReps: '10-12',
        recommendedSets: '3',
      };
    }
  }
}