// stores/profile.ts
import { defineStore } from "pinia";

export interface ProfileUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  region?: string | null;
  area?: string | null;
  avatarUrl?: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const useProfileStore = defineStore("profile", {
  state: () => ({
    profile: null as ProfileUser | null,
    loaded: false,
  }),

  actions: {
    setProfile(data: ProfileUser | null) {
      this.profile = data ? { ...data } : null;
      this.loaded = !!data;
    },

    applyProfileUpdate(payload: Partial<ProfileUser>) {
      if (!this.profile) return;
      this.profile = { ...this.profile, ...payload };
    },

    clear() {
      this.profile = null;
      this.loaded = false;
    },
  },
});
