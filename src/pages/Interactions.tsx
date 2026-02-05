import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import { Plus, Search, Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type {
  Interaction,
  ClientCompany,
  ClientContact,
  Project,
  Profile,
  InteractionType,
} from '@/types/database';

const interactionTypeLabels: Record<InteractionType, string> = {
  Call: 'Call',
  Email: 'Email',
  Meeting: 'Meeting',
  SiteVisit: 'Site Visit',
  Conference: 'Conference',
  Other: 'Other',
};

const interactionTypeColors: Record<InteractionType, string> = {
  Call: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  Email: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Meeting: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SiteVisit: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  Conference: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  Other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

interface InteractionWithDetails extends Interaction {
  company?: ClientCompany;
  contact?: ClientContact;
  project?: Project;
  logged_by?: Profile;
}

export default function Interactions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [interactions, setInteractions] = useState<InteractionWithDetails[]>([]);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [newInteraction, setNewInteraction] = useState({
    interaction_type: 'Call' as InteractionType,
    interaction_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    client_company_id: '',
    client_contact_id: '',
    project_id: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [interactionsResult, companiesResult, contactsResult, projectsResult, profilesResult] =
        await Promise.all([
          supabase.from('interactions').select('*').order('interaction_date', { ascending: false }),
          supabase.from('client_companies').select('*').order('name'),
          supabase.from('client_contacts').select('*').order('last_name'),
          supabase.from('projects').select('*').order('name'),
          supabase.from('profiles').select('*'),
        ]);

      if (interactionsResult.error) throw interactionsResult.error;

      const companiesData = (companiesResult.data || []) as ClientCompany[];
      const contactsData = (contactsResult.data || []) as ClientContact[];
      const projectsData = (projectsResult.data || []) as Project[];
      const profilesData = (profilesResult.data || []) as Profile[];

      setCompanies(companiesData);
      setContacts(contactsData);
      setProjects(projectsData);
      setProfiles(profilesData);

      const interactionsWithDetails = (interactionsResult.data || []).map((interaction) => ({
        ...interaction,
        company: companiesData.find((c) => c.id === interaction.client_company_id),
        contact: contactsData.find((c) => c.id === interaction.client_contact_id),
        project: projectsData.find((p) => p.id === interaction.project_id),
        logged_by: profilesData.find((p) => p.user_id === interaction.logged_by_user_id),
      })) as InteractionWithDetails[];

      setInteractions(interactionsWithDetails);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load interactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInteraction = async () => {
    if (!newInteraction.client_company_id) {
      toast({
        title: 'Company required',
        description: 'Please select a company',
        variant: 'destructive',
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to log interactions',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('interactions').insert({
        interaction_type: newInteraction.interaction_type,
        interaction_date: newInteraction.interaction_date,
        client_company_id: newInteraction.client_company_id,
        client_contact_id: newInteraction.client_contact_id || null,
        project_id: newInteraction.project_id || null,
        notes: newInteraction.notes || null,
        logged_by_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Interaction logged',
        description: 'The interaction has been recorded',
      });

      setIsDialogOpen(false);
      setNewInteraction({
        interaction_type: 'Call',
        interaction_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        client_company_id: '',
        client_contact_id: '',
        project_id: '',
        notes: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating interaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to log interaction',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInteraction = async (interactionId: string) => {
    try {
      const { error } = await supabase
        .from('interactions')
        .delete()
        .eq('id', interactionId);

      if (error) throw error;

      // Update local state immediately to remove the deleted interaction
      setInteractions((prevInteractions) => prevInteractions.filter((i) => i.id !== interactionId));

      toast({
        title: 'Interaction deleted',
        description: 'The interaction has been permanently deleted',
      });
    } catch (error) {
      console.error('Error deleting interaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete interaction. You may not have permission.',
        variant: 'destructive',
      });
    }
  };

  const filteredContacts = contacts.filter(
    (c) => c.client_company_id === newInteraction.client_company_id
  );

  const filteredInteractions = interactions.filter((interaction) => {
    const matchesSearch =
      interaction.company?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interaction.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || interaction.interaction_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Interactions</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Interaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Log New Interaction</DialogTitle>
              <DialogDescription>Record a client interaction</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newInteraction.interaction_type}
                    onValueChange={(value: InteractionType) =>
                      setNewInteraction({ ...newInteraction, interaction_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(interactionTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Date & Time</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={newInteraction.interaction_date}
                    onChange={(e) =>
                      setNewInteraction({ ...newInteraction, interaction_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <Select
                  value={newInteraction.client_company_id}
                  onValueChange={(value) =>
                    setNewInteraction({
                      ...newInteraction,
                      client_company_id: value,
                      client_contact_id: '',
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newInteraction.client_company_id && filteredContacts.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="contact">Contact (optional)</Label>
                  <Select
                    value={newInteraction.client_contact_id}
                    onValueChange={(value) =>
                      setNewInteraction({ ...newInteraction, client_contact_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="project">Project (optional)</Label>
                <Select
                  value={newInteraction.project_id}
                  onValueChange={(value) =>
                    setNewInteraction({ ...newInteraction, project_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newInteraction.notes}
                  onChange={(e) =>
                    setNewInteraction({ ...newInteraction, notes: e.target.value })
                  }
                  placeholder="What was discussed?"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateInteraction} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging...
                  </>
                ) : (
                  'Log Interaction'
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
            placeholder="Search interactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(interactionTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Interactions Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredInteractions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">No interactions found</p>
          <Button variant="link" onClick={() => setIsDialogOpen(true)}>
            Log your first interaction
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Logged By</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInteractions.map((interaction) => (
                <TableRow key={interaction.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(interaction.interaction_date), 'MMM d, yyyy h:mm a')}
                  </TableCell>
                  <TableCell>
                    <Badge className={interactionTypeColors[interaction.interaction_type]}>
                      {interactionTypeLabels[interaction.interaction_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    {interaction.company?.name || '—'}
                  </TableCell>
                  <TableCell>
                    {interaction.contact
                      ? `${interaction.contact.first_name} ${interaction.contact.last_name}`
                      : '—'}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {interaction.notes || '—'}
                  </TableCell>
                  <TableCell>{interaction.logged_by?.name || '—'}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Interaction</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this {interactionTypeLabels[interaction.interaction_type].toLowerCase()} with {interaction.company?.name || 'unknown company'}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteInteraction(interaction.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
