import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Inbox, ExternalLink, Search, Ban, Eye, Target } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';

type Bid = Tables<'bids'>;

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: 'A' },
  B: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', label: 'B' },
  AE: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: 'Arch/Eng Lead' },
};

const SECTORS = ['All', 'ISD', 'Higher Education', 'City', 'County', 'Charter School', 'Private Education', 'Other'] as const;

function formatValue(v: number | null): string {
  if (v == null) return 'Value TBD';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function daysUntil(dateStr: string) {
  return differenceInDays(new Date(dateStr), new Date());
}

function dueDateColor(dateStr: string) {
  const d = daysUntil(dateStr);
  if (d <= 7) return 'text-red-600 dark:text-red-400';
  if (d <= 14) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

export default function BidInbox() {
  const queryClient = useQueryClient();
  const [tierFilter, setTierFilter] = useState('All');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [noGoId, setNoGoId] = useState<string | null>(null);

  const { data: bids = [], isLoading } = useQuery({
    queryKey: ['bids', 'inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .in('status', ['New', 'Reviewing'])
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Bid[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('bids').update({ status: status as Bid['status'] }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bids'] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return bids.filter((b) => {
      if (tierFilter !== 'All' && b.tier !== tierFilter) return false;
      if (sectorFilter !== 'All' && b.sector !== sectorFilter) return false;
      if (q && !b.project_name.toLowerCase().includes(q) && !b.agency.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [bids, tierFilter, sectorFilter, search]);

  const handlePursue = (id: string) => {
    updateStatus.mutate({ id, status: 'Pursuing' }, { onSuccess: () => toast.success('Bid moved to Tracker') });
  };
  const handleReview = (id: string) => {
    updateStatus.mutate({ id, status: 'Reviewing' }, { onSuccess: () => toast.success('Marked for review') });
  };
  const confirmNoGo = () => {
    if (!noGoId) return;
    updateStatus.mutate({ id: noGoId, status: 'No-Go' }, { onSuccess: () => toast.success('Bid marked No-Go') });
    setNoGoId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-28 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={tierFilter}
          onValueChange={(v) => v && setTierFilter(v)}
          className="inline-flex rounded-lg border bg-muted p-0.5"
        >
          {['All', 'A', 'B', 'AE'].map((t) => (
            <ToggleGroupItem
              key={t}
              value={t}
              className="rounded-md px-3 py-1 text-xs font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              {t === 'All' ? 'All Tiers' : t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <ToggleGroup
          type="single"
          value={sectorFilter}
          onValueChange={(v) => v && setSectorFilter(v)}
          className="inline-flex rounded-lg border bg-muted p-0.5"
        >
          {SECTORS.map((s) => (
            <ToggleGroupItem
              key={s}
              value={s}
              className="rounded-md px-3 py-1 text-xs font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              {s === 'All' ? 'All Sectors' : s}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        <div className="relative ml-auto w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agency or project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
      </div>

      {/* Bid cards */}
      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-base font-medium text-foreground">No new bids today</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Check back tomorrow morning after the daily run.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((bid) => {
            const tier = TIER_STYLES[bid.tier] ?? TIER_STYLES.B;
            return (
              <Card key={bid.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Main row */}
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${tier.bg} ${tier.text}`}>
                          {tier.label}
                        </span>
                        {bid.status === 'Reviewing' && (
                          <Badge variant="secondary" className="text-[10px]">Reviewing</Badge>
                        )}
                      </div>
                      <p className="truncate text-[15px] font-semibold text-foreground">{bid.project_name}</p>
                      <p className="truncate text-[13px] text-muted-foreground">{bid.agency}</p>
                    </div>

                    {/* Right */}
                    <div className="shrink-0 text-right space-y-1">
                      <p className="text-sm font-semibold text-foreground">{formatValue(bid.estimated_value)}</p>
                      <p className={`text-xs font-medium ${dueDateColor(bid.due_date)}`}>
                        Due {format(new Date(bid.due_date), 'MMM d, yyyy')}
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{bid.delivery_method}</Badge>
                        <Badge variant="outline" className="text-[10px]">{bid.sector}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-3 flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {bid.source_portal && <span>{bid.source_portal}</span>}
                      {bid.bid_url && (
                        <a href={bid.bid_url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handlePursue(bid.id)}>
                        <Target className="mr-1 h-3 w-3" /> Pursue
                      </Button>
                      {bid.status !== 'Reviewing' && (
                        <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => handleReview(bid.id)}>
                          <Eye className="mr-1 h-3 w-3" /> Review later
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => setNoGoId(bid.id)}>
                        <Ban className="mr-1 h-3 w-3" /> No-Go
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No-Go confirmation */}
      <AlertDialog open={!!noGoId} onOpenChange={(open) => !open && setNoGoId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as No-Go?</AlertDialogTitle>
            <AlertDialogDescription>
              This bid will be removed from the Inbox. You can find it later by filtering for No-Go bids.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNoGo} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm No-Go
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
