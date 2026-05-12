import withPWAInit from '@ducanh2912/next-pwa';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  workboxOptions: {
    disableDevLogs: true,
  },
  // Desactivar en desarrollo para evitar problemas con HMR
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Paquetes que deben ejecutarse en Node.js (no en bundler).
  serverExternalPackages: [
    'pg',
    'bcrypt',
    'puppeteer-core',
    '@sparticuz/chromium',
    'puppeteer',
    'natural',
    'compromise',
    'cheerio',
  ],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default withPWA(nextConfig);
