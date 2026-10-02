"use client";

import React, { useState } from 'react';
import { useAuth } from '@/config/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';

export default function LogoutButton() {
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
  };

  return (
    <Button 
      variant="ghost" 
      onClick={handleLogout}
      disabled={loading}
      className="text-slate-600 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="mr-2 h-4 w-4" />
      )}
      Déconnexion
    </Button>
  );
}