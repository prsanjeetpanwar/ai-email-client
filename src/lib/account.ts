import axios from "axios";

export class Account {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private async startSync(): Promise<any> {
        try {
            const response = await axios.post(
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
        } catch (error) {
            console.error("Sync failed:", error);
            throw error; 
        }
    } 

    async performInitialSync(): Promise<void> {
        try {
            let syncResponse = await this.startSync();
            console.log("Sync Response:", syncResponse);
        } catch (err) {
            console.error("Initial sync failed:", err);
        }
    }
}
