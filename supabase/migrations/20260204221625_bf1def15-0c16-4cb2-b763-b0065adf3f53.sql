-- Create enums for all entity types
CREATE TYPE public.market_sector AS ENUM ('Public', 'ISD', 'Municipal', 'HigherEd', 'CharterSchool', 'Private', 'Other');
CREATE TYPE public.relationship_stage AS ENUM ('TargetIdentified', 'InitialOutreach', 'Introductions', 'ActivePursuit', 'AwardedWork', 'Dormant', 'Lost');
CREATE TYPE public.relationship_strength AS ENUM ('Cold', 'Neutral', 'Warm');
CREATE TYPE public.project_status AS ENUM ('Prospect', 'ActivePursuit', 'Awarded', 'Lost');
CREATE TYPE public.public_tracking_type AS ENUM ('Bond', 'Charter', 'CoopContract', 'RFQ', 'RFP', 'Other');
CREATE TYPE public.interaction_type AS ENUM ('Call', 'Email', 'Meeting', 'SiteVisit', 'Conference', 'Other');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create client_companies table
CREATE TABLE public.client_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  market_sector market_sector NOT NULL DEFAULT 'Other',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create client_contacts table
CREATE TABLE public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID REFERENCES public.client_companies(id) ON DELETE CASCADE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary_contact BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create relationships table (one per client company)
CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_company_id UUID REFERENCES public.client_companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stage relationship_stage NOT NULL DEFAULT 'TargetIdentified',
  strength relationship_strength NOT NULL DEFAULT 'Neutral',
  estimated_pursuit_value DECIMAL(15, 2) DEFAULT 0,
  last_interaction_date TIMESTAMPTZ,
  is_potentially_cold BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  market_sector market_sector NOT NULL DEFAULT 'Other',
  public_tracking_type public_tracking_type NOT NULL DEFAULT 'Other',
  estimated_value DECIMAL(15, 2) DEFAULT 0,
  status project_status NOT NULL DEFAULT 'Prospect',
  anticipated_rfq_date DATE,
  anticipated_rfp_date DATE,
  award_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create project_client_companies junction table (many-to-many)
CREATE TABLE public.project_client_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  client_company_id UUID REFERENCES public.client_companies(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, client_company_id)
);

-- Create project_team_members junction table (many-to-many)
CREATE TABLE public.project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- Create interactions table
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  interaction_type interaction_type NOT NULL DEFAULT 'Other',
  notes TEXT,
  client_company_id UUID REFERENCES public.client_companies(id) ON DELETE CASCADE NOT NULL,
  client_contact_id UUID REFERENCES public.client_contacts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  logged_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_client_contacts_company ON public.client_contacts(client_company_id);
CREATE INDEX idx_relationships_company ON public.relationships(client_company_id);
CREATE INDEX idx_relationships_owner ON public.relationships(owner_user_id);
CREATE INDEX idx_interactions_company ON public.interactions(client_company_id);
CREATE INDEX idx_interactions_project ON public.interactions(project_id);
CREATE INDEX idx_interactions_logged_by ON public.interactions(logged_by_user_id);
CREATE INDEX idx_project_client_companies_project ON public.project_client_companies(project_id);
CREATE INDEX idx_project_client_companies_company ON public.project_client_companies(client_company_id);
CREATE INDEX idx_project_team_members_project ON public.project_team_members(project_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_client_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Security definer function to check if user is relationship owner or admin
CREATE OR REPLACE FUNCTION public.can_edit_relationship(_user_id UUID, _relationship_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.relationships r
    WHERE r.id = _relationship_id
      AND (r.owner_user_id = _user_id OR public.has_role(_user_id, 'admin'))
  )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to auto-update relationship's last_interaction_date
CREATE OR REPLACE FUNCTION public.update_relationship_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.relationships
  SET last_interaction_date = NEW.interaction_date
  WHERE client_company_id = NEW.client_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to calculate is_potentially_cold flag (no interaction in 30 days)
CREATE OR REPLACE FUNCTION public.update_potentially_cold_flag()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.relationships
  SET is_potentially_cold = (
    last_interaction_date IS NULL OR 
    last_interaction_date < (now() - INTERVAL '30 days')
  )
  WHERE id = NEW.id OR client_company_id = NEW.client_company_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to create profile and assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to auto-create relationship when client company is created
CREATE OR REPLACE FUNCTION public.create_default_relationship()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.relationships (client_company_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_companies_updated_at
  BEFORE UPDATE ON public.client_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_contacts_updated_at
  BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at
  BEFORE UPDATE ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update last_interaction_date on new interaction
CREATE TRIGGER on_interaction_created
  AFTER INSERT ON public.interactions
  FOR EACH ROW EXECUTE FUNCTION public.update_relationship_last_interaction();

-- Trigger to auto-create relationship when client company is created
CREATE TRIGGER on_client_company_created
  AFTER INSERT ON public.client_companies
  FOR EACH ROW EXECUTE FUNCTION public.create_default_relationship();

-- Trigger to update potentially cold flag on relationship updates
CREATE TRIGGER on_relationship_updated_check_cold
  AFTER UPDATE OF last_interaction_date ON public.relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_potentially_cold_flag();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for client_companies (all authenticated users can view and create)
CREATE POLICY "Authenticated users can view companies" ON public.client_companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create companies" ON public.client_companies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies" ON public.client_companies
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete companies" ON public.client_companies
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for client_contacts
CREATE POLICY "Authenticated users can view contacts" ON public.client_contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create contacts" ON public.client_contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts" ON public.client_contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete contacts" ON public.client_contacts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for relationships (owners and admins can edit)
CREATE POLICY "Authenticated users can view relationships" ON public.relationships
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners and admins can update relationships" ON public.relationships
  FOR UPDATE TO authenticated USING (
    owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- RLS Policies for projects
CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for project_client_companies
CREATE POLICY "Authenticated users can view project companies" ON public.project_client_companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage project companies" ON public.project_client_companies
  FOR ALL TO authenticated USING (true);

-- RLS Policies for project_team_members
CREATE POLICY "Authenticated users can view team members" ON public.project_team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage team members" ON public.project_team_members
  FOR ALL TO authenticated USING (true);

-- RLS Policies for interactions
CREATE POLICY "Authenticated users can view interactions" ON public.interactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create interactions" ON public.interactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = logged_by_user_id);

CREATE POLICY "Users can update own interactions" ON public.interactions
  FOR UPDATE TO authenticated USING (auth.uid() = logged_by_user_id);

CREATE POLICY "Users can delete own interactions or admins" ON public.interactions
  FOR DELETE TO authenticated USING (
    auth.uid() = logged_by_user_id OR public.has_role(auth.uid(), 'admin')
  );