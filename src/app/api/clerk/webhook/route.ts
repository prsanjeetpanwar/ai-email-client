import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { db } from "~/server/db";

interface UserData {
  id: string;
  email_addresses: { email_address: string }[];
  first_name?: string;
  last_name?: string;
  image_url?: string;
}

export async function POST(req: Request) {
  console.log('[WEBHOOK] ====== START OF WEBHOOK HANDLER ======');
  console.log('[WEBHOOK] Time:', new Date().toISOString());
  console.log('[WEBHOOK] Request URL:', req.url);
  console.log('[WEBHOOK] Request method:', req.method);
  
  try {
    // Debug environment variables
    console.log('[WEBHOOK] Checking environment variables...');
    const webhookSecret = 'whsec_bxSBP3Rf4KN2eRKG+1z9WzmSOXj3Vnpm';
    console.log('[WEBHOOK] CLERK_WEBHOOK_SECRET exists:', !!webhookSecret);
    console.log('[WEBHOOK] DATABASE_URL exists:', !!process.env.DATABASE_URL);
    
    if (!webhookSecret) {
      console.error('[WEBHOOK] ERROR: CLERK_WEBHOOK_SECRET environment variable is not set');
      return new Response('Server configuration error: missing webhook secret', { status: 500 });
    }

    // Debug headers
    console.log('[WEBHOOK] Checking Svix headers...');
    const headersList = headers();
    const svix_id = headersList.get('svix-id');
    const svix_timestamp = headersList.get('svix-timestamp');
    const svix_signature = headersList.get('svix-signature');
    
    // Log all headers for debugging
    console.log('[WEBHOOK] All request headers:');
    headersList.forEach((value, key) => {
      console.log(`[WEBHOOK] Header ${key}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
    });
    
    console.log('[WEBHOOK] svix-id:', svix_id);
    console.log('[WEBHOOK] svix-timestamp exists:', !!svix_timestamp);
    console.log('[WEBHOOK] svix-signature exists:', !!svix_signature);

    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('[WEBHOOK] ERROR: Missing Svix headers');
      return new Response('Error: Missing svix headers', { status: 400 });
    }

    // Debug request body
    console.log('[WEBHOOK] Attempting to parse request body...');
    let payload;
    try {
      payload = await req.json();
      console.log('[WEBHOOK] Successfully parsed request body');
    } catch (error) {
      console.error('[WEBHOOK] ERROR: Failed to parse request body:', error);
      return new Response('Error parsing request body', { status: 400 });
    }
    
    const body = JSON.stringify(payload);
    console.log('[WEBHOOK] Payload type:', payload.type);
    console.log('[WEBHOOK] Payload data ID:', payload.data?.id);
    
    // Debug webhook verification
    console.log('[WEBHOOK] Attempting to verify webhook signature...');
    let evt: WebhookEvent;
    try {
      const wh = new Webhook(webhookSecret);
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
      console.log('[WEBHOOK] Successfully verified webhook signature');
    } catch (err) {
      console.error('[WEBHOOK] ERROR: Failed to verify webhook signature:', err);
      if (err instanceof Error) {
        console.error('[WEBHOOK] Error name:', err.name);
        console.error('[WEBHOOK] Error message:', err.message);
        console.error('[WEBHOOK] Error stack:', err.stack);
      }
      return new Response(`Error verifying webhook: ${err instanceof Error ? err.message : String(err)}`, { status: 400 });
    }

    // Debug user data extraction
    const userData = evt.data as UserData;
    const { id } = userData;
    const eventType = evt.type;
    console.log('[WEBHOOK] Event type:', eventType);
    console.log('[WEBHOOK] User ID:', id);
    console.log('[WEBHOOK] Has email_addresses:', !!userData.email_addresses && userData.email_addresses.length > 0);
    console.log('[WEBHOOK] Has first_name:', !!userData.first_name);
    console.log('[WEBHOOK] Has last_name:', !!userData.last_name);
    console.log('[WEBHOOK] Has image_url:', !!userData.image_url);

    // Debug database operation
    if (eventType === 'user.created' || eventType === 'user.updated') {
      console.log('[WEBHOOK] Processing user event:', eventType);
      
      try {
        const emailAddress = userData.email_addresses?.[0]?.email_address || '';
        if (!emailAddress) {
          console.warn('[WEBHOOK] WARNING: User has no email address');
        }

        const firstName = userData.first_name || '';
        const lastName = userData.last_name || '';
        const imageUrl = userData.image_url || '';

        console.log('[WEBHOOK] Preparing database operation with data:');
        console.log('[WEBHOOK] - ID:', id);
        console.log('[WEBHOOK] - Email:', emailAddress);
        console.log('[WEBHOOK] - First Name:', firstName);
        console.log('[WEBHOOK] - Last Name:', lastName);
        console.log('[WEBHOOK] - Image URL:', imageUrl ? 'exists' : 'missing');
        
        // Debug database connection
        console.log('[WEBHOOK] Testing database connection...');
        try {
          await db.$queryRaw`SELECT 1+1 AS result`;
          console.log('[WEBHOOK] Database connection successful');
        } catch (connErr) {
          console.error('[WEBHOOK] ERROR: Database connection test failed:', connErr);
          return new Response(`Database connection failed: ${connErr instanceof Error ? connErr.message : String(connErr)}`, { status: 500 });
        }

        // Perform actual database operation
        console.log('[WEBHOOK] Attempting to upsert user...');
        await db.user.upsert({
          where: { id },
          update: {
            emailAddress,
            firstName,
            lastName,
            imageUrl,
          },
          create: {
            id,
            emailAddress,
            firstName,
            lastName,
            imageUrl,
          },
        });

        console.log('[WEBHOOK] User upsert operation successful');
      } catch (err) {
        console.error('[WEBHOOK] ERROR: Database operation failed:', err);
        if (err instanceof Error) {
          console.error('[WEBHOOK] Error name:', err.name);
          console.error('[WEBHOOK] Error message:', err.message);
          console.error('[WEBHOOK] Error stack:', err.stack);
          
          // Check for specific database errors
          if (err.message.includes('column') && err.message.includes('does not exist')) {
            console.error('[WEBHOOK] This appears to be a schema mismatch issue');
          }
          if (err.message.includes('connect ECONNREFUSED')) {
            console.error('[WEBHOOK] This appears to be a database connection issue');
          }
        }
        return new Response(`Database operation failed: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
      }
    } else {
      console.log(`[WEBHOOK] Ignoring event type ${eventType}`);
    }

    console.log('[WEBHOOK] ====== END OF WEBHOOK HANDLER (SUCCESS) ======');
    return new Response('Webhook received and processed', { status: 200 });
    
  } catch (err) {
    console.error('[WEBHOOK] CRITICAL ERROR in webhook handler:', err);
    if (err instanceof Error) {
      console.error('[WEBHOOK] Error name:', err.name);
      console.error('[WEBHOOK] Error message:', err.message);
      console.error('[WEBHOOK] Error stack:', err.stack);
    }
    console.log('[WEBHOOK] ====== END OF WEBHOOK HANDLER (FAILED) ======');
    return new Response(`Unexpected error occurred: ${err instanceof Error ? err.message : String(err)}`, { status: 500 });
  }
}