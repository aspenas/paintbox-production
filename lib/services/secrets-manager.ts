import {
  SecretsManagerClient,
  GetSecretValueCommand,
  CreateSecretCommand,
  UpdateSecretCommand,
  DescribeSecretCommand,
  ResourceNotFoundException,
} from "@aws-sdk/client-secrets-manager";
import { z } from "zod";
import { logger } from "@/lib/logging/simple-logger";
import getCacheInstance, { CacheService } from "@/lib/cache/cache-service";

// Zod schemas for validation
const SecretsSchema = z.object({
  companyCam: z
    .object({
      apiToken: z.string().min(1),
      webhookSecret: z.string().optional(),
    })
    .optional(),
  salesforce: z
    .object({
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      username: z.string().email(),
      password: z.string().min(1),
      securityToken: z.string().min(1),
      instanceUrl: z.string().url(),
      apiVersion: z.string().default("v62.0"),
    })
    .optional(),
  database: z
    .object({
      url: z.string().url(),
      shadowUrl: z.string().url().optional(),
    })
    .optional(),
  redis: z
    .object({
      url: z.string().url(),
      password: z.string().optional(),
    })
    .optional(),
  sentry: z
    .object({
      dsn: z.string().url(),
    })
    .optional(),
  encryption: z
    .object({
      key: z.string().min(32),
      iv: z.string().min(16),
    })
    .optional(),
});

type Secrets = z.infer<typeof SecretsSchema>;

export class SecretsManagerService {
  private client: SecretsManagerClient;
  private secretName: string;
  private cacheKey: string;
  private cacheTTL: number = 3600; // 1 hour
  private secrets: Secrets | null = null;
  private cache: CacheService | null = null;

  constructor(config?: {
    region?: string;
    secretName?: string;
    cacheTTL?: number;
  }) {
    const region = config?.region || process.env.AWS_REGION || "us-east-1";
    this.secretName =
      config?.secretName ||
      process.env.AWS_SECRETS_MANAGER_SECRET_NAME ||
      "paintbox/secrets";
    this.cacheKey = `secrets:${this.secretName}`;

    if (config?.cacheTTL) {
      this.cacheTTL = config.cacheTTL;
    }

    this.client = new SecretsManagerClient({
      region,
      credentials: this.getCredentials(),
    });

    // Initialize cache if on server side
    if (typeof window === "undefined") {
      this.cache = getCacheInstance();
    }
  }

