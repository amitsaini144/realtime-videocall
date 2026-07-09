import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';

function previewFor(message: ChatMessage): string {
  if (message.kind === 'image') return '📷 Photo';
  if (message.kind === 'voice') return '🎤 Voice message';
  return (message.content ?? '').slice(0, 120);
}

function useUnfocusedTabNotifications(receivedMessages: ChatMessage[]) {
  const originalTitleRef = useRef<string>('');
  const lastNotifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    originalTitleRef.current = document.title;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        document.title = originalTitleRef.current;
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const last = receivedMessages[receivedMessages.length - 1];
    if (!last || last.isOwn || last.deleted || lastNotifiedIdRef.current === last.id) return;
    lastNotifiedIdRef.current = last.id;

    if (document.visibilityState !== 'hidden') return;

    document.title = `New message • ${originalTitleRef.current}`;

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(last.sender, { body: previewFor(last) });
    }
  }, [receivedMessages]);
}

export default useUnfocusedTabNotifications;
