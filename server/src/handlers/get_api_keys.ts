import { type ApiKey } from '../schema';

export async function getApiKeys(): Promise<ApiKey[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all API keys from the database.
    // This should typically be restricted to admin users only.
    // Note: Never return the actual key hashes, only metadata.
    return Promise.resolve([]);
}