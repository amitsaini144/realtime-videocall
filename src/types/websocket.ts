export type InboundWsMessage =
  | { type: 'userData';        user: { id: string; username: string; imageUrl: string | null } }
  | { type: 'userList';        users: Array<{ id: string; username: string; imageUrl?: string | null }> }
  | { type: 'message';         content: string; sender: string; senderImageUrl?: string | null }
  | { type: 'videoCallOffer';  offer: RTCSessionDescriptionInit; from: string; fromUsername: string }
  | { type: 'videoCallAnswer'; answer: RTCSessionDescriptionInit; from: string }
  | { type: 'iceCandidate';    candidate: RTCIceCandidateInit; from: string }
  | { type: 'endCall';         from: string }
  | { type: 'error';           content: string };

export type OutboundWsMessage =
  | { type: 'message';         content: string; sender: string }
  | { type: 'videoCallOffer';  offer: RTCSessionDescriptionInit; to: string }
  | { type: 'videoCallAnswer'; answer: RTCSessionDescriptionInit; to: string }
  | { type: 'iceCandidate';    candidate: RTCIceCandidateInit; to: string }
  | { type: 'endCall';         to: string }
  | { type: 'callBusy';        to: string }
  | { type: 'callRejected';    to: string };
