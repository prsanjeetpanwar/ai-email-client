import { db } from "~/server/db"

export const POST =async (req:Request)=>{
  const {data}=await req.json()
 console.log('clerk webhook data',data)
//  const id = data?.id;
 const emailAddress = data.emailAddresses?.[0]?.emailAddress 
 const firstName = data.firstName 
 const lastName = data.lastName 
 const imageUrl = data.imageUrl 
 const id =data.id

 await db.user.create({
    data:{
        id:id,
        emailAddress:emailAddress,
        firstName:firstName,
        lastName:lastName,
        imageUrl:imageUrl
    }
 })
  return new Response('webook received',{status:200})
}