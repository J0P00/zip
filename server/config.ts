import dotenv from 'dotenv';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const API_PORT = parseInt(process.env.PORT || '5000', 10);
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000,https://zip-pi-gules.vercel.app';

export function validateAllConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (Number.isNaN(API_PORT) || API_PORT <= 0) {
    errors.push('PORT must be a valid positive number.');
  }

  if (NODE_ENV === 'production') {
    const allowedOrigins = CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean);
    if (allowedOrigins.length === 0) {
      errors.push('CORS_ORIGIN must include the deployed frontend origin in production.');
    }

    const invalidProductionOrigins = allowedOrigins.filter(origin => (
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.startsWith('http://')
    ));

    if (invalidProductionOrigins.length > 0) {
      errors.push(`Production CORS_ORIGIN must use public HTTPS origins only: ${invalidProductionOrigins.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function logConfig(): void {
  console.log('='.repeat(70));
  console.log('Environment Configuration');
  console.log('='.repeat(70));
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`API Port: ${API_PORT}`);
  console.log(`CORS Origin: ${CORS_ORIGIN}`);
  console.log('Database: Express backend data layer');
  console.log('='.repeat(70));
}
