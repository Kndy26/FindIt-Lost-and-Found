export type UserRole = 'student' | 'admin';
export type ReportType = 'found' | 'lost';
export type ItemStatus = 'pending_review' | 'verified' | 'claimed' | 'rejected';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface User {
  id: number;
  nim: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface PublicItem {
  id: number;
  reporterId: number;
  reporterName: string;
  reportType: ReportType;
  title: string;
  category: string;
  location: string;
  eventTime: string;
  description: string;
  imageUrl: string | null;
  status: ItemStatus;
  createdAt: string;
}

export interface MyItem {
  id: number;
  reporterId: number;
  reportType: ReportType;
  title: string;
  category: string;
  location: string;
  eventTime: string;
  description: string;
  imageUrl: string | null;
  secretNote: string;
  status: ItemStatus;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MyClaim {
  id: number;
  itemId: number;
  claimantNim: string;
  secretAnswer: string;
  ktmImageUrl: string | null;
  contactInfo: string;
  status: ClaimStatus;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  itemTitle: string;
  itemImageUrl: string | null;
  itemLocation: string;
  itemReportType: ReportType;
}

export interface AdminPendingItem {
  id: number;
  reporterId: number;
  reporterName: string;
  reporterNim: string;
  reporterEmail: string;
  reportType: ReportType;
  title: string;
  category: string;
  location: string;
  eventTime: string;
  description: string;
  imageUrl: string | null;
  secretNote: string;
  status: ItemStatus;
  adminNote: string | null;
  createdAt: string;
}

export interface AdminPendingClaim {
  id: number;
  itemId: number;
  claimantId: number;
  claimantName: string;
  claimantEmail: string;
  claimantAccountNim: string;
  claimantNim: string;
  secretAnswer: string;
  ktmImageUrl: string | null;
  contactInfo: string;
  status: ClaimStatus;
  adminNote: string | null;
  createdAt: string;
  itemTitle: string;
  itemType: ReportType;
  itemCategory: string;
  itemLocation: string;
  itemEventTime: string;
  itemDescription: string;
  itemImageUrl: string | null;
  itemSecretNote: string;
}

export interface AdminReviewedItem {
  id: number;
  title: string;
  reportType: ReportType;
  location: string;
  status: ItemStatus;
  adminNote: string | null;
  updatedAt: string;
  reporterName: string;
}

export interface AdminReviewedClaim {
  id: number;
  itemTitle: string;
  claimantName: string;
  claimantNim: string;
  status: ClaimStatus;
  adminNote: string | null;
  reviewedAt: string | null;
}

export interface AdminQueueResponse {
  pendingItems: AdminPendingItem[];
  pendingClaims: AdminPendingClaim[];
  reviewedItems: AdminReviewedItem[];
  reviewedClaims: AdminReviewedClaim[];
}
