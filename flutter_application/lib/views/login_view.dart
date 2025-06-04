import 'package:flutter/material.dart';
import 'package:provider/provider.dart'; // Para usar Provider
import '../viewmodels/auth_viewmodel.dart'; // ViewModel de autenticación

// Vista del Login - Pantalla de inicio de sesión
class LoginView extends StatefulWidget {
  const LoginView({super.key});

  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  // Controladores para los campos de texto
  final TextEditingController _emailController =
      TextEditingController(); // Cambio a email
  final TextEditingController _passwordController = TextEditingController();

  // Clave para el formulario (para validaciones)
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();

  // Variable para mostrar/ocultar contraseña
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    // Inicializar AuthViewModel cuando se carga la pantalla
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthViewModel>().checkAuthStatus();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthViewModel>(
      builder: (context, authViewModel, child) {
        // Si el usuario ya está logueado, navegar al dashboard
        if (authViewModel.isLoggedIn) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _navigateToDashboard();
          });
        }

        return Scaffold(
          // Fondo con gradiente
          body: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Color(0xFF4CAF50), // Verde claro
                  Color(0xFF2E7D32), // Verde oscuro
                ],
              ),
            ),
            child: SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Logo o icono de la app
                      Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(50),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.1),
                              blurRadius: 10,
                              offset: const Offset(0, 5),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.account_balance_wallet,
                          size: 60,
                          color: Color(0xFF4CAF50),
                        ),
                      ),

                      const SizedBox(height: 30),

                      // Título
                      const Text(
                        'Expense App',
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),

                      const SizedBox(height: 8),

                      // Subtítulo
                      const Text(
                        'Manage your expenses easily',
                        style: TextStyle(fontSize: 16, color: Colors.white70),
                      ),

                      const SizedBox(height: 40),

                      // Tarjeta del formulario
                      Card(
                        elevation: 8,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              children: [
                                // Campo de Email (cambio de Username a Email)
                                TextFormField(
                                  controller: _emailController,
                                  keyboardType: TextInputType
                                      .emailAddress, // Teclado para email
                                  decoration: InputDecoration(
                                    labelText: 'Email',
                                    hintText: 'Enter your email',
                                    prefixIcon: const Icon(
                                      Icons.email,
                                    ), // Cambio de icono
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    filled: true,
                                    fillColor: Colors.grey[50],
                                  ),
                                  validator: (value) {
                                    // Validación de email
                                    if (value == null || value.isEmpty) {
                                      return 'Please enter your email';
                                    }
                                    // Validación básica de formato de email
                                    if (!value.contains('@') ||
                                        !value.contains('.')) {
                                      return 'Please enter a valid email';
                                    }
                                    return null;
                                  },
                                ),

                                const SizedBox(height: 20),

                                // Campo de Password
                                TextFormField(
                                  controller: _passwordController,
                                  obscureText: _obscurePassword,
                                  decoration: InputDecoration(
                                    labelText: 'Password',
                                    hintText: 'Enter your password',
                                    prefixIcon: const Icon(Icons.lock),
                                    suffixIcon: IconButton(
                                      icon: Icon(
                                        _obscurePassword
                                            ? Icons.visibility
                                            : Icons.visibility_off,
                                      ),
                                      onPressed: () {
                                        setState(() {
                                          _obscurePassword = !_obscurePassword;
                                        });
                                      },
                                    ),
                                    border: OutlineInputBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    filled: true,
                                    fillColor: Colors.grey[50],
                                  ),
                                  validator: (value) {
                                    // Validación básica - después agregaremos más lógica
                                    if (value == null || value.isEmpty) {
                                      return 'Please enter your password';
                                    }
                                    if (value.length < 5) {
                                      return 'Password must be at least 5 characters';
                                    }
                                    return null;
                                  },
                                ),

                                const SizedBox(height: 24),
                                // Botón de Login
                                SizedBox(
                                  width: double.infinity,
                                  height: 50,
                                  child: ElevatedButton(
                                    onPressed: authViewModel.isLoading
                                        ? null
                                        : () {
                                            // Validar formulario y hacer login
                                            if (_formKey.currentState!
                                                .validate()) {
                                              _handleLogin(authViewModel);
                                            }
                                          },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF4CAF50),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      elevation: 2,
                                    ),
                                    child: authViewModel.isLoading
                                        ? const SizedBox(
                                            height: 20,
                                            width: 20,
                                            child: CircularProgressIndicator(
                                              color: Colors.white,
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : const Text(
                                            'Login',
                                            style: TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                  ),
                                ),

                                const SizedBox(height: 16),

                                // Enlace para "Forgot Password"
                                TextButton(
                                  onPressed: () {
                                    // Aquí irá la lógica para recuperar contraseña
                                    _showForgotPasswordDialog();
                                  },
                                  child: const Text(
                                    'Forgot Password?',
                                    style: TextStyle(
                                      color: Color(0xFF4CAF50),
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                      const SizedBox(height: 24),

                      // Enlace para crear cuenta
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text(
                            "Don't have an account? ",
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 16,
                            ),
                          ),
                          TextButton(
                            onPressed: () {
                              // Aquí irá la navegación a la pantalla de registro
                              _navigateToRegister();
                            },
                            child: const Text(
                              'Sign Up',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // Función para manejar el login
  void _handleLogin(AuthViewModel authViewModel) async {
    try {
      final success = await authViewModel.login(
        _emailController.text.trim(),
        _passwordController.text,
      );

      if (success && mounted) {
        // El login fue exitoso, navegar al dashboard
        _navigateToDashboard();
      } else if (mounted) {
        // Mostrar error si el login falló
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authViewModel.errorMessage ?? 'Login failed'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  // Función para navegar al dashboard
  void _navigateToDashboard() {
    Navigator.pushReplacementNamed(context, '/dashboard');
  }

  // Función temporal para "Forgot Password"
  void _showForgotPasswordDialog() {
    Navigator.pushNamed(context, '/forgot-password');
  }

  // Función para navegación a registro
  void _navigateToRegister() {
    Navigator.pushNamed(context, '/register');
  }

  // Limpiar controladores cuando se destruye el widget
  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
