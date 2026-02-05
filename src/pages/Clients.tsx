import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Loader2, AlertTriangle, ExternalLink, Trash2 } from 'lucide-react';
import type {
  ClientCompany,
  Relationship,
  MarketSector,
  RelationshipStage,
  RelationshipStrength,
} from '@/types/database';

const marketSectorLabels: Record<MarketSector, string> = {
  Public: 'Public',
  ISD: 'ISD',
  Municipal: 'Municipal',
  HigherEd: 'Higher Ed',
  CharterSchool: 'Charter School',
  Private: 'Private',
  Other: 'Other',
};

const stageLabels: Record<RelationshipStage, string> = {
  TargetIdentified: 'Target Identified',
  InitialOutreach: 'Initial Outreach',
  Introductions: 'Introductions',
  ActivePursuit: 'Active Pursuit',
  AwardedWork: 'Awarded Work',
  Dormant: 'Dormant',
  Lost: 'Lost',
};

const strengthColors: Record<RelationshipStrength, string> = {
  Cold: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Neutral: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Warm: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

interface ClientWithRelationship extends ClientCompany {
  relationship?: Relationship;
}

export default function Clients() {
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientWithRelationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newClient, setNewClient] = useState({
    name: '',
    market_sector: 'Other' as MarketSector,
    notes: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from('client_companies')
        .select('*')
        .order('name');

      if (companiesError) throw companiesError;

      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('relationships')
        .select('*');

      if (relationshipsError) throw relationshipsError;

      const clientsWithRelationships = (companiesData || []).map((company) => ({
        ...company,
        relationship: relationshipsData?.find((r) => r.client_company_id === company.id),
      })) as ClientWithRelationship[];

      setClients(clientsWithRelationships);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clients',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClient.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a company name',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('client_companies').insert({
        name: newClient.name,
        market_sector: newClient.market_sector,
        notes: newClient.notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Client created',
        description: 'The client company has been added',
      });

      setIsDialogOpen(false);
      setNewClient({
        name: '',
        market_sector: 'Other',
        notes: '',
      });
      fetchClients();
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: 'Error',
        description: 'Failed to create client',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (clientId: string, clientName: string) => {
    try {
      const { error } = await supabase
        .from('client_companies')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Client deleted',
        description: `${clientName} has been permanently deleted`,
      });

      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete client. You may not have permission.',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === 'all' || client.market_sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Add a new client company to track relationships
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Company Name</Label>
                <Input
                  id="name"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Enter company name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sector">Market Sector</Label>
                <Select
                  value={newClient.market_sector}
                  onValueChange={(value: MarketSector) =>
                    setNewClient({ ...newClient, market_sector: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(marketSectorLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newClient.notes}
                  onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                  placeholder="Additional notes about this client"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateClient} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Client'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sectors</SelectItem>
            {Object.entries(marketSectorLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clients Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">No clients found</p>
          <Button variant="link" onClick={() => setIsDialogOpen(true)}>
            Add your first client
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company Name</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Strength</TableHead>
                <TableHead>Est. Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <Link
                      to={`/clients/${client.id}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      {client.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{marketSectorLabels[client.market_sector]}</Badge>
                  </TableCell>
                  <TableCell>
                    {client.relationship
                      ? stageLabels[client.relationship.stage]
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {client.relationship ? (
                      <Badge className={strengthColors[client.relationship.strength]}>
                        {client.relationship.strength}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {client.relationship
                      ? formatCurrency(Number(client.relationship.estimated_pursuit_value))
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {client.relationship?.is_potentially_cold && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        At Risk
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Client</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{client.name}"? This action cannot be undone and will also delete all associated contacts and interactions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteClient(client.id, client.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
