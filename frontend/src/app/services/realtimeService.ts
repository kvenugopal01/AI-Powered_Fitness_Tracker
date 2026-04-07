import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { io, Socket } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private platformId = inject(PLATFORM_ID);
  private socket: Socket | null = null;
  onlineUsers = signal(1);
  liveFeed = signal<{id: string, message: string, timestamp: Date}[]>([]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // In production, the socket connects to the same host
      this.socket = io();

      this.socket.on('presence', (data: { count: number }) => {
        this.onlineUsers.set(data.count);
      });

      this.socket.on('workout:update', (data: { type: string, count?: number, exercise?: string }) => {
        let message = '';
        if (data.type === 'ai_workout_generated') {
          message = `Operator synthesized a new ${data.count}-exercise routine.`;
        } else if (data.type === 'guide_generated') {
          message = `Operator analyzed biomechanics for: ${data.exercise}.`;
        } else if (data.type === 'exercise_added') {
          message = `New exercise committed to routine: ${data.exercise}.`;
        } else if (data.type === 'exercise_completed') {
          message = `Exercise objective achieved: ${data.exercise}.`;
        }

        if (message) {
          this.liveFeed.update(feed => [
            { id: Math.random().toString(36).substr(2, 9), message, timestamp: new Date() },
            ...feed.slice(0, 4)
          ]);
        }
      });
    }
  }

  emitUpdate(data: { type: string, count?: number, exercise?: string }) {
    if (this.socket) {
      this.socket.emit('workout:update', data);
    }
  }

  onUpdate(callback: (data: { type: string, count?: number, exercise?: string }) => void) {
    if (this.socket) {
      this.socket.on('workout:update', callback);
    }
  }
}
