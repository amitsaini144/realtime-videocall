import { NextResponse } from 'next/server';

// Not gated behind Clerk auth: guests (who have no Clerk session) need TURN
// credentials too, and the gate never provided meaningful protection since
// any Google account passes it for free.
export async function GET() {
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (!turnUsername || !turnCredential) {
    return NextResponse.json({ iceServers: [] });
  }

  return NextResponse.json({
    iceServers: [
      { urls: 'turn:global.relay.metered.ca:80', username: turnUsername, credential: turnCredential },
      { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: turnUsername, credential: turnCredential },
      { urls: 'turn:global.relay.metered.ca:443', username: turnUsername, credential: turnCredential },
      { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: turnUsername, credential: turnCredential },
    ],
  });
}
