const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const projectRef = "doaisnsdahepsxqaroru";
const password = "ahzaganteng";

const poolerUrls = [
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
  `postgresql://postgres.${projectRef}:${password}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
];

async function testPoolers() {
  for (const connectionString of poolerUrls) {
    console.log('\nTrying pooler:', connectionString.replace(password, '*****'));
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });
    try {
      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });
      const res = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('🎉 SUCCESSFUL POOLER FOUND! Result:', res);
      console.log('WORKING URL:', connectionString);
      await pool.end();
      return connectionString;
    } catch (err) {
      console.error('❌ Failed:', err.message);
    }
    await pool.end();
  }
}

testPoolers();
