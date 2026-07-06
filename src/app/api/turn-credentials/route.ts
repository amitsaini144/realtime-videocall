import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
