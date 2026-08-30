/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

export type Status = 'done' | 'progress' | 'stuck' | 'review';

export interface AvatarUser {
  id: string;
  name: string;
  avatarUrl?: string;
  initials: string;
  bgColor?: string; // Tailwind background class for fallback initials
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'premium';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface SidebarItem {
  id: string;
  label: string;
  iconName: string; // From Lucide Icons
  active?: boolean;
  badge?: string | number;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}
