class UserModel {
  final String id;
  final String email; // Email del usuario
  final String? name; // Nombre del usuario (opcional)
  final double? salary; // Salario mensual del usuario

  UserModel({required this.id, required this.email, this.name, this.salary});

  // Convertir desde JSON (respuesta del backend)
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'],
      email: json['email'],
      name: json['name'],
      salary: json['salary']?.toDouble(),
    );
  }

  // Convertir a JSON (para enviar al backend)
  Map<String, dynamic> toJson() {
    return {'id': id, 'email': email, 'name': name, 'salary': salary};
  }
}
