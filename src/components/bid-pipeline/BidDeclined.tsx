import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Ban, Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

type Bid = Tables<'bids'>;
type BidStatus = Bid['status'];

function formatValue(v: number | null): string {
  if (v == null) return 'TBD';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

export default function BidDeclined() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: bids = [], isLoading } = useQuery({
    queryKey: ['bids', 'declined'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .eq('status', 'Declined')
        .is('archived_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as Bid[];
    },
  });

  const restore = useMutation({
    mutationFn: async (bid: Bid) => {
      const { error: updErr } = await supabase
        .from('bids')
        .update({ status: 'New' as BidStatus, archived_at: null, decline_reason: null })
        .eq('id', bid.id);
      if (updErr) throw updErr;
      if (bid.dedup_key) {
        const { error: delErr } = await supabase
          .from('declined_keys')
          .delete()
          .eq('dedup_key', bid.dedup_key);
        if (delErr) throw delErr;
      }
    },
    onSuccess: () => {
      toast.success('Bid restored to Inbox');
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return bids;
    return bids.filter(
      (b) =>
        b.project_name.toLowerCase().includes(q) ||
        b.agency.toLowerCase().includes(q)
    );
  }, [bids, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search agency or project…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} declined</span>
      </div>

      {isLoading ? (
        <Card className="animate-pulse"><CardContent className="h-28 p-4" /></Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Ban className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-base font-medium text-foreground">No declined bids</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Declined bids are permanently blocked from re-importing until restored.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((bid) => (
            <Card key={bid.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-semibold text-foreground">{bid.project_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{bid.agency}</p>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <Badge variant="outline" className="text-[10px]">{bid.sector}</Badge>
                    <Badge variant="outline" className="text-[10px]">{formatValue(bid.estimated_value)}</Badge>
                  </div>
                  {bid.decline_reason && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Reason:</span> {bid.decline_reason}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => restore.mutate(bid)}
                  disabled={restore.isPending}
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
