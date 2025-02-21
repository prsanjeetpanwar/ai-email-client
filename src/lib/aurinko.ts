"use server"

import { auth } from "@clerk/nextjs/server"
import axios from "axios"

export const getAurinkoAuthUrl= async(serviceType:'Google'|'Office365')=>{
const {userId}=await auth()
if(!userId) throw new Error('Unauthorized you can not access this thing')

    const params=new URLSearchParams({
    clientId:process.env.AURINKO_CLIENT_ID! as string,
    serviceType,
    scope:'Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All Calendars.Read Calendars.ReadWrite', 
    responseType:'code',
    returnUrl:`${process.env.AURINKO_REDIRECT_URL}/api/aurinko/callback`


    })


    return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`


}




export const exchangeCodeForAccessToken = async (code: string) => {
    console.log('🔄 Starting token exchange process')
    
    if (!code) {
        console.error('❌ No code provided for token exchange')
        return null;
    }

    // Validate environment variables
    if (!process.env.AURINKO_CLIENT_ID || !process.env.AURINKO_CLIENT_SECRET) {
        console.error('❌ Missing required environment variables')
        return null;
    }

    try {
        // Construct and validate the URL
         const baseUrl = 'https://api.aurinko.io/v1/auth/token';
        const url = `${baseUrl}/${code}`;

        console.log('🌐 Attempting API request to:', url)

        const response = await axios.post(url, {}, {
            auth: {
                username: process.env.AURINKO_CLIENT_ID,
                password: process.env.AURINKO_CLIENT_SECRET
            }
        });

        console.log('✅ Token exchange successful')

        return response.data as {
            accountId: string,
            accessToken: string,
            userId: string,
            userSession: string
        };

    } catch (error) {
        if (axios.isAxiosError(error)) {
            // Handle specific HTTP errors
            const statusCode = error.response?.status;
            const errorData = error.response?.data;

            console.error('❌ Aurinko API Error:', {
                statusCode,
                message: errorData?.message || error.message,
                url: error.config?.url
            });

            // Log specific error types
            switch (statusCode) {
                case 400:
                    console.error('Invalid request parameters');
                    break;
                case 401:
                    console.error('Authentication failed - check credentials');
                    break;
                case 404:
                    console.error('API endpoint not found - check URL');
                    break;
                case 429:
                    console.error('Rate limit exceeded');
                    break;
                case 500:
                    console.error('Aurinko server error');
                    break;
                default:
                    console.error('Unexpected API error');
            }
        } else {
            console.error('❌ Unexpected error during token exchange:', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
        
        // Return null instead of throwing to prevent the application from crashing
        return null;
    }
};

export const getAccountDetails =async (accessToken:string)=>{
  try {
const response=await axios.get(`https://api.aurinko.io/v1/account`,{
    headers:{
        Authorization:`Bearer ${accessToken}`
    }
})
return response.data as {
    // accountId:string,
    // name: string,
    // emailAddress: string
    email:string,
    name:string
}
  }
  catch(err){

    if(axios.isAxiosError(err)){
        console.error(err.response?.data?.error?.message)
     }
     console.error("Unexpected error fetching account details",err)
  }
}