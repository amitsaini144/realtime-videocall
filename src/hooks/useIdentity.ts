import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { getDisplayName } from '@/lib/user';
import { peekGuestIdentity, GuestIdentity } from '@/lib/guest';

export type GetTokenFn = (options?: { skipCache?: boolean }) => Promise<string | null>;

export type Identity =
  | { mode: 'loading' }
  | { mode: 'clerk'; displayName: string; imageUrl: string | null; getToken: GetTokenFn }
  | { mode: 'guest'; displayName: string; imageUrl: string; guestId: string; refresh: () => void }
  | { mode: 'anonymous'; refresh: () => void };

function useIdentity(): Identity {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [guest, setGuest] = useState<GuestIdentity | null | undefined>(undefined);

  const refresh = useCallback(() => {
    setGuest(peekGuestIdentity());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const displayName = user ? getDisplayName(user) : null;
  const imageUrl = user?.imageUrl ?? null;

  // Memoized on primitive fields (not `user`/`getToken` references, which
  // Clerk may recreate across renders) so identity stays reference-stable
  // and doesn't retrigger the WS-connect effect / re-fetch tokens on every render.
  return useMemo<Identity>(() => {
    if (!isLoaded || guest === undefined) {
      return { mode: 'loading' };
    }

    if (user) {
      return { mode: 'clerk', displayName: displayName!, imageUrl, getToken };
    }

    if (guest) {
      return {
        mode: 'guest',
        displayName: guest.username,
        imageUrl: guest.imageUrl,
        guestId: guest.id,
        refresh,
      };
    }

    return { mode: 'anonymous', refresh };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, !!user, displayName, imageUrl, guest, getToken, refresh]);
}

export default useIdentity;
