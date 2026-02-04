import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Building2,
  Users,
  Calendar,
  DollarSign,
  FileText,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import type {
  Project,
  ClientCompany,
  Profile,
  MarketSector,
  ProjectStatus,
  PublicTrackingType,
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

const projectStatusLabels: Record<ProjectStatus, string> = {
  Prospect: 'Prospect',
  ActivePursuit: 'Active Pursuit',
  Awarded: 'Awarded',
  Lost: 'Lost',
};

const publicTrackingLabels: Record<PublicTrackingType, string> = {
  Bond: 'Bond',
  Charter: 'Charter',
  CoopContract: 'Coop Contract',
  RFQ: 'RFQ',
  RFP: 'RFP',
  Other: 'Other',
};

const statusColors: Record<ProjectStatus, string> = {
  Prospect: 'bg-muted text-muted-foreground',
  ActivePursuit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Awarded: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [associatedClients, setAssociatedClients] = useState<ClientCompany[]>([]);
  const [teamMembers, setTeamMembers] = useState<Profile[]>([]);
  const [allClients, setAllClients] = useState<ClientCompany[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);

  // Edit state
  const [editedProject, setEditedProject] = useState<Partial<Project>>({});

  // Dialogs
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState('');

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    try {
      setIsLoading(true);

      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (projectError) throw projectError;
      if (!projectData) {
        navigate('/pipeline');
        return;
      }

      setProject(projectData as Project);
      setEditedProject(projectData);

      // Fetch associated client companies
      const { data: projectClientsData, error: projectClientsError } = await supabase
        .from('project_client_companies')
        .select('client_company_id')
        .eq('project_id', id);

      if (projectClientsError) throw projectClientsError;

      if (projectClientsData && projectClientsData.length > 0) {
        const clientIds = projectClientsData.map((pc) => pc.client_company_id);
        const { data: clientsData, error: clientsError } = await supabase
          .from('client_companies')
          .select('*')
          .in('id', clientIds);

        if (clientsError) throw clientsError;
        setAssociatedClients((clientsData as ClientCompany[]) || []);
      } else {
        setAssociatedClients([]);
      }

      // Fetch team members
      const { data: teamData, error: teamError } = await supabase
        .from('project_team_members')
        .select('user_id')
        .eq('project_id', id);

      if (teamError) throw teamError;

      if (teamData && teamData.length > 0) {
        const userIds = teamData.map((tm) => tm.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;
        setTeamMembers((profilesData as Profile[]) || []);
      } else {
        setTeamMembers([]);
      }

      // Fetch all clients for add dialog
      const { data: allClientsData, error: allClientsError } = await supabase
        .from('client_companies')
        .select('*')
        .order('name');

      if (allClientsError) throw allClientsError;
      setAllClients((allClientsData as ClientCompany[]) || []);

      // Fetch all profiles for team dialog
      const { data: allProfilesData, error: allProfilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (allProfilesError) throw allProfilesError;
      setAllProfiles((allProfilesData as Profile[]) || []);
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load project data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProject = async () => {
    if (!project || !editedProject.name?.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({
          name: editedProject.name,
          market_sector: editedProject.market_sector,
          public_tracking_type: editedProject.public_tracking_type,
          estimated_value: editedProject.estimated_value,
          status: editedProject.status,
          anticipated_rfq_date: editedProject.anticipated_rfq_date || null,
          anticipated_rfp_date: editedProject.anticipated_rfp_date || null,
          award_date: editedProject.award_date || null,
          notes: editedProject.notes,
        })
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Project information updated successfully',
      });

      fetchProjectData();
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddClient = async () => {
    if (!selectedClientId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('project_client_companies').insert({
        project_id: id,
        client_company_id: selectedClientId,
      });

      if (error) throw error;

      toast({
        title: 'Client added',
        description: 'Client has been associated with this project',
      });

      setIsClientDialogOpen(false);
      setSelectedClientId('');
      fetchProjectData();
    } catch (error) {
      console.error('Error adding client:', error);
      toast({
        title: 'Error',
        description: 'Failed to add client',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveClient = async (clientId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('project_client_companies')
        .delete()
        .eq('project_id', id)
        .eq('client_company_id', clientId);

      if (error) throw error;

      toast({
        title: 'Client removed',
        description: 'Client has been removed from this project',
      });

      fetchProjectData();
    } catch (error) {
      console.error('Error removing client:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove client',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTeamMember = async () => {
    if (!selectedTeamMemberId) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.from('project_team_members').insert({
        project_id: id,
        user_id: selectedTeamMemberId,
      });

      if (error) throw error;

      toast({
        title: 'Team member added',
        description: 'Team member has been added to this project',
      });

      setIsTeamDialogOpen(false);
      setSelectedTeamMemberId('');
      fetchProjectData();
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add team member',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveTeamMember = async (userId: string) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('project_team_members')
        .delete()
        .eq('project_id', id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Team member removed',
        description: 'Team member has been removed from this project',
      });

      fetchProjectData();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove team member',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
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

  // Get clients not already associated
  const availableClients = allClients.filter(
    (c) => !associatedClients.find((ac) => ac.id === c.id)
  );

  // Get team members not already on project
  const availableTeamMembers = allProfiles.filter(
    (p) => !teamMembers.find((tm) => tm.user_id === p.user_id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={() => navigate('/pipeline')}>
          Back to pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/pipeline')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{marketSectorLabels[project.market_sector]}</Badge>
            <Badge className={statusColors[project.status]}>
              {projectStatusLabels[project.status]}
            </Badge>
            <Badge variant="secondary">{publicTrackingLabels[project.public_tracking_type]}</Badge>
          </div>
        </div>
        <Button onClick={handleSaveProject} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="clients">Clients ({associatedClients.length})</TabsTrigger>
          <TabsTrigger value="team">Team ({teamMembers.length})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Project Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={editedProject.name || ''}
                    onChange={(e) =>
                      setEditedProject({ ...editedProject, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sector">Market Sector</Label>
                    <Select
                      value={editedProject.market_sector}
                      onValueChange={(value: MarketSector) =>
                        setEditedProject({ ...editedProject, market_sector: value })
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
                    <Label htmlFor="tracking">Tracking Type</Label>
                    <Select
                      value={editedProject.public_tracking_type}
                      onValueChange={(value: PublicTrackingType) =>
                        setEditedProject({ ...editedProject, public_tracking_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(publicTrackingLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="value">Estimated Value</Label>
                    <CurrencyInput
                      id="value"
                      value={editedProject.estimated_value || 0}
                      onChange={(value) =>
                        setEditedProject({
                          ...editedProject,
                          estimated_value: value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={editedProject.status}
                      onValueChange={(value: ProjectStatus) =>
                        setEditedProject({ ...editedProject, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(projectStatusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={editedProject.notes || ''}
                    onChange={(e) =>
                      setEditedProject({ ...editedProject, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dates Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="rfq_date">Anticipated RFQ Date</Label>
                  <Input
                    id="rfq_date"
                    type="date"
                    value={editedProject.anticipated_rfq_date || ''}
                    onChange={(e) =>
                      setEditedProject({
                        ...editedProject,
                        anticipated_rfq_date: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rfp_date">Anticipated RFP Date</Label>
                  <Input
                    id="rfp_date"
                    type="date"
                    value={editedProject.anticipated_rfp_date || ''}
                    onChange={(e) =>
                      setEditedProject({
                        ...editedProject,
                        anticipated_rfp_date: e.target.value || null,
                      })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="award_date">Award Date</Label>
                  <Input
                    id="award_date"
                    type="date"
                    value={editedProject.award_date || ''}
                    onChange={(e) =>
                      setEditedProject({
                        ...editedProject,
                        award_date: e.target.value || null,
                      })
                    }
                  />
                </div>

                {/* Summary Stats */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Value</span>
                    <span className="font-medium">
                      {formatCurrency(Number(project.estimated_value) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {format(new Date(project.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={availableClients.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Client to Project</DialogTitle>
                  <DialogDescription>
                    Associate a client company with this project
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="client">Client Company</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsClientDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddClient} disabled={isSaving || !selectedClientId}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Add Client
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {associatedClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No clients associated</p>
              <Button
                variant="link"
                onClick={() => setIsClientDialogOpen(true)}
                disabled={availableClients.length === 0}
              >
                Add a client
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {associatedClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {marketSectorLabels[client.market_sector]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveClient(client.id)}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={availableTeamMembers.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Team Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                  <DialogDescription>Add a team member to this project</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="team-member">Team Member</Label>
                  <Select value={selectedTeamMemberId} onValueChange={setSelectedTeamMemberId}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeamMembers.map((profile) => (
                        <SelectItem key={profile.user_id} value={profile.user_id}>
                          {profile.name} ({profile.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTeamDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddTeamMember}
                    disabled={isSaving || !selectedTeamMemberId}
                  >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Add Team Member
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {teamMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No team members assigned</p>
              <Button
                variant="link"
                onClick={() => setIsTeamDialogOpen(true)}
                disabled={availableTeamMembers.length === 0}
              >
                Add a team member
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.user_id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTeamMember(member.user_id)}
                          disabled={isSaving}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
