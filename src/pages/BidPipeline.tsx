import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Inbox, Target, CalendarClock, DollarSign, Sparkles, Ban, Upload } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import BidInbox from '@/components/bid-pipeline/BidInbox';
import BidTracker from '@/components/bid-pipeline/BidTracker';
import BidDeclined from '@/components/bid-pipeline/BidDeclined';
import { BidDeadlineAlerts } from '@/components/bid-pipeline/BidDeadlineAlerts';
import { ImportRunBanner } from '@/components/bid-pipeline/ImportRunBanner';

export type InboxStatFilter = 'new-today' | 'closing-14d' | null;

export default function BidPipeline() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('inbox');
  const [statFilter, setStatFilter] = useState<InboxStatFilter>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const todayUtc = new Date().toISOString().slice(0, 10);

  const { data: allBids = [] } = useQuery({
    queryKey: ['bids', 'all-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('status, due_date, estimated_value, created_at, archived_at')
        .is('archived_at', null);
      if (error) throw error;
      return data;
    },
  });

  const { data: declinedCount = 0 } = useQuery({
    queryKey: ['bids', 'declined-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Declined')
        .is('archived_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  
  const newToday = allBids.filter(
    (b) => b.status === 'New' && b.created_at && new Date(b.created_at).toISOString().slice(0, 10) === todayUtc
  ).length;
  const pursuing = allBids.filter((b) => b.status === 'Pursuing').length;
  const activeStatuses = ['New', 'Reviewing', 'Pursuing'];
  const closing14 = allBids.filter(
    (b) =>
      activeStatuses.includes(b.status) &&
      b.due_date &&
      differenceInDays(new Date(b.due_date), new Date()) <= 14 &&
      differenceInDays(new Date(b.due_date), new Date()) >= 0
  ).length;
  const pipelineValue = allBids
    .filter((b) => activeStatuses.includes(b.status))
    .reduce((s, b) => s + (b.estimated_value ?? 0), 0);

  const formatPipelineValue = (v: number) => {
    if (v === 0) return '—';
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  };

  const stats: Array<{
    label: string;
    value: string;
    icon: typeof Sparkles;
    filter?: InboxStatFilter;
  }> = [
    { label: 'New today', value: newToday > 0 ? String(newToday) : '—', icon: Sparkles, filter: 'new-today' },
    { label: 'Pursuing', value: pursuing > 0 ? String(pursuing) : '—', icon: Target },
    { label: 'Closing ≤14 days', value: closing14 > 0 ? String(closing14) : '—', icon: CalendarClock, filter: 'closing-14d' },
    { label: 'Pipeline value', value: formatPipelineValue(pipelineValue), icon: DollarSign },
  ];

  const handleStatClick = (f: InboxStatFilter | undefined) => {
    if (!f) return;
    setView('inbox');
    setStatFilter((prev) => (prev === f ? null : f));
  };

  const handleImport = async () => {
    setImportError(null);
    let parsed: any;
    try {
      parsed = JSON.parse(importText);
    } catch {
      setImportError('Invalid JSON. Please check the syntax.');
      return;
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.bids)) {
      setImportError('JSON must include a "bids" array.');
      return;
    }
    setImporting(true);
    const { data, error } = await supabase.rpc('import_bids', { payload: parsed });
    setImporting(false);
    if (error) {
      setImportError(error.message);
      return;
    }
    const r = (data ?? {}) as {
      imported?: number;
      updated?: number;
      skipped_declined?: number;
      errors?: number;
    };
    toast.success(
      `Imported ${r.imported ?? 0} · Updated ${r.updated ?? 0} · Skipped ${r.skipped_declined ?? 0} · Errors ${r.errors ?? 0}`
    );
    queryClient.invalidateQueries({ queryKey: ['bids'] });
    setImportOpen(false);
    setImportText('');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bid Pipeline</h1>
          <p className="text-sm text-muted-foreground">Daily bid intelligence — Greater Houston region</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" /> Import bids
        </Button>
      </div>

      <ImportRunBanner />

      <BidDeadlineAlerts className="space-y-2" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => {
          const clickable = !!s.filter;
          const active = clickable && statFilter === s.filter;
          return (
            <Card
              key={s.label}
              onClick={clickable ? () => handleStatClick(s.filter) : undefined}
              className={`border-dashed transition-colors ${
                clickable ? 'cursor-pointer hover:bg-muted/40' : ''
              } ${active ? 'border-primary bg-primary/5' : ''}`}
              aria-pressed={clickable ? active : undefined}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${active ? 'bg-primary/15' : 'bg-muted'}`}>
                  <s.icon className={`h-4 w-4 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold text-foreground">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>


      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(v) => { if (v) { setView(v); if (v !== 'inbox') setStatFilter(null); } }}
        className="inline-flex rounded-lg border bg-muted p-1"
      >
        <ToggleGroupItem value="inbox" className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">
          <Inbox className="mr-2 h-4 w-4" /> Inbox
        </ToggleGroupItem>
        <ToggleGroupItem value="tracker" className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">
          <Target className="mr-2 h-4 w-4" /> Tracker
        </ToggleGroupItem>
        <ToggleGroupItem value="declined" className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm">
          <Ban className="mr-2 h-4 w-4" /> Declined
          {declinedCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-[10px]">
              {declinedCount}
            </Badge>
          )}
        </ToggleGroupItem>
      </ToggleGroup>

      {view === 'inbox' && <BidInbox statFilter={statFilter} onClearStatFilter={() => setStatFilter(null)} />}
      {view === 'tracker' && <BidTracker />}
      {view === 'declined' && <BidDeclined />}


      <Dialog open={importOpen} onOpenChange={(open) => { setImportOpen(open); if (!open) { setImportError(null); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import bids</DialogTitle>
            <DialogDescription>
              Paste a JSON payload in the shape <code>{'{ "source": "manual", "bids": [ ... ] }'}</code>. This calls the same importer used by the nightly automation.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='{ "source": "manual", "bids": [ { "agency": "...", "project_name": "...", "due_date": "2025-04-28" } ] }'
            className="min-h-[260px] font-mono text-xs"
          />
          {importError && <p className="text-xs text-destructive">{importError}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={importing || !importText.trim()}>
              {importing ? 'Importing…' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
