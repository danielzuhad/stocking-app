'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { EyeIcon, EyeOffIcon, LogInIcon } from 'lucide-react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username wajib diisi'),
  password: z.string().min(1, 'Password wajib diisi'),
});

type SchemaType = z.infer<typeof loginSchema>;

/**
 * Login form (MVP) memakai `username` + `password`.
 *
 * - Validasi client-side (Zod + React Hook Form) hanya untuk UX; server tetap wajib validasi.
 * - Tidak ada “forgot password” pada MVP; reset dilakukan oleh admin/superadmin (lihat `AGENTS.md`).
 * - Nantinya dihubungkan ke NextAuth Credentials + DB.
 */
export function LoginForm() {
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<SchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: SchemaType) => {
    try {
      const payload = {
        ...values,
      };

      console.log({ payload });
    } catch {}
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Masuk</CardTitle>
        <p className="text-muted-foreground text-sm">
          Gunakan username dan password yang diberikan admin perusahaanmu.
        </p>
      </CardHeader>

      <CardContent className="grid gap-4">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4"
            aria-busy={isSubmitting}
          >
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input
                      autoComplete="username"
                      placeholder="contoh: admin"
                      {...field}
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
                  <FormLabel>Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className="pr-10"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 inline-flex items-center px-3"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword ? 'Sembunyikan password' : 'Lihat password'
                      }
                    >
                      {showPassword ? (
                        <EyeOffIcon className="size-4" />
                      ) : (
                        <EyeIcon className="size-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
              loadingText="Memproses..."
            >
              <LogInIcon />
              Masuk
            </Button>

            <p className="text-muted-foreground text-center text-sm">
              Butuh akses akun? Hubungi admin perusahaanmu untuk username &
              password.
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
