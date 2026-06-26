import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { ChevronRight, ChevronDown, Archive } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import BidDetailPanel from './BidDetailPanel';

type Bid = Tables<'bids'>;
type BidStatus = Bid['status'];

const COLUMNS = [
  { id: 'Reviewing', label: 'Reviewing', accent: 'border-t-gray-400', headerBg: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'Pursuing', label: 'Pursuing', accent: 'border-t-blue-500', headerBg: 'bg-blue-50 dark:bg-blue-950/40' },
  { id: 'Submitted', label: 'Submitted', accent: 'border-t-purple-500', headerBg: 'bg-purple-50 dark:bg-purple-950/40' },
  { id: 'Awarded', label: 'Awarded', accent: 'border-t-green-500', headerBg: 'bg-green-50 dark:bg-green-950/40' },
  { id: 'No-Go', label: 'No-Go', accent: 'border-t-red-500', headerBg: 'bg-red-50 dark:bg-red-950/40' },
] as const;

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  A: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', label: 'A' },
  B: { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', label: 'B' },
  AE: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', label: 'Arch/Eng' },
};

function formatValue(v: number | null): string {
  if (v == null) return 'TBD';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toLocaleString()}`;
}

function dueDateColor(dateStr: string) {
  const d = differenceInDays(new Date(dateStr), new Date());
  if (d <= 7) return 'text-red-600 dark:text-red-400';
  if (d <= 14) return 'text-amber-600 dark:text-amber-400';
  return 'text-muted-foreground';
}

export default function BidTracker() {
  const queryClient = useQueryClient();
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [noGoExpanded, setNoGoExpanded] = useState(false);
  const [clearNoGoOpen, setClearNoGoOpen] = useState(false);

  const { data: bids = [] } = useQuery({
    queryKey: ['bids', 'tracker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('*')
        .in('status', ['Reviewing', 'Pursuing', 'Submitted', 'Awarded', 'No-Go'])
        .is('archived_at', null)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Bid[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, name');
      if (error) throw error;
      return data;
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.user_id, p.name]));

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BidStatus }) => {
      const { error } = await supabase.from('bids').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bids'] });
      queryClient.invalidateQueries({ queryKey: ['bid-activity'] });
    },
  });

  const archiveNoGo = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('bids')
        .update({ archived_at: new Date().toISOString() })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_data, ids) => {
      toast.success(`Archived ${ids.length} No-Go bid${ids.length === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['bids'] });
    },
  });

  const onDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination) return;
      const newStatus = result.destination.droppableId as BidStatus;
      const bidId = result.draggableId;
      const bid = bids.find((b) => b.id === bidId);
      if (!bid || bid.status === newStatus) return;
      updateStatus.mutate(
        { id: bidId, status: newStatus },
        { onSuccess: () => toast.success(`Moved to ${newStatus}`) }
      );
    },
    [bids, updateStatus]
  );

  const columnBids = (status: string) => bids.filter((b) => b.status === status);

  const columnValue = (status: string) =>
    columnBids(status).reduce((s, b) => s + (b.estimated_value ?? 0), 0);

  const noGoIds = columnBids('No-Go').map((b) => b.id);

  return (
    <div className="flex flex-col gap-3">
      {noGoIds.length > 0 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setClearNoGoOpen(true)}>
            <Archive className="mr-1.5 h-3.5 w-3.5" /> Clear No-Go ({noGoIds.length})
          </Button>
        </div>
      )}
      <div className="flex gap-0">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex flex-1 gap-3 overflow-x-auto pb-4">
            {COLUMNS.map((col) => {
              const isNoGo = col.id === 'No-Go';
              const collapsed = isNoGo && !noGoExpanded;
              const items = columnBids(col.id);

              if (collapsed) {
                return (
                  <div
                    key={col.id}
                    className="flex h-full w-10 shrink-0 cursor-pointer flex-col items-center rounded-lg border border-t-4 border-t-red-500 bg-muted/50 py-3 hover:bg-muted"
                    onClick={() => setNoGoExpanded(true)}
                  >
                    <ChevronRight className="mb-2 h-4 w-4 text-muted-foreground" />
                    <span className="[writing-mode:vertical-lr] text-xs font-medium text-muted-foreground">
                      No-Go ({items.length})
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={col.id}
                  className={`flex w-64 shrink-0 flex-col rounded-lg border border-t-4 ${col.accent}`}
                >
                  {/* Column header */}
                  <div
                    className={`flex items-center justify-between rounded-t-lg px-3 py-2.5 ${col.headerBg}`}
                    onClick={isNoGo ? () => setNoGoExpanded(false) : undefined}
                    style={isNoGo ? { cursor: 'pointer' } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {isNoGo && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="text-sm font-semibold text-foreground">{col.label}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {items.length}
                      </Badge>
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground">
                      {formatValue(columnValue(col.id))}
                    </span>
                  </div>

                  {/* Droppable area */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 space-y-2 overflow-y-auto p-2 transition-colors ${
                          snapshot.isDraggingOver ? 'bg-accent/30' : ''
                        }`}
                        style={{ minHeight: 80 }}
                      >
                        {items.map((bid, index) => {
                          const tier = TIER_STYLES[bid.tier] ?? TIER_STYLES.B;
                          const assigneeName = bid.assigned_to ? profileMap.get(bid.assigned_to) : null;
                          return (
                            <Draggable key={bid.id} draggableId={bid.id} index={index}>
                              {(prov, snap) => (
                                <div
                                  ref={prov.innerRef}
                                  {...prov.draggableProps}
                                  {...prov.dragHandleProps}
                                  onClick={() => setSelectedBidId(bid.id)}
                                >
                                  <Card
                                    className={`cursor-pointer transition-shadow hover:shadow-md ${
                                      snap.isDragging ? 'shadow-lg ring-2 ring-primary/30' : ''
                                    } ${selectedBidId === bid.id ? 'ring-2 ring-primary' : ''}`}
                                  >
                                    <CardContent className="p-3 space-y-1.5">
                                      <div className="flex items-start justify-between gap-1">
                                        <p className="text-[13px] font-semibold text-foreground leading-tight line-clamp-2">
                                          {bid.project_name}
                                        </p>
                                        <span
                                          className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${tier.bg} ${tier.text}`}
                                        >
                                          {tier.label}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground truncate">
                                        {bid.agency} · {bid.sector}
                                      </p>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-foreground">
                                          {formatValue(bid.estimated_value)}
                                        </span>
                                        <span className={`text-[11px] font-medium ${dueDateColor(bid.due_date)}`}>
                                          {format(new Date(bid.due_date), 'MMM d')}
                                        </span>
                                      </div>
                                      {assigneeName && (
                                        <div className="flex items-center gap-1.5 pt-0.5">
                                          <Avatar className="h-5 w-5">
                                            <AvatarFallback className="text-[9px]">
                                              {assigneeName.slice(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                          </Avatar>
                                          <span className="text-[10px] text-muted-foreground truncate">
                                            {assigneeName}
                                          </span>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>

        {/* Detail panel */}
        {selectedBidId && (
          <BidDetailPanel
            bidId={selectedBidId}
            onClose={() => setSelectedBidId(null)}
            profiles={profiles}
          />
        )}
      </div>

      <AlertDialog open={clearNoGoOpen} onOpenChange={setClearNoGoOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {noGoIds.length} No-Go bid{noGoIds.length === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll be hidden but not deleted, and can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                archiveNoGo.mutate(noGoIds);
                setClearNoGoOpen(false);
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
