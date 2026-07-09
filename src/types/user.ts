import { MessageKind, ReplyToRef } from './websocket';

export interface User {
  id: string;
  username: string | null;
  imageUrl: string | null;
}

export interface ChatMessage {
  id: string;
  kind: MessageKind;
  content?: string;
  mediaData?: string;
  mediaMimeType?: string;
  durationSec?: number;
  replyTo?: ReplyToRef;
  sender: string;
  senderImageUrl?: string | null;
  isOwn: boolean;
  reactions?: Record<string, string[]>;
  edited?: boolean;
  deleted?: boolean;
}
