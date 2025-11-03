import {
  Project,
  Blog,
  Contact,
  Skill,
  User,
  Session,
  Newsletter,
  Account,
  Verification,
  Role,
} from '@prisma/client';

// Project types
export type ProjectListItem = Omit<Project, 'deletedAt'>;

export interface ProjectUpdateData {
  title?: string;
  description?: string;
  tags?: string[];
  stack?: string[];
  imageUrl?: string;
  githubUrl?: string;
  liveUrl?: string;
  featured?: boolean;
  order?: number;
}

export interface ProjectCreateData {
  title: string;
  description: string;
  tags?: string[];
  stack?: string[];
  imageUrl?: string;
  githubUrl?: string;
  liveUrl?: string;
  featured?: boolean;
  order?: number;
}

// Blog types
export type BlogListItem = Omit<Blog, 'content' | 'deletedAt'>;

export interface BlogUpdateData {
  title?: string;
  content?: string;
  excerpt?: string;
  tags?: string[];
  imageUrl?: string;
  published?: boolean;
  slug?: string;
  readTime?: number | null;
  publishedAt?: Date | null;
}

export interface BlogCreateData {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  imageUrl?: string;
  published?: boolean;
  readTime?: number;
  publishedAt?: Date;
}

// Contact types
export type ContactMessage = Contact;

export interface ContactSubmission {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export interface ContactFilters {
  read?: boolean;
  replied?: boolean;
}

export interface ContactUpdateData {
  read?: boolean;
  replied?: boolean;
  repliedAt?: Date;
  notes?: string;
}

// Skill types
export type SkillItem = Skill;

export interface SkillUpdateData {
  category?: string;
  name?: string;
  iconUrl?: string;
  level?: number;
  order?: number;
}

export interface SkillCreateData {
  category: string;
  name: string;
  iconUrl?: string;
  level?: number;
  order?: number;
}

export interface SkillsGrouped {
  [category: string]: SkillItem[];
}

// User types
export type UserProfile = Omit<User, 'password'>;

export interface UserCreateData {
  email: string;
  password: string;
  name?: string;
  role?: Role;
}

export interface UserUpdateData {
  email?: string;
  password?: string;
  name?: string;
  role?: Role;
  emailVerified?: boolean;
  lastLoginAt?: Date;
  isActive?: boolean;
  image?: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: Date;
}

export interface UserLoginData {
  email: string;
  password: string;
}

// Session types
export type SessionData = Session;

export interface SessionCreateData {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  impersonatedBy?: string;
}

// Newsletter types
export type NewsletterSubscriber = Newsletter;

export interface NewsletterSubscribeData {
  email: string;
}

export interface NewsletterUpdateData {
  subscribed?: boolean;
  verified?: boolean;
  verifiedAt?: Date;
  unsubscribedAt?: Date;
}

// Account types (for OAuth/social login)
export type AccountData = Account;

export interface AccountCreateData {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?: string;
  password?: string;
}

// Verification types
export type VerificationData = Verification;

export interface VerificationCreateData {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Date;
}

// Cache response types
export interface CachedProjectResponse {
  success: boolean;
  data: Project;
}

export interface CachedProjectsListResponse {
  success: boolean;
  data: ProjectListItem[];
  pagination: PaginationInfo;
}

export interface CachedBlogResponse {
  success: boolean;
  data: Blog;
}

export interface CachedBlogsListResponse {
  success: boolean;
  data: BlogListItem[];
  pagination: PaginationInfo;
}

export interface CachedSkillsResponse {
  success: boolean;
  data: SkillItem[] | SkillsGrouped;
}

export interface CachedContactResponse {
  success: boolean;
  data: ContactMessage;
}

export interface CachedContactsListResponse {
  success: boolean;
  data: ContactMessage[];
  pagination: PaginationInfo;
}

// Pagination
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Analytics
export interface ViewTrackingData {
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  city?: string;
}

export interface ViewEventCreateData {
  projectId?: string;
  blogId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  country?: string;
  city?: string;
}

export interface ViewAnalytics {
  totalViews: number;
  uniqueViews: number;
  viewsByDate: { date: string; count: number }[];
  topCountries?: { country: string; count: number }[];
  topCities?: { city: string; count: number }[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  statusCode?: number;
}

// Filter and Sort types
export interface BlogFilters {
  published?: boolean;
  tags?: string[];
  search?: string;
}

export interface ProjectFilters {
  featured?: boolean;
  tags?: string[];
  stack?: string[];
  search?: string;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}
