
-- Create enums for bids
CREATE TYPE public.bid_sector AS ENUM ('ISD', 'Higher Education', 'City', 'County', 'Charter School', 'Private Education', 'Other');
CREATE TYPE public.delivery_method AS ENUM ('GC', 'CMAR', 'Design-Build', 'RFQ/Pre-qual', 'Architect-Engineer Lead', 'Other');
CREATE TYPE public.bid_tier AS ENUM ('A', 'B', 'AE');
CREATE TYPE public.bid_status AS ENUM ('New', 'Reviewing', 'Pursuing', 'Submitted', 'Awarded', 'No-Go');

-- Create bids table
CREATE TABLE public.bids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_number TEXT NOT NULL UNIQUE,
  agency TEXT NOT NULL,
  project_name TEXT NOT NULL,
  sector bid_sector NOT NULL DEFAULT 'Other',
  delivery_method delivery_method NOT NULL DEFAULT 'Other',
  estimated_value NUMERIC NULL,
  issue_date DATE NULL,
  due_date DATE NOT NULL,
  tier bid_tier NOT NULL,
  status bid_status NOT NULL DEFAULT 'New',
  contact_name TEXT NULL,
  contact_email TEXT NULL,
  source_portal TEXT NULL,
  bid_url TEXT NULL,
  notes TEXT NULL,
  assigned_to UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view bids"
ON public.bids FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create bids"
ON public.bids FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update bids"
ON public.bids FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Admins can delete bids"
ON public.bids FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_bids_updated_at
BEFORE UPDATE ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
