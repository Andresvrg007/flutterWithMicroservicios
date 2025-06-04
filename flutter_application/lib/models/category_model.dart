// models/category_model.dart
class Category {
  final String? id;
  final String nombre;
  final String tipo; // 'ingreso' or 'gasto'
  final String icono;
  final String color;
  final String userId;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Category({
    this.id,
    required this.nombre,
    required this.tipo,
    required this.icono,
    required this.color,
    required this.userId,
    this.createdAt,
    this.updatedAt,
  });

  // Factory constructor to create Category from JSON
  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['_id'] ?? json['id'],
      nombre: json['nombre'] ?? '',
      tipo: json['tipo'] ?? '',
      icono: json['icono'] ?? '',
      color: json['color'] ?? '',
      userId: json['userId'] ?? '',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'])
          : null,
    );
  }

  // Method to convert Category to JSON
  Map<String, dynamic> toJson() {
    return {
      'nombre': nombre,
      'tipo': tipo,
      'icono': icono,
      'color': color,
      'userId': userId,
    };
  }

  // Method to create a copy with updated fields
  Category copyWith({
    String? id,
    String? nombre,
    String? tipo,
    String? icono,
    String? color,
    String? userId,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Category(
      id: id ?? this.id,
      nombre: nombre ?? this.nombre,
      tipo: tipo ?? this.tipo,
      icono: icono ?? this.icono,
      color: color ?? this.color,
      userId: userId ?? this.userId,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'Category(id: $id, nombre: $nombre, tipo: $tipo, icono: $icono, color: $color)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Category &&
        other.id == id &&
        other.nombre == nombre &&
        other.tipo == tipo &&
        other.icono == icono &&
        other.color == color;
  }

  @override
  int get hashCode {
    return id.hashCode ^
        nombre.hashCode ^
        tipo.hashCode ^
        icono.hashCode ^
        color.hashCode;
  }
}

// Enum for category types
enum CategoryType { ingreso, gasto }

extension CategoryTypeExtension on CategoryType {
  String get value {
    switch (this) {
      case CategoryType.ingreso:
        return 'ingreso';
      case CategoryType.gasto:
        return 'gasto';
    }
  }

  String get displayName {
    switch (this) {
      case CategoryType.ingreso:
        return 'Ingreso';
      case CategoryType.gasto:
        return 'Gasto';
    }
  }
}
