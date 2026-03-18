import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  totalClicks: number;
  linkClicks: number;
  directLinks: string[];
  likedTaskIds?: string[];
  lastLikes?: { [taskId: string]: Timestamp };
  followingUids?: string[];
  followerUids?: string[];
  receivedLikes?: number;
  lastActiveAt?: Timestamp;
  dailyBonusClaimedAt?: Timestamp;
  createdAt: Timestamp;
}

export interface Task {
  id: string;
  taskId: string;
  title: string;
  description: string;
  url: string;
  likes: number;
  ownerUid: string;
  publishedAt: Timestamp;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string;
    providerInfo: {
      providerId: string;
      displayName: string;
      email: string;
      photoUrl: string;
    }[];
  }
}
