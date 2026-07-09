import { UserResource } from '@clerk/types';

export function getDisplayName(user: UserResource | null | undefined): string {
  return (
    user?.username ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.emailAddresses[0]?.emailAddress ||
    'Unknown'
  );
}
