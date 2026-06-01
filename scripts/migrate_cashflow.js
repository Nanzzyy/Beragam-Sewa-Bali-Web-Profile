const db = require('../db');

async function run() {
  console.log('Starting migration to enable guest roles and shared ledger access...');
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if 'guest' value exists in app_role enum
    const enumCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'app_role' AND e.enumlabel = 'guest'
      );
    `);
    
    if (!enumCheck.rows[0].exists) {
      console.log("Adding 'guest' role to app_role enum...");
      // ALTER TYPE cannot run inside a transaction block in PostgreSQL < 12, but inside pg 15+ (Supabase) it is allowed
      await client.query("ALTER TYPE public.app_role ADD VALUE 'guest'");
    } else {
      console.log("'guest' role already exists in enum app_role.");
    }

    // 2. Update trigger public.handle_new_user to default new signups to 'guest' role
    console.log("Updating handle_new_user trigger function to default new users to 'guest'...");
    await client.query(`
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        INSERT INTO public.profiles (id, full_name, role)
        VALUES (
          NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', 'Guest User'),
          COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'guest')
        );
        RETURN NEW;
      END;
      $$;
    `);

    // 3. Update Categories RLS Policies
    console.log("Updating Row Level Security (RLS) policies for public.categories...");
    await client.query(`
      DROP POLICY IF EXISTS "Allow owner full control on their categories" ON public.categories;
      DROP POLICY IF EXISTS "Allow owner and staff/accounting control on categories" ON public.categories;
      
      CREATE POLICY "Allow owner and staff/accounting control on categories"
      ON public.categories FOR ALL TO authenticated
      USING (
        auth.uid() = owner_id
        OR
        (
          owner_id IN (SELECT id FROM public.profiles WHERE role = 'owner')
          AND
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'staff', 'accounting')
          )
        )
      )
      WITH CHECK (
        auth.uid() = owner_id
        OR
        (
          owner_id IN (SELECT id FROM public.profiles WHERE role = 'owner')
          AND
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'staff', 'accounting')
          )
        )
      );
    `);

    // 4. Update Transactions RLS Policies
    console.log("Updating Row Level Security (RLS) policies for public.transactions...");
    await client.query(`
      DROP POLICY IF EXISTS "Allow owner full control on their transactions" ON public.transactions;
      DROP POLICY IF EXISTS "Allow owner and staff/accounting control on transactions" ON public.transactions;
      
      CREATE POLICY "Allow owner and staff/accounting control on transactions"
      ON public.transactions FOR ALL TO authenticated
      USING (
        auth.uid() = owner_id
        OR
        (
          owner_id IN (SELECT id FROM public.profiles WHERE role = 'owner')
          AND
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'staff', 'accounting')
          )
        )
      )
      WITH CHECK (
        auth.uid() = owner_id
        OR
        (
          owner_id IN (SELECT id FROM public.profiles WHERE role = 'owner')
          AND
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('owner', 'staff', 'accounting')
          )
        )
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.log('❌ Database migration failed!');
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
