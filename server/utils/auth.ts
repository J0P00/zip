import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from '../env';

export type JwtUser = {
  id: string;
  userId: string;
  email: string;
  role: 'student' | 'teacher' | 'admin';
};

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export const signToken = (user: JwtUser) => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as SignOptions['expiresIn'] };
  return jwt.sign(user, JWT_SECRET as Secret, options);
};

export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET) as JwtUser;

