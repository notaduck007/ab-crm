-- Drop existing restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.client_companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.client_companies;
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.client_companies;
DROP POLICY IF EXISTS "Admins can delete companies" ON public.client_companies;

-- Recreate as permissive (default)
CREATE POLICY "Authenticated users can view companies" ON public.client_companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create companies" ON public.client_companies
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update companies" ON public.client_companies
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete companies" ON public.client_companies
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix client_contacts policies
DROP POLICY IF EXISTS "Authenticated users can create contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Authenticated users can update contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.client_contacts;

CREATE POLICY "Authenticated users can view contacts" ON public.client_contacts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create contacts" ON public.client_contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts" ON public.client_contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete contacts" ON public.client_contacts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix interactions policies
DROP POLICY IF EXISTS "Authenticated users can create interactions" ON public.interactions;
DROP POLICY IF EXISTS "Authenticated users can view interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can update own interactions" ON public.interactions;
DROP POLICY IF EXISTS "Users can delete own interactions or admins" ON public.interactions;

CREATE POLICY "Authenticated users can view interactions" ON public.interactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create interactions" ON public.interactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = logged_by_user_id);

CREATE POLICY "Users can update own interactions" ON public.interactions
  FOR UPDATE TO authenticated USING (auth.uid() = logged_by_user_id);

CREATE POLICY "Users can delete own interactions or admins" ON public.interactions
  FOR DELETE TO authenticated USING (auth.uid() = logged_by_user_id OR public.has_role(auth.uid(), 'admin'));

-- Fix projects policies
DROP POLICY IF EXISTS "Authenticated users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;

CREATE POLICY "Authenticated users can view projects" ON public.projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update projects" ON public.projects
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Admins can delete projects" ON public.projects
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix relationships policies  
DROP POLICY IF EXISTS "Authenticated users can view relationships" ON public.relationships;
DROP POLICY IF EXISTS "Owners and admins can update relationships" ON public.relationships;

CREATE POLICY "Authenticated users can view relationships" ON public.relationships
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners and admins can update relationships" ON public.relationships
  FOR UPDATE TO authenticated USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Fix profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Fix user_roles policies
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Fix project_client_companies policies
DROP POLICY IF EXISTS "Authenticated users can view project companies" ON public.project_client_companies;
DROP POLICY IF EXISTS "Authenticated users can manage project companies" ON public.project_client_companies;

CREATE POLICY "Authenticated users can view project companies" ON public.project_client_companies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage project companies" ON public.project_client_companies
  FOR ALL TO authenticated USING (true);

-- Fix project_team_members policies
DROP POLICY IF EXISTS "Authenticated users can view team members" ON public.project_team_members;
DROP POLICY IF EXISTS "Authenticated users can manage team members" ON public.project_team_members;

CREATE POLICY "Authenticated users can view team members" ON public.project_team_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage team members" ON public.project_team_members
  FOR ALL TO authenticated USING (true);