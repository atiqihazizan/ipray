import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ipray_flutter/main.dart';

void main() {
  testWidgets('App builds and shows scaffold', (WidgetTester tester) async {
    await tester.pumpWidget(const MyApp());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));
    await tester.pump(const Duration(milliseconds: 500));

    expect(find.byType(Scaffold), findsWidgets);
  });
}
