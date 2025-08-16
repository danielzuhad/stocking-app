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
import { apiPost } from "@/lib/axios-client";
import { handleErrorToast } from "@/lib/utils";
import { usersTable } from "@/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInsertSchema } from "drizzle-zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = createInsertSchema(usersTable).extend({
  username: z.string().min(1, "Username is required"),
  email: z.string().refine((val) => val.endsWith("@gmail.com"), {
    message: "Email must be a Gmail address",
  }),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormType = z.infer<typeof formSchema>;

const RegisterClient = () => {
  const navigation = useRouter();

  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      username: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: FormType) => {
    try {
      const payload = {
        username: data.username,
        email: data.email,
        password: data.password,
      };

      const result = await apiPost("/auth/register", payload);

      if (!result.success) throw new Error(result.message);

      navigation.push("/login");

      toast.success("Registration successful!", {
        description: "Let's try to login",
      });
    } catch (error) {
      handleErrorToast(error);
    }
  };

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
                <Input
                  {...field}
                  placeholder="Enter Username"
                  className="w-full"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="Enter your Gmail address"
                  disabled={isSubmitting}
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
          {isSubmitting ? "Registering..." : "Register"}
        </Button>

        <div className="text-muted-foreground -mt-1 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-medium hover:underline">
            Login here
          </Link>
        </div>
      </form>
    </Form>
  );
};

export default RegisterClient;
