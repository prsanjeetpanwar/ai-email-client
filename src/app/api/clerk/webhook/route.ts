import { db } from "~/server/db";

export const POST = async (req: Request) => {
  try {
    console.log("🔹 Clerk Webhook Triggered!");
    
    const { data } = await req.json();
    console.log("clerk webhook data", data);

    if (!data) {
      console.error("⚠️ No data received from Clerk Webhook!");
      return new Response("Invalid webhook data", { status: 400 });
    }

    // Extract user data with default values for optional fields
    const userData = {
      id: data.id,
      emailAddress: data.email_addresses?.[0]?.email_address ?? '',
      firstName: data.first_name ?? '',
      lastName: data.last_name ?? '',
      imageUrl: data.image_url ?? '',
    };

    console.log("🔹 Extracted Data:", userData);

    // Validate required fields
    if (!userData.id || !userData.emailAddress) {
      console.error("⚠️ Missing required user fields!", userData);
      return new Response("Missing required user fields", { status: 400 });
    }

    console.log("🔹 Attempting to insert user into database...");
    
    // Create user with validated data
    const user = await db.user.create({
      data: userData
    });

    console.log("✅ User successfully inserted into database!", user);
    
    return new Response("Webhook processed successfully", { status: 200 });
    
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    
    // Check if error is from Prisma for better error handling
    if (error instanceof Error) {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
    
    return new Response("Internal Server Error", { status: 500 });
  }
};