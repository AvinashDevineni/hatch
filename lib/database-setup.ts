import fs from 'fs/promises';
import path from 'path';
import { Client } from 'pg';

/**
 * Database setup utility for Neon PostgreSQL integration
 */
export class DatabaseSetup {
  private startupPath: string;

  constructor(startupPath: string) {
    this.startupPath = startupPath;
  }

  /**
   * Check if the startup needs database support
   * Looks for indicators like package.json with database dependencies,
   * SQL files, or database configuration files
   */
  async needsDatabase(): Promise<boolean> {
    try {
      // Check for package.json with database dependencies
      const packageJsonPath = path.join(this.startupPath, 'package.json');
      try {
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        // Common database-related packages
        const dbPackages = ['pg', 'postgres', 'postgresql', 'prisma', '@prisma/client',
                          'typeorm', 'sequelize', 'knex', 'mongodb', 'mongoose',
                          'mysql', 'mysql2', 'sqlite3', 'better-sqlite3'];

        for (const pkg of dbPackages) {
          if (allDeps[pkg]) {
            console.log(`[DatabaseSetup] Found database dependency: ${pkg}`);
            return true;
          }
        }
      } catch {
        // No package.json or error reading it
      }

      // Check for SQL files
      const files = await this.getAllFiles(this.startupPath);
      const hasSqlFiles = files.some(f =>
        f.endsWith('.sql') ||
        f.endsWith('.prisma') ||
        f.includes('schema') ||
        f.includes('migration')
      );

      if (hasSqlFiles) {
        console.log('[DatabaseSetup] Found SQL/schema files');
        return true;
      }

      // Check for database configuration files
      const dbConfigFiles = ['drizzle.config.ts', 'prisma/schema.prisma', 'ormconfig.json'];
      for (const configFile of dbConfigFiles) {
        try {
          await fs.access(path.join(this.startupPath, configFile));
          console.log(`[DatabaseSetup] Found database config: ${configFile}`);
          return true;
        } catch {
          // File doesn't exist, continue
        }
      }

      return false;
    } catch (error) {
      console.error('[DatabaseSetup] Error checking database needs:', error);
      return false;
    }
  }

  /**
   * Recursively get all files in a directory
   */
  private async getAllFiles(dir: string, fileList: string[] = []): Promise<string[]> {
    try {
      const files = await fs.readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(dir, file.name);

        // Skip node_modules and hidden directories
        if (file.name === 'node_modules' || file.name.startsWith('.')) {
          continue;
        }

        if (file.isDirectory()) {
          await this.getAllFiles(filePath, fileList);
        } else {
          fileList.push(filePath);
        }
      }
    } catch {
      // Ignore errors reading directories
    }

    return fileList;
  }

  /**
   * Setup Neon database connection for the startup
   * Creates a .env file with database credentials if it doesn't exist
   */
  async setupDatabase(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[DatabaseSetup] Setting up Neon database...');

      // Check if database connection is needed
      const needsDb = await this.needsDatabase();

      if (!needsDb) {
        return {
          success: true,
          message: 'Startup does not require database support'
        };
      }

      // Get database credentials from environment
      const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

      if (!dbUrl) {
        return {
          success: false,
          message: 'Database URL not found in environment variables'
        };
      }

      // Create .env file in the startup if it doesn't exist
      const envPath = path.join(this.startupPath, '.env');
      let envContent = '';

      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch {
        // File doesn't exist, will create new one
      }

      // Check if DATABASE_URL already exists in .env
      if (!envContent.includes('DATABASE_URL')) {
        const newEnvContent = envContent +
          (envContent && !envContent.endsWith('\n') ? '\n' : '') +
          `# Database configuration\n` +
          `DATABASE_URL=${dbUrl}\n` +
          `POSTGRES_URL=${process.env.POSTGRES_URL || dbUrl}\n` +
          `POSTGRES_URL_NON_POOLING=${process.env.POSTGRES_URL_NON_POOLING || dbUrl}\n`;

        await fs.writeFile(envPath, newEnvContent, 'utf-8');
        console.log('[DatabaseSetup] Created .env file with database credentials');
      }

      // Test database connection
      const connectionResult = await this.testConnection();

      if (connectionResult.success) {
        return {
          success: true,
          message: 'Database setup completed successfully and connection verified'
        };
      } else {
        return {
          success: false,
          message: `Database credentials added but connection failed: ${connectionResult.message}`
        };
      }
    } catch (error) {
      console.error('[DatabaseSetup] Error setting up database:', error);
      return {
        success: false,
        message: `Error setting up database: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!dbUrl) {
      return {
        success: false,
        message: 'No database URL configured'
      };
    }

    const client = new Client({ connectionString: dbUrl });

    try {
      await client.connect();
      await client.query('SELECT NOW()');
      await client.end();

      return {
        success: true,
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }
}
