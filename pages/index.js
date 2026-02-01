import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Home() {
  const [activeTab, setActiveTab] = useState('balance');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [balanceData, setBalanceData] = useState(null);
  const [withdrawData, setWithdrawData] = useState({
    apiKey: '',
    service: 'dana',
    accountNumber: '',
    amount: '',
    withdrawAll: false
  });

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCheckBalance = async () => {
    if (!withdrawData.apiKey) {
      showNotification('error', 'API Key harus diisi');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/check-balance', {
        apiKey: withdrawData.apiKey
      });

      if (response.data.success) {
        setBalanceData({
          balance: response.data.balance,
          accountName: response.data.accountName,
          timestamp: new Date().toLocaleString('id-ID')
        });
        showNotification('success', `Saldo: Rp ${formatCurrency(response.data.balance)}`);
      } else {
        showNotification('error', response.data.message);
      }
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Gagal cek saldo');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawData.apiKey) {
      showNotification('error', 'API Key harus diisi');
      return;
    }
    if (!withdrawData.accountNumber) {
      showNotification('error', 'Nomor tujuan harus diisi');
      return;
    }
    if (!withdrawData.amount && !withdrawData.withdrawAll) {
      showNotification('error', 'Nominal harus diisi');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/withdraw', {
        apiKey: withdrawData.apiKey,
        service: withdrawData.service,
        accountNumber: withdrawData.accountNumber,
        amount: withdrawData.amount,
        withdrawAll: withdrawData.withdrawAll
      });

      if (response.data.success) {
        showNotification('success', response.data.message);
        // Reset form jika success
        if (response.data.success) {
          setWithdrawData(prev => ({
            ...prev,
            accountNumber: '',
            amount: '',
            withdrawAll: false
          }));
        }
      } else {
        showNotification('error', response.data.message);
      }
    } catch (error) {
      showNotification('error', error.response?.data?.message || 'Gagal melakukan withdraw');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID').format(amount);
  };

  const maskAccountNumber = (number) => {
    if (number.length <= 4) return number;
    return number.slice(0, 4) + '•'.repeat(number.length - 4);
  };

  const serviceOptions = [
    { value: 'dana', label: 'DANA', color: 'bg-blue-100 text-blue-800' },
    { value: 'ovo', label: 'OVO', color: 'bg-purple-100 text-purple-800' },
    { value: 'gopay', label: 'GoPay', color: 'bg-green-100 text-green-800' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            <span className="mr-2">{notification.type === 'success' ? '✓' : '✗'}</span>
            {notification.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h1 className="text-2xl font-bold text-gray-800">Atlantic H2H</h1>
              <p className="text-gray-600">Withdraw & Balance Check</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('balance')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'balance'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Cek Saldo
              </button>
              <button
                onClick={() => setActiveTab('withdraw')}
                className={`px-4 py-2 rounded-lg font-medium ${
                  activeTab === 'withdraw'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* API Key Input (Shared) */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">API Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key Atlantic
              </label>
              <input
                type="password"
                value={withdrawData.apiKey}
                onChange={(e) => setWithdrawData({...withdrawData, apiKey: e.target.value})}
                placeholder="Masukkan API Key Atlantic"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {withdrawData.apiKey && (
                <p className="mt-2 text-sm text-gray-500">
                  API Key terdeteksi: {withdrawData.apiKey.substring(0, 8)}•••••••
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Balance Check Tab */}
        {activeTab === 'balance' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Cek Saldo</h2>
            
            <button
              onClick={handleCheckBalance}
              disabled={loading || !withdrawData.apiKey}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              {loading ? 'Memproses...' : 'Cek Saldo Sekarang'}
            </button>

            {balanceData && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Informasi Saldo</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Saldo Tersedia</p>
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {formatCurrency(balanceData.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nama Akun</p>
                    <p className="text-gray-800">{balanceData.accountName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Update Terakhir</p>
                    <p className="text-gray-800">{balanceData.timestamp}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Withdraw Tab */}
        {activeTab === 'withdraw' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Withdraw Dana</h2>
            
            <div className="space-y-6">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Pilih Layanan
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {serviceOptions.map((service) => (
                    <button
                      key={service.value}
                      onClick={() => setWithdrawData({...withdrawData, service: service.value})}
                      className={`py-3 rounded-lg font-medium transition ${
                        withdrawData.service === service.value
                          ? `${service.color.replace('100', '500').replace('800', '50')} ring-2 ring-offset-2 ${service.color.split(' ')[0].replace('bg-', 'ring-')}`
                          : `${service.color} hover:opacity-90`
                      }`}
                    >
                      {service.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nomor Tujuan {withdrawData.service.toUpperCase()}
                </label>
                <input
                  type="text"
                  value={withdrawData.accountNumber}
                  onChange={(e) => setWithdrawData({...withdrawData, accountNumber: e.target.value})}
                  placeholder={`Contoh: 08xxx (${withdrawData.service})`}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {withdrawData.accountNumber && (
                  <p className="mt-2 text-sm text-gray-500">
                    Tujuan: {maskAccountNumber(withdrawData.accountNumber)}
                  </p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nominal Withdraw
                </label>
                <div className="space-y-3">
                  <input
                    type="number"
                    value={withdrawData.amount}
                    onChange={(e) => setWithdrawData({
                      ...withdrawData, 
                      amount: e.target.value,
                      withdrawAll: false
                    })}
                    placeholder="Masukkan nominal"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    disabled={withdrawData.withdrawAll}
                  />
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="withdrawAll"
                      checked={withdrawData.withdrawAll}
                      onChange={(e) => setWithdrawData({
                        ...withdrawData,
                        withdrawAll: e.target.checked,
                        amount: ''
                      })}
                      className="h-5 w-5 text-blue-600 rounded"
                    />
                    <label htmlFor="withdrawAll" className="ml-2 text-gray-700">
                      Tarik semua saldo (dikurangi fee Rp 2,000)
                    </label>
                  </div>
                </div>
              </div>

              {/* Withdraw Button */}
              <button
                onClick={handleWithdraw}
                disabled={loading || !withdrawData.apiKey}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? 'Memproses Withdraw...' : 'Lakukan Withdraw'}
              </button>

              {/* Information */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Pastikan nomor tujuan benar. Fee withdraw Rp 2,000.
                  Proses mungkin memakan waktu 1-2 menit.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-500 text-sm py-6 border-t">
        <p>© {new Date().getFullYear()} Atlantic H2H Manager - Simple Version</p>
      </footer>
    </div>
  );
}