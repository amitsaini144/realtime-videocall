export type MessageKind = 'text' | 'image' | 'voice';

export interface ReplyToRef {
  id: string;
  sender: string;
  preview: string;
}

export type InboundWsMessage =
  | { type: 'userData';        user: { id: string; username: string; imageUrl: string | null } }
  | { type: 'userList';        users: Array<{ id: string; username: string; imageUrl?: string | null }> }
  | { type: 'message';         id: string; kind: MessageKind; content?: string; mediaData?: string; mediaMimeType?: string; durationSec?: number; replyTo?: ReplyToRef; sender: string; senderImageUrl?: string | null }
  | { type: 'typing';          sender: string; isTyping: boolean }
  | { type: 'reaction';        messageId: string; emoji: string; sender: string; remove?: boolean }
  | { type: 'edit';            messageId: string; content: string; sender: string }
  | { type: 'delete';          messageId: string; sender: string }
  | { type: 'videoCallOffer';  offer: RTCSessionDescriptionInit; from: string; fromUsername: string }
  | { type: 'videoCallAnswer'; answer: RTCSessionDescriptionInit; from: string }
  | { type: 'iceCandidate';    candidate: RTCIceCandidateInit; from: string }
  | { type: 'iceRestartOffer'; offer: RTCSessionDescriptionInit; from: string }
  | { type: 'iceRestartAnswer'; answer: RTCSessionDescriptionInit; from: string }
  | { type: 'endCall';         from: string }
  | { type: 'callBusy';        from: string }
  | { type: 'callRejected';    from: string }
  | { type: 'callFailed' }
  | { type: 'error';           content: string };

export type OutboundWsMessage =
  | { type: 'message';         id: string; kind: MessageKind; content?: string; mediaData?: string; mediaMimeType?: string; durationSec?: number; replyTo?: ReplyToRef; sender: string }
  | { type: 'typing';          sender: string; isTyping: boolean }
  | { type: 'reaction';        messageId: string; emoji: string; sender: string; remove?: boolean }
  | { type: 'edit';            messageId: string; content: string; sender: string }
  | { type: 'delete';          messageId: string; sender: string }
  | { type: 'videoCallOffer';  offer: RTCSessionDescriptionInit; to: string }
  | { type: 'videoCallAnswer'; answer: RTCSessionDescriptionInit; to: string }
  | { type: 'iceCandidate';    candidate: RTCIceCandidateInit; to: string }
  | { type: 'iceRestartOffer'; offer: RTCSessionDescriptionInit; to: string }
  | { type: 'iceRestartAnswer'; answer: RTCSessionDescriptionInit; to: string }
  | { type: 'endCall';         to: string }
  | { type: 'callBusy';        to: string }
  | { type: 'callRejected';    to: string };
