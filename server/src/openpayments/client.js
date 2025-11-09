import { createAuthenticatedClient } from '@interledger/open-payments';

export async function CreateClient() {
  return createAuthenticatedClient({
    walletAddressUrl: process.env.CLIENT_WALLET_ADDRESS_URL,
    privateKey: Buffer.from(process.env.PRIVATE_KEY_BASE64 || '', 'base64'),
    keyId: process.env.KEY_ID,
  });
}
