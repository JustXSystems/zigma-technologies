import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    const connection = await pool.getConnection();
    connection.release();

    return NextResponse.json({
      message: 'Hello and welcome!',
      database: 'Connected successfully',
      loop: Array.from({ length: 5 }, (_, i) => ({ i: i + 1 })),
      env: {
        dbHost: process.env.DB_HOST,
        dbUser: process.env.DB_USER,
        dbName: process.env.DB_NAME,
        dbPort: process.env.DB_PORT
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json({
      message: 'Hello and welcome!',
      database: 'Connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : 'No stack trace',
      env: {
        dbHost: process.env.DB_HOST,
        dbUser: process.env.DB_USER,
        dbName: process.env.DB_NAME,
        dbPort: process.env.DB_PORT
      }
    }, { status: 500 });
  }
}
