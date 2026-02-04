import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { Profile, UserRole, AppRole } from '@/types/database';

interface UserWithRole extends Profile {
  role: AppRole;
  role_id?: string;
}

export default function Settings() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase.from('user_roles').select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: (userRole?.role as AppRole) || 'user',
          role_id: userRole?.id,
        };
      }) as UserWithRole[];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole, roleId?: string) => {
    if (userId === user?.id) {
      toast({
        title: 'Cannot change own role',
        description: 'You cannot change your own role',
        variant: 'destructive',
      });
      return;
    }

    setUpdatingUserId(userId);
    try {
      if (roleId) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('id', roleId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase.from('user_roles').insert({
          user_id: userId,
          role: newRole,
        });

        if (error) throw error;
      }

      toast({
        title: 'Role updated',
        description: 'User role has been updated successfully',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">
          You need administrator privileges to access this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>User Management</CardTitle>
          </div>
          <CardDescription>Manage user roles and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {userItem.name}
                        {userItem.user_id === user?.id && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <Select
                        value={userItem.role}
                        onValueChange={(value: AppRole) =>
                          handleRoleChange(userItem.user_id, value, userItem.role_id)
                        }
                        disabled={userItem.user_id === user?.id || updatingUserId === userItem.user_id}
                      >
                        <SelectTrigger className="w-[120px]">
                          {updatingUserId === userItem.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {format(new Date(userItem.created_at), 'MMM d, yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
