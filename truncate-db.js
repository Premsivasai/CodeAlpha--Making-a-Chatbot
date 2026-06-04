import pg from 'pg';

const connectionString = "postgresql://postgres:Premsiva@2007@localhost:5432/postgres";
const pool = new pg.Pool({ connectionString });

async function clear() {
  console.log("Dropping old Drizzle tables...");
  const client = await pool.connect();
  try {
    await client.query("DROP TABLE IF EXISTS messages CASCADE;");
    await client.query("DROP TABLE IF EXISTS conversations CASCADE;");
    await client.query("DROP TABLE IF EXISTS price_alerts CASCADE;");
    await client.query("DROP TABLE IF EXISTS saved_products CASCADE;");
    await client.query("DROP TABLE IF EXISTS search_history CASCADE;");
    await client.query("DROP TABLE IF EXISTS user_preferences CASCADE;");
    await client.query("DROP TABLE IF EXISTS price_history CASCADE;");
    console.log("Tables dropped successfully!");
  } catch (err) {
    console.error("Error dropping tables:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

clear();
