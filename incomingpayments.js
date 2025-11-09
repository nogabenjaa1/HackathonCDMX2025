import { CreateClient } from './client.js';
//import { getWalletAddressInfo } from './index.js';
import { isPendingGrant } from "@interledger/open-payments";

const client = await CreateClient();

/*let WalletAddress = 'https://ilp.interledger-test.dev/carl';
console.log("WALLET ADDRESS: ", WalletAddress);

const walletAddressInfo = await getWalletAddressInfo(WalletAddress);
console.log("WALLET ADDRESS INFO: ", walletAddressInfo);

// Verificar que resourceServer existe
console.log("RESOURCE SERVER: ", walletAddressInfo.resourceServer);
console.log("AUTH SERVER: ", walletAddressInfo.authServer);

const authServer = walletAddressInfo.authServer;
console.log("AUTH SERVER:", authServer);
*/

// ----- createincomingpaymentgrant----- //
export async function IncomingGrant(authServer) {
    const incomingPaymentGrant = await client.grant.request(
    {
        url: authServer,
    },
    {
        access_token: {
        access: [
            {
            type: "incoming-payment",
            actions: ["list", "read", "read-all", "complete", "create"],
            },
        ],
        },
    },
    );

    if (isPendingGrant(incomingPaymentGrant)) {
    throw new Error("Expected non-interactive incomingPaymentGrant");
    }

    return {
        token: incomingPaymentGrant.access_token.value,
        manageUrl: incomingPaymentGrant.access_token.manage,
    };
}

/*const incomingPaymentGrantObject = await IncomingGrant(authServer);
const IncomingPaymentGrantToken = incomingPaymentGrantObject.token;
console.log("INCOMING PAYMENT GRANT TOKEN =", IncomingPaymentGrantToken);
*/

// ----- createincomingpayment----- //
export async function CreateIncomingPayment(walletAddressInfo, IncomingPaymentGrantToken) {
    console.log("Creating incoming payment with:");
    console.log("Resource Server:", walletAddressInfo.resourceServer);
    console.log("Wallet Address ID:", walletAddressInfo.id);
    console.log("Asset Code:", walletAddressInfo.assetCode);
    console.log("Asset Scale:", walletAddressInfo.assetScale);
    
    const incomingPaymentCreate = await client.incomingPayment.create(
    {
        url: walletAddressInfo.resourceServer,
        accessToken: IncomingPaymentGrantToken,
    },
    {
        walletAddress: walletAddressInfo.id,
        incomingAmount: {
        value: "10000",
        assetCode: walletAddressInfo.assetCode,
        assetScale: walletAddressInfo.assetScale,
        },
        expiresAt: new Date(Date.now() + 60_000 * 10).toISOString(),
    },
    );

    return incomingPaymentCreate.id;
}

/* const IncomingPaymentCreated = await CreateIncomingPayment(walletAddressInfo, IncomingPaymentGrantToken);
console.log("INCOMING PAYMENT CREATED ID =", IncomingPaymentCreated);

// ----- listincomingpayments----- //
/*async function ListIncomingPayments(walletAddressInfo, IncomingPaymentGrantToken) {
    const incomingPayments = await client.incomingPayment.list(
    {
        url: walletAddressInfo.resourceServer,
        walletAddress: walletAddressInfo.id,
        accessToken: IncomingPaymentGrantToken,
    },
    {
        first: 10,
        last: undefined,
        cursor: undefined,
    },
    );
    return incomingPayments;
}

const IncomingPaymentsListed = await ListIncomingPayments(walletAddressInfo, IncomingPaymentGrantToken);
//console.log("INCOMING PAYMENTS:", IncomingPaymentsListed);

// ----- getincomingpayment----- //
async function GetIncomingPayment(IncomingPaymentCreated) {
    const incomingPayment = await client.incomingPayment.get({
    url: IncomingPaymentCreated,
    });
    return incomingPayment
}

const getIncomingPayment =  await GetIncomingPayment(IncomingPaymentCreated);
console.log("INCOMING PAYMENT:", getIncomingPayment);

// ----- getincomingpaymentauth----- //
async function GetIncomingPaymentAuth(IncomingPaymentCreated, IncomingPaymentGrantToken) {
    const incomingPaymenthAuth = await client.incomingPayment.get({
    url: IncomingPaymentCreated,
    accessToken: IncomingPaymentGrantToken,
    });
    return incomingPaymenthAuth;
}

const getIncomingPaymentAuth =  await GetIncomingPaymentAuth(IncomingPaymentCreated, IncomingPaymentGrantToken);
console.log("INCOMING PAYMENT WITH AUTH:", getIncomingPaymentAuth);

// ----- completeincomingpayment----- //
async function CompleteIncomingPayment(IncomingPaymentCreated, IncomingPaymentGrantToken) {
    const incomingPayment = await client.incomingPayment.complete({
  url: IncomingPaymentCreated,
  accessToken: IncomingPaymentGrantToken,
});

    return incomingPayment;
}

const completeIncomingPayment =  await CompleteIncomingPayment(IncomingPaymentCreated, IncomingPaymentGrantToken);
console.log("INCOMING PAYMENT:", (completeIncomingPayment));*/