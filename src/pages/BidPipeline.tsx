import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Inbox, Target, CalendarClock, DollarSign, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { differenceInDays } from 'date-fns';
import BidInbox from '@/components/bid-pipeline/BidInbox';

export default function BidPipeline() {
  const [view, setView] = useState('inbox');

  const { data: allBids = [] } = useQuery({
    queryKey: ['bids', 'all-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bids').select('status, due_date, estimated_value, created_at');
      if (error) throw error;
      return data;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const newToday = allBids.filter((b) => b.status === 'New' && b.created_at?.slice(0, 10) === today).length;
  const pursuing = allBids.filter((b) => b.status === 'Pursuing').length;
  const closing14 = allBids.filter((b) => ['New', 'Reviewing', 'Pursuing'].includes(b.status) && differenceInDays(new Date(b.due_date), new Date()) <= 14 && differenceInDays(new Date(b.due_date), new Date()) >= 0).length;
  const pipelineValue = allBids.filter((b) => ['New', 'Reviewing', 'Pursuing'].includes(b.status)).reduce((s, b) => s + (b.estimated_value ?? 0), 0);

  const formatPipelineValue = (v: number) => {
    if (v === 0) return '—';
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  const stats = [
    { label: 'New today', value: newToday > 0 ? String(newToday) : '—', icon: Sparkles },
    { label: 'Pursuing', value: pursuing > 0 ? String(pursuing) : '—', icon: Target },
    { label: 'Closing ≤14 days', value: closing14 > 0 ? String(closing14) : '—', icon: CalendarClock },
    { label: 'Pipeline value', value: formatPipelineValue(pipelineValue), icon: DollarSign },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bid Pipeline</h1>
        <p className="text-sm text-muted-foreground">Daily bid intelligence — Greater Houston region</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-dashed">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-semibold text-foreground">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(v) => v && setView(v)}
        className="inline-flex rounded-lg border bg-muted p-1"
      >
        <ToggleGroupItem value="inbox" className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">
          <Inbox className="mr-2 h-4 w-4" /> Inbox
        </ToggleGroupItem>
        <ToggleGroupItem value="tracker" className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">
          <Target className="mr-2 h-4 w-4" /> Tracker
        </ToggleGroupItem>
      </ToggleGroup>

      {view === 'inbox' ? (
        <BidInbox />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Target className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-base font-medium text-foreground">No pursuits yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Move bids from the Inbox to start tracking active pursuits on this board.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
