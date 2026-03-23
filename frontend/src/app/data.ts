import { Injectable, signal, computed, inject, PLATFORM_ID, effect } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface DailyStats {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  steps: number;
  workoutCompleted: boolean;
  mood: string;
}

export interface Workout {
  id: string;
  name: string;
  duration: number;
  calories: number;
  exercises: string[];
  completed: boolean;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserProfileData {
  name: string;
  age: number;
  height: number;
  weight: number;
  goals: string;
  gender: string;
  activityLevel: string;
  calorieGoal: number;
  proteinGoal: number;
  waterGoal: number;
  stepGoal: number;
}

interface DayData {
  stats: DailyStats;
  workouts: Workout[];
  meals: Meal[];
}

// ── API base URL ──────────────────────────────────────────────────────────────
// In development the Angular proxy (proxy.conf.json) forwards /api → backend.
// In production the Express server serves both the API and the built Angular app.
const API = '/api';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // ── Public reactive state ─────────────────────────────────────────────────
  selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  private _profile = signal<UserProfileData>(this.getDefaultProfile());
  private _dailyCache = signal<Record<string, DayData>>({});

  /** The current user profile (kept in sync with the backend) */
  userProfile = computed(() => this._profile());

  /** Data for the currently selected date */
  currentDayData = computed<DayData>(() => {
    const date = this.selectedDate();
    return this._dailyCache()[date] ?? this.getDefaultDayData();
  });

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  constructor() {
    if (!this.isBrowser) return;

    // Load profile once on startup
    this.loadProfile();

    // Whenever the selected date changes, fetch that day's data
    effect(() => {
      const date = this.selectedDate();
      void this.loadDayData(date);
    });
  }

  // ── Private loaders ───────────────────────────────────────────────────────

  private async loadProfile(): Promise<void> {
    try {
      const profile = await firstValueFrom(
        this.http.get<UserProfileData>(`${API}/profile`)
      );
      this._profile.set(profile);
    } catch (err) {
      console.error('[DataService] loadProfile failed:', err);
    }
  }

  private async loadDayData(date: string): Promise<void> {
  try {
    const day = await firstValueFrom(
      this.http.get<any>(`${API}/daily/${date}`)
    );

    // ✅ SAFE fallback (VERY IMPORTANT)
    const safeData = {
      stats: day?.stats || {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        water: 0,
        steps: 0,
        workoutCompleted: false,
        mood: 'neutral'
      },
      workouts: day?.workouts || [],
      meals: day?.meals || []
    };

    this._dailyCache.update(cache => ({ ...cache, [date]: safeData }));

  } catch (err) {
    console.error(`[DataService] loadDayData(${date}) failed:`, err);

    // ✅ fallback prevents blank UI
    this._dailyCache.update(cache => ({
      ...cache,
      [date]: this.getDefaultDayData()
    }));
  }
}

  // ── Public API ────────────────────────────────────────────────────────────

  setDate(date: string): void {
    this.selectedDate.set(date);
  }

  // -- Profile ---------------------------------------------------------------

  async updateProfile(profile: UserProfileData): Promise<void> {
    try {
      const updated = await firstValueFrom(
        this.http.put<UserProfileData>(`${API}/profile`, profile)
      );
      this._profile.set(updated);
    } catch (err) {
      console.error('[DataService] updateProfile failed:', err);
    }
  }

  // -- Stats -----------------------------------------------------------------

  async updateStats(stats: Partial<DailyStats>): Promise<void> {
    const date = this.selectedDate();
    try {
      const day = await firstValueFrom(
        this.http.patch<DayData>(`${API}/daily/${date}/stats`, stats)
      );
      this.setDay(date, day);
    } catch (err) {
      console.error('[DataService] updateStats failed:', err);
    }
  }

  // -- Workouts --------------------------------------------------------------

  async addWorkout(workout: Omit<Workout, 'id'>): Promise<void> {
    const date = this.selectedDate();
    try {
      const res = await firstValueFrom(
        this.http.post<{ workout: Workout; day: DayData }>(
          `${API}/daily/${date}/workouts`,
          workout
        )
      );
      this.setDay(date, res.day);
    } catch (err) {
      console.error('[DataService] addWorkout failed:', err);
    }
  }

  async toggleWorkout(workoutId: string): Promise<void> {
    const date = this.selectedDate();
    try {
      const res = await firstValueFrom(
        this.http.patch<{ workout: Workout; day: DayData }>(
          `${API}/daily/${date}/workouts/${workoutId}/toggle`,
          {}
        )
      );
      this.setDay(date, res.day);
    } catch (err) {
      console.error('[DataService] toggleWorkout failed:', err);
    }
  }

  async deleteWorkout(workoutId: string): Promise<void> {
    const date = this.selectedDate();
    try {
      const day = await firstValueFrom(
        this.http.delete<DayData>(`${API}/daily/${date}/workouts/${workoutId}`)
      );
      this.setDay(date, day);
    } catch (err) {
      console.error('[DataService] deleteWorkout failed:', err);
    }
  }

  // -- Meals -----------------------------------------------------------------

  async addMeal(meal: Omit<Meal, 'id'>): Promise<void> {
    const date = this.selectedDate();
    try {
      const res = await firstValueFrom(
        this.http.post<{ meal: Meal; day: DayData }>(
          `${API}/daily/${date}/meals`,
          meal
        )
      );
      this.setDay(date, res.day);
    } catch (err) {
      console.error('[DataService] addMeal failed:', err);
    }
  }

  async deleteMeal(mealId: string): Promise<void> {
    const date = this.selectedDate();
    try {
      const day = await firstValueFrom(
        this.http.delete<DayData>(`${API}/daily/${date}/meals/${mealId}`)
      );
      this.setDay(date, day);
    } catch (err) {
      console.error('[DataService] deleteMeal failed:', err);
    }
  }

  async updateMeals(meals: Meal[]): Promise<void> {
    const date = this.selectedDate();
    try {
      const day = await firstValueFrom(
        this.http.put<DayData>(`${API}/daily/${date}/meals`, { meals })
      );
      this.setDay(date, day);
    } catch (err) {
      console.error('[DataService] updateMeals failed:', err);
    }
  }

  // -- History ---------------------------------------------------------------

  async getHistory(): Promise<string[]> {
    try {
      return await firstValueFrom(
        this.http.get<string[]>(`${API}/daily/history`)
      );
    } catch {
      return [];
    }
  }

  private setDay(date: string, day: DayData): void {
    this._dailyCache.update(cache => ({ ...cache, [date]: day }));
  }

  // ── Defaults ──────────────────────────────────────────────────────────────

  private getDefaultProfile(): UserProfileData {
    return {
      name: 'Alex Johnson',
      age: 28,
      height: 180,
      weight: 78,
      goals: 'Build muscle and improve endurance',
      gender: 'Male',
      activityLevel: 'Moderate',
      calorieGoal: 2500,
      proteinGoal: 150,
      waterGoal: 3000,
      stepGoal: 10000,
    };
  }

  private getDefaultDayData(): DayData {
    return {
      stats: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        water: 0,
        steps: 0,
        workoutCompleted: false,
        mood: 'neutral',
      },
      workouts: [],
      meals: [],
    };
  }
}