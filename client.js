import { createAuthenticatedClient } from "@interledger/open-payments";

// ----- createdautenticatedclient ----- //
export async function CreateClient() {
    const client = await createAuthenticatedClient({
    walletAddressUrl: process.env.CLIENT_WALLET_ADDRESS_URL || 'https://ilp.interledger-test.dev/diegoc',
    privateKey:  Buffer.from(process.env.PRIVATE_KEY_BASE64 || '', 'base64'),
    keyId: process.env.KEY_ID,
    });

    return client;
}