
-- Activity log for bids
CREATE TABLE public.bid_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  performed_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bid_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bid activity" ON public.bid_activity_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create bid activity" ON public.bid_activity_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete bid activity" ON public.bid_activity_log FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_bid_activity_log_bid_id ON public.bid_activity_log(bid_id);

-- Link bids to CRM client companies
CREATE TABLE public.bid_client_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  client_company_id UUID NOT NULL REFERENCES public.client_companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bid_id, client_company_id)
);

ALTER TABLE public.bid_client_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bid clients" ON public.bid_client_companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage bid clients" ON public.bid_client_companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete bid clients" ON public.bid_client_companies FOR DELETE TO authenticated USING (true);

-- Link bids to CRM projects
CREATE TABLE public.bid_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bid_id, project_id)
);

ALTER TABLE public.bid_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bid projects" ON public.bid_projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage bid projects" ON public.bid_projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can delete bid projects" ON public.bid_projects FOR DELETE TO authenticated USING (true);
