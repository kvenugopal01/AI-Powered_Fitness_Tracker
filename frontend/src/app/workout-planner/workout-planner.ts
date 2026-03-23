import { Component, signal, inject, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { DataService, Workout } from '../data';
import { GeminiService } from '../services/geminiService';

@Component({
  selector: 'app-workout-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatDatepickerModule, MatInputModule, MatFormFieldModule],
  templateUrl: './workout-planner.html',
  styleUrl: './workout-planner.css'
})
export class WorkoutPlanner implements OnDestroy {
  private dataService = inject(DataService);
  private geminiService = inject(GeminiService);
  
  selectedDate = this.dataService.selectedDate;
  dayData = this.dataService.currentDayData;
  
  workouts = computed(() => this.dayData().workouts);

  newExerciseName = signal('');
  newExerciseSets = signal(3);
  newExerciseReps = signal(12);
  aiGenerating = signal(false);

  userProfile = this.dataService.userProfile;

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

  async generateAIWorkout() {
    this.aiGenerating.set(true);
    try {
      const profile = this.userProfile();
      const goals = profile.goals || 'General fitness and health';
      const exercises = await this.geminiService.generateStructuredWorkout(profile, goals);
      
      for (const ex of exercises) {
        this.dataService.addWorkout({
          name: ex.name,
          duration: ex.duration || 30,
          calories: ex.calories || 150,
          exercises: [`${ex.sets} sets of ${ex.reps} reps`],
          completed: false
        });
      }
    } catch (error) {
      console.error("Failed to generate AI workout:", error);
    } finally {
      this.aiGenerating.set(false);
    }
  }

  // Guide Modal State
  selectedWorkout = signal<Workout | null>(null);
  showGuide = signal(false);
  guideLoading = signal(false);
  exerciseInstructions = signal('');
  youtubeLink = signal('');
  recommendedReps = signal('');
  recommendedSets = signal('');

  // Timer State
  timerSeconds = signal(0);
  isTimerRunning = signal(false);
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  
  ngOnDestroy() {
    this.stopTimer();
  }

  addExercise() {
    if (!this.newExerciseName().trim()) return;
    
    this.dataService.addWorkout({
      name: this.newExerciseName(),
      duration: 30, // Default duration
      calories: 200, // Default calories
      exercises: [`${this.newExerciseSets()} sets of ${this.newExerciseReps()} reps`],
      completed: false
    });
    
    this.newExerciseName.set('');
  }

  async openGuide(workout: Workout) {
    this.selectedWorkout.set(workout);
    this.showGuide.set(true);
    this.guideLoading.set(true);
    this.exerciseInstructions.set('');
    this.youtubeLink.set('');
    this.recommendedReps.set('');
    this.recommendedSets.set('');
    this.resetTimer();

    try {
      const details = workout.exercises.join(', ');
      const guide = await this.geminiService.getExerciseGuide(workout.name, details);
      this.exerciseInstructions.set(guide.instructions);
      this.recommendedReps.set(guide.recommendedReps);
      this.recommendedSets.set(guide.recommendedSets);
      this.youtubeLink.set(`https://www.youtube.com/results?search_query=${encodeURIComponent(guide.youtubeQuery)}`);
    } catch {
      this.exerciseInstructions.set('Failed to load guide. Please try again.');
    } finally {
      this.guideLoading.set(false);
    }
  }

  closeGuide() {
    this.showGuide.set(false);
    this.selectedWorkout.set(null);
    this.stopTimer();
  }

  // Timer Methods
  startTimer() {
    if (this.isTimerRunning()) return;
    this.isTimerRunning.set(true);
    this.timerInterval = setInterval(() => {
      this.timerSeconds.update(s => s + 1);
    }, 1000);
  }

  stopTimer() {
    this.isTimerRunning.set(false);
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  resetTimer() {
    this.stopTimer();
    this.timerSeconds.set(0);
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  toggleComplete(id: string) {
    this.dataService.toggleWorkout(id);
  }

  removeExercise(id: string) {
    this.dataService.deleteWorkout(id);
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

  isToday() {
    return this.selectedDate() === new Date().toISOString().split('T')[0];
  }
}
