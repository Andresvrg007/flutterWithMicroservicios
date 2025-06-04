import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/api_service.dart';

class AuthViewModel extends ChangeNotifier {
  final ApiService _apiService = ApiService();

  bool _isLoading = false;
  String? _errorMessage;
  bool _isLoggedIn = false;
  String? _userEmail;

  // Getters
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isLoggedIn => _isLoggedIn;
  String? get userEmail => _userEmail;

  // Setters privados
  void setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void clearErrorMessage() {
    _errorMessage = null;
    notifyListeners();
  }

  // Verificar estado de autenticación al iniciar
  Future<void> checkAuthStatus() async {
    // Implementar verificación de token si es necesario
    notifyListeners();
  }

  // Login
  Future<bool> login(String email, String password) async {
    try {
      setLoading(true);
      clearError();

      final response = await _apiService.login(email, password);

      if (response['success'] == true) {
        _isLoggedIn = true;
        _userEmail = email;
        return true;
      } else {
        setError(response['message'] ?? 'Login failed');
        return false;
      }
    } catch (e) {
      setError('Login error: ${e.toString()}');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Register
  Future<bool> register(String name, String email, String password) async {
    try {
      setLoading(true);
      clearError();

      final response = await _apiService.register(name, email, password);

      //  DETECTAR ÉXITO CORRECTAMENTE - CUALQUIER RESPUESTA QUE INDIQUE REGISTRO EXITOSO
      final message = response['message']?.toString().toLowerCase() ?? '';
      final isSuccess =
          response['success'] == true ||
          message.contains('registrado') ||
          message.contains('exitoso') ||
          message.contains('successfully') ||
          message.contains('created') ||
          response.containsKey('user') ||
          (response.containsKey('message') && !response.containsKey('error'));

      if (isSuccess) {
        clearError();

        await Future.delayed(const Duration(milliseconds: 100));

        final loginSuccess = await login(email, password);
        if (loginSuccess) {
          return true;
        } else {
          // Si auto-login falla, aún considerarlo éxito de registro
          return true;
        }
      } else {
        //  SOLO ES ERROR SI REALMENTE HAY UN ERROR
        final errorMsg =
            response['error'] ?? response['message'] ?? 'Registration failed';
        setError(errorMsg);
        return false;
      }
    } catch (e) {
      setError('Registration error: ${e.toString()}');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Logout
  Future<void> logout() async {
    await _apiService.logout();
    _isLoggedIn = false;
    _userEmail = null;
    clearError();
    notifyListeners();
  }

  //  AGREGAR ESTE MÉTODO - Forgot Password
  Future<bool> forgotPassword(String email, String newPassword) async {
    try {
      setLoading(true);
      clearError();

      // Hacer petición HTTP directa al backend
      final response = await http.post(
        Uri.parse('http://10.0.2.23:5000/api/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'newPassword': newPassword}),
      );

      final data = jsonDecode(response.body);

      if (response.statusCode == 200) {
        return true;
      } else {
        setError(data['error'] ?? 'Failed to reset password');
        return false;
      }
    } catch (e) {
      setError('Network error: ${e.toString()}');
      return false;
    } finally {
      setLoading(false);
    }
  }
}
