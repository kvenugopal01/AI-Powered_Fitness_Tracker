import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { GeminiService, MealAnalysis } from '../services/geminiService';
import { DataService } from '../data';

@Component({
  selector: 'app-nutrition-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDatepickerModule, MatInputModule],
  templateUrl: './nutrition-tracker.html',
  styleUrl: './nutrition-tracker.css'
})
export class NutritionTracker {
  private geminiService = inject(GeminiService);
  private dataService = inject(DataService);
  
  selectedDate = this.dataService.selectedDate;
  dayData = this.dataService.currentDayData;
  
  meals = computed(() => this.dayData().meals);
  stats = computed(() => this.dayData().stats);

  // For MatDatepicker
  get selectedDateAsDate(): Date {
    return new Date(this.selectedDate() + 'T00:00:00');
  }

  onDatePickerChange(date: Date | null) {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      this.dataService.setDate(`${year}-${month}-${day}`);
    }
  }
  
  newMealName = signal('');
  newMealCalories = signal(0);
  newMealProtein = signal(0);
  
  aiAdvice = signal<{ advice: string; itemsToRemove: string[] } | null>(null);
  isAnalyzing = signal(false);
  isPhotoAnalyzing = signal(false);
  photoAnalysisResult = signal<MealAnalysis | null>(null);

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e: ProgressEvent<FileReader>) => {
      const result = e.target?.result as string;
      if (result) {
        const base64 = result.split(',')[1];
        await this.analyzeMealPhoto(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  async analyzeMealPhoto(base64: string) {
    this.isPhotoAnalyzing.set(true);
    this.photoAnalysisResult.set(null);
    try {
      const result = await this.geminiService.analyzeMealPhoto(base64);
      this.photoAnalysisResult.set(result);
    } catch (error) {
      console.error("Failed to analyze photo:", error);
    } finally {
      this.isPhotoAnalyzing.set(false);
    }
  }

  addAnalyzedMeal() {
    const result = this.photoAnalysisResult();
    if (!result) return;

    this.dataService.addMeal({
      name: result.name,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat
    });
    
    this.photoAnalysisResult.set(null);
  }

  addMeal() {
    if (!this.newMealName().trim()) return;
    
    this.dataService.addMeal({
      name: this.newMealName(),
      calories: this.newMealCalories(),
      protein: this.newMealProtein(),
      carbs: 0,
      fat: 0
    });
    
    this.newMealName.set('');
    this.newMealCalories.set(0);
    this.newMealProtein.set(0);
  }

  removeMeal(id: string) {
    this.dataService.deleteMeal(id);
  }

  prevDay() {
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() - 1);
    this.dataService.setDate(date.toISOString().split('T')[0]);
  }

  nextDay() {
    const date = new Date(this.selectedDate());
    date.setDate(date.getDate() + 1);
    this.dataService.setDate(date.toISOString().split('T')[0]);
  }

  goToToday() {
    this.dataService.setDate(new Date().toISOString().split('T')[0]);
  }

  async getAiAdvice() {
    if (this.meals().length === 0) return;
    
    this.isAnalyzing.set(true);
    const mealLog = this.meals().map(m => `${m.name} (${m.calories} kcal)`).join(', ');
    const profile = this.dataService.userProfile();
    
    try {
      const result = await this.geminiService.analyzeNutrition(mealLog, profile);
      this.aiAdvice.set(result);
    } catch (error) {
      console.error("AI Advice Error:", error);
      this.aiAdvice.set({ advice: 'Could not get AI advice at this time. Please try again later.', itemsToRemove: [] });
    } finally {
      this.isAnalyzing.set(false);
    }
  }

  removeSuggestedItems() {
    const advice = this.aiAdvice();
    if (!advice || !advice.itemsToRemove.length) return;

    const itemsToRemove = advice.itemsToRemove.map(item => item.toLowerCase());
    const currentMeals = this.meals();
    
    // Filter out meals that match the suggested items to remove
    const updatedMeals = currentMeals.filter(meal => 
      !itemsToRemove.some(toRemove => meal.name.toLowerCase().includes(toRemove))
    );

    if (updatedMeals.length !== currentMeals.length) {
      this.dataService.updateMeals(updatedMeals);
      // Clear the advice after removal to reflect the new state
      this.aiAdvice.set(null);
    }
  }

  isToday() {
    return this.selectedDate() === new Date().toISOString().split('T')[0];
  }
}
