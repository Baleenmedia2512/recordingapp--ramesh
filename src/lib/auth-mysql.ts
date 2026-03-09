import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Sign up new user
export async function signUp(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResponse> {
  // Check if user already exists
  const existing = await query<any[]>(
    'SELECT id FROM users WHERE email = ?',
    [email]
  );

  if (existing.length > 0) {
    throw new Error('User already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user
  const result = await query<any>(
    'INSERT INTO users (email, password_hash, full_name) VALUES (?, ?, ?)',
    [email, passwordHash, fullName || '']
  );

  const userId = result.insertId || generateUUID();

  // Get created user
  const users = await query<any[]>(
    'SELECT id, email, full_name, created_at FROM users WHERE email = ?',
    [email]
  );

  const user = users[0];

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { user, token };
}

// Sign in existing user
export async function signIn(
  email: string,
  password: string
): Promise<AuthResponse> {
  // Get user with password
  const users = await query<any[]>(
    'SELECT id, email, password_hash, full_name, created_at FROM users WHERE email = ?',
    [email]
  );

  if (users.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = users[0];

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT token
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  // Remove password from response
  const { password_hash, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
}

// Verify JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  const users = await query<any[]>(
    'SELECT id, email, full_name, created_at FROM users WHERE id = ?',
    [userId]
  );

  return users.length > 0 ? users[0] : null;
}

// Helper to generate UUID (fallback)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
