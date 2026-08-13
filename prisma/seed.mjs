import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { readFile } from 'fs/promises';
import path from 'path';

async function loadDotEnv(projectRoot) {
  try {
    const envPath = path.join(projectRoot, '.env');
    const content = await readFile(envPath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (process.env[key] === undefined) {
        process.env[key] = val.replace(/^"|"$/g, '');
      }
    });
    console.log('Loaded .env from', envPath);
  } catch (err) {
    // ignore if no .env
  }
}

async function main() {
  const projectRoot = path.resolve(new URL(import.meta.url).pathname, '..', '..');
  await loadDotEnv(projectRoot);

  const prisma = new PrismaClient();

  try {
    await prisma.$connect();

    console.log('Connected to database');

    // Create a default client if none exists
    let client = await prisma.client.findFirst();

    if (!client) {
      client = await prisma.client.create({
        data: {
          publicId: `C${Date.now().toString().slice(-8)}`,
          companyName: 'Local Test Client',
          displayName: 'Local Test',
          email: 'client@example.local',
        },
      });

      console.log('Created client:', client.id);
    } else {
      console.log('Using existing client:', client.id);
    }

    // Create an admin user if none exists for that client
    const existing = await prisma.user.findFirst({ where: { clientId: client.id, username: 'admin' } });

    if (!existing) {
      const passwordHash = await argon2.hash('Password123!');

      const user = await prisma.user.create({
        data: {
          clientId: client.id,
          firstName: 'Admin',
          lastName: 'User',
          username: 'admin',
          email: 'admin@example.local',
          passwordHash,
        },
      });

      console.log('Created admin user:', user.id, 'username=admin password=Password123!');
    } else {
      console.log('Admin user already exists:', existing.id);
    }

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
