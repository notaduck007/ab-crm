-- Add INSERT policy for relationships table
CREATE POLICY "Authenticated users can create relationships"
ON public.relationships
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add DELETE policy for relationships (admin only)
CREATE POLICY "Admins can delete relationships"
ON public.relationships
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));