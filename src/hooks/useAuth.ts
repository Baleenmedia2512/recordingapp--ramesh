import { useStore } from '@/store';

/**
 * Simple auth hook that reads from store
 * Authentication is handled automatically by autoAuth.ts
 */
export const useAuth = () => {
  const { user } = useStore();

  // Stub methods for backward compatibility (not used in current flow)
  const signIn = async (email: string, password: string) => {
    throw new Error('Manual sign-in not implemented. App uses auto-auth.');
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    throw new Error('Manual sign-up not implemented. App uses auto-auth.');
  };

  const signOut = async () => {
    throw new Error('Sign-out not implemented. App uses auto-auth.');
  };

  const guestLogin = async () => {
    throw new Error('Guest login not needed. App uses auto-auth.');
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
