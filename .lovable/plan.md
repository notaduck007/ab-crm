
# AEC Relationship-Driven CRM - Implementation Plan

## Overview
A purpose-built CRM for Architecture, Engineering, and Construction firms focused on long-cycle public-sector pursuits and relationship accountability. Clean, minimal design optimized for desktop with basic mobile support.

---

## Phase 1: Foundation & Authentication

### User Authentication
- Email/password login with secure session management
- Role-based access (Admin, User) stored in dedicated user_roles table
- Protected routes requiring authentication

### Internal User Management
- Admin dashboard for managing users
- Assign roles (Admin, User)
- User profile display in navigation

---

## Phase 2: Core Entities & Database

### Client Companies
- Company profile with name, market sector, and notes
- Market sectors: Public, ISD, Municipal, Higher Ed, Charter School, Private, Other
- Searchable and filterable list view

### Client Contacts
- Contact details: name, title, email, phone
- Link to parent company
- Primary contact designation
- Quick access from company profile

### Relationships
- One relationship per client company
- Track: stage, strength, estimated pursuit value
- Relationship stages: Target Identified → Initial Outreach → Introductions → Active Pursuit → Awarded Work → Dormant → Lost
- Strength indicators: Cold, Neutral, Warm
- Auto-calculated "potentially cold" flag (no activity in 30 days)

### Projects
- Project details with public-sector tracking (Bond, Charter, Coop Contract, RFQ, RFP)
- Link multiple client companies (many-to-many)
- Assign internal team members
- Track anticipated dates: RFQ, RFP, Award
- Status progression: Prospect → Active Pursuit → Awarded → Lost

### Interactions
- Log calls, emails, meetings, site visits, conferences
- Link to company, contact, and/or project
- Track who logged and when
- Auto-update relationship's last interaction date

---

## Phase 3: Views & Navigation

### Sidebar Navigation
- Clean collapsible sidebar with sections:
  - Dashboard
  - Pipeline (Projects)
  - Clients (Companies)
  - Contacts
  - Interactions
  - Settings (Admin only)

### Dashboard
- **Pipeline Summary Cards**: Total active value, count by stage
- **Market Sector Breakdown**: Visual charts showing distribution
- **At-Risk Relationships**: Flagged cold/inactive relationships needing attention
- **Upcoming Milestones**: RFQ/RFP/Award dates in next 30/60/90 days
- **Recent Activity Feed**: Latest interactions across all relationships

### Pipeline View
- Kanban or table view of projects
- Group by: Market Sector, Status
- Filters: Owner, Stage, Market Sector, Value Range
- Search across project names and companies
- Sort by value, date, status

### Client Company View
- Company header with key details
- Relationship status card (stage, strength, owner, value)
- Contacts list with quick-add
- Interaction timeline
- Associated projects
- Quick actions: Log interaction, Edit relationship

### Project View
- Project summary and public-sector tracking details
- Associated client companies with relationship status
- Internal team member assignments
- Interaction history specific to project
- Key dates tracker (RFQ, RFP, Award)

---

## Phase 4: Business Logic & Automation

### Automatic Updates
- Last interaction date auto-updates on new interaction
- "Potentially Cold" flag triggers when 30+ days inactive
- Dashboard highlights high-value pursuits with no recent activity

### Permission Enforcement
- All authenticated users can view all records
- Relationship editing (stage, strength, value) restricted to:
  - The assigned relationship owner
  - Admin users
- Admin-only: User management, system configuration

---

## Phase 5: Admin & Configuration

### Admin Panel
- User management (add/edit/deactivate users)
- View all relationships and reassign owners
- System-wide activity overview

### Data Management
- Bulk import capability for initial data
- Export functionality for reporting

---

## Design Approach

### Visual Style
- Clean, minimal interface with generous white space
- Subtle color coding for stages and status
- Data-dense tables with excellent readability
- Card-based layouts for detail views
- Consistent iconography throughout

### Color System
- Neutral grays for base interface
- Accent colors for relationship strength (green = warm, yellow = neutral, red = cold)
- Stage progress indicators with subtle color progression

---

## Technical Foundation

### Backend (Lovable Cloud)
- Supabase-powered database with normalized schemas
- Row-level security for permission enforcement
- Database triggers for automation (last interaction updates, cold flags)
- Edge functions for complex business logic

### Frontend
- React with TypeScript
- Responsive tables with filtering and sorting
- Form validation for all data entry
- Toast notifications for actions
- Loading states and error handling

---

## Key Differentiators

This CRM is specifically designed for AEC business development with:
- Public-sector pursuit tracking (bonds, charters, coop contracts)
- Long-cycle relationship management
- Clear ownership and accountability
- Proactive cold-relationship alerts
- Market sector-focused pipeline views

The result is a focused tool that supports relationship-driven AEC business development rather than generic sales tracking.
