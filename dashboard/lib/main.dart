import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

// ==========================================
// 1. APP ROLES & PERMISSIONS DEFINITION
// ==========================================
enum AppRole { owner, accounting, staff }

AppRole parseRole(String? role) {
  if (role == null) return AppRole.staff;
  switch (role.toLowerCase()) {
    case 'owner':
      return AppRole.owner;
    case 'accounting':
      return AppRole.accounting;
    default:
      return AppRole.staff;
  }
}

// ==========================================
// 2. MAIN APPLICATION ENTRY
// ==========================================
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase using fallback keys matching the project's setup
  await Supabase.initialize(
    url: const String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: 'https://izqrlblxbajnaovelvef.supabase.co',
    ),
    anonKey: const String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6cXJsYmx4YmFqbmFvdmVsdmVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgwNzg3MSwiZXhwIjoyMDg4MzgzODcxfQ.oaqJmBVPYGJRhOOVmWv3CSLhJALobYeOwrs-tN1DE-I',
    ),
  );

  runApp(const BeragamSewaBaliApp());
}

class BeragamSewaBaliApp extends StatelessWidget {
  const BeragamSewaBaliApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Beragam Sewa Bali - ERP Dashboard',
      themeMode: ThemeMode.dark,
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        primaryColor: const Color(0xFF1B5E20),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981), // Premium Emerald green accent
          secondary: Color(0xFF34D399),
          surface: Color(0xFF1E293B),
          error: Color(0xFFEF4444),
        ),
        cardTheme: CardThemeData(
          color: const Color(0xFF1E293B),
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        textTheme: const TextTheme(
          titleLarge: TextStyle(fontFamily: 'Inter', fontWeight: FontWeight.bold, color: Colors.white),
          bodyLarge: TextStyle(fontFamily: 'Inter', color: Colors.white70),
        ),
      ),
      routerConfig: _router,
    );
  }
}

// ==========================================
// 3. GO_ROUTER IMPLEMENTATION WITH RBAC MIDDLEWARE
// ==========================================
final GoRouter _router = GoRouter(
  initialLocation: '/dashboard',
  redirect: (BuildContext context, GoRouterState state) async {
    final session = Supabase.instance.client.auth.currentSession;
    final bool loggedIn = session != null;
    final bool isLoggingIn = state.matchedLocation == '/login';

    if (!loggedIn) {
      return isLoggingIn ? null : '/login';
    }

    // Attempt to extract role from user metadata safely
    final String? roleMetadata = session.user.userMetadata?['role'] as String?;
    final AppRole role = parseRole(roleMetadata);

    if (isLoggingIn) {
      return '/dashboard';
    }

    final String path = state.matchedLocation;

    // RBAC Route protection checks
    if (path.startsWith('/cashflow')) {
      if (role != AppRole.owner && role != AppRole.accounting) {
        return '/unauthorized';
      }
    }

    if (path.startsWith('/audit-logs')) {
      if (role != AppRole.owner) {
        return '/unauthorized';
      }
    }

    return null;
  },
  routes: [
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: '/unauthorized',
      builder: (context, state) => const UnauthorizedPage(),
    ),
    ShellRoute(
      builder: (context, state, child) => DashboardLayout(child: child),
      routes: [
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const DashboardOverviewPage(),
        ),
        GoRoute(
          path: '/suppliers',
          builder: (context, state) => const SupplierManagementPage(),
        ),
        GoRoute(
          path: '/inventory',
          builder: (context, state) => const InventoryPage(),
        ),
        GoRoute(
          path: '/cashflow',
          builder: (context, state) => const CashflowPage(),
        ),
        GoRoute(
          path: '/audit-logs',
          builder: (context, state) => const AuditLogsPage(),
        ),
      ],
    ),
  ],
);

// ==========================================
// 4. PAGES & COMPONENT IMPLEMENTATIONS
// ==========================================

