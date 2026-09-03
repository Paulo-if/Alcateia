import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function audit() {
  console.log('--- Table: professional_time_off ---');
  const { data: cols, error: colErr } = await supabase.rpc('get_table_columns', { table_name: 'professional_time_off' });
  // If get_table_columns RPC doesn't exist, I'll try a raw query via a function or similar.
  // Since I cannot guarantee the RPC exists, I will attempt a standard select to see what columns return.
  
  const { data: rows, error: rowErr } = await supabase
    .from('professional_time_off')
    .select('*')
    .limit(1);

  if (rowErr) {
    console.error('Error fetching rows:', rowErr);
  } else if (rows && rows.length > 0) {
    console.log('Sample row keys:', Object.keys(rows[0]));
  } else {
    console.log('No rows found or table empty.');
  }
}

audit();
