import { Component, inject, computed, signal, OnDestroy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { DataService } from '../data';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatIconModule, RouterLink, CommonModule, FormsModule, MatDatepickerModule, MatInputModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnDestroy {
  private dataService = inject(DataService);
  private platformId = inject(PLATFORM_ID);
  
  userProfile = this.dataService.userProfile;
  selectedDate = this.dataService.selectedDate;
  dayData = this.dataService.currentDayData;

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

  isEditingGoals = signal(false);
  isTrackingSteps = signal(false);
  trackingError = signal<string | null>(null);
  tempGoals = signal({
    calorieGoal: 0,
    proteinGoal: 0,
    waterGoal: 0,
    stepGoal: 0,
    gender: '',
    activityLevel: '',
    goals: ''
  });
  private lastAcceleration = { x: 0, y: 0, z: 0 };
  private stepThreshold = 1.5; // Sensitivity threshold
  private lastStepTime = 0;
  private minStepInterval = 300; // ms

  ngOnDestroy() {
    if (isPlatformBrowser(this.platformId)) {
      this.stopStepTracking();
    }
  }

  toggleStepTracking() {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.isTrackingSteps()) {
      this.stopStepTracking();
    } else {
      this.startStepTracking();
    }
  }

  private async startStepTracking() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.trackingError.set(null);

    // Check if DeviceMotionEvent is available
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
      this.trackingError.set('Step tracking not supported on this device/browser.');
      return;
    }

    try {
      // iOS 13+ requires permission
      const deviceMotionEvent = (window as unknown as {
        DeviceMotionEvent?: {
          requestPermission?: () => Promise<'granted' | 'denied'>;
        }
      }).DeviceMotionEvent;

      if (deviceMotionEvent && typeof deviceMotionEvent.requestPermission === 'function') {
        const permission = await deviceMotionEvent.requestPermission();
        if (permission !== 'granted') {
          this.trackingError.set('Permission to access motion sensors was denied.');
          return;
        }
      }

      window.addEventListener('devicemotion', this.handleMotion);
      this.isTrackingSteps.set(true);
    } catch (error) {
      console.error('Error starting step tracking:', error);
      this.trackingError.set('Failed to start tracking. Ensure you are using HTTPS and a mobile device.');
    }
  }

  private stopStepTracking() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleMotion);
    }
    this.isTrackingSteps.set(false);
  }

  private handleMotion = (event: Event) => {
    const motionEvent = event as unknown as {
      accelerationIncludingGravity?: { x: number | null; y: number | null; z: number | null };
    };
    const acc = motionEvent.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    // Simple peak detection for step counting
    const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const delta = Math.abs(magnitude - 9.81); // Subtract gravity approx

    const now = Date.now();
    if (delta > this.stepThreshold && (now - this.lastStepTime) > this.minStepInterval) {
      this.logSteps(1);
      this.lastStepTime = now;
    }
  };

  openGoalEditor() {
    const profile = this.userProfile();
    this.tempGoals.set({
      calorieGoal: profile.calorieGoal,
      proteinGoal: profile.proteinGoal,
      waterGoal: profile.waterGoal,
      stepGoal: profile.stepGoal,
      gender: profile.gender,
      activityLevel: profile.activityLevel,
      goals: profile.goals
    });
    this.isEditingGoals.set(true);
  }

  saveGoals() {
    this.dataService.updateProfile({
      ...this.userProfile(),
      ...this.tempGoals()
    });
    this.isEditingGoals.set(false);
  }

  logWater(amount: number) {
    const current = this.dayData().stats.water;
    this.dataService.updateStats({ water: current + amount });
  }

  logSteps(amount: number) {
    const current = this.dayData().stats.steps;
    this.dataService.updateStats({ steps: current + amount });
  }

  stats = computed(() => {
    const data = this.dayData();
    const stats = data.stats;
    const profile = this.userProfile();
    
    const calculateProgress = (current: number, target: number) => {
      if (!target || target <= 0) return 0;
      return Math.min(100, (current / target) * 100);
    };

    return [
      { 
        label: 'Calories', 
        current: stats.calories || 0, 
        target: profile.calorieGoal || 2500, 
        unit: 'kcal',
        icon: 'local_fire_department', 
        color: 'text-orange-500',
        bg: 'bg-orange-50',
        progress: calculateProgress(stats.calories, profile.calorieGoal)
      },
      { 
        label: 'Protein', 
        current: stats.protein || 0, 
        target: profile.proteinGoal || 150, 
        unit: 'g',
        icon: 'egg', 
        color: 'text-blue-500',
        bg: 'bg-blue-50',
        progress: calculateProgress(stats.protein, profile.proteinGoal)
      },
      { 
        label: 'Water', 
        current: stats.water || 0, 
        target: profile.waterGoal || 3000, 
        unit: 'ml',
        icon: 'water_drop', 
        color: 'text-cyan-500',
        bg: 'bg-cyan-50',
        progress: calculateProgress(stats.water, profile.waterGoal)
      },
      { 
        label: 'Steps', 
        current: stats.steps || 0, 
        target: profile.stepGoal || 10000, 
        unit: '',
        icon: 'directions_walk', 
        color: 'text-emerald-500',
        bg: 'bg-emerald-50',
        progress: calculateProgress(stats.steps, profile.stepGoal)
      }
    ];
  });

  insights = [
    { title: 'Consistency is Key', description: 'You have completed 4 workouts this week. Keep it up!', icon: 'trending_up' },
    { title: 'Nutrition Tip', description: 'Try adding more protein to your breakfast for better recovery.', icon: 'lightbulb' }
  ];

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

  isToday() {
    return this.selectedDate() === new Date().toISOString().split('T')[0];
  }

  goToToday() {
    this.dataService.setDate(new Date().toISOString().split('T')[0]);
  }
}
