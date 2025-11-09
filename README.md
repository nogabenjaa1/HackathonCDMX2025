# GoMeter

## What is GoMeter?
GoMeter is a multi-services website that can be implemented by users accounts (e.g. sellers, teacher, chefs) to facilitate interoperability in the setup and completion of payments for different use cases including:

- Tipping/Donations (low value/low friction)
- eCommerce checkout
- P2P transfers
- Subscriptions
- Invoice Payments

This website has a transaction implementation using the API of **OpenPayments** and for the integration of multiple services in a single environment.

## Key Features
- User accounts for service providers (sellers, teachers, chefs, etc.)
- Integration with **OpenPayments API**
- Support for various payment types (tipping, subscriptions, invoices, etc.)
- Simple and intuitive interface
- Modular and scalable backend

## Tech Stack
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite
- **Payments API:** OpenPayments
- **Auth:** JWT / OAuth2 (depending on configuration)
- **Styling:** Tailwind CSS

## Project Structure
```
GoMeter/
├── web/          # React frontend
├── server/          # Express backend
├── README.md
├── package.json
└── ...
```

## Installation
1. Clone the repository:
   bash
   git clone https://github.com/yourusername/HackathonCDMX2025.git
   cd HackathonCDMX2025
   

2. Install dependencies:
   bash
   npm run install:all
   

3. Start development servers:
   cd <directory>
   npm run dev
   


4. The client will run on `http://localhost:5173` and the server on `http://localhost:8000`.

## Scripts
| Command | Description |
|----------|-------------|
| `cd server, npm run dev` | Runs client and server concurrently |
| `cd web, npm run dev` | Starts frontend |
| `npm run install:all` | Installs dependencies for both client and server |

## API Integration
The backend communicates with the **OpenPayments API**, which allows the following operations:

- Create and manage user wallets
- Send and receive payments
- Manage subscriptions and invoices
- Handle payment authorization and webhooks

Example endpoint:
```js
POST /api/payment/create
{
  "amount": 50,
  "currency": "USD",
  "AssetScale": "2"
}
presetation
https://drive.google.com/drive/folders/1fjl6M5CLl9h92mJRqv4Fygcq9w-uhoU0

## License
MIT © 2025 GoMeter Team
