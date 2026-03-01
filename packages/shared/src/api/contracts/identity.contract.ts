/**
 * API contracts for the Identity bounded context
 * Handles user authentication, profiles, teams, and preferences
 */

import {
  SignupSource,
  UserRole,
  UserStatus,
  TeamRole,
  HighlightStyle,
} from './types';

/**
 * User preferences for the platform
 */
export interface UserPreferences {
  /** Style for highlighting terms in documents */
  highlightStyle: HighlightStyle;
  /** Whether to automatically enrich detected terms */
  autoEnrich: boolean;
  /** Whether to enable analytics tracking */
  enableAnalytics: boolean;
  /** Array of domains where glossary is disabled */
  disabledDomains: string[];
}

/**
 * Request to sign up a new user
 */
export interface SignUp_Request {
  /** Email address of the new user */
  email: string;
  /** Full name of the user */
  name: string;
  /** Source where the user signed up from */
  signupSource: SignupSource;
}

/**
 * Request to retrieve user profile information
 */
export interface GetUserProfile_Request {
  /** ID of the user */
  userId: string;
}

/**
 * Request to update user preferences
 */
export interface UpdateUserPreferences_Request {
  /** ID of the user */
  userId: string;
  /** Updated preferences object */
  preferences: UserPreferences;
}

/**
 * Request to create a new team
 */
export interface CreateTeam_Request {
  /** Name of the team */
  name: string;
  /** Optional description of the team */
  description?: string;
}

/**
 * Request to add a member to a team
 */
export interface AddTeamMember_Request {
  /** Team ID to add the member to */
  teamId: string;
  /** Email of the user to add */
  email: string;
  /** Role to assign to the team member */
  role: TeamRole;
}

/**
 * Request to remove a member from a team
 */
export interface RemoveTeamMember_Request {
  /** Team ID to remove the member from */
  teamId: string;
  /** ID of the user to remove */
  userId: string;
}

/**
 * Response containing user profile information
 */
export interface UserProfile_Response {
  /** Unique identifier of the user */
  id: string;
  /** Email address of the user */
  email: string;
  /** Full name of the user */
  name: string;
  /** Role of the user in the system */
  role: UserRole;
  /** ISO timestamp when the user signed up */
  signupDate: string;
  /** Current status of the user account */
  status: UserStatus;
  /** User's preferences */
  preferences: UserPreferences;
  /** Array of team IDs the user is a member of */
  teamIds: string[];
  /** Array of active glossary IDs owned by the user */
  activeGlossaryIds: string[];
}

/**
 * Response containing information about a single team member
 */
export interface TeamMember_Response {
  /** ID of the team member */
  userId: string;
  /** Email of the team member */
  email: string;
  /** Name of the team member */
  name: string;
  /** Role of the member in the team */
  role: TeamRole;
  /** ISO timestamp when the member joined the team */
  joinedAt: string;
}

/**
 * Response containing team information
 */
export interface Team_Response {
  /** Unique identifier of the team */
  id: string;
  /** Name of the team */
  name: string;
  /** ID of the team owner */
  ownerId: string;
  /** ISO timestamp when the team was created */
  createdAt: string;
  /** Number of members in the team */
  memberCount: number;
  /** Array of team members */
  members: TeamMember_Response[];
}

/**
 * Response after user signup
 */
export interface SignUp_Response {
  /** User profile information */
  user: UserProfile_Response;
  /** JWT access token for authentication */
  accessToken: string;
  /** JWT refresh token for getting new access tokens */
  refreshToken: string;
  /** Access token expiration time in seconds */
  expiresIn: number;
}
