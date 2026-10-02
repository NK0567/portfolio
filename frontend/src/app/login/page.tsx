"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/config/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';

function LoginPageContent() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && !loading) {
      router.push('/admin');
    }
  }, [isAuthenticated, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push('/admin');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message ||
        'Identifiants invalides ou problème de connexion avec le serveur.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50/50 px-4 py-12 dark:bg-slate-950">
      <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 dark:bg-slate-950 dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
      <div className="absolute top-1/4 left-1/2 -z-10 h-[300px] w-[300px] -translate-x-1/2 rounded-full bg-indigo-500/10 blur-[80px] dark:bg-indigo-500/5" />

      <Card className="w-full max-w-md border-slate-200/80 bg-white/80 backdrop-blur-md shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
        <CardHeader className="space-y-3 pt-8 px-6 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Connexion Administration
            </CardTitle>
            <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
              Entre tes accès pour piloter le portfolio.
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 px-6 pb-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 ring-1 ring-red-200/50 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-900/30">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Adresse Email
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@exemple.com"
                  required
                  className="pl-10 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  required
                  className="pl-10 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>

          <CardFooter className="px-6 pb-8">
            <Button
              type="submit"
              className="w-full bg-indigo-600 font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/10 transition-all duration-200"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authentification...
                </>
              ) : (
                'Se connecter à l\'interface'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginPageContent />
    </AuthProvider>
  );
}
