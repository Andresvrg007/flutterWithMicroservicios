// views/transactions_view.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../viewmodels/transaction_viewmodel.dart';
import '../models/transaction_model.dart' as TransactionModel;
import 'transaction_form_view.dart';
import 'package:intl/intl.dart';

class TransactionsView extends StatefulWidget {
  const TransactionsView({Key? key}) : super(key: key);

  @override
  _TransactionsViewState createState() => _TransactionsViewState();
}

class _TransactionsViewState extends State<TransactionsView>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _searchQuery = '';
  final DateFormat _dateFormat = DateFormat('dd/MM/yyyy');
  final NumberFormat _currencyFormat = NumberFormat.currency(
    locale: 'es_CO',
    symbol: '\$',
    decimalDigits: 0,
  );

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    // Cargar transacciones al iniciar
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TransactionViewModel>().loadTransactions();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Transactions'), // ✅ Cambio: 'Transacciones' → 'Transactions'
        backgroundColor: Colors.green[700], // ✅ Cambio: Colors.green → Colors.green[700]
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'All'), // ✅ Cambio: 'Todas' → 'All'
            Tab(text: 'Income'), // ✅ Cambio: 'Ingresos' → 'Income'
            Tab(text: 'Expenses'), // ✅ Cambio: 'Gastos' → 'Expenses'
          ],
        ),
      ),
      body: Column(
        children: [
          // Barra de búsqueda y resumen
          _buildHeaderSection(),

          // Lista de transacciones
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildTransactionList(TransactionFilter.all),
                _buildTransactionList(TransactionFilter.income),
                _buildTransactionList(TransactionFilter.expense),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navigateToForm(context),
        backgroundColor: Colors.green[600], // ✅ Cambio: Colors.green → Colors.green[600]
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }

  Widget _buildHeaderSection() {
    return Consumer<TransactionViewModel>(
      builder: (context, viewModel, child) {
        return Container(
          decoration: BoxDecoration( // ✅ Agregar gradiente verde
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.green[700]!,
                Colors.green[50]!,
              ],
            ),
          ),
          child: Column(
            children: [
              // Resumen de balance
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Expanded(
                      child: _buildSummaryCard(
                        'Income', // ✅ Cambio: 'Ingresos' → 'Income'
                        viewModel.totalIncome,
                        Colors.green,
                        Icons.arrow_upward,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildSummaryCard(
                        'Expenses', // ✅ Cambio: 'Gastos' → 'Expenses'
                        viewModel.totalExpenses,
                        Colors.red,
                        Icons.arrow_downward,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildSummaryCard(
                        'Balance',
                        viewModel.balance,
                        viewModel.balance >= 0 ? Colors.green : Colors.red,
                        Icons.account_balance_wallet,
                      ),
                    ),
                  ],
                ),
              ),

              // Barra de búsqueda
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: TextField(
                  decoration: InputDecoration(
                    hintText: 'Search transactions...', // ✅ Cambio: 'Buscar transacciones...' → 'Search transactions...'
                    prefixIcon: Icon(Icons.search, color: Colors.green[600]), // ✅ Agregar color verde
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    focusedBorder: OutlineInputBorder( // ✅ Agregar borde verde cuando enfocado
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide(color: Colors.green[600]!, width: 2),
                    ),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  onChanged: (value) {
                    setState(() {
                      _searchQuery = value;
                    });
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildSummaryCard(
    String title,
    double amount,
    Color color,
    IconData icon,
  ) {
    return Card(
      elevation: 4, // ✅ Aumentar elevación
      shape: RoundedRectangleBorder( // ✅ Agregar bordes redondeados
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(
              title,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 4),
            Text(
              _currencyFormat.format(amount),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTransactionList(TransactionFilter filter) {
    return Consumer<TransactionViewModel>(
      builder: (context, viewModel, child) {
        if (viewModel.isLoading) {
          return Center(
            child: CircularProgressIndicator(
              color: Colors.green[600], // ✅ Cambio: color por defecto → verde
            ),
          );
        }

        if (viewModel.errorMessage != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error, size: 64, color: Colors.red[300]),
                const SizedBox(height: 16),
                Text(
                  'Error: ${viewModel.errorMessage}',
                  style: const TextStyle(fontSize: 16),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => viewModel.loadTransactions(),
                  style: ElevatedButton.styleFrom( // ✅ Agregar estilo verde
                    backgroundColor: Colors.green[600],
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Try Again'), // ✅ Cambio: 'Reintentar' → 'Try Again'
                ),
              ],
            ),
          );
        }

        // Obtener transacciones según el filtro
        List<TransactionModel.Transaction> transactions =
            _getFilteredTransactions(viewModel, filter);

        // Aplicar búsqueda
        if (_searchQuery.isNotEmpty) {
          transactions = transactions
              .where(
                (transaction) =>
                    transaction.description.toLowerCase().contains(
                      _searchQuery.toLowerCase(),
                    ) ||
                    transaction.category.toLowerCase().contains(
                      _searchQuery.toLowerCase(),
                    ),
              )
              .toList();
        }

        if (transactions.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.receipt, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  _searchQuery.isNotEmpty
                      ? 'No transactions found' // ✅ Cambio: 'No se encontraron transacciones' → 'No transactions found'
                      : 'No transactions yet', // ✅ Cambio: 'No hay transacciones aún' → 'No transactions yet'
                  style: const TextStyle(fontSize: 16),
                ),
                if (_searchQuery.isEmpty) ...[
                  const SizedBox(height: 8),
                  const Text(
                    'Tap the + button to create one', // ✅ Cambio: 'Toca el botón + para crear una' → 'Tap the + button to create one'
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ],
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => viewModel.loadTransactions(),
          color: Colors.green[600], // ✅ Agregar color verde al indicador
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: transactions.length,
            itemBuilder: (context, index) {
              final transaction = transactions[index];
              return _buildTransactionCard(context, transaction, viewModel);
            },
          ),
        ); // ✅ FALTABA ESTE PARÉNTESIS Y PUNTO Y COMA
      },
    );
  }

  List<TransactionModel.Transaction> _getFilteredTransactions(
    TransactionViewModel viewModel,
    TransactionFilter filter,
  ) {
    switch (filter) {
      case TransactionFilter.all:
        return viewModel.transactions;
      case TransactionFilter.income:
        return viewModel.incomeTransactions;
      case TransactionFilter.expense:
        return viewModel.expenseTransactions;
    }
  }

  Widget _buildTransactionCard(
    BuildContext context,
    TransactionModel.Transaction transaction,
    TransactionViewModel viewModel,
  ) {
    final isIncome = transaction.tipo == TransactionModel.TransactionType.ingreso.value;
    final color = isIncome ? Colors.green : Colors.red;
    final icon = isIncome ? Icons.arrow_upward : Icons.arrow_downward;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12.0), // ✅ Reducido de 16 a 12
        child: Row(
          children: [
            // ✅ Icono más compacto
            Container(
              width: 40, // ✅ Reducido de 48 a 40
              height: 40, // ✅ Reducido de 48 a 40
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 20), // ✅ Reducido de 24 a 20
            ),
            
            const SizedBox(width: 12),
            
            // ✅ Información de la transacción - más compacta
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min, // ✅ IMPORTANTE: Tamaño mínimo
                children: [
                  Text(
                    transaction.description,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14, // ✅ Reducido de 16 a 14
                    ),
                    maxLines: 1, // ✅ IMPORTANTE: Solo 1 línea
                    overflow: TextOverflow.ellipsis,
                  ),
                  
                  const SizedBox(height: 2), // ✅ Reducido de 4 a 2
                  
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          transaction.category,
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 12, // ✅ Reducido de 14 a 12
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      
                      const SizedBox(width: 8),
                      
                      Text(
                        _dateFormat.format(transaction.fecha),
                        style: TextStyle(
                          color: Colors.grey[500],
                          fontSize: 11, // ✅ Reducido de 12 a 11
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            
            const SizedBox(width: 8),
            
            // ✅ Monto y menú - más compacto
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min, // ✅ IMPORTANTE: Tamaño mínimo
              children: [
                Text(
                  '${isIncome ? '+' : '-'}${_currencyFormat.format(transaction.amount)}',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: color,
                    fontSize: 14, // ✅ Reducido de 16 a 14
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                
                // ✅ Menú más pequeño
                SizedBox(
                  height: 24, // ✅ Altura fija pequeña
                  width: 24,  // ✅ Ancho fijo pequeño
                  child: PopupMenuButton<String>(
                    padding: EdgeInsets.zero, // ✅ Sin padding
                    iconSize: 16, // ✅ Icono más pequeño
                    onSelected: (value) => _handleMenuAction(context, value, transaction, viewModel),
                    itemBuilder: (context) => [
                      PopupMenuItem(
                        value: 'edit',
                        height: 36, // ✅ Altura reducida
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.edit, color: Colors.green[600], size: 16),
                            const SizedBox(width: 8),
                            const Text('Edit', style: TextStyle(fontSize: 12)),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'delete',
                        height: 36, // ✅ Altura reducida
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.delete, color: Colors.red, size: 16),
                            const SizedBox(width: 8),
                            const Text(
                              'Delete',
                              style: TextStyle(color: Colors.red, fontSize: 12),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _handleMenuAction(
    BuildContext context,
    String action,
    TransactionModel.Transaction transaction,
    TransactionViewModel viewModel,
  ) {
    switch (action) {
      case 'edit':
        _navigateToForm(context, transaction: transaction);
        break;
      case 'delete':
        _showDeleteDialog(context, transaction, viewModel);
        break;
    }
  }

  void _showDeleteDialog(
    BuildContext context,
    TransactionModel.Transaction transaction,
    TransactionViewModel viewModel,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Transaction'), // ✅ Cambio: 'Eliminar transacción' → 'Delete Transaction'
        content: Text(
          'Are you sure you want to delete "${transaction.description}"?', // ✅ Cambio: '¿Estás seguro...' → 'Are you sure...'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'), // ✅ Cambio: 'Cancelar' → 'Cancel'
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              final success = await viewModel.deleteTransaction(
                transaction.id!,
              );
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Transaction deleted successfully'), // ✅ Cambio: 'Transacción eliminada exitosamente' → 'Transaction deleted successfully'
                    backgroundColor: Colors.green,
                  ),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text(
              'Delete', // ✅ Cambio: 'Eliminar' → 'Delete'
              style: TextStyle(color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }

  void _navigateToForm(
    BuildContext context, {
    TransactionModel.Transaction? transaction,
  }) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => TransactionFormView(transaction: transaction),
      ),
    );
  }
}

enum TransactionFilter { all, income, expense }
