import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface TokenPayload {
  userId: string;
  phone: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

export async function getCurrentUser(token: string) {
  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    return user;
  } catch {
    return null;
  }
}

export function generatePhoneCode(): string {
  // 生成6位随机验证码
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// 模拟发送验证码（实际项目中使用短信服务）
export async function sendPhoneCode(phone: string, code: string): Promise<void> {
  console.log(`Sending code ${code} to phone ${phone}`);
  // TODO: 集成实际短信服务
}
