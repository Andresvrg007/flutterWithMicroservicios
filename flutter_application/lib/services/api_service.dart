import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user_model.dart';

class ApiService {
  // URL base de la API
  static const String baseUrl = 'http://10.0.0.28:8080/api';

  // Headers comunes para todas las peticiones
  Map<String, String> get _headers => {'Content-Type': 'application/json'};

  // Headers con token de autenticación
  Future<Map<String, String>> get _authHeaders async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }

  // Obtener token guardado localmente
  Future<String?> _getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('auth_token');
  }

  // Guardar token localmente
  Future<void> _saveToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  // Eliminar token (logout)
  Future<void> _removeToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  // ==================== AUTH ENDPOINTS ====================

  // Login de usuario
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: _headers,
        body: jsonEncode({'email': email, 'password': password}),
      );

      // Intenta decodificar la respuesta, pero si falla, lanza error genérico
      Map<String, dynamic> data;
      try {
        data = jsonDecode(response.body);
      } catch (_) {
        throw Exception('Respuesta inesperada del servidor: ${response.body}');
      }

      if (response.statusCode == 200) {
        if (data['token'] != null) {
          await _saveToken(data['token']);
        }
        return data;
      } else {
        // Manejar error: si data es String, conviértelo a Map
        if (data is String) {
          throw Exception(data);
        } else if (data.containsKey('message')) {
          throw Exception(data['message']);
        } else {
          throw Exception('Error en login');
        }
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  // Registro de usuario
  Future<Map<String, dynamic>> register(
    String name,
    String email,
    String password,
  ) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/register'),
        headers: _headers,
        body: jsonEncode({
          'username': name,
          'email': email,
          'password': password,
        }),
      );

      Map<String, dynamic> data;
      try {
        data = jsonDecode(response.body);
      } catch (_) {
        throw Exception('Respuesta inesperada del servidor');
      }

      if (response.statusCode == 201) {
        return data;
      } else {
        throw Exception(data['message'] ?? 'Error en registro');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  // Logout
  Future<void> logout() async {
    try {
      await http.post(
        Uri.parse('$baseUrl/auth/logout'),
        headers: await _authHeaders,
      );
      // Eliminar token local independientemente de la respuesta
      await _removeToken();
    } catch (e) {
      // Eliminar token local aunque falle la petición
      await _removeToken();
    }
  }

  // ==================== USER ENDPOINTS ====================

  // Obtener perfil de usuario
  Future<UserModel> getUserProfile() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/profile'),
        headers: await _authHeaders,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return UserModel.fromJson(data);
      } else {
        throw Exception('Error al obtener perfil');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  // ==================== CATEGORY ENDPOINTS ====================

  // Crear nueva categoría
  Future<Map<String, dynamic>> createCategory({
    required String nombre,
    required String tipo,
    required String icono,
    required String color,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/categories'),
        headers: await _authHeaders,
        body: jsonEncode({
          'nombre': nombre,
          'tipo': tipo,
          'icono': icono,
          'color': color,
        }),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 201) {
        return data;
      } else {
        throw Exception(data['message'] ?? 'Error creating category');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // Método para obtener categorías
  Future<List<Map<String, dynamic>>> getCategories({String? tipo}) async {
    try {
      final token = await _getToken();

      if (token == null || token.isEmpty) {
        throw Exception('No active session. Please log in again.');
      }

      final headers = await _authHeaders;

      String url = '$baseUrl/categories';
      if (tipo != null) {
        url += '?tipo=$tipo';
      }

      final response = await http.get(Uri.parse(url), headers: headers);

      if (response.statusCode == 401) {
        // Token expired or invalid
        await _removeToken();
        throw Exception('Session expired. Please log in again.');
      }

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['success']) {
          return List<Map<String, dynamic>>.from(data['data']);
        } else {
          throw Exception(data['message']);
        }
      } else {
        throw Exception('Server error: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // Obtener categoría por ID
  Future<Map<String, dynamic>> getCategoryById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/categories/$id'),
        headers: await _authHeaders,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'];
      } else {
        throw Exception('Error al obtener categoría');
      }
    } catch (e) {
      throw Exception('Error de conexión: $e');
    }
  }

  // Actualizar categoría
  Future<Map<String, dynamic>> updateCategory({
    required String id,
    String? nombre,
    String? tipo,
    String? icono,
    String? color,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (nombre != null) body['nombre'] = nombre;
      if (tipo != null) body['tipo'] = tipo;
      if (icono != null) body['icono'] = icono;
      if (color != null) body['color'] = color;

      final response = await http.put(
        Uri.parse('$baseUrl/categories/$id'),
        headers: await _authHeaders,
        body: jsonEncode(body),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return data;
      } else {
        throw Exception(data['message'] ?? 'Error updating category');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // Eliminar categoría
  Future<void> deleteCategory(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/categories/$id'),
        headers: await _authHeaders,
      );

      if (response.statusCode != 200) {
        final data = jsonDecode(response.body);
        throw Exception(data['message'] ?? 'Error deleting category');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // Obtener estadísticas de categorías
  Future<Map<String, dynamic>> getCategoryStats() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/categories/stats'),
        headers: await _authHeaders,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['data'];
      } else {
        throw Exception('Error getting statistics');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // ==================== TRANSACTION ENDPOINTS ====================

  // Crear nueva transacción
  Future<Map<String, dynamic>> createTransaction({
    required double amount,
    required String description,
    required String category, // Este debe ser String
    String? categoryId,
    required String type, // 'income' o 'expense'
    String metodoPago = 'efectivo',
  }) async {
    try {
      // ✅ Debugging detallado
      print('🔄 ApiService.createTransaction called with:');
      print('  amount: $amount (${amount.runtimeType})');
      print('  description: $description (${description.runtimeType})');
      print('  category: $category (${category.runtimeType})');
      print('  categoryId: $categoryId (${categoryId.runtimeType})');
      print('  type: $type (${type.runtimeType})');
      print('  metodoPago: $metodoPago (${metodoPago.runtimeType})');

      final requestBody = {
        'amount': amount,
        'description': description,
        'category': category,
        'type': type,
        'metodoPago': metodoPago,
      };

      // Solo agregar categoryId si no es null
      if (categoryId != null) {
        requestBody['categoryId'] = categoryId;
      }

      print('📤 Sending request body: $requestBody');

      final response = await http.post(
        Uri.parse('$baseUrl/transactions'),
        headers: await _authHeaders,
        body: jsonEncode(requestBody),
      );

      print('📥 Response status: ${response.statusCode}');
      print('📥 Response body: ${response.body}');

      final data = jsonDecode(response.body);

      if (response.statusCode == 201) {
        print('✅ Transaction created successfully');
        return data;
      } else {
        print('❌ Error response: $data');
        throw Exception(
          data['error'] ?? data['message'] ?? 'Error creating transaction',
        );
      }
    } catch (e) {
      print('❌ Exception in createTransaction: $e');
      throw Exception('Connection error: $e');
    }
  }

  // Obtener todas las transacciones
  Future<List<Map<String, dynamic>>> getTransactions() async {
    try {
      print('🔄 ApiService.getTransactions called');

      final token = await _getToken();
      print(
        '🔑 Token: ${token?.substring(0, 20)}...',
      ); // Solo primeros 20 caracteres

      if (token == null || token.isEmpty) {
        print('❌ No token found');
        throw Exception('No active session. Please log in again.');
      }

      print('📤 Making GET request to: $baseUrl/transactions');

      final response = await http.get(
        Uri.parse('$baseUrl/transactions'),
        headers: await _authHeaders,
      );

      print('📥 Response status: ${response.statusCode}');
      print('📥 Response headers: ${response.headers}');
      print('📥 Response body: ${response.body}');

      if (response.statusCode == 401) {
        print('🔒 Token expired, removing...');
        await _removeToken();
        throw Exception('Session expired. Please log in again.');
      }

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('📋 Parsed data keys: ${data.keys.toList()}');
        print('📋 Full data structure: $data');

        // Manejo de ambas estructuras de respuesta
        if (data['success'] == true && data['data'] != null) {
          print('✅ Using new controller structure');
          final transactions = data['data']['transactions'] ?? [];
          print('📊 Found ${transactions.length} transactions');
          return List<Map<String, dynamic>>.from(transactions);
        } else if (data['transactions'] != null) {
          print('✅ Using old controller structure');
          final transactions = data['transactions'];
          print('📊 Found ${transactions.length} transactions');
          return List<Map<String, dynamic>>.from(transactions);
        } else {
          print('⚠️ No transactions found in response');
          return [];
        }
      } else {
        print('❌ Error response: ${response.body}');
        final errorData = jsonDecode(response.body);
        throw Exception(errorData['message'] ?? 'Error getting transactions');
      }
    } catch (e) {
      print('❌ Exception in getTransactions: $e');
      print('❌ Exception type: ${e.runtimeType}');
      throw Exception('Connection error: $e');
    }
  }

  // Actualizar transacción
  Future<void> updateTransaction({
    required String id,
    required double amount,
    required String description,
    required String category,
    required String type,
  }) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/transactions/$id'),
        headers: await _authHeaders,
        body: jsonEncode({
          'amount': amount,
          'description': description,
          'category': category,
          'type': type,
        }),
      );

      if (response.statusCode != 200) {
        final data = jsonDecode(response.body);
        throw Exception(data['error'] ?? 'Error updating transaction');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // Eliminar transacción
  Future<void> deleteTransaction(String id) async {
    try {
      final response = await http.delete(
        Uri.parse('$baseUrl/transactions/$id'),
        headers: await _authHeaders,
      );

      if (response.statusCode != 200) {
        final data = jsonDecode(response.body);
        throw Exception(data['error'] ?? 'Error deleting transaction');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // Obtener resumen de transacciones
  Future<Map<String, dynamic>> getTransactionsSummary() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/transactions-summary'),
        headers: await _authHeaders,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data;
      } else {
        throw Exception('Error getting summary');
      }
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // Verificar si hay token válido (para auto-login)
  Future<bool> hasValidToken() async {
    final token = await _getToken();
    if (token == null) return false;

    try {
      // Intentar obtener perfil para verificar si token es válido
      await getUserProfile();
      return true;
    } catch (e) {
      // Si falla, eliminar token inválido
      await _removeToken();
      return false;
    }
  }
}
