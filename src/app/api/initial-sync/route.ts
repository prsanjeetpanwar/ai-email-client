// import { error } from "console";
// import { NextResponse } from "next/server";
// import { Account } from "~/lib/account";
// import { db } from "~/server/db";

// export const POST =async (req:NextResponse)=>{
// const {accountId,userId}=await req.json()
// if(!accountId || !userId){
//     return NextResponse.json({
//         error:"Missing accountId or userId"
//     },
//     {
//         status:400
//     }
//     )
// }
// const  DatabaseAccount=await db.account.findUnique({
//     where:{
//         id:accountId,
//         userId
//     }
// })
// if(!DatabaseAccount){
//     return NextResponse.json({
//         error:"Account not found"
//     },
//     {
//         status:404
//     })
// }

// //will perform the initial sync

// const account=new Account(DatabaseAccount.accessToken)

// const response=await account.performInitialSync()
// if(response){
//     return NextResponse.json({
//         error:"failed to perform initial sync"
//     },{
//         status:500
//     })
// }
// const {emails}=response
// await syncEmailsIsToDatabase(emails)
// }const { accountId, userId } = await req.json();
// if (!accountId || !userId) {
//     return NextResponse.json({
//         error: "Missing accountId or userId"
//     }, {
//         status: 400
//     });
// }
// const databaseAccount = await db.account.findUnique({
//     where: {
//         id: accountId,
//         userId
//     }
// });
// if (!databaseAccount) {
//     return NextResponse.json({
//         error: "Account not found"
//     }, {
//         status: 404
//     });
// }

// try {
//     const account = new Account(databaseAccount.accessToken);
//     const response = await account.performInitialSync();
//     if (!response) {
//         return NextResponse.json({
//             error: "Failed to perform initial sync"
//         }, {
//             status: 500
//         });
//     }
//     const { emails } = response;
//     await syncEmailsIsToDatabase(emails);
// } catch (error) {
//     error("Error performing initial sync");
//     return NextResponse.json({
//         error: "Failed to perform initial sync"
//     }, {
//         status: 500
//     });
// }const { accountId, userId } = await req.json();
// if (!accountId || !userId) {
//   return NextResponse.json({ error: "Missing accountId or userId" }, { status: 400 });
// }

// const databaseAccount = await db.account.findUnique({ where: { id: accountId, userId } });
// if (!databaseAccount) {
//   return NextResponse.json({ error: "Account not found" }, { status: 404 });
// }

// try {
//   const account = new Account(databaseAccount.accessToken);
//   const response = await account.performInitialSync();
//   if (!response) {
//     return NextResponse.json({ error: "Failed to perform initial sync" }, { status: 500 });
//   }
//   const { emails } = response;
//   await syncEmailsToDatabase(emails);
// } catch (error) {
//   error("Error performing initial sync:", error);
//   return NextResponse.json({ error: "Failed to perform initial sync" }, { status: 500 });
// }