const { createClient } = require('@supabase/supabase-js');

// Cloud Supabase
const CLOUD_URL = 'https://izqrlblxbajnaovelvef.supabase.co';
const CLOUD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cXJsYmx4YmFqbmFvdmVsdmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwNzg3MSwiZXhwIjoyMDg4MzgzODcxfQ.oaqJmBVPYGJRhOOVmWv3CSLhJALobYeOwrs-tN1DE-I';
const cloudSupabase = createClient(CLOUD_URL, CLOUD_KEY);

// Local Supabase
const LOCAL_URL = 'http://localhost:8000';
// Local Service Role Key (from the .env we copied)
const LOCAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q';
const localSupabase = createClient(LOCAL_URL, LOCAL_KEY);

const tables = [
    'profiles',
    'suppliers',
    'items',
    'jobs',
    'job_items',
    'job_staff',
    'maintenance_records',
    'cashflow',
    'audit_logs',
    'accounts',
    'section_images',
    'catalog_prices',
    'journal_entries'
];

async function migrate() {
    console.log('Starting migration via REST API...');

    // 1. Migrate Users
    console.log('Migrating Auth Users...');
    const { data: { users }, error: authError } = await cloudSupabase.auth.admin.listUsers();
    if (authError) {
        console.error('Error fetching users:', authError);
    } else {
        console.log(`Found ${users.length} users.`);
        for (const user of users) {
            // Check if exists
            const { data: existingUser } = await localSupabase.auth.admin.getUserById(user.id);
            if (!existingUser || !existingUser.user) {
                // Create user
                const { error: insertError } = await localSupabase.auth.admin.createUser({
                    id: user.id,
                    email: user.email,
                    email_confirm: true,
                    password: 'TemporaryPassword123!', // Since we can't extract encrypted_password easily via REST
                    user_metadata: user.user_metadata,
                    app_metadata: user.app_metadata
                });
                if (insertError) {
                    console.error(`Error inserting user ${user.email}:`, insertError.message);
                } else {
                    console.log(`Inserted user: ${user.email}`);
                }
            }
        }
    }

    // 2. Migrate Tables
    for (const table of tables) {
        console.log(`\nMigrating table: ${table}...`);
        
        // Fetch from cloud
        const { data: rows, error: fetchError } = await cloudSupabase.from(table).select('*');
        
        if (fetchError) {
            console.error(`Error fetching ${table}:`, fetchError.message);
            continue;
        }

        if (!rows || rows.length === 0) {
            console.log(`No rows found in ${table}.`);
            continue;
        }

        console.log(`Found ${rows.length} rows in ${table}. Inserting to local...`);
        
        // Insert to local
        const { error: insertError } = await localSupabase.from(table).upsert(rows);
        
        if (insertError) {
            console.error(`Error inserting into ${table}:`, insertError.message);
        } else {
            console.log(`Successfully migrated ${table}.`);
        }
    }
    
    console.log('\nMigration complete!');
}

migrate().catch(console.error);
