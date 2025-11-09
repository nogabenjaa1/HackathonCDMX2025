/**
 * Resolves payment global parameters from transaction entities
 * 
 * Validates required payment parameters and extracts necessary information
 * for processing Interledger-compatible payments.
 * 
 * @param {Object} params - The payment parameters object
 * @param {Object} params.buyer - Buyer entity with wallet information
 * @param {Object} params.service - Service being purchased with pricing details
 * @param {Object} params.vendor - Vendor entity with wallet information
 * 
 * @returns {Object} Resolved payment globals containing:
 * @returns {string} senderWalletUrl - Buyer's wallet address URL
 * @returns {string} receiverWalletUrl - Vendor's wallet address URL  
 * @returns {number} amountCents - Payment amount in cents
 * @returns {string|undefined} assetCode - Asset code (optional)
 * @returns {number|undefined} assetScale - Asset scale (optional)
 * 
 * @throws {Error} When buyer or vendor wallet addresses are missing
 * 
 * @example
 * const paymentGlobals = resolvePaymentGlobals({
 *   buyer: { wallet_address_url: 'https://wallet.example/buyer' },
 *   vendor: { wallet_address_url: 'https://wallet.example/vendor' },
 *   service: { price_cents: 1999, asset_code: 'USD', asset_scale: 2 }
 * });
 */
export function resolvePaymentGlobals({ buyer, service, vendor }) {
  // Validate required wallet addresses
  if (!buyer?.wallet_address_url) throw new Error('Buyer wallet address is required');
  if (!vendor?.wallet_address_url) throw new Error('Vendor wallet address is required');

  // Extract wallet URLs
  const senderWalletUrl = buyer.wallet_address_url;
  const receiverWalletUrl = vendor.wallet_address_url;

  // Extract payment amount
  const amountCents = service.price_cents;

  return {
    senderWalletUrl,
    receiverWalletUrl,
    amountCents,
    assetCode: service.asset_code || undefined,
    assetScale: Number.isInteger(service.asset_scale) ? service.asset_scale : undefined,
  };
}