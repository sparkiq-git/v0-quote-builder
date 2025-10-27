"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createUser } from "@/lib/actions/admin-users"
import { z } from "zod"

interface CreateUserModalMinimalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

// Minimal schema for testing
const minimalSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
})

type MinimalFormData = z.infer<typeof minimalSchema>

export function CreateUserModalMinimal({ open, onOpenChange, onSuccess }: CreateUserModalMinimalProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<MinimalFormData>({
    resolver: zodResolver(minimalSchema),
    defaultValues: {
      email: "",
      role: "crew",
    },
  })

  const onSubmit = async (data: MinimalFormData) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("email", data.email)
      formData.append("role", data.role)
      formData.append("display_name", data.email.split("@")[0])
      formData.append("phone", "")
      formData.append("is_crew", "false")
      formData.append("crew_data", "null")

      const result = await createUser(formData)

      if (result.success) {
        toast({
          title: "Success",
          description: `User created successfully!`,
        })
        onSuccess()
        onOpenChange(false)
        form.reset()
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create user",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User (Minimal Test)</DialogTitle>
          <DialogDescription>
            Testing with minimal react-hook-form to isolate the issue
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="user@example.com" 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="crew" 
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create User"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
