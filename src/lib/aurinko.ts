"use server"
import { auth } from "@clerk/nextjs/server"
import axios from "axios"

export const getAurinkoAuthUrl = async (serviceType: 'Google' | 'Office365') => {
    const { userId } = await auth()
    if (!userId) throw new Error('Unauthorized you can not access this thing')

    // Updated scopes with full Gmail access
    const scopes = {
        'Google': [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/gmail.send',
            'https://www.googleapis.com/auth/gmail.settings.basic',
            'https://www.googleapis.com/auth/gmail.settings.sharing',
            'https://www.googleapis.com/auth/gmail.metadata',
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events',
            'https://mail.google.com/',  // Full Gmail access scope
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ],
        'Office365': [
            'Mail.Read',
            'Mail.ReadWrite',
            'Mail.Send',
            'Mail.Drafts',
            'Mail.All',
            'Calendars.Read',
            'Calendars.ReadWrite'
        ]
    }

    const selectedScopes = scopes[serviceType].join(' ')

    // Debug logging
    console.log('🔍 Selected service type:', serviceType)
    console.log('📋 Requested scopes:', selectedScopes)

    const params = new URLSearchParams({
        clientId: process.env.AURINKO_CLIENT_ID! as string,
        serviceType,
        scope: selectedScopes,
        responseType: 'code',
        returnUrl: `${process.env.AURINKO_REDIRECT_URL}/api/aurinko/callback`,
        prompt: 'consent'  // Force consent screen to ensure all scopes are approved
    })

    const authUrl = `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`
    console.log('🔗 Generated auth URL:', authUrl)
    
    return authUrl
}

// Error handling type remains the same
type AurinkoError = {
    code: string;
    message: string;
    requestId: string;
    originalError?: {
        error: {
            code: number;
            message: string;
            errors: Array<{
                message: string;
                domain: string;
                reason: string;
            }>;
            status?: string;
            details?: Array<{
                '@type': string;
                reason: string;
                domain: string;
                metadata: {
                    service: string;
                    method: string;
                };
            }>;
        };
    };
}

export const exchangeCodeForAccessToken = async (code: string) => {
    console.log('🔄 Starting token exchange process')
    
    if (!code) {
        console.error('❌ No code provided for token exchange')
        return null;
    }

    try {
        console.log('🎫 Attempting to exchange code:', code.substring(0, 10) + '...')
        
        const response = await axios.post(`https://api.aurinko.io/v1/auth/token/${code}`, {}, {
            auth: {
                username: process.env.AURINKO_CLIENT_ID!,
                password: process.env.AURINKO_CLIENT_SECRET!
            }
        });

        console.log('✅ Token exchange successful')
        console.log('🔑 Account ID received:', response.data.accountId)
        
        return response.data as {
            accountId: string,
            accessToken: string,
            userId: string,
            userSession: string
        };

    } catch (error) {
        if (axios.isAxiosError(error)) {
            const aurinkoError = error.response?.data as AurinkoError;
            console.error('❌ Aurinko API Error:', {
                code: aurinkoError?.code,
                message: aurinkoError?.message,
                requestId: aurinkoError?.requestId,
                details: aurinkoError?.originalError?.error?.details
            });

            if (aurinkoError?.originalError?.error?.errors?.some(e => e.reason === 'insufficientPermissions')) {
                console.error('🚫 Authentication scope is insufficient. Required scopes missing for:', 
                    aurinkoError?.originalError?.error?.details?.[0]?.metadata?.method
                );
            }
        }
        return null;
    }
}

export const getAccountDetails = async (accessToken: string) => {
    try {
        console.log('📊 Fetching account details')
        const response = await axios.get(`https://api.aurinko.io/v1/account`, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        })
        console.log('✅ Account details retrieved successfully')
        return response.data as {
            email: string,
            name: string
        }
    }
    catch (err) {
        if (axios.isAxiosError(err)) {
            const errorMessage = err.response?.data?.error?.message
            console.error('❌ Error fetching account details:', errorMessage)
            throw new Error(`Failed to fetch account details: ${errorMessage}`)
        }
        console.error("❌ Unexpected error fetching account details:", err)
        throw err
    }
}