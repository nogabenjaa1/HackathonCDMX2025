import { CreateClient } from './client.js';
const client = await CreateClient();


export async function getWalletAddressInfo(walletAddressUrl) {
return client.walletAddress.get({ url: walletAddressUrl });
}