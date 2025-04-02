#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Configurar cliente PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration(migrationFile) {
  const filePath = path.join(__dirname, '../migrations', migrationFile);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    const client = await pool.connect();
    try {
      console.log(`Ejecutando migración: ${migrationFile}`);
      await client.query('BEGIN');
      await client.query(sql);
      
      // Registrar la migración en la tabla de migraciones
      await client.query(
        `INSERT INTO migrations_applied (name, applied_at) 
         VALUES ($1, NOW()) 
         ON CONFLICT (name) DO NOTHING`,
        [migrationFile]
      );
      
      await client.query('COMMIT');
      console.log(`✅ Migración completada: ${migrationFile}`);
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ Error en migración ${migrationFile}:`, err.message);
      return false;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error al conectar a la base de datos:', err.message);
    return false;
  }
}

async function main() {
  try {
    console.log('Iniciando migraciones...');
    
    // Asegurar que existe la tabla de migraciones
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations_applied (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
    } finally {
      client.release();
    }
    
    // Obtener lista de migraciones ya aplicadas
    const appliedResult = await pool.query('SELECT name FROM migrations_applied');
    const appliedMigrations = new Set(appliedResult.rows.map(row => row.name));
    
    // Obtener lista de archivos de migración
    const migrationFiles = fs.readdirSync(path.join(__dirname, '../migrations'))
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ordenar para aplicar en orden
    
    // Aplicar las migraciones nuevas
    let applied = 0;
    for (const file of migrationFiles) {
      if (!appliedMigrations.has(file)) {
        const success = await runMigration(file);
        if (success) applied++;
      } else {
        console.log(`Migración ya aplicada anteriormente: ${file}`);
      }
    }
    
    console.log(`Migraciones completadas. ${applied} nuevas migraciones aplicadas.`);
  } catch (err) {
    console.error('Error en el proceso de migración:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();