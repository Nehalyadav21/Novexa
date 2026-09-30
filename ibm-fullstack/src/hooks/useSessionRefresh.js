import { useSession, signOut, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export const useSessionRefresh = () => {
  const { data: session } = useSession();
  const router = useRouter();

  const refreshSession = async () => {
    try {
      // Get the latest user data
      const res = await fetch('/api/auth/refresh');
      if (res.ok) {
        const data = await res.json();
        
        if (data.user?.company && (!session?.user?.company || session.user.company !== data.user.company)) {
          // Session needs to be refreshed with new company info
          console.log('Refreshing session with new company data');
          
          // Force sign out and sign in to refresh the session
          await signOut({ redirect: false });
          
          // Small delay to ensure signout completes
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Sign back in which will get fresh user data
          const result = await signIn('credentials', {
            email: session?.user?.email,
            redirect: false,
            callbackUrl: '/dashboard'
          });
          
          if (result?.ok) {
            router.push('/dashboard');
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
    return false;
  };

  return { refreshSession };
};
