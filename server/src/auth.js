import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


const JWT_SECRET = process.env.JWT_SECRET || 'NoIdeaForAsecretKeyValue204';
const JWT_EXPIRES = '7d';


export async function hashPassword(pw) {
return bcrypt.hash(pw, 10);
}


export async function verifyPassword(pw, hash) {
return bcrypt.compare(pw, hash);
}


export function signJwt(payload) {
return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}


export function authMiddleware(req, res, next) {
const h = req.headers.authorization || '';
const token = h.startsWith('Bearer ') ? h.slice(7) : null;
if (!token) return res.status(401).json({ error: 'No token' });
try {
req.user = jwt.verify(token, JWT_SECRET);
next();
} catch {
return res.status(401).json({ error: 'Invalid token' });
}
}