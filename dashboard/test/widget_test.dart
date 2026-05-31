import 'package:flutter_test/flutter_test.dart';
import 'package:dashboard/main.dart';

void main() {
  testWidgets('App initialization smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const BeragamSewaBaliApp());
    expect(find.byType(BeragamSewaBaliApp), findsOneWidget);
  });
}
