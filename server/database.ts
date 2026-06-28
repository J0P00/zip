import { initializeMockData } from './mock-db';

let databaseInitialized = false;

export async function initializeDatabase() {
  if (databaseInitialized) {
    return;
  }

  initializeMockData();
  databaseInitialized = true;
  console.log('Database initialized for Express backend');
}

export async function logAudit(userId: string | null, action: string, resourceType: string, resourceId: string, details?: any) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    userId: userId || 'anonymous',
    action,
    resourceType,
    resourceId,
    details: details || {}
  }));
}
