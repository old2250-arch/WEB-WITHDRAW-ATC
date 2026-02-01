import axios from 'axios';
import qs from 'qs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { apiKey, service, accountNumber, amount, withdrawAll } = req.body;

    // Validasi input
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API Key diperlukan' 
      });
    }

    if (!accountNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nomor tujuan diperlukan' 
      });
    }

    // Mapping service ke kode bank Atlantic
    const serviceMapping = {
      dana: 'DANA',
      ovo: 'OVO',
      gopay: 'GOPAY'
    };

    const kodeBank = serviceMapping[service] || service;

    // Step 1: Cek saldo dulu
    const profileRes = await axios.post(
      'https://atlantich2h.com/get_profile',
      qs.stringify({ api_key: apiKey }),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        timeout: 10000
      }
    );

    const saldoAwal = profileRes?.data?.data?.balance || 0;
    
    // Hitung nominal withdraw
    let nominal;
    if (withdrawAll) {
      nominal = Math.max(0, saldoAwal - 2000); // Kurangi fee
      if (nominal <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Saldo tidak cukup untuk withdraw'
        });
      }
    } else {
      nominal = parseInt(amount);
      if (!nominal || nominal <= 2000) {
        return res.status(400).json({
          success: false,
          message: 'Nominal minimal Rp 2,001'
        });
      }
    }

    // Step 2: Buat request withdraw
    const withdrawRes = await axios.post(
      'https://atlantich2h.com/transfer/create',
      qs.stringify({
        api_key: apiKey,
        ref_id: `WD_${Date.now()}`,
        kode_bank: kodeBank,
        nomor_akun: accountNumber,
        nama_pemilik: 'Customer',
        nominal: nominal.toString()
      }),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        timeout: 10000
      }
    );

    const transactionId = withdrawRes?.data?.data?.id;
    const status = withdrawRes?.data?.data?.status;

    // Jika langsung success
    if (status === 'success') {
      return res.status(200).json({
        success: true,
        message: `Withdraw berhasil! Rp ${nominal.toLocaleString('id-ID')} telah dikirim ke ${service.toUpperCase()}`,
        transactionId,
        amount: nominal,
        status
      });
    }

    // Jika pending, cek status berkala
    if (status === 'pending') {
      let attempts = 0;
      const maxAttempts = 30; // Maksimal 1 menit
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Tunggu 2 detik
        
        const checkRes = await axios.post(
          'https://atlantich2h.com/transfer/status',
          qs.stringify({ 
            api_key: apiKey, 
            id: transactionId 
          }),
          { 
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded' 
            },
            timeout: 10000
          }
        );

        const result = checkRes?.data?.data || {};
        
        if (result?.status && result?.status !== 'pending') {
          return res.status(200).json({
            success: result.status === 'success',
            message: result.status === 'success' 
              ? `Withdraw berhasil! Rp ${nominal.toLocaleString('id-ID')} telah dikirim`
              : `Withdraw ${result.status}`,
            transactionId,
            amount: nominal,
            status: result.status
          });
        }
        
        attempts++;
      }

      // Jika masih pending setelah 1 menit
      return res.status(200).json({
        success: false,
        message: 'Status masih pending. Silakan cek manual nanti',
        transactionId,
        amount: nominal,
        status: 'pending'
      });
    }

    // Status lainnya
    return res.status(200).json({
      success: false,
      message: `Withdraw ${status}`,
      transactionId,
      amount: nominal,
      status
    });

  } catch (error) {
    console.error('Error processing withdraw:', error.message);
    
    // Handle saldo tidak cukup khusus
    if (error.response?.data?.message?.includes('Saldo tidak cukup')) {
      return res.status(400).json({
        success: false,
        message: 'Saldo tidak cukup untuk melakukan withdraw'
      });
    }

    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Terjadi kesalahan saat withdraw';

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
}