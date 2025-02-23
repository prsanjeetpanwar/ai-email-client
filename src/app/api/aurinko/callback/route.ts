import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForAccessToken, getAccountDetails } from "~/lib/aurinko";
import { db } from "~/server/db";
import { waitUntil } from "@vercel/functions";
import axios from "axios";

export const GET = async (req: NextRequest) => {
  try {
    console.log("🚀 Starting GET request handler");

    const { userId } = await auth();
    console.log("👤 Auth check - userId:", userId);

    if (!userId) {
      console.error("❌ Authentication failed - No userId found");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    console.log("📝 Request parameters:", Object.fromEntries(params));

    const status = params.get("status");
    console.log("📊 Status parameter:", status);

    if (status !== "success") {
      console.error("❌ Invalid status:", status);
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const code = params.get("code");
    console.log("🔑 Authorization code:", code);

    if (!code) {
      console.error("❌ No authorization code provided");
      return NextResponse.json({ message: "No code provided" }, { status: 401 });
    }

    const token = await exchangeCodeForAccessToken(code);
    console.log("🎫 Token exchange response:", {
      success: !!token,
      accountId: token?.accountId,
    });

    if (!token) {
      console.error("❌ Failed to exchange code for access token");
      return NextResponse.json(
        { message: "Failed to exchange code for access token" },
        { status: 401 }
      );
    }

    const accountDetails = await getAccountDetails(token.accessToken);
    console.log("👤 Account details retrieved:", {
      email: accountDetails?.email,
      name: accountDetails?.name,
    });

    if (!accountDetails) {
      console.error("❌ Failed to fetch account details");
      return NextResponse.json(
        { message: "Failed to fetch account details" },
        { status: 401 }
      );
    }

    try {
      await db.account.upsert({
        where: { id: token.accountId.toString() }, 
        update: {
          userId,
          emailAddress: accountDetails?.email,
          name: accountDetails?.name,
          provider: 'Aurinko',
          accessToken: token.accessToken,
        }, 
        create: {
          id: token.accountId.toString(),
          userId,
          emailAddress: accountDetails?.email,
          provider: 'Aurinko',
          name: accountDetails?.name,
          accessToken: token.accessToken,
        }, 
      });

      console.log("💾 Successfully upserted account in database");
    } catch (dbError) {
      console.error("❌ Database operation failed:", dbError);
      return NextResponse.json({ message: "Database operation failed" }, { status: 500 });
    }

    console.log("✅ Successfully completed. Redirecting to /mail");

    waitUntil(
      axios.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/initial-sync`,{
        accountId:token.accountId.toString(),
        userId
      }).then((res)=>{
console.log('initial sync is triggered',res.data)
      }).catch((error)=>{
        console.log('failed to trigger initial sync',error)
      })
    )
    
    return NextResponse.redirect(new URL("/mail", req.url));
  } catch (error) {
    console.error("❌ Unexpected error in GET handler:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
};