  private getCredentials() {
    // Production: Use IAM role
    // Development: Use environment variables
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      return {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    // Let AWS SDK handle credentials (IAM role, instance profile, etc.)
    return undefined;
  }

  async getSecrets(forceRefresh = false): Promise<Secrets> {
    try {
      // Skip AWS Secrets Manager in development if flag is set
      if (process.env.SKIP_AWS_SECRETS === "true") {
        logger.info("Skipping AWS Secrets Manager (SKIP_AWS_SECRETS=true)");
        return this.getSecretsFromEnv();
      }

      // Return cached secrets if available and not forcing refresh
      if (this.secrets && !forceRefresh) {
        return this.secrets;
      }

      // Check Redis cache
      if (!forceRefresh && this.cache) {
        const cached = await this.cache.get(this.cacheKey);
        if (cached) {
          logger.debug("Returning cached secrets");
          this.secrets = JSON.parse(cached);
          return this.secrets!;
        }
      }

      // Fetch from AWS Secrets Manager
      logger.info("Fetching secrets from AWS Secrets Manager", {
        secretName: this.secretName,
      });

      const command = new GetSecretValueCommand({ SecretId: this.secretName });
      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new Error("Secret value is empty");
      }

      const rawSecrets = JSON.parse(response.SecretString);

      // Validate and parse secrets
      this.secrets = SecretsSchema.parse(rawSecrets);

      // Cache in Redis
      if (this.cache) {
        await this.cache.set(
          this.cacheKey,
          JSON.stringify(this.secrets),
          this.cacheTTL,
        );
      }

      logger.info("Successfully fetched and cached secrets");
      return this.secrets;
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        logger.warn("Secret not found, creating new secret", {
          secretName: this.secretName,
        });
        await this.createDefaultSecret();
        return this.getSecrets();
      }

      logger.error("Failed to fetch secrets", { error });

      // Fallback to environment variables
      return this.getSecretsFromEnv();
    }
  }

  private async createDefaultSecret(): Promise<void> {
    const defaultSecrets: Secrets = {
      companyCam: {
        apiToken: process.env.NEXT_PUBLIC_COMPANYCAM_API_TOKEN || "",
      },
      salesforce: {
        clientId: process.env.SALESFORCE_CLIENT_ID || "",
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET || "",
        username: process.env.SALESFORCE_USERNAME || "",
        password: process.env.SALESFORCE_PASSWORD || "",
        securityToken: process.env.SALESFORCE_SECURITY_TOKEN || "",
        instanceUrl:
          process.env.SALESFORCE_INSTANCE_URL || "https://login.salesforce.com",
        apiVersion: "v62.0",
      },
      database: {
        url:
          process.env.DATABASE_URL ||
          "postgresql://user:password@localhost:5432/paintbox",
      },
      redis: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
      },
    };

    try {
      const command = new CreateSecretCommand({
        Name: this.secretName,
        SecretString: JSON.stringify(defaultSecrets),
        Description: "Paintbox application secrets",
      });

      await this.client.send(command);
      logger.info("Created default secret", { secretName: this.secretName });
    } catch (error) {
      logger.error("Failed to create default secret", { error });
      throw error;
    }
  }

  private getSecretsFromEnv(): Secrets {
    logger.warn("Using environment variables as fallback for secrets");

    return {
      companyCam: {
        apiToken: process.env.NEXT_PUBLIC_COMPANYCAM_API_TOKEN || "",
      },
      salesforce: {
        clientId: process.env.SALESFORCE_CLIENT_ID || "",
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET || "",
        username: process.env.SALESFORCE_USERNAME || "",
        password: process.env.SALESFORCE_PASSWORD || "",
        securityToken: process.env.SALESFORCE_SECURITY_TOKEN || "",
        instanceUrl:
          process.env.SALESFORCE_INSTANCE_URL || "https://login.salesforce.com",
        apiVersion: "v62.0",
      },
      database: {
        url:
          process.env.DATABASE_URL ||
          "postgresql://user:password@localhost:5432/paintbox",
      },
      redis: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
      },
    };
  }

  async updateSecret(updates: Partial<Secrets>): Promise<void> {
    try {
      const currentSecrets = await this.getSecrets();
      const updatedSecrets = { ...currentSecrets, ...updates };

      const command = new UpdateSecretCommand({
        SecretId: this.secretName,
        SecretString: JSON.stringify(updatedSecrets),
      });

      await this.client.send(command);

      // Clear cache
      if (this.cache) {
        await this.cache.del(this.cacheKey);
      }
      this.secrets = null;

      logger.info("Successfully updated secrets");
    } catch (error) {
      logger.error("Failed to update secrets", { error });
      throw error;
    }
  }

  async rotateSecret(secretType: keyof Secrets): Promise<void> {
    logger.info("Rotating secret", { secretType });
    // Implement secret rotation logic here
    // This would involve generating new credentials and updating both AWS and the service
  }
}

// Singleton instance
let secretsManager: SecretsManagerService | null = null;

export function getSecretsManager(): SecretsManagerService {
  if (!secretsManager) {
    secretsManager = new SecretsManagerService();
  }
  return secretsManager;
}

// Helper functions for specific secrets
export async function getCompanyCamToken(): Promise<string> {
  const secrets = await getSecretsManager().getSecrets();
  return secrets.companyCam?.apiToken || "";
}

export async function getSalesforceCredentials() {
  const secrets = await getSecretsManager().getSecrets();
  if (!secrets.salesforce) {
    throw new Error("Salesforce credentials not configured");
  }
  return secrets.salesforce;
}

export async function getDatabaseUrl(): Promise<string> {
  const secrets = await getSecretsManager().getSecrets();
  return secrets.database?.url || process.env.DATABASE_URL || "";
}

export async function getRedisUrl(): Promise<string> {
  const secrets = await getSecretsManager().getSecrets();
  return secrets.redis?.url || process.env.REDIS_URL || "";
}
