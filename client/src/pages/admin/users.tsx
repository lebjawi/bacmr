import AdminLayout from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { adminApi, contentApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { UserCheck, UserX, Shield, ShieldOff } from "lucide-react";
import type { User, Stream } from "@shared/schema";

type SafeUser = Omit<User, "password">;

export default function AdminUsers() {
  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => adminApi.getUsers(),
  });

  const { data: streams } = useQuery<Stream[]>({
    queryKey: ["/api/streams"],
    queryFn: () => contentApi.getStreams(),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      adminApi.updateUser(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const toggleRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      adminApi.updateUser(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
  });

  const getStreamName = (streamId: number | null) => {
    if (!streamId || !streams) return "—";
    const stream = streams.find((s) => s.id === streamId);
    return stream ? stream.code : "—";
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const activeCount = users?.filter((u) => u.isActive).length ?? 0;
  const studentCount = users?.filter((u) => u.role === "student").length ?? 0;
  const adminCount = users?.filter((u) => u.role === "admin").length ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif font-bold" data-testid="text-admin-users-title">
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            View, activate, and disable user accounts
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card data-testid="card-stat-total-users">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-3xl font-bold">{users?.length ?? 0}</div>
              )}
            </CardContent>
          </Card>
          <Card data-testid="card-stat-active-users">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-3xl font-bold text-green-600">{activeCount}</div>
              )}
            </CardContent>
          </Card>
          <Card data-testid="card-stat-admins">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Students / Admins</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-3xl font-bold">{studentCount} / {adminCount}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "destructive" : "secondary"} data-testid={`badge-role-${user.id}`}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStreamName(user.streamId)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={user.isActive ? "default" : "outline"}
                          className={user.isActive ? "bg-green-100 text-green-800 hover:bg-green-100" : "text-red-600 border-red-300"}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(user.createdAt as any)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate({ id: user.id, isActive: !user.isActive })}
                            disabled={toggleActiveMutation.isPending}
                            data-testid={`button-toggle-active-${user.id}`}
                            title={user.isActive ? "Disable user" : "Activate user"}
                          >
                            {user.isActive ? (
                              <><UserX className="h-4 w-4 mr-1 text-red-500" /> Disable</>
                            ) : (
                              <><UserCheck className="h-4 w-4 mr-1 text-green-500" /> Activate</>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleRoleMutation.mutate({
                              id: user.id,
                              role: user.role === "admin" ? "student" : "admin",
                            })}
                            disabled={toggleRoleMutation.isPending}
                            data-testid={`button-toggle-role-${user.id}`}
                            title={user.role === "admin" ? "Make student" : "Make admin"}
                          >
                            {user.role === "admin" ? (
                              <><ShieldOff className="h-4 w-4 mr-1" /> Remove Admin</>
                            ) : (
                              <><Shield className="h-4 w-4 mr-1" /> Make Admin</>
                            )}
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
      </div>
    </AdminLayout>
  );
}
