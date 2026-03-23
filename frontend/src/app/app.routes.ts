import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { AiCoach } from './aicoach/aicoach';
import { WorkoutPlanner } from './workout-planner/workout-planner';
import { NutritionTracker } from './nutrition-tracker/nutrition-tracker';
import { PostureChecker } from './posture-checker/posture-checker';
import { UserProfile } from './user-profile/user-profile';
import { Login } from './login/login';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'login', component: Login },
  { 
    path: '', 
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'aicoach', component: AiCoach },
      { path: 'workout-planner', component: WorkoutPlanner },
      { path: 'nutrition-tracker', component: NutritionTracker },
      { path: 'posture-checker', component: PostureChecker },
      { path: 'user-profile', component: UserProfile },
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
