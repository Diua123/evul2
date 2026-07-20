
export type UserRole = 'student' | 'chefe' | 'docente';

export interface User {
  id: string;
  name: string;
  email?: string;
  Number?: string; // Opcional para Docentes/Chefes
  password?: string; // Opcional se usarem apenas código
  photo: string;
  anoFrequencia: number; // 0 para Docentes
  role: UserRole;
  isOnline?: boolean;
  lastSeen?: number; // Timestamp em milissegundos
}

export interface Message {
  id?: string;
  authorId: string;
  text: string;
  time: number;
  to: string;
  media?: string;
  mediaType?: string;
  fileName?: string;
  replyToId?: string;
}

export interface Publication {
  id: number;
  title: string;
  category: string;
  content: string;
  date: string;
  authorName?: string;
  authorRole?: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  text: string;
  timestamp: string;
}

export interface UserPost {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  caption: string;
  media: string;
  mediaType: string;
  isImage: boolean;
  timestamp: string;
  likes: number;
  likedBy: string[];
  comments: Comment[];
}

export interface Artwork {
  userId: string;
  userName: string;
  userPhoto: string;
  description: string;
  media: string;
  mediaType: string;
  isImage: boolean;
  likes: number;
  likedBy: string[];
  comments: string[];
  timestamp: string;
}

export interface LibraryItem {
  id: string;
  userId?: string; // ID do usuário que fez o upload
  title: string;
  author: string;
  category: 'trabalhos' | 'mono' | 'planos' | 'horarios' | 'materiais';
  date: string;
  description: string;
  downloadUrl: string;
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark'
}

export enum Language {
  PT = 'pt'
}

export interface HomeSlide {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
}

export interface SystemConfig {
  logoUrl: string;
  slides: HomeSlide[];
}

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  targetUserId: string; // 'all' or specific user ID
  createdAt: string;
  readBy?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  text: string;
  imageUrl?: string;
  createdAt: string;
}
