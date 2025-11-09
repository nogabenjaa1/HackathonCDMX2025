import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), './sqlite.db');

function createSchema(db){
  db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    wallet_address_url TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('cliente','vendedor','vendedor_cliente')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL,
    asset_code TEXT,                         -- auto: se toma de la wallet del vendedor
    sale_type TEXT NOT NULL DEFAULT 'oneshot' CHECK (sale_type IN ('oneshot','interval')),
    billing_iso TEXT DEFAULT 'PT1H',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (vendor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL,
    buyer_id INTEGER NOT NULL,
    vendor_id INTEGER NOT NULL,
    sale_type TEXT,                          -- copia del servicio
    expires_at TEXT,                         -- para interval
    locked INTEGER NOT NULL DEFAULT 0,       -- 1 => no puede enviar
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (service_id, buyer_id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (vendor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (chat_id) REFERENCES chats(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS ux_users_wallet ON users(wallet_address_url);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);
}

function migrate(db){
  const svcCols = db.prepare("PRAGMA table_info(services)").all().map(c => c.name);
  if (!svcCols.includes('sale_type')) db.exec("ALTER TABLE services ADD COLUMN sale_type TEXT NOT NULL DEFAULT 'oneshot'");
  if (!svcCols.includes('billing_iso')) db.exec("ALTER TABLE services ADD COLUMN billing_iso TEXT DEFAULT 'PT1H'");
  if (!svcCols.includes('asset_code')) db.exec("ALTER TABLE services ADD COLUMN asset_code TEXT");

  const chatCols = db.prepare("PRAGMA table_info(chats)").all().map(c => c.name);
  if (!chatCols.includes('sale_type')) db.exec("ALTER TABLE chats ADD COLUMN sale_type TEXT");
  if (!chatCols.includes('expires_at')) db.exec("ALTER TABLE chats ADD COLUMN expires_at TEXT");
  if (!chatCols.includes('locked')) db.exec("ALTER TABLE chats ADD COLUMN locked INTEGER NOT NULL DEFAULT 0");

  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS ux_users_wallet ON users(wallet_address_url)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)");
}

function initDb(){
  let db;
  try {
    db = new Database(DB_PATH);
    createSchema(db);
    migrate(db);
    return db;
  } catch (e) {
    if (e?.code === 'SQLITE_NOTADB') {
      try { fs.renameSync(DB_PATH, DB_PATH + '.bad.' + Date.now()); } catch {}
      db = new Database(DB_PATH);
      createSchema(db);
      migrate(db);
      return db;
    }
    throw e;
  }
}

const db = initDb();
export default db;
