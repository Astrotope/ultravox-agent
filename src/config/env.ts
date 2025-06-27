import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Ultravox
  ULTRAVOX_API_KEY: z.string().min(10),
  ULTRAVOX_CORPUS_ID: z.string().optional(),
  ULTRAVOX_VOICE: z.string().default('Steve-English-Australian'),
  
  // Twilio
  TWILIO_ACCOUNT_SID: z.string().startsWith('AC'),
  TWILIO_AUTH_TOKEN: z.string().min(20),
  TWILIO_VOICE: z.string().default('Polly.Aria-Neural'),
  
  // Application
  BASE_URL: z.string().url().optional(),
  ADMIN_API_KEY: z.string().min(32),
  MAX_CONCURRENT_CALLS: z.coerce.number().default(5),
  CALL_CLEANUP_INTERVAL: z.coerce.number().default(300000),
  HUMAN_AGENT_PHONE: z.string().optional().default('+1234567890'),
  AGENT_NAME: z.string().default('Sofia'),
  
  // Logging
  LOG_LEVEL: z.enum(['silent', 'error', 'warn', 'info', 'debug']).default('info')
});

export type Config = z.infer<typeof envSchema>;

let config: Config;

export function validateEnv(): Config {
  try {
    config = envSchema.parse(process.env);
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      throw new Error(
        `❌ Environment validation failed:\n${errorMessages.join('\n')}`
      );
    }
    throw error;
  }
}

export function getConfig(): Config {
  if (!config) {
    config = validateEnv();
  }
  return config;
}