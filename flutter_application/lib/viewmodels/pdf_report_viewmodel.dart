import 'package:flutter/foundation.dart';
import 'dart:io';
import '../models/transaction_model.dart' as TransactionModel;
import '../services/pdf_report_service.dart';

class PDFReportViewModel extends ChangeNotifier {
  bool _isGenerating = false;
  String? _errorMessage;
  Map<String, dynamic>? _lastReport;

  // Getters
  bool get isGenerating => _isGenerating;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get lastReport => _lastReport;

  ///  MÉTODO CORREGIDO QUE USA EL SERVICIO REAL DE PDF CON THREADING
  Future<bool> generateMonthlyPDF({
    required List<TransactionModel.Transaction> transactions,
  }) async {
    try {
      _isGenerating = true;
      _errorMessage = null;
      notifyListeners(); //  OBTENER DIRECTORIO EN HILO PRINCIPAL (antes del compute)
      final downloadDir = Directory(
        '/storage/emulated/0/Download/FinanceReports',
      );
      await downloadDir.create(recursive: true);

      //  LOGS PARA VERIFICAR PROCESO
      print('🚀 Iniciando generación PDF real en hilo separado');
      print('📊 Procesando ${transactions.length} transacciones');
      print('📁 Directorio base: ${downloadDir.path}');
      final startTime = DateTime.now();

      //  USAR compute() PARA EJECUTAR EN HILO SEPARADO
      final result = await compute(_generatePDFInBackground, {
        'transactions': transactions.map((t) => t.toJson()).toList(),
        'timestamp': startTime.millisecondsSinceEpoch,
        'baseDirPath': downloadDir.path, //
      });

      final endTime = DateTime.now();
      final duration = endTime.difference(startTime).inMilliseconds;
      print('⏱️ PDF generado en ${duration}ms en hilo separado');

      if (result['success'] == true) {
        _lastReport = result;
        print('PDF generado y guardado exitosamente: ${result['filePath']}');
        return true;
      } else {
        _errorMessage = result['error'] ?? 'Unknown error occurred';
        print('❌ Error generando PDF: $_errorMessage');
        return false;
      }
    } catch (e) {
      print('💥 Excepción en generación PDF: $e');
      _errorMessage = e.toString();
      return false;
    } finally {
      _isGenerating = false;
      notifyListeners();
      print('🏁 Proceso de generación PDF terminado');
    }
  }

  ///  FUNCIÓN ESTÁTICA QUE SE EJECUTA EN HILO SEPARADO
  static Future<Map<String, dynamic>> _generatePDFInBackground(
    Map<String, dynamic> data,
  ) async {
    try {
      print('🔄 Ejecutando generación PDF REAL en hilo separado');

      final transactionMaps = data['transactions'] as List<dynamic>;
      final baseDirPath = data['baseDirPath'] as String;

      //  CONVERTIR MAPS DE VUELTA A OBJETOS Transaction
      final transactions = transactionMaps
          .map(
            (map) => TransactionModel.Transaction.fromJson(
              map as Map<String, dynamic>,
            ),
          )
          .toList();

      print('📊 Transacciones convertidas: ${transactions.length}');
      print('📁 Directorio base para PDF: $baseDirPath');

      //  LLAMAR AL SERVICIO REAL DE PDF con directorio proporcionado
      final result = await PDFReportService.generateMonthlyPDFReport(
        allTransactions: transactions,
        baseDirPath: baseDirPath,
      );

      print('📋 PDF procesado y guardado en hilo separado');
      return result;
    } catch (e) {
      print('💥 Error en hilo separado: $e');
      return {
        'success': false,
        'error': 'Error en procesamiento paralelo: ${e.toString()}',
      };
    }
  }

  /// Cerrar último reporte (para generar otro)
  void clearLastReport() {
    _lastReport = null;
    notifyListeners();
  }

  /// Limpiar mensaje de error
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  /// Obtener estadísticas del último reporte
  Map<String, dynamic>? get lastReportStatistics {
    return _lastReport?['statistics'];
  }

  /// Verificar si hay un reporte generado
  bool get hasReport => _lastReport != null;

  /// Obtener ruta del último PDF generado
  String? get lastPDFPath => _lastReport?['filePath'];

  /// Obtener tiempo de procesamiento del último reporte
  int? get lastProcessingTime => _lastReport?['processingTime'];

  /// Resetear todo el estado
  void reset() {
    _isGenerating = false;
    _errorMessage = null;
    _lastReport = null;
    notifyListeners();
  }
}
