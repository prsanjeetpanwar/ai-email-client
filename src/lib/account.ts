import axios from "axios";
import { EmailMessage, SyncResponse, SyncUpdatedResponse } from "~/types/types";

export class Account {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private async startSync(): Promise<SyncResponse> {
        try {
            const response = await axios.post<SyncResponse>(
                "https://api.aurinko.io/v1/email/sync",
                {},
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    params: {
                        dayWithin: 2,
                        bodyType: "html",
                    },
                }
            );
            return response.data;
        } catch (error: any) {
            console.error("Sync failed:", error.message);
            throw error;
        }
    }

    async getUpdateEmails({ deltaToken, pageToken }: { deltaToken?: string; pageToken?: string }) {
        try {
            const params: Record<string, string> = {};
            if (deltaToken) params.deltaToken = deltaToken;
            if (pageToken) params.pageToken = pageToken;

            const response = await axios.get<SyncUpdatedResponse>(
                "https://api.aurinko.io/v1/email/updated",
                {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    },
                    params,
                }
            );
            return response.data;
        } catch (error: any) {
            console.error("Failed to fetch updated emails:", error.message);
            throw error;
        }
    }

    async performInitialSync(): Promise<{ emails: EmailMessage[]; deltaToken: string } | null> {
        try {
            let syncResponse = await this.startSync();

            while (!syncResponse.ready) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                syncResponse = await this.startSync(); // Re-fetch sync status
            }

            let storedDeltaToken: string = syncResponse.syncDeletedToken;
            let updateResponse = await this.getUpdateEmails({ deltaToken: storedDeltaToken });

            if (updateResponse.nextDeltaToken) {
                storedDeltaToken = updateResponse.nextDeltaToken;
            }

            let allEmails: EmailMessage[] = updateResponse.records;

            // Fetch all pages if more exist
            while (updateResponse.nextPageToken) {
                updateResponse = await this.getUpdateEmails({ pageToken: updateResponse.nextPageToken });
                allEmails = allEmails.concat(updateResponse.records);

                if (updateResponse.nextDeltaToken) {
                    storedDeltaToken = updateResponse.nextDeltaToken;
                }
            }

            console.log(`Initial sync completed. Synced ${allEmails.length} emails.`);

            return {
                emails: allEmails,
                deltaToken: storedDeltaToken,
            };
        } catch (err: any) {
            console.error("Initial sync failed:", err.message);
            return null;
        }
    }
}
