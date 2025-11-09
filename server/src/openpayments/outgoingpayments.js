import { CreateClient } from './client.js';
import pkg from '@interledger/open-payments';
const { isPendingGrant, isFinalizedGrant } = pkg;

// Initialize Open Payments client
const client = await CreateClient();

/**
 * Creates a grant for quote operations (non-interactive)
 * 
 * Obtains an access token with permissions to create and read quotes
 * for outgoing payment preparation.
 * 
 * @param {string} authServer - The URL of the authorization server
 * @returns {Promise<Object>} Grant object containing access token and management URL
 * @returns {string} token - The access token value for quote operations
 * @returns {string} manageUrl - URL to manage the granted token
 * 
 * @throws {Error} When the grant requires interactive approval
 * 
 * @example
 * const grant = await createSenderQuoteGrant('https://auth.example.com');
 */
export async function createSenderQuoteGrant(authServer) {
  const grant = await client.grant.request(
    { url: authServer },
    { 
      access_token: { 
        access: [{ 
          type: 'quote', 
          actions: ['create', 'read', 'read-all'] 
        }] 
      } 
    }
  );
  
  if (isPendingGrant(grant)) {
    throw new Error('Expected non-interactive quote grant');
  }
  
  return { 
    token: grant.access_token.value, 
    manageUrl: grant.access_token.manage 
  };
}

/**
 * Creates a payment quote for an outgoing payment
 * 
 * Generates a quote that calculates the exact amount to be debited from
 * the sender's account for a specific incoming payment request.
 * 
 * @param {string} quoteGrantToken - Access token with quote permissions
 * @param {Object} senderInfo - Sender's wallet information
 * @param {string} senderInfo.resourceServer - The resource server URL
 * @param {string} senderInfo.id - Sender's wallet address identifier
 * @param {string} incomingPaymentId - The ID of the incoming payment to fulfill
 * @returns {Promise<string>} The created quote ID
 * 
 * @example
 * const quoteId = await createQuoteFromSender(quoteToken, senderInfo, incomingPaymentId);
 */
export async function createQuoteFromSender(quoteGrantToken, senderInfo, incomingPaymentId) {
  const res = await client.quote.create(
    { url: senderInfo.resourceServer, accessToken: quoteGrantToken },
    { 
      method: 'ilp', 
      walletAddress: senderInfo.id, 
      receiver: incomingPaymentId 
    }
  );
  return res.id;
}

/**
 * Retrieves detailed information about a specific quote
 * 
 * @param {string} quoteGrantToken - Access token with quote permissions
 * @param {string} quoteId - The ID of the quote to retrieve
 * @returns {Promise<Object>} Detailed quote information including amounts and fees
 * 
 * @example
 * const quote = await getQuoteFromSender(quoteToken, quoteId);
 * console.log(quote.debitAmount.value); // Amount to be debited
 */
export async function getQuoteFromSender(quoteGrantToken, quoteId) {
  return client.quote.get({ url: quoteId, accessToken: quoteGrantToken });
}

/**
 * Requests an interactive grant for a one-time outgoing payment
 * 
 * Initiates an interactive authorization flow for a single outgoing payment
 * with specific amount limits. Requires user redirection for approval.
 * 
 * @param {Object} senderWalletAddressInfo - Sender's wallet address information
 * @param {Object} quote - Quote object containing payment amount details
 * @param {Object} quote.debitAmount - The amount to be debited from sender
 * @param {Object} options - Interactive grant options
 * @param {string} options.callbackUrl - URL to redirect after authorization
 * @param {string} options.nonce - Security nonce for the authorization flow
 * @returns {Promise<Object>} Interactive grant response
 * @returns {string} interactUrl - URL to redirect user for authorization
 * @returns {string} continueAccessToken - Token to continue grant after interaction
 * @returns {string} continueUri - URI to continue grant process
 * 
 * @throws {Error} When the grant is not interactive as expected
 * 
 * @example
 * const grant = await requestOutgoingPaymentInteractiveGrant(
 *   senderInfo,
 *   quote,
 *   { callbackUrl: 'https://app.example/callback', nonce: 'random123' }
 * );
 */
export async function requestOutgoingPaymentInteractiveGrant(
  senderWalletAddressInfo, 
  quote, 
  { callbackUrl, nonce }
) {
  const pending = await client.grant.request(
    { url: senderWalletAddressInfo.authServer },
    {
      access_token: {
        access: [{
          identifier: senderWalletAddressInfo.id,
          type: 'outgoing-payment',
          actions: ['list', 'list-all', 'read', 'read-all', 'create'],
          limits: {
            debitAmount: {
              assetCode: quote.debitAmount.assetCode,
              assetScale: quote.debitAmount.assetScale,
              value: quote.debitAmount.value,
            },
          },
        }],
      },
      interact: {
        start: ['redirect'],
        finish: { method: 'redirect', uri: callbackUrl, nonce },
      },
    }
  );
  
  if (!isPendingGrant(pending)) {
    throw new Error('Expected interactive grant for outgoing payment');
  }
  
  return {
    interactUrl: pending.interact.redirect,
    continueAccessToken: pending.continue.access_token.value,
    continueUri: pending.continue.uri,
  };
}

