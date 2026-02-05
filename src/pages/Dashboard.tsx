import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  Calendar,
  DollarSign,
  FolderKanban,
} from 'lucide-react';
import { format, addDays, isWithinInterval } from 'date-fns';
import { AIRelationshipAdvisor } from '@/components/dashboard/AIRelationshipAdvisor';
import { AIChatAssistant } from '@/components/dashboard/AIChatAssistant';
import type {
  ClientCompany,
  Relationship,
  Project,
  Interaction,
  Profile,
} from '@/types/database';

interface DashboardStats {
  totalPipelineValue: number;
  activeProjects: number;
  totalClients: number;
  atRiskRelationships: number;
}

interface UpcomingMilestone {
  project: Project;
  type: 'RFQ' | 'RFP' | 'Award';
  date: Date;
}

interface RecentActivity {
  interaction: Interaction;
  company?: ClientCompany;
  loggedBy?: Profile;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPipelineValue: 0,
    activeProjects: 0,
    totalClients: 0,
    atRiskRelationships: 0,
  });
  const [milestones, setMilestones] = useState<UpcomingMilestone[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [atRiskRelationships, setAtRiskRelationships] = useState<
    Array<{ relationship: Relationship; company: ClientCompany }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch projects for pipeline value and milestones
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .in('status', ['Prospect', 'ActivePursuit']);

      // Fetch client companies
      const { data: companies } = await supabase
        .from('client_companies')
        .select('*');

      // Fetch relationships
      const { data: relationships } = await supabase
        .from('relationships')
        .select('*');

      // Fetch recent interactions with related data
      const { data: interactions } = await supabase
        .from('interactions')
        .select('*')
        .order('interaction_date', { ascending: false })
        .limit(5);

      // Fetch profiles for activity feed
      const { data: profiles } = await supabase.from('profiles').select('*');

      // Calculate stats
      const totalPipelineValue =
        projects?.reduce((sum, p) => sum + (Number(p.estimated_value) || 0), 0) || 0;
      const activeProjects = projects?.length || 0;
      const totalClients = companies?.length || 0;
      const atRiskCount = relationships?.filter((r) => r.is_potentially_cold).length || 0;

      setStats({
        totalPipelineValue,
        activeProjects,
        totalClients,
        atRiskRelationships: atRiskCount,
      });

      // Calculate upcoming milestones
      const now = new Date();
      const in90Days = addDays(now, 90);
      const upcomingMilestones: UpcomingMilestone[] = [];

      projects?.forEach((project) => {
        const checkDate = (dateStr: string | null, type: 'RFQ' | 'RFP' | 'Award') => {
          if (dateStr) {
            const date = new Date(dateStr);
            if (isWithinInterval(date, { start: now, end: in90Days })) {
              upcomingMilestones.push({ project: project as Project, type, date });
            }
          }
        };

        checkDate(project.anticipated_rfq_date, 'RFQ');
        checkDate(project.anticipated_rfp_date, 'RFP');
        checkDate(project.award_date, 'Award');
      });

      upcomingMilestones.sort((a, b) => a.date.getTime() - b.date.getTime());
      setMilestones(upcomingMilestones.slice(0, 5));

      // Set at-risk relationships
      const atRisk =
        relationships
          ?.filter((r) => r.is_potentially_cold)
          .map((relationship) => ({
            relationship: relationship as Relationship,
            company: companies?.find((c) => c.id === relationship.client_company_id) as ClientCompany,
          }))
          .filter((item) => item.company) || [];
      setAtRiskRelationships(atRisk.slice(0, 5));

      // Set recent activity
      const activity =
        interactions?.map((interaction) => ({
          interaction: interaction as Interaction,
          company: companies?.find((c) => c.id === interaction.client_company_id) as ClientCompany,
          loggedBy: profiles?.find((p) => p.user_id === interaction.logged_by_user_id) as Profile,
        })) || [];
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
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

  const getInteractionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      Call: 'Call',
      Email: 'Email',
      Meeting: 'Meeting',
      SiteVisit: 'Site Visit',
      Conference: 'Conference',
      Other: 'Other',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPipelineValue)}</div>
            <p className="text-xs text-muted-foreground">Active pursuits value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProjects}</div>
            <p className="text-xs text-muted-foreground">In prospect or pursuit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">Companies in database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats.atRiskRelationships}
            </div>
            <p className="text-xs text-muted-foreground">Relationships need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Relationship Advisor */}
      <AIRelationshipAdvisor atRiskRelationships={atRiskRelationships} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* At-Risk Relationships */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              At-Risk Relationships
            </CardTitle>
            <CardDescription>No interaction in 30+ days</CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskRelationships.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No at-risk relationships. Great job staying connected!
              </p>
            ) : (
              <div className="space-y-3">
                {atRiskRelationships.map(({ relationship, company }) => (
                  <div
                    key={relationship.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Last contact:{' '}
                        {relationship.last_interaction_date
                          ? format(new Date(relationship.last_interaction_date), 'MMM d, yyyy')
                          : 'Never'}
                      </p>
                    </div>
                    <Badge variant="destructive">Cold</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Milestones
            </CardTitle>
            <CardDescription>RFQ/RFP/Award dates in next 90 days</CardDescription>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming milestones in the next 90 days.
              </p>
            ) : (
              <div className="space-y-3">
                {milestones.map((milestone, index) => (
                  <div
                    key={`${milestone.project.id}-${milestone.type}-${index}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{milestone.project.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(milestone.date, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="secondary">{milestone.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and AI Chat */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest interactions across all relationships</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity to show.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.map(({ interaction, company, loggedBy }) => (
                  <div
                    key={interaction.id}
                    className="flex items-start gap-4 rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{company?.name || 'Unknown Company'}</p>
                        <Badge variant="outline">
                          {getInteractionTypeLabel(interaction.interaction_type)}
                        </Badge>
                      </div>
                      {interaction.notes && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {interaction.notes}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {loggedBy?.name || 'Unknown'} •{' '}
                        {format(new Date(interaction.interaction_date), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Chat Assistant */}
        <AIChatAssistant />
      </div>
    </div>
  );
}
