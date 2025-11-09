import { CreateClient } from './client.js';
import pkg from '@interledger/open-payments';
const { isPendingGrant, isFinalizedGrant } = pkg;

const client = await CreateClient();

export async function createSenderQuoteGrant(authServer) {
  const grant = await client.grant.request(
    { url: authServer },
    { access_token: { access: [{ type: 'quote', actions: ['create','read','read-all'] }] } }
  );
  if (isPendingGrant(grant)) throw new Error('Expected non-interactive quote grant');
  return { token: grant.access_token.value, manageUrl: grant.access_token.manage };
}

export async function createQuoteFromSender(quoteGrantToken, senderInfo, incomingPaymentId) {
  const res = await client.quote.create(
    { url: senderInfo.resourceServer, accessToken: quoteGrantToken },
    { method: 'ilp', walletAddress: senderInfo.id, receiver: incomingPaymentId }
  );
  return res.id;
}

export async function getQuoteFromSender(quoteGrantToken, quoteId) {
  return client.quote.get({ url: quoteId, accessToken: quoteGrantToken });
}

// Grant interactivo (one-shot)
export async function requestOutgoingPaymentInteractiveGrant(senderWalletAddressInfo, quote, { callbackUrl, nonce }) {
  const pending = await client.grant.request(
    { url: senderWalletAddressInfo.authServer },
    {
      access_token: {
        access: [{
          identifier: senderWalletAddressInfo.id,
          type: 'outgoing-payment',
          actions: ['list','list-all','read','read-all','create'],
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
  if (!isPendingGrant(pending)) throw new Error('Expected interactive grant');
  return {
    interactUrl: pending.interact.redirect,
    continueAccessToken: pending.continue.access_token.value,
    continueUri: pending.continue.uri,
  };
}

// Grant interactivo con intervalo (pay-per-use)
export async function requestOutgoingPaymentIntervalGrant(senderWalletAddressInfo, quote, intervalIso, { callbackUrl, nonce }) {
  const pending = await client.grant.request(
    { url: senderWalletAddressInfo.authServer },
    {
      access_token: {
        access: [{
          identifier: senderWalletAddressInfo.id,
          type: 'outgoing-payment',
          actions: ['list','list-all','read','read-all','create'],
          limits: {
            debitAmount: {
              assetCode: quote.debitAmount.assetCode,
              assetScale: quote.debitAmount.assetScale,
              value: quote.debitAmount.value,
            },
            interval: intervalIso, // e.g. R/2025-01-01T00:00:00.000Z/PT1H
          },
        }],
      },
      interact: {
        start: ['redirect'],
        finish: { method: 'redirect', uri: callbackUrl, nonce },
      },
    }
  );
  if (!isPendingGrant(pending)) throw new Error('Expected interactive grant (interval)');
  return {
    interactUrl: pending.interact.redirect,
    continueAccessToken: pending.continue.access_token.value,
    continueUri: pending.continue.uri,
  };
}

export async function finalizeInteractiveGrant(continueAccessToken, continueUri, interactRef) {
  const cont = await client.grant.continue(
    { accessToken: continueAccessToken, url: continueUri },
    { interact_ref: interactRef }
  );
  if (!isFinalizedGrant(cont)) throw new Error('Expected finalized continue grant');
  return cont.access_token.value;
}

export async function createOutgoingPayment(senderWalletAddressInfo, accessToken, quote) {
  const res = await client.outgoingPayment.create(
    { url: senderWalletAddressInfo.resourceServer, accessToken },
    { walletAddress: senderWalletAddressInfo.id, quoteId: quote.id }
  );
  return res.id;
}