/**
 * Requests an interactive grant for recurring outgoing payments
 * 
 * Initiates an interactive authorization flow for recurring payments
 * within a specified time interval (pay-per-use model).
 * 
 * @param {Object} senderWalletAddressInfo - Sender's wallet address information
 * @param {Object} quote - Quote object containing payment amount details
 * @param {string} intervalIso - ISO 8601 interval string (e.g., 'R/2025-01-01T00:00:00.000Z/PT1H')
 * @param {Object} options - Interactive grant options
 * @param {string} options.callbackUrl - URL to redirect after authorization
 * @param {string} options.nonce - Security nonce for the authorization flow
 * @returns {Promise<Object>} Interactive grant response
 * @returns {string} interactUrl - URL to redirect user for authorization
 * @returns {string} continueAccessToken - Token to continue grant after interaction
 * @returns {string} continueUri - URI to continue grant process
 * 
 * @throws {Error} When the grant is not interactive as expected
 * 
 * @example
 * const grant = await requestOutgoingPaymentIntervalGrant(
 *   senderInfo,
 *   quote,
 *   'R/2025-01-01T00:00:00.000Z/PT1H', // Every hour
 *   { callbackUrl: 'https://app.example/callback', nonce: 'random123' }
 * );
 */
export async function requestOutgoingPaymentIntervalGrant(
  senderWalletAddressInfo, 
  quote, 
  intervalIso, 
  { callbackUrl, nonce }
) {
  const pending = await client.grant.request(
    { url: senderWalletAddressInfo.authServer },
    {
      access_token: {
        access: [{
          identifier: senderWalletAddressInfo.id,
          type: 'outgoing-payment',
          actions: ['list', 'list-all', 'read', 'read-all', 'create'],
          limits: {
            debitAmount: {
              assetCode: quote.debitAmount.assetCode,
              assetScale: quote.debitAmount.assetScale,
              value: quote.debitAmount.value,
            },
            interval: intervalIso, // ISO 8601 interval for recurring payments
          },
        }],
      },
      interact: {
        start: ['redirect'],
        finish: { method: 'redirect', uri: callbackUrl, nonce },
      },
    }
  );
  
  if (!isPendingGrant(pending)) {
    throw new Error('Expected interactive grant with interval');
  }
  
  return {
    interactUrl: pending.interact.redirect,
    continueAccessToken: pending.continue.access_token.value,
    continueUri: pending.continue.uri,
  };
}

/**
 * Finalizes an interactive grant after user authorization
 * 
 * Completes the interactive grant flow by exchanging the interaction reference
 * for a final access token that can be used to create outgoing payments.
 * 
 * @param {string} continueAccessToken - The continue access token from the pending grant
 * @param {string} continueUri - The continue URI from the pending grant
 * @param {string} interactRef - The interaction reference from the redirect callback
 * @returns {Promise<string>} The finalized access token for outgoing payments
 * 
 * @throws {Error} When the grant finalization fails or returns unexpected state
 * 
 * @example
 * const accessToken = await finalizeInteractiveGrant(
 *   continueAccessToken,
 *   continueUri,
 *   interactRef
 * );
 */
export async function finalizeInteractiveGrant(continueAccessToken, continueUri, interactRef) {
  const cont = await client.grant.continue(
    { accessToken: continueAccessToken, url: continueUri },
    { interact_ref: interactRef }
  );
  
  if (!isFinalizedGrant(cont)) {
    throw new Error('Expected finalized continue grant');
  }
  
  return cont.access_token.value;
}

/**
 * Creates an outgoing payment using a finalized grant and quote
 * 
 * Executes the actual payment transfer after successful authorization
 * and quote creation.
 * 
 * @param {Object} senderWalletAddressInfo - Sender's wallet address information
 * @param {string} senderWalletAddressInfo.resourceServer - The resource server URL
 * @param {string} senderWalletAddressInfo.id - Sender's wallet address identifier
 * @param {string} accessToken - Finalized access token with outgoing payment permissions
 * @param {Object} quote - The finalized quote object with payment details
 * @param {string} quote.id - The quote ID to use for payment
 * @returns {Promise<string>} The created outgoing payment ID
 * 
 * @example
 * const paymentId = await createOutgoingPayment(
 *   senderInfo,
 *   accessToken,
 *   quote
 * );
 */
export async function createOutgoingPayment(senderWalletAddressInfo, accessToken, quote) {
  const res = await client.outgoingPayment.create(
    { url: senderWalletAddressInfo.resourceServer, accessToken },
    { 
      walletAddress: senderWalletAddressInfo.id, 
      quoteId: quote.id 
    }
  );
  return res.id;
}