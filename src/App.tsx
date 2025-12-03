import { useState, useEffect } from "react";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { DollarSign, TrendingUp, TrendingDown, Wallet, FileSpreadsheet, Download, Settings, Plus, X, Heart, Upload, Bell, BellOff } from "lucide-react";
import { toast } from "sonner@2.0.3";
import * as XLSX from 'xlsx';
import { InstallPrompt } from "./components/InstallPrompt";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Switch } from "./components/ui/switch";

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category?: string;
  date: string;
  type: 'income' | 'expense';
}

const defaultCategories = [
  "Salud",
  "Gasto Personal", 
  "Pago de Servicios",
  "Otros"
];

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [incomeForm, setIncomeForm] = useState({ amount: "", description: "" });
  const [expenseForm, setExpenseForm] = useState({ 
    amount: "", 
    description: "", 
    category: "" 
  });
  const [activeTab, setActiveTab] = useState("overview");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallButton, setShowInstallButton] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationFrequency, setNotificationFrequency] = useState("daily");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
    
    // Load notification settings from localStorage
    const savedNotificationsEnabled = localStorage.getItem('notifications-enabled');
    const savedNotificationFrequency = localStorage.getItem('notification-frequency');
    
    if (savedNotificationsEnabled) {
      setNotificationsEnabled(savedNotificationsEnabled === 'true');
    }
    if (savedNotificationFrequency) {
      setNotificationFrequency(savedNotificationFrequency);
    }
  }, []);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Las notificaciones no están soportadas en este navegador');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        toast.success('Permisos de notificación concedidos');
        return true;
      } else if (permission === 'denied') {
        toast.error('Permisos de notificación denegados');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Error al solicitar permisos de notificación');
      return false;
    }
    return false;
  };

  // Show a notification
  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Send message to service worker to show notification
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          body
        });
      } else {
        // Fallback to regular notification
        new Notification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          vibrate: [200, 100, 200]
        });
      }
    }
  };

  // Toggle notifications
  const toggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const hasPermission = notificationPermission === 'granted' || await requestNotificationPermission();
      if (hasPermission) {
        setNotificationsEnabled(true);
        localStorage.setItem('notifications-enabled', 'true');
        toast.success('Notificaciones activadas');
        
        // Show test notification
        setTimeout(() => {
          showNotification(
            '¡Recordatorios activados!',
            `Te recordaremos registrar tus gastos ${getFrequencyText(notificationFrequency)}`
          );
        }, 1000);
        
        // Vibrate if supported
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
      } else {
        setNotificationsEnabled(false);
        localStorage.setItem('notifications-enabled', 'false');
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications-enabled', 'false');
      toast.info('Notificaciones desactivadas');
    }
  };

  // Update notification frequency
  const updateNotificationFrequency = (frequency: string) => {
    setNotificationFrequency(frequency);
    localStorage.setItem('notification-frequency', frequency);
    toast.success(`Frecuencia actualizada: ${getFrequencyText(frequency)}`);
    
    if (notificationsEnabled) {
      showNotification(
        'Frecuencia actualizada',
        `Ahora te recordaremos ${getFrequencyText(frequency)}`
      );
    }
  };

  // Get frequency text
  const getFrequencyText = (frequency: string): string => {
    switch (frequency) {
      case 'hourly':
        return 'cada hora';
      case 'daily':
        return 'una vez al día';
      case 'every2days':
        return 'cada 2 días';
      case 'every3days':
        return 'cada 3 días';
      case 'weekly':
        return 'una vez a la semana';
      default:
        return 'periódicamente';
    }
  };

  // Schedule periodic notifications
  useEffect(() => {
    if (!notificationsEnabled || notificationPermission !== 'granted') {
      return;
    }

    const getInterval = (frequency: string): number => {
      switch (frequency) {
        case 'hourly':
          return 60 * 60 * 1000; // 1 hour
        case 'daily':
          return 24 * 60 * 60 * 1000; // 24 hours
        case 'every2days':
          return 2 * 24 * 60 * 60 * 1000; // 2 days
        case 'every3days':
          return 3 * 24 * 60 * 60 * 1000; // 3 days
        case 'weekly':
          return 7 * 24 * 60 * 60 * 1000; // 7 days
        default:
          return 24 * 60 * 60 * 1000; // Default to daily
      }
    };

    const messages = [
      '¿Ya registraste tus gastos de hoy?',
      'Recuerda actualizar tus finanzas',
      '¡No olvides registrar tus ingresos y gastos!',
      'Mantén tu presupuesto al día',
      'Es momento de revisar tus finanzas'
    ];

    const interval = setInterval(() => {
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      showNotification('Recordatorio de Finanzas', randomMessage);
    }, getInterval(notificationFrequency));

    // Cleanup interval on unmount or when settings change
    return () => clearInterval(interval);
  }, [notificationsEnabled, notificationFrequency, notificationPermission]);

  // Detect if app is already installed
  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      setShowInstallButton(false);
      return;
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      // Si hay un prompt nativo disponible, usarlo
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        toast.success('¡Aplicación instalada correctamente!');
        setShowInstallButton(false);
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // Mostrar instrucciones manuales
      const userAgent = navigator.userAgent.toLowerCase();
      let message = "";
      
      if (userAgent.includes('chrome') || userAgent.includes('brave')) {
        message = "En Chrome/Brave: Toca el menú (⋮) → 'Instalar aplicación' o el ícono ⊕ en la barra de direcciones";
      } else if (userAgent.includes('safari')) {
        message = "En Safari: Toca el botón Compartir (⬆️) → 'Agregar a pantalla de inicio'";
      } else if (userAgent.includes('firefox')) {
        message = "En Firefox: Toca el menú (⋮) → 'Instalar'";
      } else {
        message = "Usa el menú de tu navegador y busca la opción 'Instalar aplicación' o 'Agregar a pantalla de inicio'";
      }
      
      toast.info(message, { duration: 6000 });
    }
  };

  // Load categories from localStorage on mount
  useEffect(() => {
    const savedCategories = localStorage.getItem('expense-categories');
    if (savedCategories) {
      setExpenseCategories(JSON.parse(savedCategories));
    } else {
      setExpenseCategories(defaultCategories);
    }
  }, []);

  // Save categories to localStorage whenever they change
  useEffect(() => {
    if (expenseCategories.length > 0) {
      localStorage.setItem('expense-categories', JSON.stringify(expenseCategories));
    }
  }, [expenseCategories]);

  // Load transactions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('financial-transactions');
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  // Save transactions to localStorage whenever transactions change
  useEffect(() => {
    localStorage.setItem('financial-transactions', JSON.stringify(transactions));
  }, [transactions]);

  // Category management functions
  const addCategory = () => {
    if (!newCategory.trim()) {
      toast.error("Por favor ingresa un nombre para la categoría");
      return;
    }
    if (expenseCategories.includes(newCategory.trim())) {
      toast.error("Esta categoría ya existe");
      return;
    }
    setExpenseCategories(prev => [...prev, newCategory.trim()]);
    setNewCategory("");
    toast.success("Categoría agregada correctamente");
  };

  const removeCategory = (category: string) => {
    // Check if category is used in transactions
    const isUsed = transactions.some(t => t.category === category);
    if (isUsed) {
      toast.error("No se puede eliminar una categoría que tiene transacciones asociadas");
      return;
    }
    setExpenseCategories(prev => prev.filter(c => c !== category));
    toast.success("Categoría eliminada correctamente");
  };

  const resetCategories = () => {
    setExpenseCategories(defaultCategories);
    toast.success("Categorías restauradas a valores por defecto");
  };

  const addIncome = () => {
    if (!incomeForm.amount || !incomeForm.description) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    const newIncome: Transaction = {
      id: Date.now().toString(),
      amount: parseFloat(incomeForm.amount),
      description: incomeForm.description,
      date: new Date().toISOString().split('T')[0],
      type: 'income'
    };

    setTransactions(prev => [newIncome, ...prev]);
    setIncomeForm({ amount: "", description: "" });
    toast.success("Ingreso agregado correctamente");
  };

  const addExpense = () => {
    if (!expenseForm.amount || !expenseForm.description || !expenseForm.category) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    const newExpense: Transaction = {
      id: Date.now().toString(),
      amount: parseFloat(expenseForm.amount),
      description: expenseForm.description,
      category: expenseForm.category,
      date: new Date().toISOString().split('T')[0],
      type: 'expense'
    };

    setTransactions(prev => [newExpense, ...prev]);
    setExpenseForm({ amount: "", description: "", category: "" });
    toast.success("Gasto agregado correctamente");
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
    toast.success("Transacción eliminada");
  };

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const balance = totalIncome - totalExpenses;

  // Export to Excel function
  const exportToExcel = () => {
    if (transactions.length === 0) {
      toast.error("No hay transacciones para exportar");
      return;
    }

    // Prepare data for Excel
    const excelData = transactions.map(t => ({
      Fecha: t.date,
      Tipo: t.type === 'income' ? 'Ingreso' : 'Gasto',
      Categoría: t.category || 'N/A',
      Descripción: t.description,
      Monto: t.amount
    }));

    // Add summary at the end
    excelData.push({
      Fecha: '',
      Tipo: '',
      Categoría: '',
      Descripción: 'RESUMEN',
      Monto: ''
    });
    excelData.push({
      Fecha: '',
      Tipo: '',
      Categoría: '',
      Descripción: 'Total Ingresos',
      Monto: totalIncome
    });
    excelData.push({
      Fecha: '',
      Tipo: '',
      Categoría: '',
      Descripción: 'Total Gastos',
      Monto: totalExpenses
    });
    excelData.push({
      Fecha: '',
      Tipo: '',
      Categoría: '',
      Descripción: 'Balance',
      Monto: balance
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transacciones");
    
    // Generate file name with current date
    const fileName = `finanzas_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // Save file
    XLSX.writeFile(wb, fileName);
    
    toast.success("Archivo Excel exportado correctamente");
  };

  // Import from Excel function
  const importFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Process and validate data
        const importedTransactions: Transaction[] = [];
        let validCount = 0;
        let invalidCount = 0;

        jsonData.forEach((row: any) => {
          // Skip summary rows
          if (row.Descripción === 'RESUMEN' || 
              row.Descripción === 'Total Ingresos' || 
              row.Descripción === 'Total Gastos' || 
              row.Descripción === 'Balance') {
            return;
          }

          // Validate required fields
          if (row.Fecha && row.Tipo && row.Descripción && row.Monto) {
            const type = row.Tipo === 'Ingreso' ? 'income' : 'expense';
            const transaction: Transaction = {
              id: Date.now().toString() + Math.random().toString(),
              date: row.Fecha,
              type: type,
              description: row.Descripción,
              amount: parseFloat(row.Monto),
              category: type === 'expense' ? (row.Categoría !== 'N/A' ? row.Categoría : 'Otros') : undefined
            };
            importedTransactions.push(transaction);
            validCount++;
          } else {
            invalidCount++;
          }
        });

        if (importedTransactions.length > 0) {
          setTransactions(prev => [...importedTransactions, ...prev]);
          toast.success(`${validCount} transacciones importadas correctamente${invalidCount > 0 ? ` (${invalidCount} inválidas omitidas)` : ''}`);
        } else {
          toast.error("No se encontraron transacciones válidas en el archivo");
        }
      } catch (error) {
        console.error('Error importing file:', error);
        toast.error("Error al importar el archivo. Verifica que sea un archivo Excel válido.");
      }
    };
    reader.readAsBinaryString(file);
    
    // Reset input
    event.target.value = '';
  };

  // Get expense breakdown by category
  const expensesByCategory = expenseCategories.map(category => {
    const categoryTotal = transactions
      .filter(t => t.type === 'expense' && t.category === category)
      .reduce((sum, t) => sum + t.amount, 0);
    return { category, amount: categoryTotal };
  });

  // Render different screens based on activeTab
  const renderOverviewScreen = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2 py-4">
        <h1 className="flex items-center justify-center gap-2">
          <Wallet className="h-6 w-6" />
          Control Financiero
        </h1>
        <p className="text-muted-foreground text-sm">
          Gestiona tus finanzas personales
        </p>
      </div>

      {/* Install Button */}
      {showInstallButton && !isInstalled && (
        <Button 
          onClick={handleInstallApp} 
          variant="outline"
          size="sm"
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          Instalar App
        </Button>
      )}

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <CardHeader className="text-center">
          <CardTitle className="text-white">Balance Total</CardTitle>
          <div className={`text-3xl font-bold text-white`}>
            ${balance.toLocaleString()}
          </div>
        </CardHeader>
      </Card>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm">Ingresos</CardTitle>
            </div>
            <div className="text-lg font-bold text-green-600">
              ${totalIncome.toLocaleString()}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <CardTitle className="text-sm">Gastos</CardTitle>
            </div>
            <div className="text-lg font-bold text-red-600">
              ${totalExpenses.toLocaleString()}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Categories Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Gastos por Categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {expensesByCategory.map(({ category, amount }) => (
            <div key={category} className="flex justify-between items-center">
              <span className="text-sm">{category}</span>
              <Badge variant={amount > 0 ? "destructive" : "secondary"}>
                ${amount.toLocaleString()}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No hay transacciones
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-start py-2 border-b last:border-b-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={transaction.type === 'income' ? 'secondary' : 'destructive'} className="text-xs">
                        {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </Badge>
                      {transaction.category && (
                        <span className="text-xs text-muted-foreground">{transaction.category}</span>
                      )}
                    </div>
                    <p className="text-sm truncate mt-1">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.date}</p>
                  </div>
                  <div className={`text-sm font-bold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderIncomeScreen = () => (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h2>Agregar Ingreso</h2>
        <p className="text-muted-foreground text-sm">Registra un nuevo ingreso</p>
      </div>
      
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="income-amount">Monto</Label>
            <Input
              id="income-amount"
              type="number"
              placeholder="0.00"
              value={incomeForm.amount}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="income-description">Descripción</Label>
            <Textarea
              id="income-description"
              placeholder="Describe el origen del ingreso..."
              value={incomeForm.description}
              onChange={(e) => setIncomeForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          <Button onClick={addIncome} className="w-full" size="lg">
            <TrendingUp className="mr-2 h-4 w-4" />
            Agregar Ingreso
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderExpenseScreen = () => (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h2>Agregar Gasto</h2>
        <p className="text-muted-foreground text-sm">Registra un nuevo gasto</p>
      </div>
      
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="expense-amount">Monto</Label>
            <Input
              id="expense-amount"
              type="number"
              placeholder="0.00"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
              className="text-lg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-category">Categoría</Label>
            <Select
              value={expenseForm.category}
              onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="expense-description">Descripción</Label>
            <Textarea
              id="expense-description"
              placeholder="Describe el gasto realizado..."
              value={expenseForm.description}
              onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>
          <Button onClick={addExpense} className="w-full" size="lg">
            <TrendingDown className="mr-2 h-4 w-4" />
            Agregar Gasto
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderTransactionsScreen = () => (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h2>Historial</h2>
        <p className="text-muted-foreground text-sm">Todas tus transacciones</p>
      </div>
      
      {/* Export and Import buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          onClick={exportToExcel} 
          className="bg-green-600 hover:bg-green-700"
          size="lg"
          disabled={transactions.length === 0}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar
        </Button>
        
        <div className="relative">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={importFromExcel}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            id="import-excel"
          />
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
            asChild
          >
            <label htmlFor="import-excel" className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </label>
          </Button>
        </div>
      </div>
      
      {transactions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No hay transacciones registradas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={transaction.type === 'income' ? 'secondary' : 'destructive'} className="text-xs">
                        {transaction.type === 'income' ? 'Ingreso' : 'Gasto'}
                      </Badge>
                      {transaction.category && (
                        <span className="text-xs text-muted-foreground">{transaction.category}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">{transaction.date}</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteTransaction(transaction.id)}
                      className="mt-2"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettingsScreen = () => (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h2>Configuración</h2>
        <p className="text-muted-foreground text-sm">Gestiona las categorías y recordatorios</p>
      </div>

      {/* Notifications Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            Recordatorios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable/Disable Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm">Activar recordatorios</Label>
              <p className="text-xs text-muted-foreground">
                Recibe notificaciones para registrar tus gastos
              </p>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={toggleNotifications}
            />
          </div>

          {/* Notification Frequency Selector */}
          {notificationsEnabled && (
            <div className="space-y-2">
              <Label className="text-sm">Frecuencia de recordatorios</Label>
              <Select
                value={notificationFrequency}
                onValueChange={updateNotificationFrequency}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Cada hora (para pruebas)</SelectItem>
                  <SelectItem value="daily">Una vez al día</SelectItem>
                  <SelectItem value="every2days">Cada 2 días</SelectItem>
                  <SelectItem value="every3days">Cada 3 días</SelectItem>
                  <SelectItem value="weekly">Una vez a la semana</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Frecuencia actual: {getFrequencyText(notificationFrequency)}
              </p>
            </div>
          )}

          {/* Permission Status */}
          {notificationPermission === 'denied' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-700">
                ⚠️ Los permisos de notificación están bloqueados. Para activar las notificaciones, ve a la configuración de tu navegador y permite las notificaciones para este sitio.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Agregar Categoría</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Nueva categoría..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            />
            <Button onClick={addCategory} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Categorías Actuales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {expenseCategories.map((category) => {
            const isUsed = transactions.some(t => t.category === category);
            return (
              <div key={category} className="flex items-center justify-between p-2 border rounded">
                <span className="text-sm">{category}</span>
                <div className="flex items-center gap-2">
                  {isUsed && (
                    <Badge variant="secondary" className="text-xs">
                      En uso
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCategory(category)}
                    disabled={isUsed}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reset Button */}
      <Button 
        onClick={resetCategories} 
        variant="outline"
        className="w-full"
      >
        Restaurar categorías por defecto
      </Button>

      {/* Donation Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="outline"
            className="w-full border-pink-300 text-pink-600 hover:bg-pink-50"
          >
            <Heart className="mr-2 h-4 w-4" />
            Donativo
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[90%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apoya este proyecto</DialogTitle>
            <DialogDescription>
              Cualquier donativo se agradece
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm">PayPal</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-mono">donaciones@finanzaspersonales.com</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">PayPal.me</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-mono">paypal.me/finanzaspersonales</p>
              </div>
            </div>
            <div className="text-center pt-2">
              <p className="text-xs text-muted-foreground">
                Tu apoyo ayuda a mantener esta aplicación gratuita y sin publicidad.
                ¡Gracias por tu generosidad! 💙
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Content */}
      <div className="pb-20 px-4 pt-4">
        {activeTab === "overview" && renderOverviewScreen()}
        {activeTab === "income" && renderIncomeScreen()}
        {activeTab === "expense" && renderExpenseScreen()}
        {activeTab === "transactions" && renderTransactionsScreen()}
        {activeTab === "settings" && renderSettingsScreen()}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t">
        <div className="grid grid-cols-5 gap-1 p-2">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            className="flex flex-col gap-1 h-auto py-2"
            onClick={() => setActiveTab("overview")}
          >
            <Wallet className="h-4 w-4" />
            <span className="text-xs">Inicio</span>
          </Button>
          <Button
            variant={activeTab === "income" ? "default" : "ghost"}
            className="flex flex-col gap-1 h-auto py-2"
            onClick={() => setActiveTab("income")}
          >
            <TrendingUp className="h-4 w-4" />
            <span className="text-xs">Ingresos</span>
          </Button>
          <Button
            variant={activeTab === "expense" ? "default" : "ghost"}
            className="flex flex-col gap-1 h-auto py-2"
            onClick={() => setActiveTab("expense")}
          >
            <TrendingDown className="h-4 w-4" />
            <span className="text-xs">Gastos</span>
          </Button>
          <Button
            variant={activeTab === "transactions" ? "default" : "ghost"}
            className="flex flex-col gap-1 h-auto py-2"
            onClick={() => setActiveTab("transactions")}
          >
            <DollarSign className="h-4 w-4" />
            <span className="text-xs">Historial</span>
          </Button>
          <Button
            variant={activeTab === "settings" ? "default" : "ghost"}
            className="flex flex-col gap-1 h-auto py-2"
            onClick={() => setActiveTab("settings")}
          >
            <Settings className="h-4 w-4" />
            <span className="text-xs">Config</span>
          </Button>
        </div>
      </div>
      <InstallPrompt />
    </div>
  );
}