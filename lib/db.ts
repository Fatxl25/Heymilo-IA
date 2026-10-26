import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
  hasPaid: boolean;
  paidAt?: number;
  paidAmount?: number;
  planName?: string;
  minutes: number;
  role: 'admin' | 'user';
}

export interface Session {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
}

export interface Transaction {
  id: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethod: string;
  createdAt: number;
}

interface DatabaseData {
  users: User[];
  sessions: Session[];
  transactions: Transaction[];
}

const dataDir = path.join(process.cwd(), 'data');
const dbFilePath = path.join(dataDir, 'users.json');

function ensureDataDir(): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbFilePath)) {
    // Inicializar con usuario Administrador por defecto con acceso completo y pagado
    const initialAdminEmail = process.env.ADMIN_EMAIL || 'admin@heymilo.ai';
    const initialAdminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = hashPasswordWithSalt(initialAdminPassword, defaultSalt);

    const initialData: DatabaseData = {
      users: [
        {
          id: 'admin_master',
          email: initialAdminEmail,
          name: 'Administrador Master',
          passwordHash: adminPasswordHash,
          salt: defaultSalt,
          createdAt: Date.now(),
          hasPaid: true,
          paidAt: Date.now(),
          paidAmount: 5,
          planName: 'Pase Creador VIP (Ilimitado)',
          minutes: 999.0,
          role: 'admin',
        },
      ],
      sessions: [],
      transactions: [
        {
          id: 'tx_init_admin',
          userId: 'admin_master',
          userEmail: initialAdminEmail,
          amount: 5,
          currency: 'USD',
          description: 'Pase Creador Fundador Hey Milo',
          status: 'completed',
          paymentMethod: 'admin_grant',
          createdAt: Date.now(),
        },
      ],
    };
    fs.writeFileSync(dbFilePath, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb(): DatabaseData {
  ensureDataDir();
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users db, resetting corrupted file:', err);
    return { users: [], sessions: [], transactions: [] };
  }
}

function writeDb(data: DatabaseData): void {
  ensureDataDir();
  fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function hashPasswordWithSalt(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function getUserByEmail(email: string): User | null {
  const db = readDb();
  const cleanEmail = email.trim().toLowerCase();
  return db.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

export function getUserById(id: string): User | null {
  const db = readDb();
  return db.users.find((u) => u.id === id) || null;
}

export function createUser(email: string, name: string, password: string): { user: User; error?: string } {
  const db = readDb();
  const cleanEmail = email.trim().toLowerCase();

  if (db.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return { user: null as any, error: 'Ya existe una cuenta registrada con este correo electrónico.' };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPasswordWithSalt(password, salt);

  const newUser: User = {
    id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    email: cleanEmail,
    name: name.trim() || cleanEmail.split('@')[0],
    passwordHash,
    salt,
    createdAt: Date.now(),
    hasPaid: false, // Requiere pagar $5 para desbloquear acceso
    minutes: 0,
    role: 'user',
  };

  db.users.push(newUser);
  writeDb(db);

  return { user: newUser };
}

export function verifyPassword(user: User, password: string): boolean {
  try {
    const computed = hashPasswordWithSalt(password, user.salt);
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(user.passwordHash, 'hex'));
  } catch {
    return false;
  }
}

export function createSession(userId: string): Session {
  const db = readDb();
  const token = crypto.randomBytes(32).toString('hex');
  const session: Session = {
    token,
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
  };

  // Limpiar sesiones expiradas
  db.sessions = db.sessions.filter((s) => s.expiresAt > Date.now());
  db.sessions.push(session);
  writeDb(db);

  return session;
}

export function getSession(token: string): Session | null {
  if (!token) return null;
  const db = readDb();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > Date.now());
  return session || null;
}

export function deleteSession(token: string): void {
  const db = readDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  writeDb(db);
}

export function unlockUserAccess(userId: string, amount: number = 3, paymentMethod: string = 'card'): { success: boolean; user?: User; error?: string } {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { success: false, error: 'Usuario no encontrado' };

  user.hasPaid = true;
  user.paidAt = Date.now();
  user.paidAmount = amount;
  user.planName = 'Pase Creador ($3 USD)';
  user.minutes = (user.minutes || 0) + 20.0; // 20 minutos incluidos al entrar por primera vez

  const tx: Transaction = {
    id: `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    userId: user.id,
    userEmail: user.email,
    amount,
    currency: 'USD',
    description: 'Pase de Acceso Creador Hey Milo ($3 USD)',
    status: 'completed',
    paymentMethod,
    createdAt: Date.now(),
  };

  db.transactions.push(tx);
  writeDb(db);

  return { success: true, user };
}

export function addMinutesToUser(userId: string, minutes: number, amount: number, paymentMethod: string): { success: boolean; user?: User } {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { success: false };

  user.minutes = Number(((user.minutes || 0) + minutes).toFixed(2));

  const tx: Transaction = {
    id: `tx_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    userId: user.id,
    userEmail: user.email,
    amount,
    currency: 'USD',
    description: `Recarga de ${minutes} Minutos de Video`,
    status: 'completed',
    paymentMethod,
    createdAt: Date.now(),
  };

  db.transactions.push(tx);
  writeDb(db);

  return { success: true, user };
}

export function deductMinutesFromUser(userId: string, minutes: number): { success: boolean; newBalance: number } {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  if (!user) return { success: false, newBalance: 0 };

  const updated = Math.max(0, Number(((user.minutes || 0) - minutes).toFixed(2)));
  user.minutes = updated;
  writeDb(db);

  return { success: true, newBalance: updated };
}

export function sanitizeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    hasPaid: user.hasPaid,
    paidAt: user.paidAt,
    paidAmount: user.paidAmount,
    planName: user.planName,
    minutes: user.minutes,
    role: user.role,
    createdAt: user.createdAt,
  };
}
