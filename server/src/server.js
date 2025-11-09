import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import servicesRoutes from './routes/services.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import chatRoutes from './routes/chat.routes.js';

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.ORIGIN || 'http://localhost:5173', credentials: false }));

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/open-payments', purchaseRoutes);
app.use('/api/chats', chatRoutes);

app.get('/health', (_, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 6060);
app.listen(port, () => console.log(`API on http://localhost:${port}`));
