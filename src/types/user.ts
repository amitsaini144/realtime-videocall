export interface User {
  id: string;
  username: string | null;
  imageUrl: string | null;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  senderImageUrl?: string | null;
  isOwn: boolean;
}
