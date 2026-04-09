import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays } from 'date-fns';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

interface BidDeadlineAlertsProps {
  className?: string;
}

export function BidDeadlineAlerts({ className }: BidDeadlineAlertsProps) {
  const { data: urgentBids = [] } = useQuery({
    queryKey: ['bids', 'deadline-alerts'],
    queryFn: async () => {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data, error } = await supabase
        .from('bids')
        .select('id, agency, project_name, due_date, status')
        .in('status', ['Pursuing', 'Submitted'])
        .lte('due_date', sevenDaysFromNow.toISOString().slice(0, 10))
        .gte('due_date', new Date().toISOString().slice(0, 10))
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (urgentBids.length === 0) return null;

  return (
    <div className={className}>
      {urgentBids.map((bid) => {
        const daysLeft = differenceInDays(new Date(bid.due_date), new Date());
        return (
          <Alert key={bid.id} variant="destructive" className="flex items-center justify-between">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                <AlertTitle className="text-sm font-semibold">Bid deadline approaching</AlertTitle>
                <AlertDescription className="text-sm">
                  {bid.agency} — {bid.project_name} due in {daysLeft === 0 ? 'today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
                </AlertDescription>
              </div>
            </div>
            <Link
              to={`/bid-pipeline?view=tracker&bid=${bid.id}`}
              className="ml-4 shrink-0 inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
            >
              View <ExternalLink className="h-3 w-3" />
            </Link>
          </Alert>
        );
      })}
    </div>
  );
}
