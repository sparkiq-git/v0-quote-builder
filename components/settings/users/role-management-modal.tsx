"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { updateUser } from "@/lib/actions/admin-users"
import { AVAILABLE_ROLES, type AdminUser } from "@/lib/types/admin"
import { Shield, Check, X, Search, UserCheck, UserX, CheckCircle } from "lucide-react"

interface RoleManagementModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: AdminUser[]
  onRoleUpdate: () => void
}

// Role permissions matrix
const ROLE_PERMISSIONS = [
  { name: "View Dashboard", roles: ["admin", "manager", "dispatcher", "crew", "viewer"] },
  { name: "Manage Users", roles: ["admin", "manager"] },
  { name: "Manage Aircraft", roles: ["admin", "manager", "dispatcher"] },
  { name: "Create Quotes", roles: ["admin", "manager", "dispatcher"] },
  { name: "Manage Crew", roles: ["admin", "manager"] },
  { name: "View Reports", roles: ["admin", "manager", "dispatcher"] },
  { name: "System Settings", roles: ["admin"] },
  { name: "Flight Operations", roles: ["admin", "manager", "dispatcher", "crew"] },
]

export function RoleManagementModal({ open, onOpenChange, users, onRoleUpdate }: RoleManagementModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [bulkRole, setBulkRole] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [isRoleFilterOpen, setIsRoleFilterOpen] = useState(false)
  const [isBulkRoleOpen, setIsBulkRoleOpen] = useState(false)
  const roleFilterRef = useRef<HTMLDivElement>(null)
  const bulkRoleRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleFilterRef.current && !roleFilterRef.current.contains(event.target as Node)) {
        setIsRoleFilterOpen(false)
      }
      if (bulkRoleRef.current && !bulkRoleRef.current.contains(event.target as Node)) {
        setIsBulkRoleOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter users based on search and role filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter)

    return matchesSearch && matchesRole
  })

  // Get role statistics
  const getRoleStats = () => {
    const stats = AVAILABLE_ROLES.reduce(
      (acc, role) => {
        acc[role] = users.filter((user) => user.roles.includes(role)).length
        return acc
      },
      {} as Record<string, number>,
    )

    return stats
  }

  const roleStats = getRoleStats()

  // Handle user selection
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map((user) => user.id)))
    }
  }

  // Handle bulk role assignment
  const handleBulkRoleAssignment = async () => {
    if (!bulkRole || selectedUsers.size === 0) {
      toast({
        title: "Error",
        description: "Please select a role and at least one user",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const promises = Array.from(selectedUsers).map(async (userId) => {
        const user = users.find((u) => u.id === userId)
        if (!user) return

        const updatedRoles = user.roles.includes(bulkRole) ? user.roles : [...user.roles, bulkRole]

        return updateUser(userId, {
          roles: updatedRoles,
          role: bulkRole,
          active: user.status === "active",
          is_crew: user.is_crew,
        })
      })

      const results = await Promise.all(promises)
      const failed = results.filter((result) => !result.success)

      if (failed.length === 0) {
        toast({
          title: "Success",
          description: `Role "${bulkRole}" assigned to ${selectedUsers.size} user(s)`,
        })
        setSelectedUsers(new Set())
        setBulkRole("")
        onRoleUpdate()
      } else {
        toast({
          title: "Partial Success",
          description: `${results.length - failed.length} users updated, ${failed.length} failed`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user roles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Handle individual role toggle
  const handleRoleToggle = async (userId: string, role: string) => {
    const user = users.find((u) => u.id === userId)
    if (!user) return

    setLoading(true)
    try {
      const updatedRoles = user.roles.includes(role) ? user.roles.filter((r) => r !== role) : [...user.roles, role]

      const result = await updateUser(userId, {
        roles: updatedRoles,
        role: updatedRoles[0] || user.roles[0],
        active: user.status === "active",
        is_crew: user.is_crew,
      })

      if (result.success) {
        toast({
          title: "Success",
          description: `Role "${role}" ${user.roles.includes(role) ? "removed from" : "added to"} ${user.email}`,
        })
        onRoleUpdate()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to update user role",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[90vw] lg:max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6 text-primary" />
            Role Management
          </DialogTitle>
          <DialogDescription className="text-base">
            Manage user roles and permissions across your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Role Statistics */}
          <div className="grid grid-cols-5 gap-4">
            {AVAILABLE_ROLES.map((role) => (
              <Card key={role} className="text-center">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-primary">{roleStats[role]}</div>
                  <div className="text-sm text-muted-foreground capitalize">{role}s</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters and Bulk Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bulk Role Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="relative w-[180px]" ref={roleFilterRef}>
                  <button
                    type="button"
                    onClick={() => setIsRoleFilterOpen(!isRoleFilterOpen)}
                    className="flex items-center justify-between w-full h-9 px-3 py-2 text-sm border border-input bg-transparent rounded-md shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <span className="capitalize">{roleFilter === "all" ? "All roles" : roleFilter}</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-50"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {isRoleFilterOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg">
                      <div className="p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setRoleFilter("all")
                            setIsRoleFilterOpen(false)
                          }}
                          className={`w-full text-left px-2 py-1.5 text-sm rounded-sm transition-colors ${
                            roleFilter === "all"
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-primary hover:text-primary-foreground"
                          }`}
                        >
                          All roles
                        </button>
                        {AVAILABLE_ROLES.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setRoleFilter(role)
                              setIsRoleFilterOpen(false)
                            }}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded-sm capitalize transition-colors ${
                              roleFilter === role
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-primary hover:text-primary-foreground"
                            }`}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium">
                    Select All ({selectedUsers.size} selected)
                  </label>
                </div>

                <div className="relative w-[200px]" ref={bulkRoleRef}>
                  <button
                    type="button"
                    onClick={() => setIsBulkRoleOpen(!isBulkRoleOpen)}
                    className="flex items-center justify-between w-full h-9 px-3 py-2 text-sm border border-input bg-transparent rounded-md shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <span className={bulkRole ? "capitalize" : "text-muted-foreground"}>
                      {bulkRole ? bulkRole.charAt(0).toUpperCase() + bulkRole.slice(1) : "Select role to assign"}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-50"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {isBulkRoleOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg">
                      <div className="p-1">
                        {AVAILABLE_ROLES.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              setBulkRole(role)
                              setIsBulkRoleOpen(false)
                            }}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded-sm capitalize transition-colors ${
                              bulkRole === role
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-primary hover:text-primary-foreground"
                            }`}
                          >
                            {role.charAt(0).toUpperCase() + role.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button onClick={handleBulkRoleAssignment} disabled={loading || selectedUsers.size === 0 || !bulkRole}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Assign Role
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Select</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Current Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.has(user.id)}
                            onCheckedChange={() => toggleUserSelection(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={user.avatar_path ? `/api/avatar/${user.id}` : undefined}
                                alt={user.display_name || user.email}
                              />
                              <AvatarFallback>
                                {(user.display_name || user.email)
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.display_name || user.email.split("@")[0]}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {user.roles.map((role) => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.status === "active" ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <UserX className="h-3 w-3 mr-1" />
                              Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {AVAILABLE_ROLES.map((role) => (
                              <Button
                                key={role}
                                variant={user.roles.includes(role) ? "default" : "outline"}
                                size="sm"
                                onClick={() => handleRoleToggle(user.id, role)}
                                disabled={loading}
                                className="text-xs h-7"
                              >
                                {user.roles.includes(role) ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <X className="h-3 w-3 mr-1" />
                                )}
                                {role}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Role Permissions Matrix */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role Permissions Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    {AVAILABLE_ROLES.map((role) => (
                      <TableHead key={role} className="text-center capitalize">
                        {role}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROLE_PERMISSIONS.map((permission) => (
                    <TableRow key={permission.name}>
                      <TableCell className="font-medium">{permission.name}</TableCell>
                      {AVAILABLE_ROLES.map((role) => (
                        <TableCell key={role} className="text-center">
                          {permission.roles.includes(role) ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                          ) : (
                            <X className="h-4 w-4 text-red-600 mx-auto" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
