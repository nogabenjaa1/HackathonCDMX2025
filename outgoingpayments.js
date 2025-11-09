// outgoingpayments.js
import { CreateClient } from './client.js';
import { getWalletAddressInfo } from './index.js';
import { isPendingGrant, isFinalizedGrant } from "@interledger/open-payments";
import { IncomingGrant, CreateIncomingPayment } from './incomingpayments.js';
import { randomUUID } from "crypto";
import http from "http";
import { URL } from "url";

const client = await CreateClient();

function toIso(d) { try { return new Date(d).toISOString(); } catch { return String(d); } }

function waitForInteractRef({ host = "localhost", port = 3344, path = "/callback" } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const reqUrl = new URL(req.url, `http://${host}:${port}`);
        if (reqUrl.pathname === path) {
          const interactRef = reqUrl.searchParams.get("interact_ref");
          if (!interactRef) { res.statusCode = 400; res.end("Missing interact_ref"); return; }
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("✅ Autorización recibida. Puedes volver a la terminal.");
          server.close(); resolve(interactRef);
        } else { res.statusCode = 404; res.end("Not Found"); }
      } catch (e) { server.close(); reject(e); }
    });
    server.on("error", reject);
    server.listen(port, host, () => {
      console.log(`Callback server escuchando en http://${host}:${port}${path}`);
    });
  });
}

async function createSenderQuoteGrant(authServer) {
  const grant = await client.grant.request(
    { url: authServer },
    { access_token: { access: [{ type: "quote", actions: ["create", "read", "read-all"] }] } }
  );
  if (isPendingGrant(grant)) throw new Error("Expected non-interactive quote grant (sender)");
  return { token: grant.access_token.value, manageUrl: grant.access_token.manage };
}

async function createQuoteFromSender(quoteGrantToken, senderInfo, incomingPaymentId) {
  const res = await client.quote.create(
    { url: senderInfo.resourceServer, accessToken: quoteGrantToken },
    { method: "ilp", walletAddress: senderInfo.id, receiver: incomingPaymentId }
  );
  return res.id;
}

async function getQuoteFromSender(quoteGrantToken, quoteId) {
  return client.quote.get({ url: quoteId, accessToken: quoteGrantToken });
}

