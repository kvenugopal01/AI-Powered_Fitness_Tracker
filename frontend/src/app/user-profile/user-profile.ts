import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService, UserProfileData } from '../data';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css'
})
export class UserProfile {
  private dataService = inject(DataService);
  
  profile = this.dataService.userProfile;
  editForm: UserProfileData = { ...this.profile() };
  isEditing = signal(false);

  startEdit() {
    this.editForm = { ...this.profile() };
    this.isEditing.set(true);
  }

  saveProfile() {
    this.dataService.updateProfile(this.editForm);
    this.isEditing.set(false);
  }

  cancelEdit() {
    this.isEditing.set(false);
  }
}
