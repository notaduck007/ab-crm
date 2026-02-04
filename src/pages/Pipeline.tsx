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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type {
  Project,
  MarketSector,
  ProjectStatus,
  PublicTrackingType,
  MARKET_SECTOR_LABELS,
  PROJECT_STATUS_LABELS,
  PUBLIC_TRACKING_LABELS,
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

export default function Pipeline() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New project form state
  const [newProject, setNewProject] = useState({
    name: '',
    market_sector: 'Other' as MarketSector,
    public_tracking_type: 'Other' as PublicTrackingType,
    estimated_value: '',
    status: 'Prospect' as ProjectStatus,
    anticipated_rfq_date: '',
    anticipated_rfp_date: '',
    award_date: '',
    notes: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects((data as Project[]) || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to load projects',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('projects').insert({
        name: newProject.name,
        market_sector: newProject.market_sector,
        public_tracking_type: newProject.public_tracking_type,
        estimated_value: newProject.estimated_value ? parseFloat(newProject.estimated_value) : 0,
        status: newProject.status,
        anticipated_rfq_date: newProject.anticipated_rfq_date || null,
        anticipated_rfp_date: newProject.anticipated_rfp_date || null,
        award_date: newProject.award_date || null,
        notes: newProject.notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Project created',
        description: 'The project has been added to the pipeline',
      });

      setIsDialogOpen(false);
      setNewProject({
        name: '',
        market_sector: 'Other',
        public_tracking_type: 'Other',
        estimated_value: '',
        status: 'Prospect',
        anticipated_rfq_date: '',
        anticipated_rfp_date: '',
        award_date: '',
        notes: '',
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
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

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    const matchesSector = sectorFilter === 'all' || project.market_sector === sectorFilter;
    return matchesSearch && matchesStatus && matchesSector;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Pipeline</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Project</DialogTitle>
              <DialogDescription>
                Create a new project to track in your pipeline
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  placeholder="Enter project name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="sector">Market Sector</Label>
                  <Select
                    value={newProject.market_sector}
                    onValueChange={(value: MarketSector) =>
                      setNewProject({ ...newProject, market_sector: value })
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
                    value={newProject.public_tracking_type}
                    onValueChange={(value: PublicTrackingType) =>
                      setNewProject({ ...newProject, public_tracking_type: value })
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
                  <Input
                    id="value"
                    type="number"
                    value={newProject.estimated_value}
                    onChange={(e) =>
                      setNewProject({ ...newProject, estimated_value: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newProject.status}
                    onValueChange={(value: ProjectStatus) =>
                      setNewProject({ ...newProject, status: value })
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
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="rfq_date">Anticipated RFQ</Label>
                  <Input
                    id="rfq_date"
                    type="date"
                    value={newProject.anticipated_rfq_date}
                    onChange={(e) =>
                      setNewProject({ ...newProject, anticipated_rfq_date: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rfp_date">Anticipated RFP</Label>
                  <Input
                    id="rfp_date"
                    type="date"
                    value={newProject.anticipated_rfp_date}
                    onChange={(e) =>
                      setNewProject({ ...newProject, anticipated_rfp_date: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="award_date">Award Date</Label>
                  <Input
                    id="award_date"
                    type="date"
                    value={newProject.award_date}
                    onChange={(e) =>
                      setNewProject({ ...newProject, award_date: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newProject.notes}
                  onChange={(e) => setNewProject({ ...newProject, notes: e.target.value })}
                  placeholder="Additional notes about this project"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Project'
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
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(projectStatusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Projects Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">No projects found</p>
          <Button variant="link" onClick={() => setIsDialogOpen(true)}>
            Add your first project
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Sector</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>RFP Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {marketSectorLabels[project.market_sector]}
                    </Badge>
                  </TableCell>
                  <TableCell>{publicTrackingLabels[project.public_tracking_type]}</TableCell>
                  <TableCell>{formatCurrency(Number(project.estimated_value))}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[project.status]}>
                      {projectStatusLabels[project.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.anticipated_rfp_date
                      ? format(new Date(project.anticipated_rfp_date), 'MMM d, yyyy')
                      : '—'}
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
