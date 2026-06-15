import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyz.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

async function upsertContent(key: string, value: string) {
    const upd = await db.query(
        'UPDATE site_content SET content_value=$1 WHERE content_key=$2',
        [value, key]
    );
    if (upd.rowCount === 0) {
        await db.query(
            'INSERT INTO site_content(content_key, content_value) VALUES($1, $2)',
            [key, value]
        );
    }
}

async function uploadToSupabase(fileBuffer: Buffer, mimetype: string, folder = 'uploads') {
    const ext = mimetype.split('/')[1] || 'jpg';
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
        .from('beragam-sewa-bali-images')
        .upload(filename, fileBuffer, { contentType: mimetype, upsert: false });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from('beragam-sewa-bali-images').getPublicUrl(filename);
    return data.publicUrl;
}

function requireAdmin(req: NextRequest) {
    const isAdmin = req.cookies.get('isAdmin')?.value === 'true';
    if (!isAdmin) {
        throw new Error('Unauthorized');
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
    try {
        const resolvedParams = await params;
        const slug = resolvedParams.slug || [];
        const path = '/' + slug.join('/');

        if (path === '/health') {
            return NextResponse.json({ status: 'ok' });
        }

        if (path === '/admin/status') {
            const isAdmin = req.cookies.get('isAdmin')?.value === 'true';
            return NextResponse.json({ loggedIn: isAdmin });
        }

        if (path === '/content') {
            const texts = await db.query('SELECT DISTINCT ON (content_key) * FROM site_content ORDER BY content_key, id DESC');
            const images = await db.query('SELECT * FROM section_images ORDER BY id DESC');

            const siteContent = texts.rows.reduce((a: any, r: any) => ({ ...a, [r.content_key]: r.content_value }), {});
            const groupedImages = images.rows.reduce((acc: any, img: any) => {
                let key = img.section_key;
                if (key === 'service' || key === 'package') key = `${key}s`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(key.endsWith('s')
                    ? { id: img.id, image_url: img.image_url, name: img.title, description: img.text }
                    : img);
                return acc;
            }, {});

            const response = NextResponse.json({ ...siteContent, ...groupedImages });
            response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
            return response;
        }

        if (path === '/gallery') {
            const result = await db.query("SELECT * FROM section_images WHERE section_key='gallery' ORDER BY id DESC");
            const response = NextResponse.json(result.rows);
            response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
            return response;
        }

        if (path === '/hero') {
            requireAdmin(req);
            const texts = await db.query("SELECT content_key, content_value FROM site_content WHERE content_key IN ('home_title','home_subtitle')");
            const images = await db.query("SELECT * FROM section_images WHERE section_key='home_slider' ORDER BY id DESC");
            const data = texts.rows.reduce((a: any, r: any) => ({ ...a, [r.content_key]: r.content_value }), {});
            return NextResponse.json({ title: data.home_title || '', subtitle: data.home_subtitle || '', images: images.rows });
        }

        if (path === '/about') {
            requireAdmin(req);
            const texts = await db.query("SELECT content_key, content_value FROM site_content WHERE content_key IN ('about_title','about_text')");
            const images = await db.query("SELECT * FROM section_images WHERE section_key='about_carousel' ORDER BY id DESC");
            const data = texts.rows.reduce((a: any, r: any) => ({ ...a, [r.content_key]: r.content_value }), {});
            return NextResponse.json({ title: data.about_title || '', text: data.about_text || '', images: images.rows });
        }

        if (path === '/services') {
            const r = await db.query("SELECT * FROM section_images WHERE section_key='service' ORDER BY id DESC");
            return NextResponse.json(r.rows);
        }

        if (path.startsWith('/services/') && slug.length === 2) {
            const id = slug[1];
            const r = await db.query('SELECT * FROM section_images WHERE id=$1', [id]);
            if (!r.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            const row = r.rows[0];
            return NextResponse.json({ id: row.id, name: row.title, description: row.text, long_text: row.long_text, image_url: row.image_url });
        }

        if (path === '/packages') {
            const r = await db.query("SELECT * FROM section_images WHERE section_key='package' ORDER BY id DESC");
            return NextResponse.json(r.rows);
        }

        if (path.startsWith('/packages/') && slug.length === 2) {
            const id = slug[1];
            const r = await db.query('SELECT * FROM section_images WHERE id=$1', [id]);
            if (!r.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
            const row = r.rows[0];
            return NextResponse.json({ id: row.id, name: row.title, description: row.text, long_text: row.long_text, image_url: row.image_url });
        }

        if (path === '/catalog/services') {
            const r = await db.query(
                `SELECT si.id, si.title AS name, si.text AS description, si.long_text, si.image_url,
                        cp.price, cp.price_unit
                 FROM section_images si
                 LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'service'
                 WHERE si.section_key = 'service'
                 ORDER BY si.id DESC`
            );
            const response = NextResponse.json(r.rows);
            response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
            return response;
        }

        if (path === '/catalog/packages') {
            const r = await db.query(
                `SELECT si.id, si.title AS name, si.text AS description, si.long_text, si.image_url,
                        cp.price, cp.price_unit
                 FROM section_images si
                 LEFT JOIN catalog_prices cp ON cp.item_id = si.id AND cp.item_type = 'package'
                 WHERE si.section_key = 'package'
                 ORDER BY si.id DESC`
            );
            const response = NextResponse.json(r.rows);
            response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
            return response;
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (e: any) {
        if (e.message === 'Unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
    try {
        const resolvedParams = await params;
        const slug = resolvedParams.slug || [];
        const path = '/' + slug.join('/');

        if (path === '/admin/login') {
            const { email, password } = await req.json();
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            
            const response = NextResponse.json({ message: 'OK' });
            response.cookies.set('isAdmin', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 3600
            });
            return response;
        }

        if (path === '/admin/logout') {
            const response = NextResponse.json({ message: 'Logged out' });
            response.cookies.delete('isAdmin');
            return response;
        }

        // Add requireAdmin logic for all POSTs below
        requireAdmin(req);

        if (path === '/hero/text') {
            const { title, subtitle } = await req.json();
            await upsertContent('home_title', title);
            await upsertContent('home_subtitle', subtitle);
            return NextResponse.json({ message: 'Updated' });
        }

        if (path === '/about/text') {
            const { title, text } = await req.json();
            await upsertContent('about_title', title);
            await upsertContent('about_text', text);
            return NextResponse.json({ message: 'Updated' });
        }

        // Note: Multipart forms for /hero/image, /about/image, /services, /packages, /gallery, /site/logo
        // We handle form-data naturally with NextRequest
        const handleImageUpload = async (section_key: string, folder: string) => {
            const formData = await req.formData();
            const file = formData.get('image') as File | null;
            if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 });
            
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const url = await uploadToSupabase(buffer, file.type, folder);
            await db.query(`INSERT INTO section_images(section_key, image_url) VALUES($1, $2)`, [section_key, url]);
            return NextResponse.json({ message: 'Uploaded', url });
        };

        if (path === '/hero/image') return handleImageUpload('home_slider', 'hero');
        if (path === '/about/image') return handleImageUpload('about_carousel', 'about');

        if (path === '/services') {
            const formData = await req.formData();
            const title = formData.get('title') as string;
            const text = formData.get('text') as string;
            const long_text = formData.get('long_text') as string;
            let url = null;
            const file = formData.get('image') as File | null;
            if (file) {
                const buffer = Buffer.from(await file.arrayBuffer());
                url = await uploadToSupabase(buffer, file.type, 'services');
            }
            await db.query(
                "INSERT INTO section_images(section_key,title,text,long_text,image_url) VALUES('service',$1,$2,$3,$4)",
                [title, text, long_text, url]
            );
            return NextResponse.json({ message: 'Created' });
        }

        if (path === '/packages') {
            const formData = await req.formData();
            const title = formData.get('title') as string;
            const text = formData.get('text') as string;
            const long_text = formData.get('long_text') as string;
            let url = null;
            const file = formData.get('image') as File | null;
            if (file) {
                const buffer = Buffer.from(await file.arrayBuffer());
                url = await uploadToSupabase(buffer, file.type, 'packages');
            }
            await db.query(
                "INSERT INTO section_images(section_key,title,text,long_text,image_url) VALUES('package',$1,$2,$3,$4)",
                [title, text, long_text, url]
            );
            return NextResponse.json({ message: 'Created' });
        }

        if (path === '/gallery') {
            const formData = await req.formData();
            const files = formData.getAll('images') as File[];
            if (!files.length) return NextResponse.json({ error: 'No images' }, { status: 400 });
            for (const file of files) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const url = await uploadToSupabase(buffer, file.type, 'gallery');
                await db.query("INSERT INTO section_images(section_key, image_url) VALUES('gallery', $1)", [url]);
            }
            return NextResponse.json({ message: 'Uploaded' });
        }

        if (path === '/site/logo') {
            const formData = await req.formData();
            const file = formData.get('image') as File | null;
            if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 });
            const buffer = Buffer.from(await file.arrayBuffer());
            const url = await uploadToSupabase(buffer, file.type, 'logos');
            await upsertContent('site_logo', url);
            return NextResponse.json({ message: 'Updated', url });
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (e: any) {
        if (e.message === 'Unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
    try {
        const resolvedParams = await params;
        const slug = resolvedParams.slug || [];
        const path = '/' + slug.join('/');
        requireAdmin(req);

        if ((path.startsWith('/services/') || path.startsWith('/packages/')) && slug.length === 2) {
            const type = path.startsWith('/services/') ? 'service' : 'package';
            const id = slug[1];
            
            const formData = await req.formData();
            const title = formData.get('title') as string;
            const text = formData.get('text') as string;
            const long_text = formData.get('long_text') as string;
            let url = null;
            const file = formData.get('image') as File | null;
            if (file) {
                const buffer = Buffer.from(await file.arrayBuffer());
                url = await uploadToSupabase(buffer, file.type, type + 's');
            }

            const query = url
                ? 'UPDATE section_images SET title=$1,text=$2,long_text=$3,image_url=$4 WHERE id=$5'
                : 'UPDATE section_images SET title=$1,text=$2,long_text=$3 WHERE id=$4';
            const queryParams = url ? [title, text, long_text, url, id] : [title, text, long_text, id];
            await db.query(query, queryParams);
            return NextResponse.json({ message: 'Updated' });
        }

        if (path.startsWith('/catalog/price/') && slug.length === 4) {
            const type = slug[2];
            const id = slug[3];
            if (!['service', 'package'].includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
            
            const { price, price_unit } = await req.json();
            const unit = price_unit || '/hari';

            const existing = await db.query('SELECT id FROM catalog_prices WHERE item_id=$1 AND item_type=$2', [id, type]);
            if (existing.rowCount && existing.rowCount > 0) {
                await db.query('UPDATE catalog_prices SET price=$1, price_unit=$2 WHERE item_id=$3 AND item_type=$4', [price, unit, id, type]);
            } else {
                await db.query('INSERT INTO catalog_prices(item_id, item_type, price, price_unit) VALUES($1,$2,$3,$4)', [id, type, price, unit]);
            }
            return NextResponse.json({ message: 'Price updated' });
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (e: any) {
        if (e.message === 'Unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
    try {
        const resolvedParams = await params;
        const slug = resolvedParams.slug || [];
        const path = '/' + slug.join('/');
        requireAdmin(req);

        if (path.startsWith('/hero/image/') && slug.length === 3) {
            await db.query('DELETE FROM section_images WHERE id=$1', [slug[2]]);
            return NextResponse.json({ message: 'Deleted' });
        }
        if (path.startsWith('/about/image/') && slug.length === 3) {
            await db.query('DELETE FROM section_images WHERE id=$1', [slug[2]]);
            return NextResponse.json({ message: 'Deleted' });
        }
        if (path.startsWith('/services/') && slug.length === 2) {
            await db.query('DELETE FROM section_images WHERE id=$1', [slug[1]]);
            return NextResponse.json({ message: 'Deleted' });
        }
        if (path.startsWith('/packages/') && slug.length === 2) {
            await db.query('DELETE FROM section_images WHERE id=$1', [slug[1]]);
            return NextResponse.json({ message: 'Deleted' });
        }
        if (path.startsWith('/gallery/') && slug.length === 2) {
            await db.query('DELETE FROM section_images WHERE id=$1', [slug[1]]);
            return NextResponse.json({ message: 'Deleted' });
        }
        if (path.startsWith('/catalog/price/') && slug.length === 4) {
            await db.query('DELETE FROM catalog_prices WHERE item_id=$1 AND item_type=$2', [slug[3], slug[2]]);
            return NextResponse.json({ message: 'Price removed' });
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (e: any) {
        if (e.message === 'Unauthorized') return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
