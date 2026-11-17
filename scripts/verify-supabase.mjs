const url = 'https://sodxwchaqpqnwvnrnsaj.supabase.co';
const key = 'sb_publishable_KYRYhqhTDJSohgptEx5GVg_GooKFAqw';

const tables = [
  'categories',
  'profiles',
  'providers',
  'bookings',
  'messages',
  'reviews',
  'user_reports',
  'admin_actions'
];

async function verify() {
  console.log('Testing Supabase REST endpoints via standard Node fetch:\n');
  for (const table of tables) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        console.log(`✅ [${res.status}] ${table.padEnd(18)} : Accessible (Rows: ${data.length})`);
      } else {
        const text = await res.text();
        console.log(`❌ [${res.status}] ${table.padEnd(18)} : ${text}`);
      }
    } catch (e) {
      console.log(`⚠️ ${table.padEnd(18)} : Network error: ${e.message}`);
    }
  }
}

verify();
