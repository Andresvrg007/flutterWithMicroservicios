// viewmodels/transaction_viewmodel.dart
import 'package:flutter/foundation.dart';
import '../models/transaction_model.dart';
import '../services/api_service.dart';

class TransactionViewModel extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<Transaction> _transactions = [];
  List<Transaction> _incomeTransactions = [];
  List<Transaction> _expenseTransactions = [];
  bool _isLoading = false;
  String? _errorMessage;
  Map<String, dynamic>? _summary;
  double _totalIncome = 0.0;
  double _totalExpenses = 0.0;
  double _balance = 0.0;

  // Getters
  List<Transaction> get transactions => _transactions;
  List<Transaction> get incomeTransactions => _incomeTransactions;
  List<Transaction> get expenseTransactions => _expenseTransactions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get summary => _summary;
  double get totalIncome => _totalIncome;
  double get totalExpenses => _totalExpenses;
  double get balance => _balance;

  // Set loading state
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  // Set error message
  void _setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }

  // Clear error
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  // Crear nueva transacción
  Future<bool> createTransaction({
    required double amount,
    required String description,
    required String category,
    String? categoryId,
    required String type, // 'income' or 'expense'
    String metodoPago = 'efectivo',
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      await _apiService.createTransaction(
        amount: amount,
        description: description,
        category: category,
        categoryId: categoryId,
        type: type,
        metodoPago: metodoPago,
      );

      // Recargar transacciones después de crear
      await loadTransactions();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Cargar todas las transacciones
  Future<void> loadTransactions() async {
    try {
      _setLoading(true);
      _setError(null);

      final transactionsData = await _apiService.getTransactions();

      _transactions = transactionsData
          .map((data) => Transaction.fromJson(data))
          .toList();

      // Separar por tipo
      _incomeTransactions = _transactions
          .where((trans) => trans.tipo == 'ingreso')
          .toList();

      _expenseTransactions = _transactions
          .where((trans) => trans.tipo == 'gasto')
          .toList();

      // Calcular totales
      _calculateTotals();
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  // Actualizar transacción
  Future<bool> updateTransaction({
    required String id,
    required double amount,
    required String description,
    required String category,
    required String type,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      await _apiService.updateTransaction(
        id: id,
        amount: amount,
        description: description,
        category: category,
        type: type,
      );

      // Recargar transacciones después de actualizar
      await loadTransactions();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Eliminar transacción
  Future<bool> deleteTransaction(String id) async {
    try {
      _setLoading(true);
      _setError(null);

      await _apiService.deleteTransaction(id);

      // Recargar transacciones después de eliminar
      await loadTransactions();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Cargar resumen de transacciones
  Future<void> loadSummary() async {
    try {
      _setLoading(true);
      _setError(null);

      _summary = await _apiService.getTransactionsSummary();
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  // Calcular totales
  void _calculateTotals() {
    _totalIncome = _incomeTransactions.fold(
      0.0,
      (sum, transaction) => sum + transaction.amount,
    );

    _totalExpenses = _expenseTransactions.fold(
      0.0,
      (sum, transaction) => sum + transaction.amount,
    );

    _balance = _totalIncome - _totalExpenses;
  }

  // Filtrar transacciones por fecha
  List<Transaction> getTransactionsByDateRange(DateTime start, DateTime end) {
    return _transactions.where((transaction) {
      final fecha = transaction.fecha;
      return fecha.isAfter(start.subtract(Duration(days: 1))) &&
          fecha.isBefore(end.add(Duration(days: 1)));
    }).toList();
  }

  // Filtrar transacciones por categoría
  List<Transaction> getTransactionsByCategory(String category) {
    return _transactions
        .where((transaction) => transaction.category == category)
        .toList();
  }

  // Buscar transacciones por descripción
  List<Transaction> searchTransactions(String query) {
    if (query.isEmpty) return _transactions;

    return _transactions
        .where(
          (transaction) =>
              transaction.description.toLowerCase().contains(
                query.toLowerCase(),
              ) ||
              transaction.category.toLowerCase().contains(query.toLowerCase()),
        )
        .toList();
  }

  // Obtener transacciones del mes actual
  List<Transaction> getCurrentMonthTransactions() {
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);
    final endOfMonth = DateTime(now.year, now.month + 1, 0);

    return getTransactionsByDateRange(startOfMonth, endOfMonth);
  }

  // Obtener transacciones de la semana actual
  List<Transaction> getCurrentWeekTransactions() {
    final now = DateTime.now();
    final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
    final endOfWeek = startOfWeek.add(Duration(days: 6));

    return getTransactionsByDateRange(startOfWeek, endOfWeek);
  }

  // Obtener transacciones por tipo específico
  List<Transaction> getTransactionsByType(TransactionType type) {
    return type == TransactionType.ingreso
        ? _incomeTransactions
        : _expenseTransactions;
  }

  // Calcular total por categoría
  Map<String, double> getTotalsByCategory() {
    final Map<String, double> totals = {};

    for (final transaction in _transactions) {
      totals[transaction.category] =
          (totals[transaction.category] ?? 0.0) + transaction.amount;
    }

    return totals;
  }

  // Obtener las transacciones más recientes
  List<Transaction> getRecentTransactions({int limit = 10}) {
    final sortedTransactions = List<Transaction>.from(_transactions);
    sortedTransactions.sort((a, b) => b.fecha.compareTo(a.fecha));

    return sortedTransactions.take(limit).toList();
  }

  // Resetear el estado
  void reset() {
    _transactions = [];
    _incomeTransactions = [];
    _expenseTransactions = [];
    _isLoading = false;
    _errorMessage = null;
    _summary = null;
    _totalIncome = 0.0;
    _totalExpenses = 0.0;
    _balance = 0.0;
    notifyListeners();
  }
}
