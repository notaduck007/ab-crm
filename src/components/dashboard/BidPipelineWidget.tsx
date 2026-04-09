import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gavel, CalendarClock, DollarSign, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';

export function BidPipelineWidget() {
  const { data: bids = [], isLoading } = useQuery({
    queryKey: ['bids', 'dashboard-widget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('status, due_date, estimated_value, created_at');
      if (error) throw error;
      return data;
    },
  });

  const newBids = bids.filter((b) => b.status === 'New').length;

  const closing14 = bids.filter(
    (b) =>
      ['Pursuing', 'Submitted'].includes(b.status) &&
      differenceInDays(new Date(b.due_date), new Date()) <= 14 &&
      differenceInDays(new Date(b.due_date), new Date()) >= 0
  ).length;

  const pipelineValue = bids
    .filter((b) => ['Pursuing', 'Submitted'].includes(b.status))
    .reduce((sum, b) => sum + (b.estimated_value ?? 0), 0);

  const formatValue = (v: number) => {
    if (v === 0) return '$0';
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          Bid Pipeline
        </CardTitle>
        <CardDescription>Active solicitations &amp; pursuits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Inbox className="h-3.5 w-3.5" />
              <span className="text-xs">New</span>
            </div>
            <p className="text-xl font-bold text-foreground">{newBids}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <CalendarClock className="h-3.5 w-3.5" />
              <span className="text-xs">Due ≤14d</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {closing14 > 0 ? (
                <span className="text-amber-600 dark:text-amber-400">{closing14}</span>
              ) : (
                '0'
              )}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-xs">Pipeline</span>
            </div>
            <p className="text-xl font-bold text-foreground">{formatValue(pipelineValue)}</p>
          </div>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/bid-pipeline">View Inbox</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
