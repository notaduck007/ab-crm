import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Inbox, ExternalLink, Search, Ban, Eye, Target, Slash } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';
import { formatBidValue } from '@/lib/formatValue';

type Bid = Tables<'bids'>;
type BidStatus = Bid['status'];

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: 'A' },
  B: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', label: 'B' },
  AE: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: 'Arch/Eng Lead' },
};

const SECTORS = ['All', 'ISD', 'Higher Education', 'City', 'County', 'Charter School', 'Private Education', 'Other'] as const;

const formatValue = (v: number | null) => formatBidValue(v, 'compact');

function daysUntil(dateStr: string) {
  return differenceInDays(new Date(dateStr), new Date());
}

function dueDateColor(dateStr: string) {
  const d = daysUntil(dateStr);
  if (d <= 7) return 'text-red-600 dark:text-red-400';
  if (d <= 14) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

type PendingAction =
  | { kind: 'no-go'; ids: string[] }
  | { kind: 'decline'; ids: string[] };

export default function BidInbox() {
  const queryClient = useQueryClient();
  const [tierFilter, setTierFilter] = useState('All');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const { data: bids = [], isLoading } = useQuery({
    queryKey: ['bids', 'inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('status', 'New')
        .is('archived_at', null)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Bid[];
    },
  });

  const setStatusBulk = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: BidStatus }) => {
      const { error } = await supabase.from('bids').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bids'] }),
  });

  const declineBulk = useMutation({
    mutationFn: async ({ ids, reason }: { ids: string[]; reason: string | null }) => {
      const { error } = await supabase
        .from('bids')
        .update({ status: 'Declined' as BidStatus, decline_reason: reason })
        .in('id', ids);
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

  const allSelected = filtered.length > 0 && filtered.every((b) => selected.has(b.id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((b) => b.id)));
  };

  const doPursue = (ids: string[]) => {
    setStatusBulk.mutate(
      { ids, status: 'Pursuing' as BidStatus },
      {
        onSuccess: () => {
          toast.success(ids.length === 1 ? 'Bid moved to Tracker' : `${ids.length} bids moved to Tracker`);
          setSelected(new Set());
        },
      }
    );
  };
  const doReview = (ids: string[]) => {
    setStatusBulk.mutate(
      { ids, status: 'Reviewing' as BidStatus },
      {
        onSuccess: () => {
          toast.success(ids.length === 1 ? 'Marked for review' : `${ids.length} bids marked for review`);
          setSelected(new Set());
        },
      }
    );
  };
  const confirmNoGo = () => {
    if (pending?.kind !== 'no-go') return;
    const ids = pending.ids;
    setStatusBulk.mutate(
      { ids, status: 'No-Go' as BidStatus },
      {
        onSuccess: () => {
          toast.success(ids.length === 1 ? 'Bid marked No-Go' : `${ids.length} bids marked No-Go`);
          setSelected(new Set());
        },
      }
    );
    setPending(null);
  };
  const confirmDecline = () => {
    if (pending?.kind !== 'decline') return;
    const ids = pending.ids;
    const reason = declineReason.trim() || null;
    declineBulk.mutate(
      { ids, reason },
      {
        onSuccess: () => {
          toast.success(ids.length === 1 ? 'Bid declined' : `${ids.length} bids declined`);
          setSelected(new Set());
        },
      }
    );
    setPending(null);
    setDeclineReason('');
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
    <div className="space-y-4 pb-20">
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

      {/* Select-all bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Checkbox
            checked={allSelected ? true : someSelected ? 'indeterminate' : false}
            onCheckedChange={toggleAll}
            aria-label="Select all"
          />
          <span>
            {selected.size > 0
              ? `${selected.size} selected`
              : `Select all (${filtered.length})`}
          </span>
        </div>
      )}

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
            const isSelected = selected.has(bid.id);
            return (
              <Card key={bid.id} className={`overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-4">
                  {/* Main row */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(bid.id)}
                      aria-label="Select bid"
                      className="mt-1"
                    />
                    <div className="flex flex-1 items-start justify-between gap-4">
                      {/* Left */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${tier.bg} ${tier.text}`}>
                            {tier.label}
                          </span>
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
                      <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => doPursue([bid.id])}>
                        <Target className="mr-1 h-3 w-3" /> Pursue
                      </Button>
                      <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => doReview([bid.id])}>
                        <Eye className="mr-1 h-3 w-3" /> Review later
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPending({ kind: 'no-go', ids: [bid.id] })}>
                        <Ban className="mr-1 h-3 w-3" /> No-Go
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => { setDeclineReason(''); setPending({ kind: 'decline', ids: [bid.id] }); }}
                      >
                        <Slash className="mr-1 h-3 w-3" /> Decline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky bulk action bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-lg border bg-background px-4 py-2 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
            <div className="h-5 w-px bg-border" />
            <Button size="sm" variant="default" className="h-8 text-xs" onClick={() => doPursue(Array.from(selected))}>
              <Target className="mr-1 h-3.5 w-3.5" /> Pursue
            </Button>
            <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => doReview(Array.from(selected))}>
              <Eye className="mr-1 h-3.5 w-3.5" /> Review later
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setPending({ kind: 'no-go', ids: Array.from(selected) })}>
              <Ban className="mr-1 h-3.5 w-3.5" /> No-Go
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => { setDeclineReason(''); setPending({ kind: 'decline', ids: Array.from(selected) }); }}
            >
              <Slash className="mr-1 h-3.5 w-3.5" /> Decline
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* No-Go confirmation */}
      <AlertDialog open={pending?.kind === 'no-go'} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === 'no-go' && pending.ids.length > 1
                ? `Mark ${pending.ids.length} bids as No-Go?`
                : 'Mark as No-Go?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The bid moves to the Tracker's No-Go column. You can drag it back to another column anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNoGo}>
              Confirm No-Go
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Decline dialog with reason */}
      <Dialog
        open={pending?.kind === 'decline'}
        onOpenChange={(open) => { if (!open) { setPending(null); setDeclineReason(''); } }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pending?.kind === 'decline' && pending.ids.length > 1
                ? `Decline ${pending.ids.length} bids?`
                : 'Decline bid?'}
            </DialogTitle>
            <DialogDescription>
              Declining permanently blocks this RFP from re-importing. You can restore it later from the Declined tab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
            <Textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Out of region, conflict, capacity, etc."
              className="min-h-[80px] text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setPending(null); setDeclineReason(''); }}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDecline}>Decline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
