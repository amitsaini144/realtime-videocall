const ADJECTIVES = [
  'Swift', 'Quiet', 'Brave', 'Clever', 'Gentle', 'Bold', 'Calm', 'Eager',
  'Fuzzy', 'Jolly', 'Lucky', 'Mighty', 'Nimble', 'Proud', 'Sunny', 'Witty',
  'Amber', 'Crimson', 'Golden', 'Silver', 'Cosmic', 'Rustic', 'Vivid', 'Zesty',
];

const ANIMALS = [
  'Otter', 'Falcon', 'Panda', 'Tiger', 'Dolphin', 'Fox', 'Lynx', 'Heron',
  'Koala', 'Raven', 'Badger', 'Wolf', 'Hawk', 'Rabbit', 'Panther', 'Owl',
  'Cheetah', 'Turtle', 'Sparrow', 'Bison', 'Gecko', 'Marmot', 'Ibis', 'Puma',
];

const GUEST_STORAGE_KEY = 'guest-identity';

export interface GuestIdentity {
  id: string;
  username: string;
  imageUrl: string;
}

export function generateGuestName(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adjective} ${animal}`;
}

export function getGuestAvatarUrl(id: string): string {
  return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(id)}`;
}

export function getOrCreateGuestIdentity(): GuestIdentity {
  const stored = sessionStorage.getItem(GUEST_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as GuestIdentity;
    } catch {
      // fall through and regenerate
    }
  }

  const id = crypto.randomUUID();
  const identity: GuestIdentity = {
    id,
    username: generateGuestName(),
    imageUrl: getGuestAvatarUrl(id),
  };
  sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(identity));
  return identity;
}

export function peekGuestIdentity(): GuestIdentity | null {
  const stored = sessionStorage.getItem(GUEST_STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as GuestIdentity;
  } catch {
    return null;
  }
}

export function clearGuestIdentity(): void {
  sessionStorage.removeItem(GUEST_STORAGE_KEY);
}
