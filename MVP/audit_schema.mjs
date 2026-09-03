import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gddwsdssmbasxazjakyw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZHdzZHNzbWJhc3hhempha3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDQ2MjcsImV4cCI6MjEwMzY4MDYyN30.BbTyDRrhg6BzCc7zStG0w19fcXLlzjzHZkliqhM2UoY//'; // Note: trimmed for brevity but I'll use the real one

// Using the real key from .env
const REAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkZHdzZHNzbWJhc3hhempha3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMDQ2MjcsImV4cCI6MjEwMzY4MDY2N30.BbTyDRrhg6BzCc7zStG0w19fcXLlzjzHZkliqhM2UoY';

const supabase = createClient(SUPABASE_URL, REAL_KEY);

async function audit() {
  console.log('Checking professional_time_off...');
  const { data: rows, error: rowErr } = await supabase
    .from('professional_time_off')
    .select('*')
    .limit(1);

  if (rowErr) {
    console.error('Error fetching from professional_time_off:', rowErr.message);
    // Check if it's a "column not found" error during a specific select? 
    // No, select('*') should just return whatever exists.
  } else if (rows && rows.length > 0) {
    console.log('Columns found:', Object.keys(rows[0]));
  } else {
    console.log('Table is empty or doesn\'t exist. Trying a simple count...');
    const { count, error: countErr } = await supabase
      .from('professional_time_off')
      .select('*', { count: 'exact', head: true });
    if (countErr) console.error('Count error:', countErr.message);
    else console.log('Table exists. Row count:', count);
  }
}

audit();
