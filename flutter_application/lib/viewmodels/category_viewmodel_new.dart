// viewmodels/category_viewmodel.dart
import 'package:flutter/foundation.dart';
import '../models/category_model.dart' as CategoryModel;
import '../services/api_service.dart';

class CategoryViewModel extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  List<CategoryModel.Category> _categories = [];
  List<CategoryModel.Category> _incomeCategories = [];
  List<CategoryModel.Category> _expenseCategories = [];
  bool _isLoading = false;
  String? _errorMessage;
  Map<String, dynamic>? _stats;

  // Getters
  List<CategoryModel.Category> get categories => _categories;
  List<CategoryModel.Category> get incomeCategories => _incomeCategories;
  List<CategoryModel.Category> get expenseCategories => _expenseCategories;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get stats => _stats;

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

  // Crear nueva categoría
  Future<bool> createCategory({
    required String nombre,
    required String tipo,
    required String icono,
    required String color,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      await _apiService.createCategory(
        nombre: nombre,
        tipo: tipo,
        icono: icono,
        color: color,
      );

      // Recargar categorías después de crear
      await loadCategories();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Cargar todas las categorías
  Future<void> loadCategories() async {
    try {
      _setLoading(true);
      _setError(null);

      final categoriesData = await _apiService.getCategories();

      _categories = categoriesData
          .map((data) => CategoryModel.Category.fromJson(data))
          .toList();

      // Separar por tipo
      _incomeCategories = _categories
          .where((cat) => cat.tipo == 'ingreso')
          .toList();

      _expenseCategories = _categories
          .where((cat) => cat.tipo == 'gasto')
          .toList();
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  // Cargar categorías por tipo
  Future<void> loadCategoriesByType(String tipo) async {
    try {
      _setLoading(true);
      _setError(null);

      final categoriesData = await _apiService.getCategories(tipo: tipo);

      final categories = categoriesData
          .map((data) => CategoryModel.Category.fromJson(data))
          .toList();

      if (tipo == 'ingreso') {
        _incomeCategories = categories;
      } else {
        _expenseCategories = categories;
      }
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  // Obtener categoría por ID
  Future<CategoryModel.Category?> getCategoryById(String id) async {
    try {
      _setLoading(true);
      _setError(null);

      final categoryData = await _apiService.getCategoryById(id);
      return CategoryModel.Category.fromJson(categoryData);
    } catch (e) {
      _setError(e.toString());
      return null;
    } finally {
      _setLoading(false);
    }
  }

  // Actualizar categoría
  Future<bool> updateCategory({
    required String id,
    String? nombre,
    String? tipo,
    String? icono,
    String? color,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      await _apiService.updateCategory(
        id: id,
        nombre: nombre,
        tipo: tipo,
        icono: icono,
        color: color,
      );

      // Recargar categorías después de actualizar
      await loadCategories();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Eliminar categoría
  Future<bool> deleteCategory(String id) async {
    try {
      _setLoading(true);
      _setError(null);

      await _apiService.deleteCategory(id);

      // Recargar categorías después de eliminar
      await loadCategories();
      return true;
    } catch (e) {
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Cargar estadísticas de categorías
  Future<void> loadStats() async {
    try {
      _setLoading(true);
      _setError(null);

      _stats = await _apiService.getCategoryStats();
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  // Buscar categorías por nombre
  List<CategoryModel.Category> searchCategories(String query) {
    if (query.isEmpty) return _categories;

    return _categories
        .where(
          (category) =>
              category.nombre.toLowerCase().contains(query.toLowerCase()),
        )
        .toList();
  }

  // Obtener categorías por tipo específico
  List<CategoryModel.Category> getCategoriesByType(
    CategoryModel.CategoryType type,
  ) {
    return type == CategoryModel.CategoryType.ingreso
        ? _incomeCategories
        : _expenseCategories;
  }

  // Verificar si existe una categoría con el mismo nombre y tipo
  bool categoryExists(String nombre, String tipo, {String? excludeId}) {
    return _categories.any(
      (category) =>
          category.nombre.toLowerCase() == nombre.toLowerCase() &&
          category.tipo == tipo &&
          category.id != excludeId,
    );
  }

  // Resetear el estado
  void reset() {
    _categories = [];
    _incomeCategories = [];
    _expenseCategories = [];
    _isLoading = false;
    _errorMessage = null;
    _stats = null;
    notifyListeners();
  }
}
