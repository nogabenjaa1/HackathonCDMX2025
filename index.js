import { CreateClient } from './client.js';

const client = await CreateClient();

// ----- walletaddress ----- //
export async function getWalletAddressInfo(walletAddressUrl) {
  const walletAddressInfo = await client.walletAddress.get({
    url: walletAddressUrl,
  });

  return walletAddressInfo;
}