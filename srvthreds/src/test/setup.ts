/**
 * Vitest Test Setup
 *
 * This file is automatically loaded before all tests via vitest.config.ts
 * It handles environment configuration for test execution.
 */

import 'dotenv/config';
import { Logger, LoggerLevel } from '../ts/thredlib/index.js';

// Configure logger for test environment
Logger.setLevel(LoggerLevel.INFO);

/**
 * Test Environment Configuration Defaults
 *
 * These defaults ensure tests can run in various environments:
 * - Local development with Docker containers
 * - CI/CD pipelines with containerized databases
 * - Kubernetes/Minikube environments
 */

// MongoDB Configuration
if (!process.env.MONGO_HOST) {
  process.env.MONGO_HOST = 'localhost:27017';
}

// For single-node MongoDB replica sets (local development), use directConnection
// For multi-node replica sets (production-like), set this to 'false' in .env
if (!process.env.MONGO_DIRECT_CONNECTION) {
  process.env.MONGO_DIRECT_CONNECTION = 'true';
}

// Redis Configuration
if (!process.env.REDIS_HOST) {
  process.env.REDIS_HOST = 'localhost:6379';
}

// RabbitMQ Configuration
if (!process.env.RABBITMQ_HOST) {
  process.env.RABBITMQ_HOST = 'localhost';
}

// JWT Configuration for tests
if (!process.env.JWT_SECRET) {
  // process.env.JWT_SECRET = 'test-jwt-secret-key';
}

if (!process.env.JWT_EXPIRE_TIME) {
  // process.env.JWT_EXPIRE_TIME = '1h';
}

if (!process.env.REFRESH_TOKEN_SECRET) {
  // process.env.REFRESH_TOKEN_SECRET = 'test-refresh-token-secret';
}

if (!process.env.REFRESH_TOKEN_EXPIRE_TIME) {
  // process.env.REFRESH_TOKEN_EXPIRE_TIME = '7d';
}

// Log configuration in debug mode
Logger.debug('Test environment configured:');
Logger.debug(`  MONGO_HOST: ${process.env.MONGO_HOST}`);
Logger.debug(`  MONGO_DIRECT_CONNECTION: ${process.env.MONGO_DIRECT_CONNECTION}`);
Logger.debug(`  REDIS_HOST: ${process.env.REDIS_HOST}`);
Logger.debug(`  RABBITMQ_HOST: ${process.env.RABBITMQ_HOST}`);
