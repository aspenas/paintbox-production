/**
 * CompanyCam API Service
 * Handles photo management for painting projects
 */

import { apiClient } from './api-client';
import { mockApi } from './mock-api';

export interface CompanyCamProject {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  photos: CompanyCamPhoto[];
}

export interface CompanyCamPhoto {
  id: string;
  uri: string;
  created_at: string;
  tags: string[];
  annotations: PhotoAnnotation[];
}

export interface PhotoAnnotation {
  text: string;
  x: number;
  y: number;
}

class CompanyCamApiService {
  private useBackend: boolean = false;
  private useMockData: boolean = true;

  constructor() {
    this.checkBackendAvailability();
  }

  private async checkBackendAvailability() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      try {
        const result = await apiClient.healthCheck();
        this.useBackend = result.success;
        this.useMockData = !result.success;
        console.log(`CompanyCam API: Using ${this.useBackend ? 'backend' : 'mock data'}`);
      } catch (error) {
        console.warn('Backend not available, using mock data');
        this.useBackend = false;
        this.useMockData = true;
      }
    }
  }

  async getProjects(): Promise<CompanyCamProject[]> {
    if (this.useBackend) {
      const result = await apiClient.getCompanyCamProjects();
      if (result.success && result.data) {
        return (result.data as any).projects || [];
      }
    }

    if (this.useMockData) {
      return mockApi.getCompanyCamProjects();
    }

    return [];
  }

  async getProject(projectId: string): Promise<CompanyCamProject | null> {
    if (this.useMockData) {
      return mockApi.getCompanyCamProject(projectId);
    }

    // TODO: Implement backend call
    return null;
  }

  async createProject(data: {
    name: string;
    address: string;
    salesforceId?: string;
  }): Promise<CompanyCamProject> {
    // For now, return a mock project
    const newProject: CompanyCamProject = {
      id: `CC${Date.now()}`,
      name: data.name,
      address: data.address,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      photos: []
    };

    return newProject;
  }

  async uploadPhoto(projectId: string, file: File, tags?: string[]): Promise<CompanyCamPhoto> {
    if (this.useBackend) {
      const result = await apiClient.uploadCompanyCamPhoto(projectId, file);
      if (result.success && result.data) {
        return result.data as CompanyCamPhoto;
      }
    }

    // Mock photo upload
    const mockPhoto: CompanyCamPhoto = {
      id: `PH${Date.now()}`,
      uri: URL.createObjectURL(file),
      created_at: new Date().toISOString(),
      tags: tags || ['uploaded'],
      annotations: []
    };

    return mockPhoto;
  }

  async addAnnotation(photoId: string, annotation: PhotoAnnotation): Promise<void> {
    // TODO: Implement annotation persistence
    console.log('Adding annotation to photo', photoId, annotation);
  }

  async addTags(photoId: string, tags: string[]): Promise<void> {
    // TODO: Implement tag persistence
    console.log('Adding tags to photo', photoId, tags);
  }

  // Helper method to get photos by tag
  async getPhotosByTag(projectId: string, tag: string): Promise<CompanyCamPhoto[]> {
    const project = await this.getProject(projectId);
    if (!project) return [];

    return project.photos.filter(photo => photo.tags.includes(tag));
  }

  // Helper method to categorize photos
  categorizePhotos(photos: CompanyCamPhoto[]): {
    before: CompanyCamPhoto[];
    progress: CompanyCamPhoto[];
    after: CompanyCamPhoto[];
    other: CompanyCamPhoto[];
  } {
    const categorized = {
      before: [] as CompanyCamPhoto[],
      progress: [] as CompanyCamPhoto[],
      after: [] as CompanyCamPhoto[],
      other: [] as CompanyCamPhoto[]
    };

    photos.forEach(photo => {
      if (photo.tags.includes('before')) {
        categorized.before.push(photo);
      } else if (photo.tags.includes('progress') || photo.tags.includes('during')) {
        categorized.progress.push(photo);
      } else if (photo.tags.includes('after') || photo.tags.includes('completed')) {
        categorized.after.push(photo);
      } else {
        categorized.other.push(photo);
      }
    });

    return categorized;
  }
}

export const companyCamApi = new CompanyCamApiService();