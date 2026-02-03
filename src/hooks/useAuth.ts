import { useEffect } from 'react';
import { useStore } from '@/store';
import { authApi } from '@/lib/auth';
import { supabase, isMockMode } from '@/lib/supabase';

export const useAuth = () => {
  const { user, setUser } = useStore();

  useEffect(() => {
    // Mock mode: Auto-login with test user
    if (isMockMode) {
      const mockUser = {
        id: 'mock-user-id',
        email: 'test@callmonitor.com',
        user_metadata: { full_name: 'Test User' },
      } as any;
      setUser(mockUser);
      return;
    }

    // Get initial session
    authApi.getSession().then((session) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser]);

  const signIn = async (email: string, password: string) => {
    if (isMockMode) {
      // Mock sign in
      const mockUser = {
        id: 'mock-user-id',
        email: email,
        user_metadata: { full_name: 'Test User' },
      } as any;
      setUser(mockUser);
      return { user: mockUser, session: null };
    }
    const data = await authApi.signIn(email, password);
    return data;
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    if (isMockMode) {
      // Mock sign up
      const mockUser = {
        id: 'mock-user-id',
        email: email,
        user_metadata: { full_name: fullName || 'Test User' },
      } as any;
      setUser(mockUser);
      return { user: mockUser, session: null };
    }
    const data = await authApi.signUp(email, password, fullName);
    return data;
  };

  const signOut = async () => {
    if (isMockMode) {
      setUser(null);
      return;
    }
    await authApi.signOut();
    setUser(null);
  };

  return {
    user,
    signIn,
    signUp,
    signOut,
    isAuthenticated: !!user,
  };
};
