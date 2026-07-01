import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, ExternalLink, Link2, Search } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { formatBidValue } from '@/lib/formatValue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Bid = Tables<'bids'>;

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: 'A' },
  B: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', label: 'B' },
  AE: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: 'Arch/Eng Lead' },
};

const formatValue = (v: number | null) => formatBidValue(v, 'full');

function dueDateColor(dateStr: string | null) {
  if (!dateStr) return 'text-muted-foreground';
  const d = differenceInDays(new Date(dateStr), new Date());
  if (d <= 7) return 'text-red-600 dark:text-red-400';
  if (d <= 14) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

interface Props {
  bidId: string;
  onClose: () => void;
  profiles: { user_id: string; name: string }[];
}

export default function BidDetailPanel({ bidId, onClose, profiles }: Props) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [linkType, setLinkType] = useState<'client' | 'project' | null>(null);
  const [linkSearch, setLinkSearch] = useState('');

  // Fetch bid
  const { data: bid } = useQuery({
    queryKey: ['bid', bidId],
    queryFn: async () => {
      const { data, error } = await supabase.from('bids').select('*').eq('id', bidId).single();
      if (error) throw error;
      return data as Bid;
    },
  });

  // Fetch activity log
  const { data: activity = [] } = useQuery({
    queryKey: ['bid-activity', bidId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bid_activity_log')
        .select('*')
        .eq('bid_id', bidId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch linked clients
  const { data: linkedClients = [] } = useQuery({
    queryKey: ['bid-clients', bidId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bid_client_companies')
        .select('id, client_company_id, client_companies(name)')
        .eq('bid_id', bidId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch linked projects
  const { data: linkedProjects = [] } = useQuery({
    queryKey: ['bid-projects', bidId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bid_projects')
        .select('id, project_id, projects(name)')
        .eq('bid_id', bidId);
      if (error) throw error;
      return data;
    },
  });

  // Search data for linking
  const { data: searchClients = [] } = useQuery({
    queryKey: ['client-search', linkSearch],
    enabled: linkType === 'client' && linkSearch.length > 1,
    queryFn: async () => {
      const { data } = await supabase
        .from('client_companies')
        .select('id, name')
        .ilike('name', `%${linkSearch}%`)
        .limit(10);
      return data ?? [];
    },
  });

  const { data: searchProjects = [] } = useQuery({
    queryKey: ['project-search', linkSearch],
    enabled: linkType === 'project' && linkSearch.length > 1,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .ilike('name', `%${linkSearch}%`)
        .limit(10);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (bid) setNotes(bid.notes ?? '');
  }, [bid]);

  // Save notes on blur — DB trigger logs the activity
  const saveNotes = useMutation({
    mutationFn: async (newNotes: string) => {
      const { error } = await supabase.from('bids').update({ notes: newNotes }).eq('id', bidId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['bid-activity', bidId] });
    },
  });

  // Update assigned_to — DB trigger logs the activity
  const updateAssigned = useMutation({
    mutationFn: async (userId: string | null) => {
      const { error } = await supabase
        .from('bids')
        .update({ assigned_to: userId })
        .eq('id', bidId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['bid-activity', bidId] });
      toast.success('Assignment updated');
    },
  });

  // Link to CRM
  const linkClient = useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase.from('bid_client_companies').insert({ bid_id: bidId, client_company_id: clientId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-clients', bidId] });
      setLinkType(null);
      setLinkSearch('');
      toast.success('Client linked');
    },
  });

  const linkProject = useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from('bid_projects').insert({ bid_id: bidId, project_id: projectId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bid-projects', bidId] });
      setLinkType(null);
      setLinkSearch('');
      toast.success('Project linked');
    },
  });

  if (!bid) return null;

  const tier = TIER_STYLES[bid.tier] ?? TIER_STYLES.B;
  const profileName = (userId: string | null) => {
    if (!userId) return 'System';
    const p = profiles.find((pr) => pr.user_id === userId);
    return p?.name ?? 'Unknown';
  };

  return (
    <>
      <div className="w-[400px] shrink-0 border-l bg-background flex flex-col h-[calc(100vh-220px)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold ${tier.bg} ${tier.text}`}>
              {tier.label}
            </span>
            <Badge variant="outline" className="text-[10px]">{bid.status}</Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-5 p-4">
            {/* Core info */}
            <div>
              <h2 className="text-base font-bold text-foreground leading-tight">{bid.project_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{bid.agency}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{bid.bid_number}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Sector</p>
                <p className="font-medium text-foreground">{bid.sector}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Delivery</p>
                <p className="font-medium text-foreground">{bid.delivery_method}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Value</p>
                <p className="font-medium text-foreground">{formatValue(bid.estimated_value)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tier</p>
                <p className="font-medium text-foreground">{bid.tier}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className={`font-medium ${dueDateColor(bid.due_date)}`}>
                  {bid.due_date ? format(new Date(bid.due_date), 'MMM d, yyyy') : 'TBD'}
                </p>
              </div>
              {bid.issue_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Issue Date</p>
                  <p className="font-medium text-foreground">{format(new Date(bid.issue_date), 'MMM d, yyyy')}</p>
                </div>
              )}
              {bid.contact_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact</p>
                  <p className="font-medium text-foreground">{bid.contact_name}</p>
                </div>
              )}
              {bid.contact_email && (
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground text-xs break-all">{bid.contact_email}</p>
                </div>
              )}
              {bid.source_portal && (
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium text-foreground">{bid.source_portal}</p>
                </div>
              )}
              {bid.bid_url && (
                <div>
                  <p className="text-xs text-muted-foreground">Link</p>
                  <a href={bid.bid_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    Open solicitation <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            <Separator />

            {/* Assigned to */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Assigned To</p>
              <Select
                value={bid.assigned_to ?? 'unassigned'}
                onValueChange={(v) => updateAssigned.mutate(v === 'unassigned' ? null : v)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Pursuit Notes</p>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => saveNotes.mutate(notes)}
                placeholder="Add pursuit notes…"
                className="min-h-[80px] text-sm"
              />
            </div>

            <Separator />

            {/* CRM Links */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">CRM Links</p>

              {linkedClients.map((lc: any) => (
                <Badge key={lc.id} variant="secondary" className="mr-1">
                  {lc.client_companies?.name ?? 'Client'}
                </Badge>
              ))}
              {linkedProjects.map((lp: any) => (
                <Badge key={lp.id} variant="secondary" className="mr-1">
                  {lp.projects?.name ?? 'Project'}
                </Badge>
              ))}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setLinkType('client'); setLinkSearch(''); }}>
                  <Link2 className="mr-1 h-3 w-3" /> Link Client
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setLinkType('project'); setLinkSearch(''); }}>
                  <Link2 className="mr-1 h-3 w-3" /> Link Project
                </Button>
              </div>
            </div>

            <Separator />

            {/* Activity log */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Activity</p>
              <div className="space-y-2">
                {activity.length === 0 && (
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                )}
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-[11px]">
                    <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                    <div className="flex-1">
                      <span className="font-medium text-foreground">
                        {profileName(a.performed_by)}
                      </span>{' '}
                      {a.action === 'status_change' && (
                        <span className="text-muted-foreground">
                          changed status from <strong>{a.old_value}</strong> to <strong>{a.new_value}</strong>
                        </span>
                      )}
                      {a.action === 'note_edit' && (
                        <span className="text-muted-foreground">updated notes</span>
                      )}
                      {a.action === 'assigned' && (
                        <span className="text-muted-foreground">
                          updated assignment
                        </span>
                      )}
                      <p className="text-muted-foreground/70 mt-0.5">
                        {format(new Date(a.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Link dialog */}
      <Dialog open={linkType !== null} onOpenChange={(open) => !open && setLinkType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link to CRM {linkType === 'client' ? 'Client' : 'Project'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={`Search ${linkType === 'client' ? 'clients' : 'projects'}…`}
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {linkType === 'client' &&
                searchClients.map((c) => (
                  <Button
                    key={c.id}
                    variant="ghost"
                    className="w-full justify-start text-sm h-8"
                    onClick={() => linkClient.mutate(c.id)}
                  >
                    {c.name}
                  </Button>
                ))}
              {linkType === 'project' &&
                searchProjects.map((p) => (
                  <Button
                    key={p.id}
                    variant="ghost"
                    className="w-full justify-start text-sm h-8"
                    onClick={() => linkProject.mutate(p.id)}
                  >
                    {p.name}
                  </Button>
                ))}
              {linkSearch.length > 1 &&
                ((linkType === 'client' && searchClients.length === 0) ||
                  (linkType === 'project' && searchProjects.length === 0)) && (
                  <p className="text-xs text-muted-foreground py-2 text-center">No results found</p>
                )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
