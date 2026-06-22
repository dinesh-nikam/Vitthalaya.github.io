/**
 * Digital Pandharpur — Storage Layer Public API
 *
 * Usage:
 *   import { storage } from '@/src/lib/storage';
 *   const path = await storage.save('myfile.pdf', buffer, 'application/pdf');
 */

import type { StorageProvider } from './provider';
import { LocalStorageProvider } from './local';

let _storage: StorageProvider | null = null;

function getProvider(): StorageProvider {
  if (_storage) return _storage;

  const providerName = process.env.STORAGE_PROVIDER ?? 'local';

  switch (providerName) {
    case 'local':
    default: {
      _storage = new LocalStorageProvider({
        basePath: process.env.STORAGE_LOCAL_PATH,
        publicUrlBase: process.env.STORAGE_PUBLIC_URL ?? '/uploads',
      });
      break;
    }
    // S3 provider can be added here when needed:
    // case 's3':
    //   _storage = new S3StorageProvider({ ... });
    //   break;
  }

  return _storage;
}

/** Singleton storage provider instance */
export const storage: StorageProvider = new Proxy({} as StorageProvider, {
  get(_target, prop: keyof StorageProvider) {
    const provider = getProvider();
    return provider[prop].bind(provider);
  },
});

export { LocalStorageProvider } from './local';
export type { StorageProvider, StorageConfig } from './provider';
