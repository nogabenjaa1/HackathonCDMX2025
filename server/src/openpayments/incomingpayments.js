import { CreateClient } from './client.js';
import { isPendingGrant } from '@interledger/open-payments';

const client = await CreateClient();

// Grant para incoming payments
export async function IncomingGrant(authServer) {
  const incomingPaymentGrant = await client.grant.request(
    { url: authServer },
    { access_token: { access: [{ type: 'incoming-payment', actions: ['list','read','read-all','complete','create'] }] } }
  );
  if (isPendingGrant(incomingPaymentGrant)) throw new Error('Expected non-interactive incomingPaymentGrant');
  return { token: incomingPaymentGrant.access_token.value, manageUrl: incomingPaymentGrant.access_token.manage };
}

// Crear incoming payment (valor en centavos). Forzamos assetScale=2 como pediste.
export async function CreateIncomingPayment(walletAddressInfo, IncomingPaymentGrantToken, { valueCents, expiresInMinutes = 10, metadata } = {}) {
  const resolvedValue = String(Math.trunc(valueCents ?? 10000)); // default 100.00
  const incomingPaymentCreate = await client.incomingPayment.create(
    { url: walletAddressInfo.resourceServer, accessToken: IncomingPaymentGrantToken },
    {
      walletAddress: walletAddressInfo.id,
      incomingAmount: {
        value: resolvedValue,
        assetCode: walletAddressInfo.assetCode,
        assetScale: 2, // <- forzado (según tu requerimiento)
      },
      expiresAt: new Date(Date.now() + expiresInMinutes * 60_000).toISOString(),
      ...(metadata ? { metadata } : {}),
    }
  );
  return incomingPaymentCreate.id;
}
