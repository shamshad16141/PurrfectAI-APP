import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, Plus, Trash2, TrendingDown, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: 'expense' | 'income';
  category: string;
}

interface ExpenseTrackerProps {
  onExpenseAdded?: (amount: number) => void;
  onIncomeAdded?: (amount: number) => void;
  onBudgetExceeded?: () => void;
}

const CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍔' },
  { id: 'transport', label: 'Transport', icon: '🚗' },
  { id: 'fun', label: 'Fun', icon: '🎮' },
  { id: 'bills', label: 'Bills', icon: '📄' },
  { id: 'other', label: 'Other', icon: '📦' },
];

export const ExpenseTracker: React.FC<ExpenseTrackerProps> = ({
  onExpenseAdded,
  onIncomeAdded,
  onBudgetExceeded,
}) => {
  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem('kuro_budget');
    return saved ? JSON.parse(saved) : 0;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('kuro_expenses'); // Keep same key for migration
    if (!saved) return [];
    const data = JSON.parse(saved);
    // Migration: add type and category if missing
    return data.map((t: any) => ({
      ...t,
      type: t.type || 'expense',
      category: t.category || 'other'
    }));
  });

  const [descInput, setDescInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('other');
  const [addMoneyInput, setAddMoneyInput] = useState('');
  const [budgetInput, setBudgetInput] = useState(budget.toString());
  const [isEditingBudget, setIsEditingBudget] = useState(budget === 0);

  useEffect(() => {
    localStorage.setItem('kuro_budget', JSON.stringify(budget));
  }, [budget]);

  useEffect(() => {
    localStorage.setItem('kuro_expenses', JSON.stringify(transactions));
  }, [transactions]);

  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const remaining = budget + totalIncome - totalSpent;
  const spentPercentage = budget > 0 ? Math.min((totalSpent / (budget + totalIncome)) * 100, 100) : 0;

  const addTransaction = (type: 'expense' | 'income') => {
    const inputVal = type === 'expense' ? amountInput : addMoneyInput;
    const amount = parseFloat(inputVal);
    if (isNaN(amount) || amount <= 0) return;
    if (type === 'expense' && !descInput.trim()) return;

    const newTransaction: Transaction = {
      id: Date.now().toString(),
      description: type === 'expense' ? descInput.trim() : 'Added Funds',
      amount,
      date: new Date().toISOString(),
      type,
      category: type === 'expense' ? categoryInput : 'income',
    };

    setTransactions([newTransaction, ...transactions]);
    
    if (type === 'expense') {
      setDescInput('');
      setAmountInput('');
      onExpenseAdded?.(amount);
      if (budget > 0 && totalSpent + amount > budget + totalIncome) {
        onBudgetExceeded?.();
      }
    } else {
      setAddMoneyInput('');
      onIncomeAdded?.(amount);
    }
  };

  const deleteTransaction = (id: string) => {
    if (window.confirm('Delete this transaction?')) {
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const updateBudget = () => {
    const newBudget = parseFloat(budgetInput);
    if (isNaN(newBudget) || newBudget < 0) return;
    setBudget(newBudget);
    setIsEditingBudget(false);
  };

  const clearAll = () => {
    if (window.confirm('Clear all transactions for this month?')) {
      setTransactions([]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b-2 border-black bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-[2px_2px_0_#333]">
              <Wallet size={18} />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest">Expense Tracker</h2>
          </div>
          <button 
            onClick={clearAll}
            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:underline"
          >
            Reset Month
          </button>
        </div>

        {/* Budget Summary Card */}
        <div className="p-4 border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] bg-white space-y-4">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Monthly Budget</p>
              {isEditingBudget ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-24 p-1 text-sm font-black border-b-2 border-black outline-none"
                    autoFocus
                  />
                  <button onClick={updateBudget} className="text-xs font-black uppercase text-green-600">Set</button>
                </div>
              ) : (
                <div className="flex items-baseline gap-2 group cursor-pointer" onClick={() => setIsEditingBudget(true)}>
                  <span className="text-2xl font-black">${budget.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Edit</span>
                </div>
              )}
            </div>
            <div className={`p-2 rounded-lg ${remaining >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {remaining >= 0 ? <TrendingUp size={20} className="text-green-600" /> : <TrendingDown size={20} className="text-red-600" />}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="h-4 w-full bg-gray-100 border-2 border-black rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${spentPercentage}%` }}
                className={cn(
                  "h-full transition-colors",
                  spentPercentage > 90 ? "bg-red-500" : spentPercentage > 70 ? "bg-orange-400" : "bg-black"
                )}
              />
            </div>
            <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-gray-400">
              <span>Spent: {spentPercentage.toFixed(0)}%</span>
              <span>Available: ${(budget + totalIncome).toLocaleString()}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Spent</p>
              <p className="text-sm font-black text-red-500">${totalSpent.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Remaining</p>
              <p className={`text-sm font-black ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${remaining.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Add Funds Form */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Add Funds (Income)</h3>
          <div className="p-4 border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] bg-white flex gap-3">
            <div className="flex-1 relative">
              <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                value={addMoneyInput}
                onChange={(e) => setAddMoneyInput(e.target.value)}
                placeholder="Add extra funds..."
                className="w-full p-2 pl-7 text-sm border-2 border-black rounded-lg outline-none focus:shadow-[2px_2px_0_#000] transition-all"
              />
            </div>
            <button
              onClick={() => addTransaction('income')}
              className="px-4 bg-green-500 text-white font-black uppercase text-[10px] tracking-widest rounded-lg shadow-[3px_3px_0_#057a55] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
            >
              Add
            </button>
          </div>
        </div>

        {/* Add Expense Form */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Add New Expense</h3>
          <div className="p-4 border-2 border-black rounded-2xl shadow-[4px_4px_0_#000] bg-white space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Category</label>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryInput(cat.id)}
                    className={cn(
                      "flex-shrink-0 px-3 py-2 rounded-xl border-2 border-black text-[10px] font-black uppercase tracking-widest transition-all",
                      categoryInput === cat.id ? "bg-black text-white shadow-[2px_2px_0_#333]" : "bg-white text-black hover:bg-gray-50"
                    )}
                  >
                    <span className="mr-1">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Description</label>
              <input
                type="text"
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="e.g., Coffee, Rent, Catnip..."
                className="w-full p-2 text-sm border-2 border-black rounded-lg outline-none focus:shadow-[2px_2px_0_#000] transition-all"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Amount</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2 pl-7 text-sm border-2 border-black rounded-lg outline-none focus:shadow-[2px_2px_0_#000] transition-all"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => addTransaction('expense')}
                  className="h-10 w-10 flex items-center justify-center bg-black text-white rounded-lg shadow-[3px_3px_0_#333] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-3 pb-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Recent Transactions</h3>
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {transactions.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="group flex items-center justify-between p-3 border-2 border-black rounded-xl shadow-[2px_2px_0_#000] bg-white hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#000] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-xs",
                      t.type === 'income' ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600"
                    )}>
                      {t.type === 'income' ? '💰' : CATEGORIES.find(c => c.id === t.category)?.icon || '📦'}
                    </div>
                    <div>
                      <p className="text-xs font-black leading-none mb-1">{t.description}</p>
                      <p className="text-[9px] font-bold text-gray-400">
                        {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        {t.type === 'expense' && ` • ${t.category}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-sm font-black",
                      t.type === 'income' ? "text-green-600" : "text-red-500"
                    )}>
                      {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                    </span>
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {transactions.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">No transactions recorded.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const cn = (...inputs: any[]) => {
  return inputs.filter(Boolean).join(' ');
};
