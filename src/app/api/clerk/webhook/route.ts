import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  console.log('==== WEBHOOK CALLED ====');
  try {
    console.log('Attempting to read body');
    const body = await req.text(); // Use text() instead of json() for initial testing
    console.log('Body received:', body.substring(0, 100) + '...');
    
    return NextResponse.json({ message: 'Received' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}