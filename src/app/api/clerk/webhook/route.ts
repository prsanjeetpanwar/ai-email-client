import { PrismaClient } from '@prisma/client';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';

const db = new PrismaClient();

interface UserData {
  id: string;
  email_addresses: { email_address: string }[];
  first_name?: string;
  last_name?: string;
  image_url?: string;
}

export async function POST(req: Request) {
  try {
    if (!process.env.CLERK_WEBHOOK_SECRET) {
      return new Response('CLERK_WEBHOOK_SECRET is not set', { status: 500 });
    }

    const headersList = headers();
    const svix_id = headersList.get('svix-id');
    const svix_timestamp = headersList.get('svix-timestamp');
    const svix_signature = headersList.get('svix-signature');

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return new Response('Error: Missing svix headers', { status: 400 });
    }

    const payload = await req.json();
    const body = JSON.stringify(payload);

    console.log('Received webhook payload:', payload);

    const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    let evt: WebhookEvent;
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return new Response('Error verifying webhook', { status: 400 });
    }

    const userData = evt.data as UserData;
    const { id } = userData;
    const eventType = evt.type;

    console.log(`Webhook with ID: ${id} and type: ${eventType}`);
    console.log('Webhook data:', userData);

    if (eventType === 'user.created' || eventType === 'user.updated') {
      try {
        const emailAddress = userData.email_addresses?.[0]?.email_address || '';
        if (!emailAddress) {
          console.warn(`User ${id} has no email address`);
        }

        const firstName = userData.first_name || '';
        const lastName = userData.last_name || '';
        const imageUrl = userData.image_url || '';

        console.log('Preparing to upsert user with data:', {
          id,
          emailAddress,
          firstName,
          lastName,
          imageUrl,
        });

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

        console.log(`User ${id} successfully ${eventType === 'user.created' ? 'created' : 'updated'}`);
      } catch (err) {
        console.error('Database operation failed:', err);
        return new Response('Database operation failed', { status: 500 });
      }
    }

    return new Response('Webhook received and processed', { status: 200 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response('Unexpected error occurred', { status: 500 });
  }
}
