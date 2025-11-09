import { CreateClient } from './client.js';
//import { getWalletAddressInfo } from './index.js';
import { isPendingGrant } from "@interledger/open-payments";
//import { IncomingGrant, CreateIncomingPayment } from './incomingpayments.js';

const client = await CreateClient();

/*let WalletAddress = 'https://ilp.interledger-test.dev/benjaapis';
console.log("WALLET ADDRESS: ", WalletAddress);

const walletAddressInfo = await getWalletAddressInfo(WalletAddress);
console.log("WALLET ADDRESS INFO: ", walletAddressInfo);

// Verificar que resourceServer existe
console.log("RESOURCE SERVER: ", walletAddressInfo.resourceServer);
console.log("AUTH SERVER: ", walletAddressInfo.authServer);

const authServer = walletAddressInfo.authServer;
console.log("AUTH SERVER:", authServer);

const incomingPaymentGrantObject = await IncomingGrant(authServer);
const IncomingPaymentGrantToken = incomingPaymentGrantObject.token;
console.log("INCOMING PAYMENT GRANT TOKEN =", IncomingPaymentGrantToken);

const IncomingPaymentCreated = await CreateIncomingPayment(walletAddressInfo, IncomingPaymentGrantToken);
console.log("INCOMING PAYMENT CREATED ID =", IncomingPaymentCreated);
*/

// ----- createquotegrant ----- //
export async function CreateQuoteGrant(authServer) {
    const quoteGrant = await client.grant.request(
    {
        url: authServer,
    },
    {
        access_token: {
        access: [
            {
            type: "quote",
            actions: ["create", "read", "read-all"],
            },
        ],
        },
    },
    );

    if (isPendingGrant(quoteGrant)) {
    throw new Error("Expected non-interactive quotegrant");
    } 
    return {
        token: quoteGrant.access_token.value,
        manageUrl: quoteGrant.access_token.manage,
    };
}

/*const quoteGrantObject = await CreateQuoteGrant(authServer);
const quoteGrantToken = quoteGrantObject.token;
console.log("QUOTE GRANT TOKEN =", quoteGrantToken);
*/

// ----- createquote ----- //
export async function CreateQuote(quoteGrantToken, walletAddressInfo, IncomingPaymentCreated) {
    console.log("Creating quote with:");
    console.log("Resource Server:", walletAddressInfo.resourceServer);
    console.log("Wallet Address ID:", walletAddressInfo.id);
    const createQuote = await client.quote.create(
    {
        url: walletAddressInfo.resourceServer,
        accessToken: quoteGrantToken,
    },
    {
        method: "ilp",
        walletAddress: walletAddressInfo.id,
        receiver: IncomingPaymentCreated,
    },
    );
    return createQuote.id;
}

/*const QuoteCreated = await CreateQuote(quoteGrantToken, walletAddressInfo, IncomingPaymentCreated);
console.log("QUOTE CREATED ID =", QuoteCreated);
*/

// ----- getquote ----- //
export async function GetQuote(quoteGrantToken, QuoteCreated) {
    const getQuote = await client.quote.get({
    url: QuoteCreated,
    accessToken: quoteGrantToken,
    });
    return getQuote;
}

/*const QuoteGotten = await GetQuote(quoteGrantToken, QuoteCreated);
console.log("QUOTE GOTTEN =", QuoteGotten);
*/