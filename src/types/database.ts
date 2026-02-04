// Database types for AEC CRM

export type MarketSector = 'Public' | 'ISD' | 'Municipal' | 'HigherEd' | 'CharterSchool' | 'Private' | 'Other';
export type RelationshipStage = 'TargetIdentified' | 'InitialOutreach' | 'Introductions' | 'ActivePursuit' | 'AwardedWork' | 'Dormant' | 'Lost';
export type RelationshipStrength = 'Cold' | 'Neutral' | 'Warm';
export type ProjectStatus = 'Prospect' | 'ActivePursuit' | 'Awarded' | 'Lost';
export type PublicTrackingType = 'Bond' | 'Charter' | 'CoopContract' | 'RFQ' | 'RFP' | 'Other';
export type InteractionType = 'Call' | 'Email' | 'Meeting' | 'SiteVisit' | 'Conference' | 'Other';
export type AppRole = 'admin' | 'user';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface ClientCompany {
  id: string;
  name: string;
  market_sector: MarketSector;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientContact {
  id: string;
  client_company_id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  is_primary_contact: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  client_company_id: string;
  owner_user_id: string | null;
  stage: RelationshipStage;
  strength: RelationshipStrength;
  estimated_pursuit_value: number;
  last_interaction_date: string | null;
  is_potentially_cold: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  market_sector: MarketSector;
  public_tracking_type: PublicTrackingType;
  estimated_value: number;
  status: ProjectStatus;
  anticipated_rfq_date: string | null;
  anticipated_rfp_date: string | null;
  award_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectClientCompany {
  id: string;
  project_id: string;
  client_company_id: string;
  created_at: string;
}

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
}

export interface Interaction {
  id: string;
  interaction_date: string;
  interaction_type: InteractionType;
  notes: string | null;
  client_company_id: string;
  client_contact_id: string | null;
  project_id: string | null;
  logged_by_user_id: string;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface ClientCompanyWithRelationship extends ClientCompany {
  relationship?: Relationship;
  contacts?: ClientContact[];
}

export interface RelationshipWithDetails extends Relationship {
  client_company?: ClientCompany;
  owner?: Profile;
}

export interface ProjectWithDetails extends Project {
  client_companies?: ClientCompany[];
  team_members?: Profile[];
}

export interface InteractionWithDetails extends Interaction {
  client_company?: ClientCompany;
  client_contact?: ClientContact;
  project?: Project;
  logged_by?: Profile;
}

// Helper type for display labels
export const MARKET_SECTOR_LABELS: Record<MarketSector, string> = {
  Public: 'Public',
  ISD: 'ISD',
  Municipal: 'Municipal',
  HigherEd: 'Higher Ed',
  CharterSchool: 'Charter School',
  Private: 'Private',
  Other: 'Other',
};

export const RELATIONSHIP_STAGE_LABELS: Record<RelationshipStage, string> = {
  TargetIdentified: 'Target Identified',
  InitialOutreach: 'Initial Outreach',
  Introductions: 'Introductions',
  ActivePursuit: 'Active Pursuit',
  AwardedWork: 'Awarded Work',
  Dormant: 'Dormant',
  Lost: 'Lost',
};

export const RELATIONSHIP_STRENGTH_LABELS: Record<RelationshipStrength, string> = {
  Cold: 'Cold',
  Neutral: 'Neutral',
  Warm: 'Warm',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  Prospect: 'Prospect',
  ActivePursuit: 'Active Pursuit',
  Awarded: 'Awarded',
  Lost: 'Lost',
};

export const PUBLIC_TRACKING_LABELS: Record<PublicTrackingType, string> = {
  Bond: 'Bond',
  Charter: 'Charter',
  CoopContract: 'Coop Contract',
  RFQ: 'RFQ',
  RFP: 'RFP',
  Other: 'Other',
};

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  Call: 'Call',
  Email: 'Email',
  Meeting: 'Meeting',
  SiteVisit: 'Site Visit',
  Conference: 'Conference',
  Other: 'Other',
};
