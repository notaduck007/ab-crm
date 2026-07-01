import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type FailedRec = {
  error?: string;
  rec?: {
    bid_number?: string | null;
    agency?: string | null;
    project_name?: string | null;
    [k: string]: unknown;
  };
};

export function ImportRunBanner() {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { data: run } = useQuery({
    queryKey: ['import-runs', 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('import_runs')
        .select('id, ran_at, imported, updated, skipped_declined, errors, detail')
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

  const failures: FailedRec[] = Array.isArray(run.detail)
    ? (run.detail as unknown as FailedRec[]).filter((d) => d && typeof d === 'object' && 'error' in d)
    : [];

  const tone = hasErrors
    ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100'
    : 'border-border bg-muted/40 text-muted-foreground';

  return (
    <div className={`rounded-md border text-xs ${tone}`}>
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <button
          type="button"
          className={`flex flex-1 items-center gap-2 text-left ${hasErrors ? 'cursor-pointer' : 'cursor-default'}`}
          onClick={() => hasErrors && setExpanded((v) => !v)}
          aria-expanded={hasErrors ? expanded : undefined}
        >
          {hasErrors ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            )
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          {hasErrors && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />}
          <span>
            Last import: <strong className="font-medium">{imported}</strong> new ·{' '}
            <strong className="font-medium">{updated}</strong> updated ·{' '}
            <strong className="font-medium">{blocked}</strong> blocked ·{' '}
            <strong className={`font-medium ${hasErrors ? 'text-amber-700 dark:text-amber-300' : ''}`}>
              {errors}
            </strong>{' '}
            error{errors === 1 ? '' : 's'} — {relative}
          </span>
        </button>
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
      {hasErrors && expanded && failures.length > 0 && (
        <div className="border-t border-amber-300/60 px-3 py-2 dark:border-amber-800/60">
          <ul className="space-y-1">
            {failures.map((f, i) => (
              <li key={i} className="flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="font-mono text-[11px] font-medium">
                  {f.rec?.bid_number ?? '—'}
                </span>
                <span className="text-[11px]">{f.rec?.agency ?? '—'}</span>
                <span className="text-[11px] opacity-80">— {f.error ?? 'Unknown error'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
