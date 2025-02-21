import { error } from "console";
import { NextResponse } from "next/server";
import { Account } from "~/lib/account";
import { db } from "~/server/db";

export const POST =async (req:NextResponse)=>{
const {accountId,userId}=await req.json()
if(!accountId || !userId){
    return NextResponse.json({
        error:"Missing accountId or userId"
    },
    {
        status:400
    }
    )
}
const  DatabaseAccount=await db.account.findUnique({
    where:{
        id:accountId,
        userId
    }
})
if(!DatabaseAccount){
    return NextResponse.json({
        error:"Account not found"
    },
    {
        status:404
    })
}

//will perform the initial sync

const account=new Account(DatabaseAccount.accessToken)

const emails=await performInitialSync(DatabaseAccount.accessToken)
await syncEmailsIsToDatabase(emails)
}