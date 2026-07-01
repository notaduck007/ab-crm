import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gavel, CalendarClock, DollarSign, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { formatBidValue } from '@/lib/formatValue';

export function BidPipelineWidget() {
  const { data: bids = [], isLoading } = useQuery({
    queryKey: ['bids', 'dashboard-widget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('status, due_date, estimated_value, created_at, archived_at')
        .is('archived_at', null)
        .neq('status', 'Declined');
      if (error) throw error;
      return data;
    },
  });

  const newBids = bids.filter((b) => b.status === 'New').length;

  const closing14 = bids.filter(
    (b) =>
      ['Pursuing', 'Submitted'].includes(b.status) &&
      b.due_date &&
      differenceInDays(new Date(b.due_date), new Date()) <= 14 &&
      differenceInDays(new Date(b.due_date), new Date()) >= 0
  ).length;

  const pipelineValue = bids
    .filter((b) => ['Pursuing', 'Submitted'].includes(b.status))
    .reduce((sum, b) => sum + (b.estimated_value ?? 0), 0);

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
            <p className="text-xl font-bold text-foreground">
              {pipelineValue === 0 ? '$0' : formatBidValue(pipelineValue, 'compact')}
            </p>
          </div>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/bid-pipeline">View Inbox</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
