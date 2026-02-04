import { useEffect } from 'react';
import { useStore } from '@/store';

export const useAuth = () => {
  const { user, setUser } = useStore();

  useEffect(() => {
    // Check for stored token
    const token = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
  }, [setUser]);

  const signIn = async (email: string, password: string) => {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sign in failed');
    }

    const { user, token } = await response.json();
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setUser(user);
    return { user };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Sign up failed');
    }

    const { user, token } = await response.json();
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    setUser(user);
    return { user };
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
  };

  const guestLogin = () => {
    const guestUser = {
      id: 'guest-' + Date.now(),
      email: 'guest@temporary.local',
      full_name: 'Guest User',
      isGuest: true,
    };
    localStorage.setItem('auth_token', 'guest-token');
    localStorage.setItem('auth_user', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  return {
    user,
    signIn,
    signUp,
    signOut,
    guestLogin,
    isAuthenticated: !!user,
  };
};
