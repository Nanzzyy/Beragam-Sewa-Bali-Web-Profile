# Beragam Sewa Bali - POS & Rental Management System

A comprehensive Point of Sale (POS) and rental management system for event equipment rentals in Bali. This application provides tools for inventory management, rental tracking, financial reporting, and user role management.

## ✨ Features

### 📦 Inventory Management
- **Item Catalog**: Manage all rental items with SKUs, categories, and quantities.
- **Status Tracking**: Track item status (Ready, Rented, Maintenance, Damaged).
- **Supplier Management**: Track suppliers for all items.
- **Soft Delete**: Items and suppliers can be archived without permanent deletion.

### 🤝 Rental Management
- **Full Rental Lifecycle**: Handle rental requests, order confirmation, and completion.
- **Status Transitions**: Seamlessly update rental statuses as they progress.
- **User Assignment**: Assign specific staff members to manage rental orders.

### 💰 Financial Tracking
- **Cashflow Ledger**: Track all financial transactions (Inflow/Outflow).
- **Transaction Types**: Categorize transactions as Client Rental, Operational Expense, Payroll, Supplier Payment, or Maintenance Cost.
- **User Roles**: Dedicated **Accounting** role for financial management.

### 👥 User & Access Control
- **Role-Based Access Control (RBAC)**: Secure system with three distinct roles:
  - **Owner**: Full access to all features including user management.
  - **Accounting**: Access to financial reports and cashflow management.
  - **Staff**: Access to inventory and rental order management.
- **Role-Safe Authentication**: Supabase Auth with role-based RLS policies.
- **Profile Management**: Update user information and roles.

### 🛡️ Security
- **Row Level Security (RLS)**: Comprehensive RLS policies ensure data security.
- **Audit Logging**: Automatic logging of all data changes (Inserts, Updates, Deletes) across all tables.
- **UUID-based Authentication**: Secure user identification using UUIDs.

### 📈 Business Intelligence & Analytics
- **Dashboard Overview**: Real-time visualization of active rentals, pending requests, and critical alerts.
- **Rental Analytics**: Charts showing rentals per status, category, and user.
- **Financial Analytics**: Insights into income, expenses, and profitability.
- **Inventory Analytics**: Performance tracking of different item categories.

## 🛠️ Technology Stack

- **Frontend**: **Flutter** (Mobile & Web)
- **Backend**: **Supabase** (PostgreSQL Database, Authentication, Storage)
- **State Management**: Riverpod
- **API**: REST API (Node.js + Express)
- **Database Client**: PostgREST

## 📂 Project Structure

### Frontend (`dashboard/`)
- `lib/`
  - `main.dart`: Entry point and routing configuration.
  - `models/`: Data models for items, rentals, suppliers, etc.
  - `providers/`: Riverpod providers for state management.
  - `services/`: API services for data fetching and manipulation.
  - `screens/`: UI screens for different features.

## ⚙️ Setup & Installation

### Prerequisites
- Flutter SDK (>= 3.0.0)
- Node.js & npm
- Supabase Account

### 1. Backend Setup

1. **Clone the repository** (if not already done).

2. **Setup Supabase**:
   - Create a new Supabase project.
   - Import the schema from `supabase_schema.sql`:
     ```bash
     psql -h <db_host> -p 5432 -U postgres -d postgres < supabase_schema.sql
     ```

3. **Setup API**:
   - Navigate to the API directory:
     ```bash
     cd api
     ```
   - Install dependencies:
     ```bash
     npm install
     ```
   - Create a `.env` file with the following variables:
     ```env
     PORT=3000
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_KEY=your-anon-key
     ```
   - Start the server:
     ```bash
     npm start
     ```

### 2. Frontend Setup

1. **Clone the repository** (if not already done).

2. **Navigate to the dashboard directory**:
   ```bash
   cd dashboard
   ```

3. **Install dependencies**:
   ```bash
   flutter pub get
   ```

4. **Configure Supabase URL**:
   - Open `lib/main.dart`.
   - Update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the `main()` function to match your Supabase project credentials.

5. **Run the application**:
   ```bash
   flutter run
   ```
   - To run on web: `flutter run -d chrome`

## 👥 Usage

### Login Credentials
After setting up, you can create users via the Supabase Dashboard or programmatically. Use these credentials to log in:

- **Owner**: [EMAIL_ADDRESS] / admin123
- **Accounting**: [EMAIL_ADDRESS] / accounting123
- **Staff**: [EMAIL_ADDRESS] / staff123

### Database Configuration
For development, you can use the **PostgREST** extension in Supabase to expose your database tables as a REST API. Ensure PostgREST is enabled in your Supabase project settings.w