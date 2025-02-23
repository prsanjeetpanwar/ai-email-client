import axios from "axios";
import { EmailMessage, SyncResponse, SyncUpdatedResponse } from "~/types/types";

export class Account {
    private token: string;
    private readonly baseUrl = 'https://api.aurinko.io/v1';

    constructor(token: string) {
        this.token = token;
    }

    private async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', data: any = null, params: Record<string, any> = {}) {
        try {
            const config = {
                method,
                url: `${this.baseUrl}${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                params,
                data: method === 'POST' ? data : undefined
            };

            console.log(`🔄 Making ${method} request to ${endpoint}`, { params });
            const response = await axios(config);
            return response.data as T;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorDetails = error.response?.data;
                console.error(`❌ API Error for ${endpoint}:`, {
                    status: error.response?.status,
                    data: errorDetails,
                    config: {
                        url: error.config?.url,
                        method: error.config?.method,
                        params: error.config?.params
                    }
                });

                // Check if we need to refresh token or re-authenticate
                if (error.response?.status === 401) {
                    throw new Error('Authentication token expired or invalid');
                }
            }
            throw error;
        }
    }

    private async startSync(): Promise<SyncResponse> {
        console.log('📧 Starting email sync process');
        return this.makeRequest<SyncResponse>('/email/sync', 'POST', {}, {
            daysWithin: 2,
            bodyType: 'html',
            serviceType: 'Gmail'  // Explicitly specify Gmail as service type
        });
    }

    async getUpdatedEmails({ deltaToken, pageToken }: { deltaToken?: string; pageToken?: string; }): Promise<SyncUpdatedResponse> {
        const params: Record<string, string> = {};
        if (deltaToken) params.deltaToken = deltaToken;
        if (pageToken) params.syncToken = pageToken;

        return this.makeRequest<SyncUpdatedResponse>('/email/sync/updated', 'GET', null, params);
    }

    async performInitialSync() {
        try {
            console.log('🚀 Starting initial sync process');

            // First, verify account access
            await this.makeRequest('/account');
            console.log('✅ Account access verified');

            let syncResponse = await this.startSync();
            console.log('📥 Initial sync response:', { ready: syncResponse.ready });

            // Wait for sync to be ready
            let attempts = 0;
            const maxAttempts = 10;
            while (!syncResponse.ready && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                syncResponse = await this.startSync();
                attempts++;
                console.log(`🔄 Waiting for sync to be ready (attempt ${attempts}/${maxAttempts})`);
            }

            if (!syncResponse.ready) {
                throw new Error('Sync failed to become ready after maximum attempts');
            }

            let storedDeltaToken = syncResponse.syncUpdatedToken;
            let updateResponse = await this.getUpdatedEmails({ deltaToken: storedDeltaToken });
            console.log('📨 Retrieved first batch of emails');

            let allEmails: EmailMessage[] = updateResponse.records;

            // Paginate through all results
            while (updateResponse.nextPageToken) {
                console.log('📑 Fetching next page of emails');
                updateResponse = await this.getUpdatedEmails({ pageToken: updateResponse.nextPageToken });
                allEmails = allEmails.concat(updateResponse.records);
                
                if (updateResponse.nextDeltaToken) {
                    storedDeltaToken = updateResponse.nextDeltaToken;
                }
            }

            console.log(`✅ Initial sync completed with ${allEmails.length} emails`);

            return {
                emails: allEmails,
                deltaToken: storedDeltaToken
            };

        } catch (err) {
            if (axios.isAxiosError(err)) {
                const errorDetails = err.response?.data;
                console.error('❌ Sync error:', {
                    status: err.response?.status,
                    message: errorDetails?.message,
                    originalError: errorDetails?.originalError,
                    requestId: errorDetails?.requestId
                });
            }
            throw err;
        }
    }
}