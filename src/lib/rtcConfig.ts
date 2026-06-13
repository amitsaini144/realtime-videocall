const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
const hasTurnCredentials = Boolean(turnUsername && turnCredential);

const turnServers: RTCIceServer[] = hasTurnCredentials
  ? [
      { urls: 'turn:global.relay.metered.ca:80', username: turnUsername, credential: turnCredential },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: turnUsername, credential: turnCredential },
      { urls: 'turn:global.relay.metered.ca:443', username: turnUsername, credential: turnCredential },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: turnUsername, credential: turnCredential },
    ]
  : [];

export const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.relay.metered.ca:80' },
    ...turnServers,
  ],
  iceCandidatePoolSize: 10,
};
