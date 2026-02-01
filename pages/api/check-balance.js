import axios from 'axios';
import qs from 'qs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API Key diperlukan' 
      });
    }

    // Call Atlantic API
    const response = await axios.post(
      'https://atlantich2h.com/get_profile',
      qs.stringify({ api_key: apiKey }),
      { 
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded' 
        },
        timeout: 10000
      }
    );

    const balance = response?.data?.data?.balance || 0;
    const accountName = response?.data?.data?.name || 'Atlantic H2H';

    res.status(200).json({
      success: true,
      balance,
      accountName,
      message: 'Saldo berhasil diambil'
    });

  } catch (error) {
    console.error('Error checking balance:', error.message);
    
    const errorMessage = error.response?.data?.message || 
                        error.message || 
                        'Terjadi kesalahan saat cek saldo';

    res.status(500).json({
      success: false,
      message: errorMessage
    });
  }
}