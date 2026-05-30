export interface EnvironmentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  envVars: Record<string, { value: string; required: boolean }>;
}

export function validateEnvironment(): EnvironmentValidationResult {
  const result: EnvironmentValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    envVars: {},
  };

  const required: Record<string, string> = {
    DATABASE_URL: 'postgresql://forensiq:forensiq_secure_password@localhost:5432/forensiq',
    JWT_SECRET: 'your-super-secret-jwt-key-change-in-production',
    JWT_EXPIRES_IN: '24h',
    API_PORT: '3001',
    API_PREFIX: 'api',
    API_VERSION: '1',
  };

  const optional: Record<string, string> = {
    NODE_ENV: 'development',
    PORT: '3000',
    OLLAMA_BASE_URL: 'http://localhost:11434',
    OLLAMA_DEFAULT_MODEL: 'phi4',
    THROTTLE_TTL: '60000',
    THROTTLE_LIMIT: '100',
    POSTGRES_USER: 'forensiq',
    POSTGRES_PASSWORD: 'forensiq_secure_password',
    POSTGRES_DB: 'forensiq',
    POSTGRES_PORT: '5432',
  };

  for (const [key, defaultValue] of Object.entries(required)) {
    const value = process.env[key] || defaultValue;
    result.envVars[key] = { value, required: true };

    if (!process.env[key] && key === 'DATABASE_URL') {
      result.errors.push(`${key} is not set. Using default: ${defaultValue}`);
    }
  }

  for (const [key, defaultValue] of Object.entries(optional)) {
    const value = process.env[key] || defaultValue;
    result.envVars[key] = { value, required: false };
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET?.includes('change-in-production') || !process.env.JWT_SECRET) {
      result.errors.push('JWT_SECRET must be set to a secure value in production');
    }
  }

  if (process.env.DATABASE_URL?.includes('localhost') && process.env.NODE_ENV === 'production') {
    result.warnings.push('DATABASE_URL points to localhost which may not be accessible in production');
  }

  if (!process.env.JWT_SECRET) {
    result.warnings.push('JWT_SECRET using default value - change for production');
  }

  result.valid = result.errors.length === 0;

  return result;
}

export function logEnvironmentStatus(): void {
  const result = validateEnvironment();

  console.log('\n========== Environment Validation ==========');
  console.log(`Status: ${result.valid ? '✓ VALID' : '✗ INVALID'}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }

  console.log('\n📋 Environment Variables:');
  for (const [key, info] of Object.entries(result.envVars)) {
    const required = info.required ? '🔴' : '⚪';
    const displayValue = key.includes('SECRET') || key.includes('PASSWORD')
      ? '***'
      : info.value;
    console.log(`  ${required} ${key}=${displayValue}`);
  }

  console.log('============================================\n');
}
