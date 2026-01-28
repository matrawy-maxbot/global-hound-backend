import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file path
const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

// Path to environments folder - استخدام المسار من جذر المشروع
// عند التشغيل من dist، نحتاج للرجوع إلى src/config/environments
const projectRoot: string = path.resolve(__dirname, '..', '..');
const environmentsPath: string = path.join(projectRoot, 'src', 'config', 'environments');

// Load all environment files
const envFiles: string[] = [
  'Database.env',
  'Server.env',
  'Security.env',
  'FileStorage.env',
  'GraphQL.env',
  'IntegratedAuthentication.env',
  'Kafka.env',
  'Notifications.env',
  'Queue.env',
  'SessionCookies.env',
  'Webhooks.env',
  'Websocket.env',
  'owners.env',
  'Stripe.env',
];

// Load each environment file
envFiles.forEach((envFile: string): void => {
  const envPath: string = path.join(environmentsPath, envFile);
  try {
    dotenv.config({ path: envPath });
    console.log(`✅ Environment file loaded: ${envFile}`);
  } catch (error) {
    const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`⚠️ Failed to load environment file: ${envFile}`, errorMessage);
  }
});

console.log('🚀 All environment files loaded successfully');

// Export function to reload environment files if needed
export const reloadEnvironments = (): void => {
  envFiles.forEach((envFile: string): void => {
    const envPath: string = path.join(environmentsPath, envFile);
    try {
      dotenv.config({ path: envPath, override: true });
    } catch (error) {
      const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Failed to reload environment file: ${envFile}`, errorMessage);
    }
  });
};