// --- LOGIN PAGE ---
class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  Future<void> _signIn() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      if (mounted) context.go('/dashboard');
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          child: Container(
            width: 420,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF334155)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.storefront_rounded,
                  size: 64,
                  color: Color(0xFF10B981),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Beragam Sewa Bali',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                const Text(
                  'ERP Dashboard System',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.white54,
                  ),
                ),
                const SizedBox(height: 32),
                TextField(
                  controller: _emailController,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: 'Password',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock_outlined),
                  ),
                ),
                const SizedBox(height: 24),
                if (_errorMessage != null) ...[
                  Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.redAccent),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                ],
                ElevatedButton(
                  onPressed: _isLoading ? null : _signIn,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black),
                        )
                      : const Text('Login to Dashboard', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// --- DASHBOARD SIDEBAR & HEADER LAYOUT ---
class DashboardLayout extends StatelessWidget {
  final Widget child;

  const DashboardLayout({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final user = Supabase.instance.client.auth.currentUser;
    final role = parseRole(user?.userMetadata?['role'] as String?);

    return Scaffold(
      body: Row(
        children: [
          // Sidebar Menu
          Container(
            width: 260,
            decoration: const BoxDecoration(
              color: Color(0xFF0F172A),
              border: Border(right: BorderSide(color: Color(0xFF1E293B))),
            ),
            child: Column(
              children: [
                const SizedBox(height: 24),
                // Header Logo
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      const Icon(Icons.dashboard_customize_rounded, color: Color(0xFF10B981), size: 28),
                      const SizedBox(width: 12),
                      Text(
                        'BSB ERP',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 20),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFF334155)),
                        ),
                        child: Text(
                          role.name.toUpperCase(),
                          style: const TextStyle(fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                // Sidebar items based on Role
                _SidebarMenuItem(
                  icon: Icons.dashboard_rounded,
                  label: 'Dashboard',
                  route: '/dashboard',
                ),
                _SidebarMenuItem(
                  icon: Icons.people_rounded,
                  label: 'Suppliers',
                  route: '/suppliers',
                ),
                _SidebarMenuItem(
                  icon: Icons.inventory_2_rounded,
                  label: 'Inventory',
                  route: '/inventory',
                ),
                if (role == AppRole.owner || role == AppRole.accounting)
                  _SidebarMenuItem(
                    icon: Icons.monetization_on_rounded,
                    label: 'Cashflow Ledger',
                    route: '/cashflow',
                  ),
                if (role == AppRole.owner)
                  _SidebarMenuItem(
                    icon: Icons.history_rounded,
                    label: 'Audit Logs',
                    route: '/audit-logs',
                  ),
                const Spacer(),
                // Logged In User Email
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text(
                    user?.email ?? '',
                    style: const TextStyle(fontSize: 12, color: Colors.white38),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
                  title: const Text('Logout', style: TextStyle(color: Colors.redAccent)),
                  onTap: () async {
                    await Supabase.instance.client.auth.signOut();
                    if (context.mounted) context.go('/login');
                  },
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
          // Main Content View
          Expanded(
            child: Container(
              color: const Color(0xFF0F172A),
              child: child,
            ),
          ),
        ],
      ),
    );
  }
}

class _SidebarMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;

  const _SidebarMenuItem({
    required this.icon,
    required this.label,
    required this.route,
  });

  @override
  Widget build(BuildContext context) {
    final String currentRoute = GoRouterState.of(context).matchedLocation;
    final bool isSelected = currentRoute == route;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: ListTile(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        selected: isSelected,
        selectedTileColor: const Color(0xFF1E293B),
        selectedColor: const Color(0xFF10B981),
        leading: Icon(icon, color: isSelected ? const Color(0xFF10B981) : Colors.white70),
        title: Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
        onTap: () => context.go(route),
      ),
    );
  }
}

// --- DASHBOARD OVERVIEW PAGE ---
class DashboardOverviewPage extends StatelessWidget {
  const DashboardOverviewPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Dashboard Overview', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 28)),
            const SizedBox(height: 8),
            const Text('Welcome to Beragam Sewa Bali management ecosystem.', style: TextStyle(color: Colors.white54)),
            const SizedBox(height: 32),
            Expanded(
              child: GridView.count(
                crossAxisCount: 3,
                crossAxisSpacing: 24,
                mainAxisSpacing: 24,
                children: const [
                  _MetricCard(
                    title: 'Ready Stock Items',
                    value: '142',
                    icon: Icons.check_circle_outline_rounded,
                    color: Color(0xFF10B981),
                  ),
                  _MetricCard(
                    title: 'Active Rent Outs',
                    value: '58',
                    icon: Icons.shopping_bag_outlined,
                    color: Colors.blueAccent,
                  ),
                  _MetricCard(
                    title: 'Maintenance Cost (MTD)',
                    value: 'Rp 4.500.000',
                    icon: Icons.build_circle_outlined,
                    color: Colors.orangeAccent,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: const TextStyle(color: Colors.white54, fontSize: 16)),
                Icon(icon, color: color, size: 28),
              ],
            ),
            Text(value, style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

// --- SUPPLIER MANAGEMENT PAGE ---
class SupplierManagementPage extends StatefulWidget {
  const SupplierManagementPage({super.key});

  @override
  State<SupplierManagementPage> createState() => _SupplierManagementPageState();
}

class _SupplierManagementPageState extends State<SupplierManagementPage> {
  final _supabase = Supabase.instance.client;
  List<dynamic> _suppliers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchSuppliers();
  }

  Future<void> _fetchSuppliers() async {
    try {
      final response = await _supabase
          .from('suppliers')
          .select('*')
          .eq('is_deleted', false)
          .order('name', ascending: true);
      setState(() {
        _suppliers = response;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = parseRole(_supabase.auth.currentUser?.userMetadata?['role'] as String?);

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Suppliers Management', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 28)),
                if (role == AppRole.owner)
                  ElevatedButton.icon(
                    onPressed: () {}, // Trigger creation dialog / page
                    icon: const Icon(Icons.add),
                    label: const Text('Add Supplier'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.black,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _suppliers.isEmpty
                      ? const Center(child: Text('No suppliers found.'))
                      : ListView.builder(
                          itemCount: _suppliers.length,
                          itemBuilder: (context, index) {
                            final supplier = _suppliers[index];
                            return Card(
                              margin: const EdgeInsets.symmetric(vertical: 8),
                              child: ListTile(
                                leading: const CircleAvatar(
                                  backgroundColor: Color(0xFF1E293B),
                                  child: Icon(Icons.local_shipping_outlined, color: Color(0xFF10B981)),
                                ),
                                title: Text(supplier['name'] ?? ''),
                                subtitle: Text('Contact: ${supplier['contact_name'] ?? '-'} • Phone: ${supplier['phone'] ?? '-'}'),
                                trailing: role == AppRole.owner
                                    ? IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                                        onPressed: () async {
                                          await _supabase
                                              .from('suppliers')
                                              .update({'is_deleted': true})
                                              .eq('id', supplier['id']);
                                          _fetchSuppliers();
                                        },
                                      )
                                    : null,
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- INVENTORY MANAGEMENT PAGE ---
class InventoryPage extends StatefulWidget {
  const InventoryPage({super.key});

  @override
  State<InventoryPage> createState() => _InventoryPageState();
}

class _InventoryPageState extends State<InventoryPage> {
  final _supabase = Supabase.instance.client;
  List<dynamic> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchItems();
  }

  Future<void> _fetchItems() async {
    try {
      final response = await _supabase
          .from('items')
          .select('*')
          .eq('is_deleted', false)
          .order('name', ascending: true);
      setState(() {
        _items = response;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _updateItemStatus(String id, String newStatus) async {
    try {
      await _supabase.from('items').update({'status': newStatus}).eq('id', id);
      _fetchItems();
    } catch (e) {
      // Handle error
    }
  }

  @override
  Widget build(BuildContext context) {
    final role = parseRole(_supabase.auth.currentUser?.userMetadata?['role'] as String?);

    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Items Inventory', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 28)),
                if (role == AppRole.owner)
                  ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.add),
                    label: const Text('Add Item'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.black,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _items.isEmpty
                      ? const Center(child: Text('No items in inventory.'))
                      : GridView.builder(
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 3,
                            crossAxisSpacing: 16,
                            mainAxisSpacing: 16,
                            childAspectRatio: 2.2,
                          ),
                          itemCount: _items.length,
                          itemBuilder: (context, index) {
                            final item = _items[index];
                            return Card(
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(item['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                              Text('SKU: ${item['sku'] ?? ''}', style: const TextStyle(color: Colors.white38, fontSize: 12)),
                                            ],
                                          ),
                                        ),
                                        _StatusBadge(status: item['status'] ?? 'ready'),
                                      ],
                                    ),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text('Quantity: ${item['quantity'] ?? 0}'),
                                        DropdownButton<String>(
                                          value: item['status'],
                                          underline: const SizedBox(),
                                          items: const [
                                            DropdownMenuItem(value: 'ready', child: Text('Ready')),
                                            DropdownMenuItem(value: 'rented', child: Text('Rented')),
                                            DropdownMenuItem(value: 'maintenance', child: Text('Maintenance')),
                                            DropdownMenuItem(value: 'damaged', child: Text('Damaged')),
                                          ],
                                          onChanged: (newStatus) {
                                            if (newStatus != null) {
                                              _updateItemStatus(item['id'], newStatus);
                                            }
                                          },
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color badgeColor;
    switch (status) {
      case 'ready':
        badgeColor = const Color(0xFF10B981);
        break;
      case 'rented':
        badgeColor = Colors.blueAccent;
        break;
      case 'maintenance':
        badgeColor = Colors.orangeAccent;
        break;
      default:
        badgeColor = Colors.redAccent;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: badgeColor.withAlpha(38),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: badgeColor),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(color: badgeColor, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}

// --- CASHFLOW MANAGEMENT PAGE ---
class CashflowPage extends StatefulWidget {
  const CashflowPage({super.key});

  @override
  State<CashflowPage> createState() => _CashflowPageState();
}

class _CashflowPageState extends State<CashflowPage> {
  final _supabase = Supabase.instance.client;
  List<dynamic> _transactions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchCashflow();
  }

  Future<void> _fetchCashflow() async {
    try {
      final response = await _supabase
          .from('cashflow')
          .select('*')
          .order('transaction_date', ascending: false);
      setState(() {
        _transactions = response;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Cashflow Ledger', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 28)),
                ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.add),
                  label: const Text('Add Entry'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.black,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _transactions.isEmpty
                      ? const Center(child: Text('No transactions registered.'))
                      : ListView.builder(
                          itemCount: _transactions.length,
                          itemBuilder: (context, index) {
                            final tx = _transactions[index];
                            final bool isInflow = tx['type'] == 'inflow';
                            return Card(
                              margin: const EdgeInsets.symmetric(vertical: 8),
                              child: ListTile(
                                leading: Icon(
                                  isInflow ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                                  color: isInflow ? const Color(0xFF10B981) : Colors.redAccent,
                                ),
                                title: Text(tx['description'] ?? ''),
                                subtitle: Text(tx['category'] ?? ''),
                                trailing: Text(
                                  '${isInflow ? "+" : "-"} Rp ${tx['amount']}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: isInflow ? const Color(0xFF10B981) : Colors.redAccent,
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- AUDIT LOGS PAGE ---
class AuditLogsPage extends StatefulWidget {
  const AuditLogsPage({super.key});

  @override
  State<AuditLogsPage> createState() => _AuditLogsPageState();
}

class _AuditLogsPageState extends State<AuditLogsPage> {
  final _supabase = Supabase.instance.client;
  List<dynamic> _logs = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  Future<void> _fetchLogs() async {
    try {
      final response = await _supabase
          .from('audit_logs')
          .select('*')
          .order('created_at', ascending: false);
      setState(() {
        _logs = response;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Security Audit Logs', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 28)),
            const SizedBox(height: 24),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _logs.isEmpty
                      ? const Center(child: Text('No audit logs recorded.'))
                      : ListView.builder(
                          itemCount: _logs.length,
                          itemBuilder: (context, index) {
                            final log = _logs[index];
                            return Card(
                              margin: const EdgeInsets.symmetric(vertical: 6),
                              child: ListTile(
                                leading: const Icon(Icons.security, color: Color(0xFF10B981)),
                                title: Text('${log['action']} on table "${log['table_name']}"'),
                                subtitle: Text('Record ID: ${log['record_id']} • User: ${log['user_id'] ?? 'System'}'),
                                trailing: Text(
                                  log['created_at'].toString().split('T').first,
                                  style: const TextStyle(color: Colors.white38),
                                ),
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

// --- UNAUTHORIZED PAGE ---
class UnauthorizedPage extends StatelessWidget {
  const UnauthorizedPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.gpp_bad_outlined, size: 72, color: Colors.redAccent),
            const SizedBox(height: 24),
            Text('Unauthorized Access', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 8),
            const Text('You do not have the required role to view this page.', style: TextStyle(color: Colors.white54)),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () => context.go('/dashboard'),
              child: const Text('Back to Dashboard'),
            ),
          ],
        ),
      ),
    );
  }
}
