import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Phone,
  Mail,
  Calendar,
  Building2,
  Users,
  MessageSquare,
  AlertTriangle,
  User,
} from 'lucide-react';
import { format } from 'date-fns';
import type {
  ClientCompany,
  ClientContact,
  Relationship,
  Interaction,
  MarketSector,
  RelationshipStage,
  RelationshipStrength,
  InteractionType,
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

const strengthLabels: Record<RelationshipStrength, string> = {
  Cold: 'Cold',
  Neutral: 'Neutral',
  Warm: 'Warm',
};

const strengthColors: Record<RelationshipStrength, string> = {
  Cold: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  Neutral: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Warm: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const interactionTypeLabels: Record<InteractionType, string> = {
  Call: 'Call',
  Email: 'Email',
  Meeting: 'Meeting',
  SiteVisit: 'Site Visit',
  Conference: 'Conference',
  Other: 'Other',
};

const interactionTypeIcons: Record<InteractionType, React.ReactNode> = {
  Call: <Phone className="h-4 w-4" />,
  Email: <Mail className="h-4 w-4" />,
  Meeting: <Users className="h-4 w-4" />,
  SiteVisit: <Building2 className="h-4 w-4" />,
  Conference: <Users className="h-4 w-4" />,
  Other: <MessageSquare className="h-4 w-4" />,
};

interface InteractionWithContact extends Interaction {
  client_contact?: ClientContact | null;
}

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [client, setClient] = useState<ClientCompany | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [interactions, setInteractions] = useState<InteractionWithContact[]>([]);

  // Edit states
  const [editedClient, setEditedClient] = useState<Partial<ClientCompany>>({});
  const [editedRelationship, setEditedRelationship] = useState<Partial<Relationship>>({});

  // Add contact dialog
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    title: '',
    email: '',
    phone: '',
    is_primary_contact: false,
    notes: '',
  });

  // Add interaction dialog
  const [isInteractionDialogOpen, setIsInteractionDialogOpen] = useState(false);
  const [newInteraction, setNewInteraction] = useState({
    interaction_type: 'Meeting' as InteractionType,
    interaction_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    client_contact_id: '',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      fetchClientData();
    }
  }, [id]);

  const fetchClientData = async () => {
    try {
      setIsLoading(true);

      // Fetch client company
      const { data: clientData, error: clientError } = await supabase
        .from('client_companies')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (clientError) throw clientError;
      if (!clientData) {
        navigate('/clients');
        return;
      }

      setClient(clientData as ClientCompany);
      setEditedClient(clientData);

      // Fetch relationship
      const { data: relationshipData, error: relationshipError } = await supabase
        .from('relationships')
        .select('*')
        .eq('client_company_id', id)
        .maybeSingle();

      if (relationshipError) throw relationshipError;
      setRelationship(relationshipData as Relationship | null);
      if (relationshipData) {
        setEditedRelationship(relationshipData);
      }

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_company_id', id)
        .order('is_primary_contact', { ascending: false })
        .order('last_name');

      if (contactsError) throw contactsError;
      setContacts((contactsData as ClientContact[]) || []);

      // Fetch interactions with contact info
      const { data: interactionsData, error: interactionsError } = await supabase
        .from('interactions')
        .select('*, client_contacts(*)')
        .eq('client_company_id', id)
        .order('interaction_date', { ascending: false });

      if (interactionsError) throw interactionsError;
      const formattedInteractions = (interactionsData || []).map((i) => ({
        ...i,
        client_contact: i.client_contacts,
      })) as InteractionWithContact[];
      setInteractions(formattedInteractions);
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClient = async () => {
    if (!client || !editedClient.name?.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a company name',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update client
      const { error: clientError } = await supabase
        .from('client_companies')
        .update({
          name: editedClient.name,
          market_sector: editedClient.market_sector,
          notes: editedClient.notes,
        })
        .eq('id', client.id);

      if (clientError) throw clientError;

      // Update relationship if exists
      if (relationship && editedRelationship) {
        const { error: relationshipError } = await supabase
          .from('relationships')
          .update({
            stage: editedRelationship.stage,
            strength: editedRelationship.strength,
            estimated_pursuit_value: editedRelationship.estimated_pursuit_value,
            notes: editedRelationship.notes,
          })
          .eq('id', relationship.id);

        if (relationshipError) throw relationshipError;
      }

      toast({
        title: 'Saved',
        description: 'Client information updated successfully',
      });

      fetchClientData();
    } catch (error) {
      console.error('Error saving client:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.first_name.trim() || !newContact.last_name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter first and last name',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('client_contacts').insert({
        client_company_id: id,
        first_name: newContact.first_name,
        last_name: newContact.last_name,
        title: newContact.title || null,
        email: newContact.email || null,
        phone: newContact.phone || null,
        is_primary_contact: newContact.is_primary_contact,
        notes: newContact.notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Contact added',
        description: 'The contact has been added successfully',
      });

      setIsContactDialogOpen(false);
      setNewContact({
        first_name: '',
        last_name: '',
        title: '',
        email: '',
        phone: '',
        is_primary_contact: false,
        notes: '',
      });
      fetchClientData();
    } catch (error) {
      console.error('Error adding contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to add contact',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const contactId = newInteraction.client_contact_id && newInteraction.client_contact_id !== 'none' 
        ? newInteraction.client_contact_id 
        : null;
      
      const { error } = await supabase.from('interactions').insert({
        client_company_id: id,
        interaction_type: newInteraction.interaction_type,
        interaction_date: newInteraction.interaction_date,
        client_contact_id: contactId,
        notes: newInteraction.notes || null,
        logged_by_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: 'Interaction logged',
        description: 'The interaction has been recorded',
      });

      setIsInteractionDialogOpen(false);
      setNewInteraction({
        interaction_type: 'Meeting',
        interaction_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        client_contact_id: '',
        notes: '',
      });
      fetchClientData();
    } catch (error) {
      console.error('Error adding interaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to log interaction',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Client not found</p>
        <Button variant="link" onClick={() => navigate('/clients')}>
          Back to clients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{marketSectorLabels[client.market_sector]}</Badge>
            {relationship && (
              <>
                <Badge className={strengthColors[relationship.strength]}>
                  {relationship.strength}
                </Badge>
                {relationship.is_potentially_cold && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    At Risk
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
        <Button onClick={handleSaveClient} disabled={isSaving}>
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
          <TabsTrigger value="contacts">Contacts ({contacts.length})</TabsTrigger>
          <TabsTrigger value="interactions">Interactions ({interactions.length})</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Company Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Company Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Company Name</Label>
                  <Input
                    id="name"
                    value={editedClient.name || ''}
                    onChange={(e) =>
                      setEditedClient({ ...editedClient, name: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sector">Market Sector</Label>
                  <Select
                    value={editedClient.market_sector}
                    onValueChange={(value: MarketSector) =>
                      setEditedClient({ ...editedClient, market_sector: value })
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
                  <Label htmlFor="company-notes">Notes</Label>
                  <Textarea
                    id="company-notes"
                    value={editedClient.notes || ''}
                    onChange={(e) =>
                      setEditedClient({ ...editedClient, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Relationship Card */}
            {relationship && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Relationship
                  </CardTitle>
                  <CardDescription>
                    Last interaction:{' '}
                    {relationship.last_interaction_date
                      ? format(new Date(relationship.last_interaction_date), 'MMM d, yyyy')
                      : 'Never'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="stage">Stage</Label>
                    <Select
                      value={editedRelationship.stage}
                      onValueChange={(value: RelationshipStage) =>
                        setEditedRelationship({ ...editedRelationship, stage: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="strength">Strength</Label>
                    <Select
                      value={editedRelationship.strength}
                      onValueChange={(value: RelationshipStrength) =>
                        setEditedRelationship({ ...editedRelationship, strength: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(strengthLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="value">Estimated Pursuit Value</Label>
                    <Input
                      id="value"
                      type="number"
                      value={editedRelationship.estimated_pursuit_value || 0}
                      onChange={(e) =>
                        setEditedRelationship({
                          ...editedRelationship,
                          estimated_pursuit_value: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="relationship-notes">Notes</Label>
                    <Textarea
                      id="relationship-notes"
                      value={editedRelationship.notes || ''}
                      onChange={(e) =>
                        setEditedRelationship({ ...editedRelationship, notes: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                  <DialogDescription>
                    Add a contact person for {client.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={newContact.first_name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, first_name: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={newContact.last_name}
                        onChange={(e) =>
                          setNewContact({ ...newContact, last_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newContact.title}
                      onChange={(e) =>
                        setNewContact({ ...newContact, title: e.target.value })
                      }
                      placeholder="e.g., Director of Facilities"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={newContact.email}
                        onChange={(e) =>
                          setNewContact({ ...newContact, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newContact.phone}
                        onChange={(e) =>
                          setNewContact({ ...newContact, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="contact-notes">Notes</Label>
                    <Textarea
                      id="contact-notes"
                      value={newContact.notes}
                      onChange={(e) =>
                        setNewContact({ ...newContact, notes: e.target.value })
                      }
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsContactDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddContact} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Add Contact
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No contacts yet</p>
              <Button variant="link" onClick={() => setIsContactDialogOpen(true)}>
                Add the first contact
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Primary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </TableCell>
                      <TableCell>{contact.title || '—'}</TableCell>
                      <TableCell>
                        {contact.email ? (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-primary hover:underline"
                          >
                            {contact.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.phone ? (
                          <a
                            href={`tel:${contact.phone}`}
                            className="text-primary hover:underline"
                          >
                            {contact.phone}
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.is_primary_contact && (
                          <Badge variant="secondary">Primary</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Interactions Tab */}
        <TabsContent value="interactions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isInteractionDialogOpen} onOpenChange={setIsInteractionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Log Interaction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Interaction</DialogTitle>
                  <DialogDescription>
                    Record an interaction with {client.name}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="interaction_type">Type</Label>
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
                      <Label htmlFor="interaction_date">Date & Time</Label>
                      <Input
                        id="interaction_date"
                        type="datetime-local"
                        value={newInteraction.interaction_date}
                        onChange={(e) =>
                          setNewInteraction({
                            ...newInteraction,
                            interaction_date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
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
                        <SelectItem value="none">No specific contact</SelectItem>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="interaction-notes">Notes</Label>
                    <Textarea
                      id="interaction-notes"
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
                  <Button
                    variant="outline"
                    onClick={() => setIsInteractionDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddInteraction} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Log Interaction
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {interactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No interactions logged</p>
              <Button variant="link" onClick={() => setIsInteractionDialogOpen(true)}>
                Log the first interaction
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {interactions.map((interaction) => (
                <Card key={interaction.id}>
                  <CardContent className="flex items-start gap-4 pt-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {interactionTypeIcons[interaction.interaction_type]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">
                          {interactionTypeLabels[interaction.interaction_type]}
                          {interaction.client_contact && (
                            <span className="text-muted-foreground font-normal">
                              {' '}
                              with {interaction.client_contact.first_name}{' '}
                              {interaction.client_contact.last_name}
                            </span>
                          )}
                        </div>
                        <time className="text-sm text-muted-foreground">
                          {format(new Date(interaction.interaction_date), 'MMM d, yyyy')}
                        </time>
                      </div>
                      {interaction.notes && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {interaction.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
