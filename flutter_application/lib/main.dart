import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'viewmodels/auth_viewmodel.dart';
import 'viewmodels/category_viewmodel.dart';
import 'viewmodels/transaction_viewmodel.dart';
import 'viewmodels/pdf_report_viewmodel.dart'; // ✅ AGREGAR ESTA LÍNEA
import 'views/login_view.dart';
import 'views/register_view.dart';
import 'views/dashboard_view_simple.dart';
import 'forgot_password_view.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Servicios
        Provider<ApiService>(create: (_) => ApiService()),
        // ViewModels
        ChangeNotifierProvider<AuthViewModel>(
          create: (context) => AuthViewModel(),
        ),
        ChangeNotifierProvider<CategoryViewModel>(
          create: (context) => CategoryViewModel(),
        ),
        ChangeNotifierProvider<TransactionViewModel>(
          create: (context) => TransactionViewModel(),
        ),
        ChangeNotifierProvider<PDFReportViewModel>(
          // ✅ AGREGAR ESTA LÍNEA
          create: (context) => PDFReportViewModel(), // ✅ AGREGAR ESTA LÍNEA
        ), // ✅ AGREGAR ESTA LÍNEA
      ],
      child: MaterialApp(
        title: 'Expense Tracker',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
        ),
        initialRoute: '/login',
        routes: {
          '/login': (context) => LoginView(),
          '/register': (context) => RegisterView(),
          '/dashboard': (context) => DashboardView(),
          '/forgot-password': (context) =>
              const ForgotPasswordView(), // ✅ AGREGAR ESTA LÍNEA
        },
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
