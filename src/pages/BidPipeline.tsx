import { useState } from 'react';
import { Inbox, Target, CalendarClock, DollarSign, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

const stats = [
  { label: 'New today', value: '—', icon: Sparkles },
  { label: 'Pursuing', value: '—', icon: Target },
  { label: 'Closing ≤14 days', value: '—', icon: CalendarClock },
  { label: 'Pipeline value', value: '—', icon: DollarSign },
];

export default function BidPipeline() {
  const [view, setView] = useState('inbox');

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bid Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Daily bid intelligence — Greater Houston region
        </p>
      </div>

      {/* Stats bar */}
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

      {/* Segmented control */}
      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(v) => v && setView(v)}
        className="inline-flex rounded-lg border bg-muted p-1"
      >
        <ToggleGroupItem
          value="inbox"
          className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          <Inbox className="mr-2 h-4 w-4" />
          Inbox
        </ToggleGroupItem>
        <ToggleGroupItem
          value="tracker"
          className="rounded-md px-4 py-1.5 text-sm font-medium data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          <Target className="mr-2 h-4 w-4" />
          Tracker
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Sub-view content */}
      {view === 'inbox' ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <h3 className="text-base font-medium text-foreground">No new bids yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              New bids from the daily automation will appear here. Check back after the next scan runs.
            </p>
          </CardContent>
        </Card>
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
