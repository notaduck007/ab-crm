import { useEffect, useState } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Loader2, Mail, Phone, Star, Trash2, Building2 } from 'lucide-react';
import type { ClientContact, ClientCompany, MarketSector } from '@/types/database';

const marketSectorLabels: Record<MarketSector, string> = {
  Public: 'Public',
  ISD: 'ISD',
  Municipal: 'Municipal',
  HigherEd: 'Higher Ed',
  CharterSchool: 'Charter School',
  Private: 'Private',
  Other: 'Other',
};

interface ContactWithCompany extends ClientContact {
  company?: ClientCompany;
}

export default function Contacts() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [companies, setCompanies] = useState<ClientCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Inline company creation state
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyMarketSector, setNewCompanyMarketSector] = useState<MarketSector>('Other');
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);

  const [newContact, setNewContact] = useState({
    first_name: '',
    last_name: '',
    title: '',
    email: '',
    phone: '',
    client_company_id: '',
    is_primary_contact: false,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [contactsResult, companiesResult] = await Promise.all([
        supabase.from('client_contacts').select('*').order('last_name'),
        supabase.from('client_companies').select('*').order('name'),
      ]);

      if (contactsResult.error) throw contactsResult.error;
      if (companiesResult.error) throw companiesResult.error;

      const companiesData = (companiesResult.data || []) as ClientCompany[];
      setCompanies(companiesData);

      const contactsWithCompanies = (contactsResult.data || []).map((contact) => ({
        ...contact,
        company: companiesData.find((c) => c.id === contact.client_company_id),
      })) as ContactWithCompany[];

      setContacts(contactsWithCompanies);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast({
        title: 'Company name required',
        description: 'Please enter a company name',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingCompany(true);
    try {
      const { data, error } = await supabase
        .from('client_companies')
        .insert({
          name: newCompanyName,
          market_sector: newCompanyMarketSector,
        })
        .select()
        .single();

      if (error) throw error;

      const newCompany = data as ClientCompany;
      setCompanies((prev) => [...prev, newCompany].sort((a, b) => a.name.localeCompare(b.name)));
      setNewContact({ ...newContact, client_company_id: newCompany.id });
      setIsAddingCompany(false);
      setNewCompanyName('');
      setNewCompanyMarketSector('Other');

      toast({
        title: 'Company created',
        description: `${newCompany.name} has been added`,
      });
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: 'Error',
        description: 'Failed to create company',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingCompany(false);
    }
  };

  const handleCreateContact = async () => {
    if (!newContact.first_name.trim() || !newContact.last_name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter first and last name',
        variant: 'destructive',
      });
      return;
    }

    if (!newContact.client_company_id) {
      toast({
        title: 'Company required',
        description: 'Please select a company',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('client_contacts').insert({
        first_name: newContact.first_name,
        last_name: newContact.last_name,
        title: newContact.title || null,
        email: newContact.email || null,
        phone: newContact.phone || null,
        client_company_id: newContact.client_company_id,
        is_primary_contact: newContact.is_primary_contact,
        notes: newContact.notes || null,
      });

      if (error) throw error;

      toast({
        title: 'Contact created',
        description: 'The contact has been added',
      });

      setIsDialogOpen(false);
      setNewContact({
        first_name: '',
        last_name: '',
        title: '',
        email: '',
        phone: '',
        client_company_id: '',
        is_primary_contact: false,
        notes: '',
      });
      fetchData();
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to create contact',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = async (contactId: string, contactName: string) => {
    try {
      const { error } = await supabase
        .from('client_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      // Update local state immediately to remove the deleted contact
      setContacts((prevContacts) => prevContacts.filter((c) => c.id !== contactId));

      toast({
        title: 'Contact deleted',
        description: `${contactName} has been permanently deleted`,
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact. You may not have permission.',
        variant: 'destructive',
      });
    }
  };

  const filteredContacts = contacts.filter((contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany =
      companyFilter === 'all' || contact.client_company_id === companyFilter;
    return matchesSearch && matchesCompany;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Contacts</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
              <DialogDescription>Add a new contact to a client company</DialogDescription>
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
                    placeholder="John"
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
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company">Company</Label>
                <div className="flex gap-2">
                  <Select
                    value={newContact.client_company_id}
                    onValueChange={(value) =>
                      setNewContact({ ...newContact, client_company_id: value })
                    }
                  >
                    <SelectTrigger className="flex-1">
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
                  <Popover open={isAddingCompany} onOpenChange={setIsAddingCompany}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="icon" title="Add new company">
                        <Building2 className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <h4 className="font-medium leading-none">New Company</h4>
                          <p className="text-sm text-muted-foreground">
                            Add a new client company
                          </p>
                        </div>
                        <div className="grid gap-3">
                          <div className="grid gap-2">
                            <Label htmlFor="new_company_name">Company Name</Label>
                            <Input
                              id="new_company_name"
                              value={newCompanyName}
                              onChange={(e) => setNewCompanyName(e.target.value)}
                              placeholder="Enter company name"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="new_company_sector">Market Sector</Label>
                            <Select
                              value={newCompanyMarketSector}
                              onValueChange={(value: MarketSector) => setNewCompanyMarketSector(value)}
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
                          <Button
                            onClick={handleCreateCompany}
                            disabled={isCreatingCompany || !newCompanyName.trim()}
                            size="sm"
                          >
                            {isCreatingCompany ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-3 w-3" />
                                Add Company
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newContact.title}
                  onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
                  placeholder="Project Manager"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    placeholder="john@company.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="primary"
                  checked={newContact.is_primary_contact}
                  onCheckedChange={(checked) =>
                    setNewContact({ ...newContact, is_primary_contact: checked as boolean })
                  }
                />
                <Label htmlFor="primary" className="font-normal">
                  Primary contact for this company
                </Label>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={newContact.notes}
                  onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateContact} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Contact'
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
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <p className="text-muted-foreground">No contacts found</p>
          <Button variant="link" onClick={() => setIsDialogOpen(true)}>
            Add your first contact
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </span>
                      {contact.is_primary_contact && (
                        <Star className="h-4 w-4 fill-current text-primary" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{contact.company?.name || '—'}</Badge>
                  </TableCell>
                  <TableCell>{contact.title || '—'}</TableCell>
                  <TableCell>
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Mail className="h-3 w-3" />
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
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </a>
                    ) : (
                      '—'
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
                          <AlertDialogTitle>Delete Contact</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {contact.first_name} {contact.last_name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteContact(contact.id, `${contact.first_name} ${contact.last_name}`)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
