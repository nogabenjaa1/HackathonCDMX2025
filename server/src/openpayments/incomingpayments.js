import { CreateClient } from './client.js';
import { isPendingGrant } from '@interledger/open-payments';

// Initialize Open Payments client
const client = await CreateClient();

/**
 * Requests an incoming payment grant from the authorization server
 * 
 * Obtains an access token with permissions to manage incoming payments
 * including listing, reading, completing, and creating payment requests.
 * 
 * @param {string} authServer - The URL of the authorization server
 * @returns {Promise<Object>} Grant object containing access token and management URL
 * @returns {string} token - The access token value
 * @returns {string} manageUrl - URL to manage the granted token
 * 
 * @throws {Error} When the grant requires interactive approval (pending grant)
 * @throws {Error} When the grant request fails
 * 
 * @example
 * const grant = await requestIncomingPaymentGrant('https://auth.example.com');
 * console.log(grant.token); // Access token for incoming payment operations
 */
export async function requestIncomingPaymentGrant(authServer) {
  const incomingPaymentGrant = await client.grant.request(
    { url: authServer },
    { 
      access_token: { 
        access: [
          { 
            type: 'incoming-payment', 
            actions: ['list', 'read', 'read-all', 'complete', 'create'] 
          }
        ] 
      } 
    }
  );
  
  if (isPendingGrant(incomingPaymentGrant)) {
    throw new Error('Expected non-interactive grant for incoming payments');
  }
  
  return { 
    token: incomingPaymentGrant.access_token.value, 
    manageUrl: incomingPaymentGrant.access_token.manage 
  };
}

/**
 * Creates an incoming payment request with fixed asset scale
 * 
 * Generates a payment request that can be fulfilled by a sender. The amount
 * is specified in cents and automatically converted to the proper format
 * with asset scale fixed at 2 (as required).
 * 
 * @param {Object} walletAddressInfo - Wallet address information object
 * @param {string} walletAddressInfo.id - The wallet address identifier
 * @param {string} walletAddressInfo.assetCode - The currency code (e.g., 'USD', 'EUR')
 * @param {string} walletAddressInfo.resourceServer - The resource server URL
 * @param {string} IncomingPaymentGrantToken - Access token for incoming payment operations
 * @param {Object} options - Payment creation options
 * @param {number} options.valueCents - Payment amount in cents (default: 10000 = $100.00)
 * @param {number} options.expiresInMinutes - Payment expiration time in minutes (default: 10)
 * @param {Object} [options.metadata] - Optional payment metadata
 * 
 * @returns {Promise<string>} The created incoming payment ID
 * 
 * @throws {Error} When the incoming payment creation fails
 * 
 * @example
 * const paymentId = await createIncomingPayment(
 *   walletInfo,
 *   grantToken,
 *   { 
 *     valueCents: 5000, // $50.00
 *     expiresInMinutes: 15,
 *     metadata: { invoiceId: 'inv_123' }
 *   }
 * );
 */
export async function createIncomingPayment(
  walletAddressInfo, 
  IncomingPaymentGrantToken, 
  { valueCents, expiresInMinutes = 10, metadata } = {}
) {
  // Convert cents to proper string value (100 cents = 1.00 unit)
  const resolvedValue = String(Math.trunc(valueCents ?? 10000));
  
  const incomingPaymentCreate = await client.incomingPayment.create(
    { 
      url: walletAddressInfo.resourceServer, 
      accessToken: IncomingPaymentGrantToken 
    },
    {
      walletAddress: walletAddressInfo.id,
      incomingAmount: {
        value: resolvedValue,
        assetCode: walletAddressInfo.assetCode,
        assetScale: 2, // Fixed asset scale as required
      },
      expiresAt: new Date(Date.now() + expiresInMinutes * 60_000).toISOString(),
      ...(metadata ? { metadata } : {}),
    }
  );
  
  return incomingPaymentCreate.id;
}