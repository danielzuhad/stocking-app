"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/axios-client";
import { handleErrorToast } from "@/lib/utils";
import type { CompanyType } from "@/schema";
import type { EUserRole } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type Member = {
  id: string;
  username: string;
  email: string;
  role: EUserRole;
};

interface MembersClientProps {
  userRole: EUserRole;
  companyId: string | null;
  companyName?: string | null;
  companies: CompanyType[];
}

const memberSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyId: z.string().uuid().optional(),
});

type MemberFormType = z.infer<typeof memberSchema>;

const MembersClient = ({ userRole, companyId, companyName, companies }: MembersClientProps) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(() => {
    if (userRole === "super_admin") {
      return companyId ?? companies[0]?.id ?? "";
    }
    return companyId ?? "";
  });

  useEffect(() => {
    if (userRole === "super_admin" && !selectedCompanyId && companies.length > 0) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [userRole, selectedCompanyId, companies]);

  const fetchMembers = useCallback(async () => {
    if (userRole !== "super_admin" && !companyId) {
      setMembers([]);
      setIsFetching(false);
      return;
    }

    if (userRole === "super_admin" && !selectedCompanyId) {
      setMembers([]);
      setIsFetching(false);
      return;
    }

    setIsFetching(true);
    try {
      const params =
        userRole === "super_admin" ? { company_id: selectedCompanyId } : undefined;
      const { data } = await apiGet<Member[]>("/members", params);
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      handleErrorToast(error);
    } finally {
      setIsFetching(false);
    }
  }, [companyId, selectedCompanyId, userRole]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const form = useForm<MemberFormType>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      companyId: userRole === "super_admin" ? selectedCompanyId : undefined,
    },
  });

  useEffect(() => {
    if (userRole === "super_admin") {
      form.setValue("companyId", selectedCompanyId || undefined);
    }
  }, [form, selectedCompanyId, userRole]);

  const onSubmit = async (data: MemberFormType) => {
    try {
      const payload: Record<string, string> = {
        username: data.username,
        email: data.email,
        password: data.password,
      };

      if (userRole === "super_admin") {
        payload.companyId = data.companyId ?? selectedCompanyId;
      }

      await apiPost("/members", payload);
      toast.success("Member added successfully.");
      form.reset({
        username: "",
        email: "",
        password: "",
        companyId: userRole === "super_admin" ? selectedCompanyId : undefined,
      });
      fetchMembers();
    } catch (error) {
      handleErrorToast(error);
    }
  };

  const currentCompanyName = useMemo(() => {
    if (userRole === "super_admin") {
      const company = companies.find((item) => item.id === selectedCompanyId);
      return company?.name ?? "Select a company";
    }

    return "";
  }, [companies, selectedCompanyId, userRole]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Manage Members</h1>
          <p className="text-muted-foreground text-sm">
            Invite teammates to manage inventory under the same company.
          </p>
          {userRole !== "super_admin" && companyName && (
            <p className="text-xs uppercase text-muted-foreground">Company: {companyName}</p>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={fetchMembers}
          isLoading={isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Team Members</h2>
          <p className="text-muted-foreground text-sm">
            {userRole === "super_admin"
              ? selectedCompanyId
                ? `Showing members for ${currentCompanyName || "selected company"}.`
                : "Select a company to view its admins."
              : "Everyone with access to this company’s inventory."}
          </p>

          <div className="mt-4 flex flex-col divide-y">
            {isFetching ? (
              <div className="text-muted-foreground py-10 text-center text-sm">
                Loading members...
              </div>
            ) : members.length === 0 ? (
              <div className="text-muted-foreground py-10 text-center text-sm">
                No members yet.
              </div>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900">{member.username}</p>
                    <p className="text-muted-foreground text-xs">{member.email}</p>
                  </div>
                  <span className="text-muted-foreground text-xs uppercase">
                    {member.role.replace("_", " ")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Invite New Admin</h2>
          {userRole !== "super_admin" && !companyId ? (
            <p className="text-muted-foreground text-sm">
              Assign this account to a company before inviting members.
            </p>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {userRole === "super_admin" && (
                  <FormField
                    control={form.control}
                    name="companyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <select
                            {...field}
                            className="border-input w-full rounded-lg border px-3 py-2 text-sm"
                            onChange={(event) => {
                              field.onChange(event.target.value);
                              setSelectedCompanyId(event.target.value);
                            }}
                          >
                            <option value="">Select company</option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. warehouse.ops" disabled={isFetching} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="admin@company.com"
                          disabled={isFetching}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temporary Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Min. 6 characters"
                          disabled={isFetching}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isFetching}>
                  Invite Member
                </Button>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembersClient;
