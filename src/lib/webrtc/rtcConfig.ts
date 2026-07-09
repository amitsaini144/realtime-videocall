import { logger } from '@/lib/logger';

const STUN_ONLY_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.relay.metered.ca:80' }],
  iceCandidatePoolSize: 10,
};

let cachedConfigPromise: Promise<RTCConfiguration> | null = null;

export function getRtcConfiguration(): Promise<RTCConfiguration> {
  cachedConfigPromise ??= fetch('/api/turn-credentials')
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch TURN credentials: ${res.status}`);
      return res.json() as Promise<{ iceServers: RTCIceServer[] }>;
    })
    .then((data) => ({
      iceServers: [...STUN_ONLY_CONFIGURATION.iceServers!, ...data.iceServers],
      iceCandidatePoolSize: 10,
    }))
    .catch((error) => {
      logger.error('Falling back to STUN-only ICE configuration:', error);
      return STUN_ONLY_CONFIGURATION;
    });
  return cachedConfigPromise;
}
