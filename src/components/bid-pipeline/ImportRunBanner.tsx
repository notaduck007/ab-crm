import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ImportRunBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: run } = useQuery({
    queryKey: ['import-runs', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_runs')
        .select('id, ran_at, imported, updated, skipped_declined, errors')
        .order('ran_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (dismissed || !run || !run.ran_at) return null;

  const imported = run.imported ?? 0;
  const updated = run.updated ?? 0;
  const blocked = run.skipped_declined ?? 0;
  const errors = run.errors ?? 0;
  const hasErrors = errors > 0;
  const relative = formatDistanceToNow(new Date(run.ran_at), { addSuffix: true });

  const tone = hasErrors
    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100'
    : 'border-border bg-muted/40 text-muted-foreground';

  return (
    <div className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs ${tone}`}>
      <div className="flex items-center gap-2">
        {hasErrors ? (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span>
          Last import: <strong className="font-medium">{imported}</strong> new ·{' '}
          <strong className="font-medium">{updated}</strong> updated ·{' '}
          <strong className="font-medium">{blocked}</strong> blocked ·{' '}
          <strong className={`font-medium ${hasErrors ? 'text-amber-700 dark:text-amber-300' : ''}`}>
            {errors}
          </strong>{' '}
          error{errors === 1 ? '' : 's'} — {relative}
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
