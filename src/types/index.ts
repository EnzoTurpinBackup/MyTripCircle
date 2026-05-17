export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  createdAt: Date;
  verified?: boolean;
  isPublicProfile?: boolean;
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  destination: string;
  coverImage?: string;
  tags?: string[];
  ownerId: string;
  collaborators: Collaborator[];
  isPublic: boolean;
  visibility: "private" | "friends" | "public";
  status: "draft" | "validated";
  stats: TripStats;
  location: GeoLocation;
  createdAt: Date;
  updatedAt: Date;
}

export interface Collaborator {
  userId: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: Date;
  permissions: {
    canEdit: boolean;
    canInvite: boolean;
    canDelete: boolean;
  };
  invitedBy?: string; // ID de l'utilisateur qui a invité ce collaborateur
}

export interface TripStats {
  totalBookings: number;
  totalAddresses: number;
  totalCollaborators: number;
}

export interface GeoLocation {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Booking {
  id: string;
  _id?: string;
  tripId: string;
  type: "flight" | "train" | "hotel" | "restaurant" | "activity";
  tripDirection?: "outbound" | "return" | "roundtrip";
  origin?: string;
  destination?: string;
  title: string;
  description?: string;
  date: Date;
  endDate?: Date; // Date de fin (hôtels et vols/trains aller-retour)
  time?: string;
  returnTime?: string;
  address?: string;
  confirmationNumber?: string;
  price?: number;
  currency?: string;
  status: "confirmed" | "pending" | "cancelled";
  attachments?: string[];
  userId?: string; // Lien avec l'utilisateur créateur
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  id: string;
  type: "hotel" | "restaurant" | "activity" | "transport" | "other";
  name: string;
  address: string;
  city: string;
  country: string;
  phone?: string;
  website?: string;
  notes?: string;
  rating?: number; // Note Google Maps (0–5)
  photoUrl?: string; // Photo du lieu via Google Places
  tripId?: string; // Lien optionnel avec un voyage
  userId?: string; // Lien avec l'utilisateur créateur
  createdAt: Date;
  updatedAt: Date;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Date;
  respondedAt?: Date;
  commonFriends?: number;
}

export interface FriendSuggestion {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  commonFriends: number;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt: Date;
}

export interface TripInvitation {
  id: string;
  tripId: string;
  inviterId: string;
  inviteeEmail?: string;
  inviteePhone?: string;
  status: "pending" | "accepted" | "declined" | "expired";
  token: string;
  expiresAt: Date;
  createdAt: Date;
  read?: boolean;
  trip?: {
    _id: string;
    title: string;
    destination: string;
    startDate: Date;
    endDate: Date;
  };
  inviter?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface TripCollaborator {
  id: string;
  tripId: string;
  userId: string;
  role: "owner" | "editor" | "viewer";
  joinedAt: Date;
}

export interface SubscriptionFeatures {
  maxTrips: number;
  maxCollaborators: number;
  canExport: boolean;
  prioritySupport: boolean;
  maxAttachments: number;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: "free" | "premium";
  status: "active" | "cancelled" | "expired";
  features: SubscriptionFeatures;
  startDate: Date;
  endDate?: Date;
  cancelledAt?: Date;
  nextBillingDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type RootStackParamList = {
  Welcome: undefined;
  Auth: { initialMode?: "login" | "register" } | undefined;
  Main: undefined;
  Otp: { userId: string; email?: string };
  TripDetails: { tripId: string; showValidateButton?: boolean; showToast?: boolean };
  BookingDetails: { bookingId: string; readOnly?: boolean };
  AddressDetails: { addressId: string };
  AddressForm: { addressId?: string; tripId?: string } | undefined;
  FullMap: undefined;
  InviteFriends: { tripId: string };
  Invitation: { token?: string };
  Friends: undefined;
  CreateTrip: undefined;
  EditTrip: { tripId: string };
  TripActions: {
    tripId: string;
    tripTitle: string;
    destination: string;
    startDate: string;
    endDate: string;
    coverImage?: string;
    totalBookings: number;
    totalAddresses: number;
    isOwner: boolean;
  };
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  ConsentManagement: undefined;
  CalendarExport: undefined;
  ChangePassword: undefined;
  ForgotPassword: { token?: string };
  HelpSupport: undefined;
  Subscription: undefined;
  Terms: undefined;
  Privacy: undefined;
  LegalNotice: undefined;
  Consent: undefined;
  Notifications: undefined;
  FriendProfile: { friendId: string; friendName: string };
  TripPublicView: { tripId: string; invitationToken?: string };
  TripMembers: { tripId: string };
  AddFriend: undefined;
  FriendRequestConfirmation: { recipientName: string; recipientEmail?: string; autoAccepted?: boolean };
  FriendInvitation: { token: string };
  IdeaDetail: { ideaId: string };
  NotFound: undefined;
  Error: { message?: string; canGoBack?: boolean } | undefined;
};

export type MainTabParamList = {
  Trips: undefined;
  Bookings: undefined;
  Addresses: undefined;
  Ideas: undefined;
  Profile: undefined;
};

// Navigation prop types
export type RootStackScreenProps<T extends keyof RootStackParamList> = {
  navigation: any;
  route: { params: RootStackParamList[T] };
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = {
  navigation: any;
  route: { params: MainTabParamList[T] };
};
