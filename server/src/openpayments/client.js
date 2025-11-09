import { createAuthenticatedClient } from '@interledger/open-payments';

/**
 * Creates and initializes an authenticated Open Payments client
 * 
 * Configures and returns a client instance using environment variables
 * for authentication and wallet addressing. The client is pre-authenticated
 * and ready for making signed requests to the Open Payments network.
 * 
 * @returns {Promise<Object>} Authenticated Open Payments client instance
 * 
 * @throws {Error} When required environment variables are missing or invalid
 * 
 * @example
 * // Environment variables required:
 * // CLIENT_WALLET_ADDRESS_URL=https://wallet.example/client
 * // PRIVATE_KEY_BASE64=base64EncodedPrivateKey
 * // KEY_ID=your-key-id
 * 
 * const client = await createOpenPaymentsClient();
 * // Client is now ready for wallet address operations
 */
export async function createOpenPaymentsClient() {
  const client = await createAuthenticatedClient({
    walletAddressUrl: process.env.CLIENT_WALLET_ADDRESS_URL,
    privateKey: Buffer.from(process.env.PRIVATE_KEY_BASE64 || '', 'base64'),
    keyId: process.env.KEY_ID,
  });
  
  return client;
}

// Initialize client instance at module load
const client = await createOpenPaymentsClient();

/**
 * Retrieves wallet address information from the Open Payments network
 * 
 * Fetches and returns detailed information about a specific wallet address
 * using the pre-authenticated client instance.
 * 
 * @param {string} walletAddressUrl - The URL of the wallet address to query
 * @returns {Promise<Object>} Wallet address information object
 * 
 * @throws {Error} When the client is not properly initialized
 * @throws {Error} When the wallet address lookup fails
 * 
 * @example
 * const walletInfo = await getWalletAddressInfo('https://wallet.example/user1');
 * console.log(walletInfo);
 */
export async function getWalletAddressInfo(walletAddressUrl) {
  return client.walletAddress.get({ url: walletAddressUrl });
}