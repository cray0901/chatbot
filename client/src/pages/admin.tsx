import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { insertAdminConfigSchema, type InsertAdminConfig } from '@shared/schema';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isAdmin: boolean;
  tokenQuota: number;
  tokenUsed: number;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminConfig {
  id: number | null;
  apiProvider: string;
  apiKey: string;
  apiEndpoint: string;
  modelName: string;
  defaultTokenQuota: number;
  isActive: boolean;
}

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch admin config
  const { data: config, isLoading: configLoading } = useQuery<AdminConfig>({
    queryKey: ['/api/admin/config'],
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
  });

  // Config form
  const configForm = useForm<InsertAdminConfig>({
    resolver: zodResolver(insertAdminConfigSchema),
    defaultValues: config || {
      apiProvider: 'openai',
      apiKey: '',
      apiEndpoint: '',
      modelName: 'gpt-4',
      defaultTokenQuota: 10000,
    },
  });

  // Reset form when config data loads
  useEffect(() => {
    if (config) {
      configForm.reset({
        apiProvider: config.apiProvider,
        apiKey: config.apiKey === '***hidden***' ? '' : config.apiKey,
        apiEndpoint: config.apiEndpoint,
        modelName: config.modelName,
        defaultTokenQuota: config.defaultTokenQuota,
      });
    }
  }, [config, configForm]);

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (data: InsertAdminConfig) => {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update configuration');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Configuration updated',
        description: 'API configuration has been saved successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/config'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle user status mutation
  const toggleUserMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'User status updated',
        description: 'User status has been changed successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update user quota mutation
  const updateQuotaMutation = useMutation({
    mutationFn: async ({ userId, tokenQuota }: { userId: string; tokenQuota: number }) => {
      const response = await fetch(`/api/admin/users/${userId}/quota`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenQuota }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user quota');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'User quota updated',
        description: 'User quota has been changed successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onConfigSubmit = (data: InsertAdminConfig) => {
    updateConfigMutation.mutate(data);
  };

  const handleUserStatusToggle = (user: User) => {
    toggleUserMutation.mutate({ userId: user.id, isActive: !user.isActive });
  };

  const handleQuotaUpdate = (user: User, newQuota: number) => {
    updateQuotaMutation.mutate({ userId: user.id, tokenQuota: newQuota });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      <Tabs defaultValue="api-config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-config">API Configuration</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>

        <TabsContent value="api-config">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure the AI API provider, endpoints, and default settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div>Loading configuration...</div>
              ) : (
                <form onSubmit={configForm.handleSubmit(onConfigSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="apiProvider">API Provider</Label>
                      <Select
                        value={configForm.watch('apiProvider')}
                        onValueChange={(value) => configForm.setValue('apiProvider', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="anthropic">Anthropic</SelectItem>
                          <SelectItem value="qwen">Qwen</SelectItem>
                          <SelectItem value="deepseek">DeepSeek</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="modelName">Model Name</Label>
                      <Input
                        id="modelName"
                        placeholder="gpt-4, claude-3, etc."
                        {...configForm.register('modelName')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      placeholder="Enter API key"
                      {...configForm.register('apiKey')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiEndpoint">API Endpoint (Optional)</Label>
                    <Input
                      id="apiEndpoint"
                      placeholder="https://api.openai.com/v1"
                      {...configForm.register('apiEndpoint')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultTokenQuota">Default Token Quota</Label>
                    <Input
                      id="defaultTokenQuota"
                      type="number"
                      placeholder="10000"
                      {...configForm.register('defaultTokenQuota', { valueAsNumber: true })}
                    />
                  </div>

                  <Button type="submit" disabled={updateConfigMutation.isPending}>
                    {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user accounts, quotas, and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div>Loading users...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Token Usage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            {user.emailVerified && (
                              <Badge variant="outline">Verified</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isAdmin ? 'destructive' : 'outline'}>
                            {user.isAdmin ? 'Admin' : 'User'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {user.tokenUsed} / {user.tokenQuota}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant={user.isActive ? 'destructive' : 'default'}
                              onClick={() => handleUserStatusToggle(user)}
                              disabled={toggleUserMutation.isPending}
                            >
                              {user.isActive ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedUser(user)}
                            >
                              Edit Quota
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Quota Edit Dialog */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Edit User Quota</CardTitle>
              <CardDescription>
                Update token quota for {selectedUser.firstName} {selectedUser.lastName}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newQuota = parseInt(formData.get('quota') as string);
                  handleQuotaUpdate(selectedUser, newQuota);
                  setSelectedUser(null);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="quota">Token Quota</Label>
                  <Input
                    id="quota"
                    name="quota"
                    type="number"
                    defaultValue={selectedUser.tokenQuota}
                    min="0"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateQuotaMutation.isPending}>
                    {updateQuotaMutation.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}