async function requestOutgoingPaymentInteractiveGrant(senderWalletAddressInfo, quote) {
  console.log("Quote Debit Amount (sender asset) Value:", quote.debitAmount.value);
  console.log("Quote Debit Amount Asset Code:", quote.debitAmount.assetCode);
  console.log("Quote Debit Amount Asset Scale:", quote.debitAmount.assetScale);

  const NONCE = randomUUID();
  console.log("Generated NONCE for interaction:", NONCE);

  const pending = await client.grant.request(
    { url: senderWalletAddressInfo.authServer },
    {
      access_token: {
        access: [{
          identifier: senderWalletAddressInfo.id,
          type: "outgoing-payment",
          actions: ["list", "list-all", "read", "read-all", "create"],
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
        start: ["redirect"],
        finish: { method: "redirect", uri: "http://localhost:3344/callback", nonce: NONCE },
      },
    }
  );

  if (!isPendingGrant(pending)) throw new Error("Expected interactive grant");
  return {
    interactUrl: pending.interact.redirect,
    continueAccessToken: pending.continue.access_token.value,
    continueUri: pending.continue.uri,
  };
}

async function requestOutgoingPaymentIntervalGrant(senderWalletAddressInfo, quote, intervalIso) {
  console.log("Quote Debit Amount (sender asset) Value:", quote.debitAmount.value);
  console.log("Quote Debit Amount Asset Code:", quote.debitAmount.assetCode);
  console.log("Quote Debit Amount Asset Scale:", quote.debitAmount.assetScale);
  console.log("Interval limits:", intervalIso);

  const NONCE = randomUUID();
  console.log("Generated NONCE for interaction (interval):", NONCE);

  const pending = await client.grant.request(
    { url: senderWalletAddressInfo.authServer },
    {
      access_token: {
        access: [{
          identifier: senderWalletAddressInfo.id,
          type: "outgoing-payment",
          actions: ["list", "list-all", "read", "read-all", "create"],
          limits: {
            debitAmount: {
              assetCode: quote.debitAmount.assetCode,
              assetScale: quote.debitAmount.assetScale,
              value: quote.debitAmount.value,
            },
            interval: intervalIso,
          },
        }],
      },
      interact: {
        start: ["redirect"],
        finish: { method: "redirect", uri: "http://localhost:3344/callback", nonce: NONCE },
      },
    }
  );

  if (!isPendingGrant(pending)) throw new Error("Expected interactive grant (interval)");
  return {
    interactUrl: pending.interact.redirect,
    continueAccessToken: pending.continue.access_token.value,
    continueUri: pending.continue.uri,
  };
}

async function createOutgoingPayment(senderWalletAddressInfo, accessToken, quote) {
  console.log("Creating outgoing payment with:");
  console.log("Auth Server:", senderWalletAddressInfo.authServer);
  console.log("Resource Server:", senderWalletAddressInfo.resourceServer);
  console.log("Wallet Address ID:", senderWalletAddressInfo.id);
  console.log("Asset Code:", senderWalletAddressInfo.assetCode);
  console.log("Asset Scale:", senderWalletAddressInfo.assetScale);

  const res = await client.outgoingPayment.create(
    { url: senderWalletAddressInfo.resourceServer, accessToken },
    { walletAddress: senderWalletAddressInfo.id, quoteId: quote.id }
  );
  return res.id; 
}

async function ListOutgoingPayments(walletAddressInfo, OutgoingPaymentAccessToken) {
  const baseUrl = walletAddressInfo.resourceServer || new URL(walletAddressInfo.id).origin;
  const outgoingPayments = await client.outgoingPayment.list(
    { url: baseUrl, walletAddress: walletAddressInfo.id, accessToken: OutgoingPaymentAccessToken },
    { first: 10, last: undefined, cursor: undefined },
  );
  return JSON.stringify(outgoingPayments, null, 2);
}

async function GetOutgoingPayment(outgoingPaymentUrl, accessToken) {
  const outgoingPayment = await client.outgoingPayment.get({
    url: outgoingPaymentUrl,
    accessToken,
  });
  return outgoingPayment;
}

try {
  const receiverWallet = 'https://ilp.interledger-test.dev/carl';
  console.log("WALLET ADDRESS (receiver): ", receiverWallet);
  const receiverInfo = await getWalletAddressInfo(receiverWallet);
  console.log("WALLET ADDRESS INFO (receiver): ", receiverInfo);
  console.log("RESOURCE SERVER (receiver): ", receiverInfo.resourceServer);
  console.log("AUTH SERVER (receiver): ", receiverInfo.authServer);

  const inGrant = await IncomingGrant(receiverInfo.authServer);
  console.log("INCOMING PAYMENT GRANT TOKEN =", inGrant.token);
  console.log("INCOMING PAYMENT GRANT MANAGE URL =", inGrant.manageUrl);

  const incomingPaymentId = await CreateIncomingPayment(receiverInfo, inGrant.token);
  console.log("INCOMING PAYMENT CREATED ID =", incomingPaymentId);

  const senderWallet = 'https://ilp.interledger-test.dev/benjaapis';
  console.log("WALLET ADDRESS (sender): ", senderWallet);
  const senderInfo = await getWalletAddressInfo(senderWallet);
  console.log("WALLET ADDRESS INFO (sender): ", senderInfo);

  const senderQuoteGrant = await createSenderQuoteGrant(senderInfo.authServer);
  console.log("SENDER QUOTE GRANT TOKEN =", senderQuoteGrant.token);

  const senderQuoteId = await createQuoteFromSender(senderQuoteGrant.token, senderInfo, incomingPaymentId);
  console.log("SENDER QUOTE CREATED ID =", senderQuoteId);

  const quote = await getQuoteFromSender(senderQuoteGrant.token, senderQuoteId);
  console.log("SENDER QUOTE GOTTEN =", quote);

  if (quote?.debitAmount?.assetCode !== senderInfo.assetCode) {
    throw new Error(`El quote no está en el asset del sender. debitAmount.assetCode=${quote?.debitAmount?.assetCode}, sender.assetCode=${senderInfo.assetCode}`);
  }
  if (quote?.expiresAt) {
    const now = new Date();
    const exp = new Date(quote.expiresAt);
    if (now >= exp) throw new Error(`Quote expirado a las ${toIso(exp)}`);
  }

  let lastActiveOutgoingAccessToken = null;
  let outgoingPaymentIdNoInterval = null;
  let outgoingPaymentIdInterval = null;

  let CONTINUE_ACCESS_TOKEN_NOINT = null;
  let CONTINUE_URI_NOINT = null;
  let CONTINUE_ACCESS_TOKEN_INT = null;
  let CONTINUE_URI_INT = null;

  {
    const interactRefPromise = waitForInteractRef({ host: "localhost", port: 3344, path: "/callback" });
    const pending = await requestOutgoingPaymentInteractiveGrant(senderInfo, quote);

    CONTINUE_ACCESS_TOKEN_NOINT = pending.continueAccessToken;
    CONTINUE_URI_NOINT = pending.continueUri;

    console.log("Abre esta URL para aprobar la solicitud (sin intervalo):", pending.interactUrl);
    console.log("CONTINUE_ACCESS_TOKEN =", pending.continueAccessToken);
    console.log("CONTINUE_URI =", pending.continueUri);
    console.log("Esperando redirect a http://localhost:3344/callback ...");

    const interactRef = await interactRefPromise;
    console.log("INTERACT_REF recibido =", interactRef);

    const continueoutgoinggrant = await client.grant.continue(
      { accessToken: pending.continueAccessToken, url: pending.continueUri },
      { interact_ref: interactRef },
    );

    if (!isFinalizedGrant(continueoutgoinggrant)) {
      throw new Error("Expected finalized continueoutgoinggrant. Received non-finalized continueoutgoinggrant.");
    }

    console.log("OUTGOING_PAYMENT_ACCESS_TOKEN =", continueoutgoinggrant.access_token.value);
    console.log("OUTGOING_PAYMENT_ACCESS_TOKEN_MANAGE_URL =", continueoutgoinggrant.access_token.manage);

    const OUTGOING_PAYMENT_ACCESS_TOKEN = continueoutgoinggrant.access_token.value;
    outgoingPaymentIdNoInterval = await createOutgoingPayment(senderInfo, OUTGOING_PAYMENT_ACCESS_TOKEN, quote);
    console.log("OUTGOING PAYMENT CREATED ID (no-interval) =", outgoingPaymentIdNoInterval);

    lastActiveOutgoingAccessToken = OUTGOING_PAYMENT_ACCESS_TOKEN;
  }

  {
    const incomingPaymentIdInterval = await CreateIncomingPayment(receiverInfo, inGrant.token);
    console.log("INCOMING PAYMENT CREATED ID (interval-flow) =", incomingPaymentIdInterval);

    const nowIso = new Date().toISOString();
    const intervalIso = `R/${nowIso}/P1D`;
    console.log("Usando interval:", intervalIso);

    const senderQuoteGrant2 = await createSenderQuoteGrant(senderInfo.authServer);
    console.log("SENDER QUOTE GRANT TOKEN (interval) =", senderQuoteGrant2.token);

    const senderQuoteId2 = await createQuoteFromSender(senderQuoteGrant2.token, senderInfo, incomingPaymentIdInterval);
    console.log("SENDER QUOTE CREATED ID (interval) =", senderQuoteId2);

    const quote2 = await getQuoteFromSender(senderQuoteGrant2.token, senderQuoteId2);
    console.log("SENDER QUOTE GOTTEN (interval) =", quote2);

    if (quote2?.debitAmount?.assetCode !== senderInfo.assetCode) {
      throw new Error(`El quote (interval) no está en el asset del sender. debitAmount.assetCode=${quote2?.debitAmount?.assetCode}, sender.assetCode=${senderInfo.assetCode}`);
    }
    if (quote2?.expiresAt) {
      const now = new Date();
      const exp = new Date(quote2.expiresAt);
      if (now >= exp) throw new Error(`Quote (interval) expirado a las ${toIso(exp)}`);
    }

    const interactRefPromise = waitForInteractRef({ host: "localhost", port: 3344, path: "/callback" });
    const pendingInterval = await requestOutgoingPaymentIntervalGrant(senderInfo, quote2, intervalIso);

    CONTINUE_ACCESS_TOKEN_INT = pendingInterval.continueAccessToken;
    CONTINUE_URI_INT = pendingInterval.continueUri;

    console.log("Abre esta URL para aprobar la solicitud (intervalo):", pendingInterval.interactUrl);
    console.log("CONTINUE_ACCESS_TOKEN (interval) =", pendingInterval.continueAccessToken);
    console.log("CONTINUE_URI (interval) =", pendingInterval.continueUri);
    console.log("Esperando redirect a http://localhost:3344/callback ...");

    const interactRef = await interactRefPromise;
    console.log("INTERACT_REF recibido (interval) =", interactRef);

    const continueoutgoinggrant = await client.grant.continue(
      { accessToken: pendingInterval.continueAccessToken, url: pendingInterval.continueUri },
      { interact_ref: interactRef },
    );

    if (!isFinalizedGrant(continueoutgoinggrant)) {
      throw new Error("Expected finalized continueoutgoinggrant. Received non-finalized continueoutgoinggrant.");
    }

    console.log("OUTGOING_PAYMENT_ACCESS_TOKEN =", continueoutgoinggrant.access_token.value);
    console.log("OUTGOING_PAYMENT_ACCESS_TOKEN_MANAGE_URL =", continueoutgoinggrant.access_token.manage);

    const OUTGOING_PAYMENT_ACCESS_TOKEN = continueoutgoinggrant.access_token.value;
    outgoingPaymentIdInterval = await createOutgoingPayment(senderInfo, OUTGOING_PAYMENT_ACCESS_TOKEN, quote2);
    console.log("OUTGOING PAYMENT CREATED ID (interval) =", outgoingPaymentIdInterval);

    lastActiveOutgoingAccessToken = OUTGOING_PAYMENT_ACCESS_TOKEN;
  }

  if (!lastActiveOutgoingAccessToken) throw new Error("No se obtuvo access token activo para listar outgoing payments.");
  const OutgoingPaymentsListed = await ListOutgoingPayments(senderInfo, lastActiveOutgoingAccessToken);
  console.log("OUTGOING PAYMENTS (all):", OutgoingPaymentsListed);

  if (outgoingPaymentIdNoInterval) {
    const opNoInterval = await GetOutgoingPayment(outgoingPaymentIdNoInterval, lastActiveOutgoingAccessToken);
    console.log("OUTGOING PAYMENT (no-interval) DETAIL:", JSON.stringify(opNoInterval, null, 2));
  }
  if (outgoingPaymentIdInterval) {
    const opInterval = await GetOutgoingPayment(outgoingPaymentIdInterval, lastActiveOutgoingAccessToken);
    console.log("OUTGOING PAYMENT (interval) DETAIL:", JSON.stringify(opInterval, null, 2));
  }

  if (CONTINUE_ACCESS_TOKEN_NOINT && CONTINUE_URI_NOINT) {
    try {
      await client.grant.cancel({
        accessToken: CONTINUE_ACCESS_TOKEN_NOINT,
        url: CONTINUE_URI_NOINT,
      });
      console.log("OUTGOING_PAYMENT_ACCESS_TOKEN REVOKED (no-interval)");
    } catch (e) {
      console.log("No-interval continue grant ya finalizado o no cancelable (ok).");
    }
  }
  if (CONTINUE_ACCESS_TOKEN_INT && CONTINUE_URI_INT) {
    try {
      await client.grant.cancel({
        accessToken: CONTINUE_ACCESS_TOKEN_INT,
        url: CONTINUE_URI_INT,
      });
      console.log("OUTGOING_PAYMENT_ACCESS_TOKEN REVOKED (interval)");
    } catch (e) {
      console.log("Interval continue grant ya finalizado o no cancelable (ok).");
    }
  }

} catch (err) {
  if (err?.description || err?.status || err?.code) {
    console.error("OpenPaymentsClientError:", {
      description: err.description,
      status: err.status,
      code: err.code,
      details: err.details,
      validationErrors: err.validationErrors,
    });
  } else {
    console.error("Error:", err);
  }
  process.exit(1);
}
