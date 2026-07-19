# Job Pricing Overhaul + Data Barang Implementation Plan

**Goal:** Dynamic job pricing from items + individual unit tracking menu

**DB Changes (run on nine-lives Supabase):**
1. `job_items`: add `rental_price NUMERIC(15,2) DEFAULT 0` — harga sewa per unit
2. `jobs`: add `price_cut NUMERIC(15,2) DEFAULT 0` — potongan tambahan
3. NEW `item_units`: id, item_id, unit_code, status, notes, created_at
4. NEW `unit_service_history`: id, unit_id, service_date, description, location, cost, created_at

**Logic Changes:**
- `total_rental_fee` = SUM(job_items.rental_price × quantity) - discount - price_cut
- `total_vendor_cost` = SUM(job_items.sub_rent_cost × quantity)
- JobFormModal: readonly total display, item rows get price input
- JobDetailModal: show per-item pricing breakdown

**Data Barang Tab:**
- List all items with stock count
- Click item → show all units (e.g. 50 rows for item "Beta" stock 50)
- Each unit: unit_code (SD-BT3-1), status, service history button
- Auto-generate units when item quantity increases
- Delete item → cascade delete units
- Search, filter by status, mobile responsive
- Sidebar: new menu "Data Barang" icon Boxes/Package
