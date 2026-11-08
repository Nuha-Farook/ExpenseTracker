import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Download,
  RotateCcw,
  CreditCard,
  Building2,
  Utensils,
  Car,
  Home,
  Film,
  Zap,
  ShoppingBag,
  Activity,
  Briefcase,
  Laptop,
  Coins,
  Calendar,
  X,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  BarChart3,
  PieChart,
  Layers
} from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', name: 'Euro (€)' },
  { code: 'GBP', symbol: '£', name: 'British Pound (£)' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹)' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (¥)' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar ($)' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar ($)' }
];

const DEBIT_CATEGORIES = [
  'Food & Dining',
  'Housing',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Utilities',
  'Healthcare & Fitness',
  'Electronics',
  'Education',
  'Travel',
  'Other Expense'
];

const CREDIT_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Business',
  'Consulting',
  'Bonus',
  'Dividends',
  'Gift',
  'Other Income'
];

const PAYMENT_METHODS = [
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'UPI / Digital Wallet',
  'Cash',
  'Other'
];

const QUICK_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_credit: 0,
    total_debit: 0,
    net_balance: 0,
    savings_rate: 0,
    credit_count: 0,
    debit_count: 0,
    debit_categories: [],
    credit_categories: [],
    monthly_trend: []
  });
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState(CURRENCIES[0]);

  // Filters
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'credit', 'debit'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [categoryViewType, setCategoryViewType] = useState('debit'); // 'debit' or 'credit'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'debit', // 'debit' or 'credit'
    category: 'Food & Dining',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'Credit Card',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Fetch summary and transactions
  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, sumRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/summary')
      ]);

      if (txRes.ok && sumRes.ok) {
        const txData = await txRes.json();
        const sumData = await sumRes.json();
        setTransactions(txData);
        setSummary(sumData);
      } else {
        showToast('Failed to fetch transaction data', 'error');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Network error connecting to backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format currency helper
  const formatMoney = (val) => {
    const num = Math.abs(Number(val) || 0);
    return `${currency.symbol}${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Open modal for add
  const handleOpenAdd = (defaultType = 'debit') => {
    setEditingItem(null);
    setFormData({
      title: '',
      amount: '',
      type: defaultType,
      category: defaultType === 'credit' ? CREDIT_CATEGORIES[0] : DEBIT_CATEGORIES[0],
      date: new Date().toISOString().split('T')[0],
      payment_method: 'Credit Card',
      notes: ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      amount: item.amount,
      type: item.type,
      category: item.category,
      date: item.date,
      payment_method: item.payment_method || 'Cash',
      notes: item.notes || ''
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Switch type inside modal
  const handleTypeSwitch = (newType) => {
    setFormData((prev) => ({
      ...prev,
      type: newType,
      category: newType === 'credit' ? CREDIT_CATEGORIES[0] : DEBIT_CATEGORIES[0]
    }));
  };

  // Quick Amount button clicked
  const handleQuickAmount = (val) => {
    const current = parseFloat(formData.amount) || 0;
    setFormData((prev) => ({
      ...prev,
      amount: (current + val).toString()
    }));
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Title or description is required';
    }
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      errors.amount = 'Please enter a valid amount greater than 0';
    }
    if (!formData.date) {
      errors.date = 'Date is required';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Add / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        title: formData.title.trim(),
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category,
        date: formData.date,
        payment_method: formData.payment_method,
        notes: formData.notes.trim()
      };

      let res;
      if (editingItem) {
        res = await fetch(`/api/transactions/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        showToast(
          editingItem ? 'Transaction updated successfully!' : 'Transaction added successfully!'
        );
        if (!editingItem && formData.type === 'credit') {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#10b981', '#34d399', '#6ee7b7']
          });
        }
      } else {
        const data = await res.json();
        showToast(data.error || 'Failed to save transaction', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving transaction', 'error');
    }
  };

  // Delete transaction
  const confirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      const res = await fetch(`/api/transactions/${deleteCandidate.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('Transaction removed');
        setDeleteCandidate(null);
        fetchData();
      } else {
        showToast('Failed to delete transaction', 'error');
      }
    } catch (err) {
      showToast('Error deleting transaction', 'error');
    }
  };

  // Reset Demo Data
  const handleResetDemo = async () => {
    if (window.confirm('Reset all transactions to default demonstration data?')) {
      try {
        const res = await fetch('/api/seed', { method: 'POST' });
        if (res.ok) {
          fetchData();
          showToast('Sample transactions restored!');
        }
      } catch (err) {
        showToast('Failed to reset demo data', 'error');
      }
    }
  };

  // Clear All
  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete ALL transactions? This cannot be undone.')) {
      try {
        const res = await fetch('/api/clear', { method: 'POST' });
        if (res.ok) {
          fetchData();
          showToast('All transactions cleared');
        }
      } catch (err) {
        showToast('Failed to clear data', 'error');
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.location.href = '/api/export';
    showToast('Exporting CSV...');
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Tab filter
      if (activeTab === 'credit' && t.type !== 'credit') return false;
      if (activeTab === 'debit' && t.type !== 'debit') return false;

      // Category filter
      if (selectedCategory !== 'all' && t.category !== selectedCategory) return false;

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesNotes = (t.notes || '').toLowerCase().includes(query);
        const matchesCat = t.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes && !matchesCat) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'amount') {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
      // Date sort
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [transactions, activeTab, selectedCategory, searchQuery, sortBy, sortOrder]);

  // Category Icon helper
  const getCategoryIcon = (category, type) => {
    switch (category) {
      case 'Food & Dining':
        return <Utensils size={18} />;
      case 'Housing':
        return <Home size={18} />;
      case 'Transportation':
        return <Car size={18} />;
      case 'Shopping':
        return <ShoppingBag size={18} />;
      case 'Entertainment':
        return <Film size={18} />;
      case 'Utilities':
        return <Zap size={18} />;
      case 'Healthcare & Fitness':
        return <Activity size={18} />;
      case 'Salary':
        return <Briefcase size={18} />;
      case 'Freelance':
      case 'Consulting':
        return <Laptop size={18} />;
      case 'Investment':
      case 'Dividends':
        return <TrendingUp size={18} />;
      case 'Business':
        return <Building2 size={18} />;
      default:
        return type === 'credit' ? <Coins size={18} /> : <CreditCard size={18} />;
    }
  };

  // Color generator for category progress bars
  const categoryColors = [
    '#38bdf8', '#818cf8', '#a855f7', '#ec4899', '#f97316', '#eab308', '#10b981', '#06b6d4'
  ];

  // Max value for monthly chart scaling
  const maxMonthlyVal = useMemo(() => {
    let max = 1;
    (summary.monthly_trend || []).forEach((m) => {
      if (m.credit > max) max = m.credit;
      if (m.debit > max) max = m.debit;
    });
    return max;
  }, [summary.monthly_trend]);

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon-wrapper">
            <Wallet size={24} />
          </div>
          <div className="brand-text">
            <h1>
              FlowFinance
              <span className="brand-tag">Debit & Credit</span>
            </h1>
            <p className="brand-subtitle">Smart Personal Cashflow & Expense Intelligence</p>
          </div>
        </div>

        <div className="nav-actions">
          <select
            className="currency-select"
            value={currency.code}
            onChange={(e) => {
              const selected = CURRENCIES.find((c) => c.code === e.target.value);
              if (selected) setCurrency(selected);
            }}
            title="Change Currency"
            id="currency-select"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.code}
              </option>
            ))}
          </select>

          <button
            className="btn-secondary"
            onClick={handleExportCSV}
            title="Download CSV report"
            id="export-btn"
          >
            <Download size={16} />
            Export CSV
          </button>

          <button
            className="btn-secondary"
            onClick={handleResetDemo}
            title="Load sample debit & credit data"
            id="reset-demo-btn"
          >
            <RotateCcw size={16} />
            Demo Data
          </button>

          <button
            className="btn-primary"
            onClick={() => handleOpenAdd('debit')}
            id="new-transaction-btn"
          >
            <Plus size={18} />
            Add Transaction
          </button>
        </div>
      </header>

      {/* Hero Stats Section */}
      <section className="stats-grid">
        {/* Net Balance */}
        <div className="glass-panel stat-card balance" id="stat-card-balance">
          <div className="stat-header">
            <span className="stat-title">Net Balance</span>
            <div className="stat-icon">
              <Wallet size={20} />
            </div>
          </div>
          <div className="stat-value">
            {summary.net_balance >= 0 ? '+' : '-'}
            {formatMoney(summary.net_balance)}
          </div>
          <div className="stat-footer">
            <span
              className={`badge-pill ${
                summary.net_balance >= 0 ? 'badge-credit' : 'badge-debit'
              }`}
            >
              {summary.net_balance >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {summary.savings_rate}% Savings Rate
            </span>
            <span>{summary.total_transactions} total transactions</span>
          </div>
        </div>

        {/* Total Credit (Income) */}
        <div className="glass-panel stat-card credit" id="stat-card-credit">
          <div className="stat-header">
            <span className="stat-title">Total Credits (Money In)</span>
            <div className="stat-icon">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div className="stat-value">+{formatMoney(summary.total_credit)}</div>
          <div className="stat-footer">
            <span className="badge-pill badge-credit">
              {summary.credit_count} Inflow Entries
            </span>
            <span>Income & Dividends</span>
          </div>
        </div>

        {/* Total Debit (Expenses) */}
        <div className="glass-panel stat-card debit" id="stat-card-debit">
          <div className="stat-header">
            <span className="stat-title">Total Debits (Money Out)</span>
            <div className="stat-icon">
              <ArrowDownLeft size={20} />
            </div>
          </div>
          <div className="stat-value">-{formatMoney(summary.total_debit)}</div>
          <div className="stat-footer">
            <span className="badge-pill badge-debit">
              {summary.debit_count} Outflow Entries
            </span>
            <span>Expenses & Bills</span>
          </div>
        </div>

        {/* Cashflow Velocity */}
        <div className="glass-panel stat-card velocity" id="stat-card-velocity">
          <div className="stat-header">
            <span className="stat-title">Average Outflow</span>
            <div className="stat-icon">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="stat-value">
            {formatMoney(
              summary.debit_count > 0 ? summary.total_debit / summary.debit_count : 0
            )}
          </div>
          <div className="stat-footer">
            <span className="badge-pill badge-neutral">Per Expense</span>
            <button
              onClick={() => handleOpenAdd('credit')}
              style={{
                background: 'none',
                color: 'var(--credit-primary)',
                fontWeight: '600',
                fontSize: '0.8rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              + Quick Credit
            </button>
          </div>
        </div>
      </section>

      {/* Analytics Row: Monthly Bar Visual & Category Breakdown */}
      <section className="analytics-section">
        {/* Monthly Trend Visual */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="card-heading">
            <div className="card-title-group">
              <BarChart3 size={20} color="#818cf8" />
              <h2>Cash Flow Trends (Credits vs Debits)</h2>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.8rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: 'var(--credit-primary)'
                  }}
                />
                Credit (Income)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '2px',
                    background: 'var(--debit-primary)'
                  }}
                />
                Debit (Expense)
              </span>
            </div>
          </div>

          {summary.monthly_trend && summary.monthly_trend.length > 0 ? (
            <div className="chart-container">
              {summary.monthly_trend.map((m) => {
                const creditHeight = Math.max(8, Math.round((m.credit / maxMonthlyVal) * 160));
                const debitHeight = Math.max(8, Math.round((m.debit / maxMonthlyVal) * 160));
                return (
                  <div key={m.month} className="chart-bar-group">
                    <div className="bars-wrapper">
                      {/* Credit Bar */}
                      <div
                        className="chart-bar credit"
                        style={{ height: `${creditHeight}px` }}
                      >
                        <div className="bar-tooltip">
                          Credit: +{formatMoney(m.credit)}
                        </div>
                      </div>

                      {/* Debit Bar */}
                      <div
                        className="chart-bar debit"
                        style={{ height: `${debitHeight}px` }}
                      >
                        <div className="bar-tooltip">
                          Debit: -{formatMoney(m.debit)}
                        </div>
                      </div>
                    </div>
                    <span className="chart-bar-label">{m.month}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              No monthly data recorded yet.
            </div>
          )}
        </div>

        {/* Category Breakdown Progress */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="card-heading">
            <div className="card-title-group">
              <PieChart size={20} color="#38bdf8" />
              <h2>Top Categories</h2>
            </div>
            <div className="tabs-group" style={{ margin: 0 }}>
              <button
                className={`tab-btn ${categoryViewType === 'debit' ? 'active debit' : ''}`}
                onClick={() => setCategoryViewType('debit')}
              >
                Debits
              </button>
              <button
                className={`tab-btn ${categoryViewType === 'credit' ? 'active credit' : ''}`}
                onClick={() => setCategoryViewType('credit')}
              >
                Credits
              </button>
            </div>
          </div>

          <div className="category-list">
            {categoryViewType === 'debit' ? (
              summary.debit_categories && summary.debit_categories.length > 0 ? (
                summary.debit_categories.slice(0, 5).map((cat, idx) => (
                  <div key={cat.category} className="category-item">
                    <div className="category-meta">
                      <span className="category-name">
                        <span
                          className="cat-color-dot"
                          style={{
                            background: categoryColors[idx % categoryColors.length]
                          }}
                        />
                        {cat.category}
                      </span>
                      <span className="category-amount">
                        {formatMoney(cat.total)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="category-bar-bg">
                      <div
                        className="category-bar-fill"
                        style={{
                          width: `${cat.percentage}%`,
                          background: categoryColors[idx % categoryColors.length]
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No debits logged yet.
                </div>
              )
            ) : summary.credit_categories && summary.credit_categories.length > 0 ? (
              summary.credit_categories.slice(0, 5).map((cat, idx) => (
                <div key={cat.category} className="category-item">
                  <div className="category-meta">
                    <span className="category-name">
                      <span
                        className="cat-color-dot"
                        style={{
                          background: categoryColors[idx % categoryColors.length]
                        }}
                      />
                      {cat.category}
                    </span>
                    <span className="category-amount">
                      {formatMoney(cat.total)} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="category-bar-bg">
                    <div
                      className="category-bar-fill"
                      style={{
                        width: `${cat.percentage}%`,
                        background: categoryColors[idx % categoryColors.length]
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No credits logged yet.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section className="filter-bar">
        {/* Search */}
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by title, notes, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            id="search-input"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type Filter Tabs */}
        <div className="tabs-group">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
            id="filter-tab-all"
          >
            All ({transactions.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'credit' ? 'active credit' : ''}`}
            onClick={() => setActiveTab('credit')}
            id="filter-tab-credit"
          >
            <ArrowUpRight size={14} />
            Credits ({summary.credit_count})
          </button>
          <button
            className={`tab-btn ${activeTab === 'debit' ? 'active debit' : ''}`}
            onClick={() => setActiveTab('debit')}
            id="filter-tab-debit"
          >
            <ArrowDownLeft size={14} />
            Debits ({summary.debit_count})
          </button>
        </div>

        {/* Category Filter */}
        <select
          className="filter-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          id="category-filter-select"
        >
          <option value="all">All Categories</option>
          {Array.from(new Set(transactions.map((t) => t.category))).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          className="filter-select"
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [b, o] = e.target.value.split('-');
            setSortBy(b);
            setSortOrder(o);
          }}
          id="sort-select"
        >
          <option value="date-desc">Date: Newest First</option>
          <option value="date-asc">Date: Oldest First</option>
          <option value="amount-desc">Amount: Highest First</option>
          <option value="amount-asc">Amount: Lowest First</option>
        </select>

        {/* Clear All Data */}
        <button
          className="icon-btn"
          onClick={handleClearAll}
          title="Clear all transactions"
          style={{ marginLeft: 'auto' }}
          id="clear-all-btn"
        >
          <Trash2 size={16} />
        </button>
      </section>

      {/* Transaction Records List */}
      <section className="transactions-container" id="transactions-list">
        {loading ? (
          <div className="glass-panel" style={{ padding: '50px', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Layers size={28} />
            </div>
            <h3>No Transactions Found</h3>
            <p>
              {searchQuery || selectedCategory !== 'all' || activeTab !== 'all'
                ? 'Try adjusting your filters or search keywords.'
                : 'Start tracking your financial transactions by clicking "Add Transaction" above.'}
            </p>
            <button
              className="btn-primary"
              onClick={() => handleOpenAdd('debit')}
              style={{ marginTop: '10px' }}
            >
              <Plus size={16} /> Add First Record
            </button>
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const isCredit = tx.type === 'credit';
            return (
              <div
                key={tx.id}
                className={`transaction-card ${isCredit ? 'credit' : 'debit'}`}
                id={`tx-card-${tx.id}`}
              >
                <div className="tx-main">
                  {/* Category / Type Icon */}
                  <div className={`tx-icon-badge ${isCredit ? 'credit' : 'debit'}`}>
                    {getCategoryIcon(tx.category, tx.type)}
                  </div>

                  <div className="tx-details">
                    <div className="tx-title-row">
                      <span className="tx-title">{tx.title}</span>
                      <span className="tx-category-tag">{tx.category}</span>
                    </div>

                    <div className="tx-sub-row">
                      <span className="tx-date">
                        <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        {new Date(tx.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>

                      <span className="tx-method">
                        • {tx.payment_method || 'Cash'}
                      </span>

                      {tx.notes && <span className="tx-notes">• {tx.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="tx-right">
                  <div className="tx-amount-col">
                    <span className={`tx-amount ${isCredit ? 'credit' : 'debit'}`}>
                      {isCredit ? '+' : '-'}
                      {formatMoney(tx.amount)}
                    </span>
                    <span className={`tx-type-label ${isCredit ? 'credit' : 'debit'}`}>
                      {isCredit ? 'Credit (In)' : 'Debit (Out)'}
                    </span>
                  </div>

                  <div className="tx-actions">
                    <button
                      className="icon-btn"
                      onClick={() => handleOpenEdit(tx)}
                      title="Edit transaction"
                      id={`edit-btn-${tx.id}`}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      className="icon-btn delete"
                      onClick={() => setDeleteCandidate(tx)}
                      title="Delete transaction"
                      id={`delete-btn-${tx.id}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>{editingItem ? 'Edit Transaction' : 'Record Transaction'}</h3>
              <button
                className="modal-close"
                onClick={() => setIsModalOpen(false)}
                id="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Debit / Credit Segment Switcher */}
                <div className="form-group">
                  <label>Transaction Type</label>
                  <div className="type-segmented-control">
                    <button
                      type="button"
                      className={`segment-btn ${
                        formData.type === 'debit' ? 'active debit' : ''
                      }`}
                      onClick={() => handleTypeSwitch('debit')}
                      id="modal-type-debit"
                    >
                      <ArrowDownLeft size={16} />
                      Debit (Money Out)
                    </button>
                    <button
                      type="button"
                      className={`segment-btn ${
                        formData.type === 'credit' ? 'active credit' : ''
                      }`}
                      onClick={() => handleTypeSwitch('credit')}
                      id="modal-type-credit"
                    >
                      <ArrowUpRight size={16} />
                      Credit (Money In)
                    </button>
                  </div>
                </div>

                {/* Amount with quick chips */}
                <div className="form-group">
                  <label>Amount</label>
                  <div className="amount-input-wrapper">
                    <span className="currency-symbol">{currency.symbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      className="input-control amount-input"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      id="tx-amount-input"
                      autoFocus
                    />
                  </div>
                  {formErrors.amount && (
                    <span style={{ color: 'var(--debit-primary)', fontSize: '0.75rem' }}>
                      {formErrors.amount}
                    </span>
                  )}

                  {/* Quick Amount Chips */}
                  <div className="quick-chips-row">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Quick add:
                    </span>
                    {QUICK_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className="quick-chip"
                        onClick={() => handleQuickAmount(amt)}
                      >
                        +{currency.symbol}
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label>Description / Title</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder={
                      formData.type === 'credit'
                        ? 'e.g. Monthly Salary, Freelance project'
                        : 'e.g. Grocery Store, Coffee, Internet bill'
                    }
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    id="tx-title-input"
                  />
                  {formErrors.title && (
                    <span style={{ color: 'var(--debit-primary)', fontSize: '0.75rem' }}>
                      {formErrors.title}
                    </span>
                  )}
                </div>

                {/* Category & Payment Method Row */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      className="input-control"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      id="tx-category-select"
                    >
                      {(formData.type === 'credit'
                        ? CREDIT_CATEGORIES
                        : DEBIT_CATEGORIES
                      ).map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Payment Method</label>
                    <select
                      className="input-control"
                      value={formData.payment_method}
                      onChange={(e) =>
                        setFormData({ ...formData, payment_method: e.target.value })
                      }
                      id="tx-payment-select"
                    >
                      {PAYMENT_METHODS.map((pm) => (
                        <option key={pm} value={pm}>
                          {pm}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date */}
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    className="input-control"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    id="tx-date-input"
                  />
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>Notes (Optional)</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Add tags or additional reference notes..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    id="tx-notes-input"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn-primary ${
                    formData.type === 'debit' ? 'btn-debit' : ''
                  }`}
                  style={
                    formData.type === 'debit'
                      ? {
                          background: 'linear-gradient(135deg, #e11d48, #f43f5e)',
                          boxShadow: '0 4px 14px rgba(244, 63, 94, 0.4)'
                        }
                      : {}
                  }
                  id="tx-save-btn"
                >
                  {editingItem ? 'Save Changes' : `Add ${formData.type === 'credit' ? 'Credit' : 'Debit'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteCandidate(null);
          }}
        >
          <div className="modal-dialog" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3>Delete Transaction</h3>
              <button
                className="modal-close"
                onClick={() => setDeleteCandidate(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '30px 20px' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: 'var(--debit-bg)',
                  color: 'var(--debit-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto'
                }}
              >
                <Trash2 size={24} />
              </div>
              <p style={{ color: '#fff', fontSize: '1.05rem', fontWeight: '600', marginBottom: '8px' }}>
                Are you sure you want to delete this record?
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                "{deleteCandidate.title}" for {formatMoney(deleteCandidate.amount)} will be permanently removed.
              </p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #e11d48, #f43f5e)' }}
                onClick={confirmDelete}
                id="confirm-delete-btn"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === 'error' ? (
            <AlertCircle size={18} color="var(--debit-primary)" />
          ) : (
            <CheckCircle2 size={18} color="var(--credit-primary)" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
