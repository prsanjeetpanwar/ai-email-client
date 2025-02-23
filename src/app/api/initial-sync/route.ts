import { NextRequest, NextResponse } from "next/server";
import { Account } from "~/lib/account";
import { db } from "~/server/db";

export const POST = async (req: NextRequest) => {
    try {
        const { accountId, userId } = await req.json();
        
        if (!userId || !accountId) {
            return NextResponse.json({
                message: "Account Id or User Id not found"
            }, { status: 400 });
        }

        console.log('🔍 Looking up account:', { accountId, userId });

        const databaseAccount = await db.account.findUnique({
            where: {
                id: accountId,
                userId
            }
        });

        if (!databaseAccount) {
            console.error('❌ Account not found in database');
            return NextResponse.json({
                error: "Account not found"
            }, { status: 404 });
        }

        console.log('📧 Starting sync for account:', databaseAccount.emailAddress);
        const account = new Account(databaseAccount.accessToken);

        try {
            const syncResult = await account.performInitialSync();
            
            if (!syncResult) {
                console.error('❌ Sync failed - no result returned');
                return NextResponse.json({
                    message: "Initial sync failed"
                }, { status: 500 });
            }

            const { emails, deltaToken } = syncResult;

            await db.account.update({
                where: { id: accountId },
                data: { nextDeltaToken: deltaToken }
            });

            console.log(`✅ Sync completed successfully with ${emails.length} emails`);
            return NextResponse.json({
                message: "Initial sync successful",
                emailCount: emails.length
            }, { status: 200 });

        } catch (syncError) {
            console.error('❌ Sync error:', syncError);
            return NextResponse.json({
                message: "Sync failed",
                error: syncError instanceof Error ? syncError.message : "Unknown error"
            }, { status: 500 });
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error);
        return NextResponse.json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : "Unknown error"
        }, { status: 500 });
    }
};