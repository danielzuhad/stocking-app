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
import { handleErrorToast } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "6 characters minimum"),
});

type FormType = z.infer<typeof formSchema>;

const LoginClient = () => {
  const navigation = useRouter();
  const searchParams = useSearchParams();

  const error = searchParams.get("error");

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: FormType) => {
    try {
      const res = await signIn("credentials", {
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (res?.ok) {
        toast.success("Login successful");
        navigation.push("/");
      } else {
        throw new Error(res?.error || "Invalid email or password");
      }
    } catch (error) {
      handleErrorToast(error);
    }
  };

  useEffect(() => {
    if (error === "auth-expired") {
      toast.error("Session expired. Please log in again.");

      // Hapus query dari URL tanpa reload
      const params = new URLSearchParams(searchParams.toString());
      params.delete("error");
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;

      navigation.replace(newUrl);
    }
  }, [error, navigation, searchParams]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-5">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter Username" className="w-full" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    {...field}
                    placeholder="Enter Password"
                    type={showPassword ? "text" : "password"}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="mt-5 w-full" disabled={isSubmitting} isLoading={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </Button>

        <div className="text-muted-foreground -mt-1 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Register here
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default LoginClient;
