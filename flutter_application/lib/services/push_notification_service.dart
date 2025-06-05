import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class PushNotificationService {
  // URL del notification service - 10.0.2.2 para emulador Android
  static const String notificationBaseUrl = 'http://10.0.2.2:8082';
  
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

  // Generar un device token simulado
  String _generateDeviceToken() {
    final random = Random();
    return 'flutter-device-token-${random.nextInt(999999)}';
  }

  // Generar un device ID simulado
  String _generateDeviceId() {
    final random = Random();
    return 'Flutter-Emulator-${random.nextInt(9999)}';
  }

  // Registrar dispositivo para notificaciones push
  Future<Map<String, dynamic>> registerDevice() async {
    try {
      final headers = await _authHeaders;
      final deviceData = {
        'token': _generateDeviceToken(),
        'platform': 'android', // Emulador Android
        'deviceId': _generateDeviceId(),
        'appVersion': '1.0.0'
      };

      print('📱 Registrando dispositivo para push notifications...');
      print('Device Data: ${jsonEncode(deviceData)}');

      final response = await http.post(
        Uri.parse('$notificationBaseUrl/api/devices/register'),
        headers: headers,
        body: jsonEncode(deviceData),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        print('✅ Dispositivo registrado exitosamente: ${data['deviceToken']['id']}');
        
        // Guardar device ID localmente
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('device_id', data['deviceToken']['id']);
        
        return data;
      } else {
        print('❌ Error registrando dispositivo: ${response.statusCode}');
        print('Response: ${response.body}');
        throw Exception('Failed to register device: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Exception registrando dispositivo: $e');
      throw Exception('Failed to register device: $e');
    }
  }

  // Enviar notificación de prueba
  Future<Map<String, dynamic>> sendTestNotification(String userId) async {
    try {
      final headers = await _authHeaders;
      final notificationData = {
        'type': 'transactionAlerts',
        'title': '📱 Test desde Flutter',
        'message': 'Esta es una notificación push de prueba enviada desde la app Flutter.',
        'channels': ['push', 'websocket'],
        'recipients': [userId],
        'data': {
          'source': 'flutter_app',
          'testId': Random().nextInt(9999),
          'timestamp': DateTime.now().toIso8601String(),
        },
        'priority': 'normal'
      };

      print('🔔 Enviando notificación de prueba...');
      print('Notification Data: ${jsonEncode(notificationData)}');

      final response = await http.post(
        Uri.parse('$notificationBaseUrl/api/notifications/send'),
        headers: headers,
        body: jsonEncode(notificationData),
      );

      if (response.statusCode == 200 || response.statusCode == 202) {
        final data = jsonDecode(response.body);
        print('✅ Notificación enviada exitosamente: ${data['jobId']}');
        return data;
      } else {
        print('❌ Error enviando notificación: ${response.statusCode}');
        print('Response: ${response.body}');
        throw Exception('Failed to send notification: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Exception enviando notificación: $e');
      throw Exception('Failed to send notification: $e');
    }
  }

  // Simular notificación cuando se crea transacción
  Future<void> notifyTransactionCreated(Map<String, dynamic> transaction, String userId) async {
    try {
      final headers = await _authHeaders;
      final notificationData = {
        'type': 'transactionAlerts',
        'title': '💰 Transacción Registrada',
        'message': 'Su ${transaction['tipo']} de \$${transaction['amount']} en "${transaction['description']}" ha sido procesada.',
        'channels': ['push', 'websocket'],
        'recipients': [userId],
        'data': {
          'transactionId': transaction['_id'] ?? 'unknown',
          'amount': transaction['amount'],
          'type': transaction['tipo'],
          'category': transaction['category'],
          'description': transaction['description'],
          'timestamp': transaction['fecha'] ?? DateTime.now().toIso8601String(),
          'source': 'flutter_transaction'
        },
        'priority': 'normal'
      };

      print('🔔 Enviando notificación de transacción...');
      
      final response = await http.post(
        Uri.parse('$notificationBaseUrl/api/notifications/send'),
        headers: headers,
        body: jsonEncode(notificationData),
      );

      if (response.statusCode == 200 || response.statusCode == 202) {
        final data = jsonDecode(response.body);
        print('✅ Notificación de transacción enviada: ${data['jobId']}');
      } else {
        print('❌ Error enviando notificación de transacción: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Exception en notificación de transacción: $e');
    }
  }

  // Simular notificación de login
  Future<void> notifyLogin(String userId, String userEmail) async {
    try {
      final headers = await _authHeaders;
      final notificationData = {
        'type': 'securityAlerts',
        'title': '🔐 Nuevo Inicio de Sesión',
        'message': 'Se ha detectado un nuevo inicio de sesión en su cuenta desde la app Flutter.',
        'channels': ['push', 'email'],
        'recipients': [userId],
        'data': {
          'deviceInfo': 'Flutter App - Android Emulator',
          'location': 'Local Development',
          'email': userEmail,
          'timestamp': DateTime.now().toIso8601String(),
          'source': 'flutter_login'
        },
        'priority': 'high'
      };

      print('🔔 Enviando notificación de login...');
      
      final response = await http.post(
        Uri.parse('$notificationBaseUrl/api/notifications/send'),
        headers: headers,
        body: jsonEncode(notificationData),
      );

      if (response.statusCode == 200 || response.statusCode == 202) {
        final data = jsonDecode(response.body);
        print('✅ Notificación de login enviada: ${data['jobId']}');
      } else {
        print('❌ Error enviando notificación de login: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ Exception en notificación de login: $e');
    }
  }
}
