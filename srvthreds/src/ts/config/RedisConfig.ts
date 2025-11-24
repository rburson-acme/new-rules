import { Logger } from "../thredlib/index.js";

export interface RedisConfigDef {
  url: string;
  password?: string;
  socket: {
    reconnectStrategy: (retries: number) => number;
  };
}

export const redisConfig = (hostString: string = ''): RedisConfigDef => {
  const _host = hostString || process.env.REDIS_HOST || 'localhost:6379';
  const includeProtocol = !_host.startsWith('redis://') && !_host.startsWith('rediss://');
  const useTls = process.env.REDIS_USE_TLS === 'true';
  const protocol = includeProtocol ? (useTls ? 'rediss://' : 'redis://') : '';
  // Redis will automatically set up TLS if the URL starts with rediss://
  const redisUrl = includeProtocol ? `${protocol}${_host}` : _host;
  Logger.debug(`Using Redis URL: ${redisUrl}`);
  Logger.debug(`Using Redis TLS: ${useTls}`);
  return {
    url: redisUrl,
    password: process.env.REDIS_PASSWORD,
    socket: {
      reconnectStrategy: (retries: number) => {
        const delay = Math.min(retries * 50, 2000);
        return delay;
      },
    },
  }
};
