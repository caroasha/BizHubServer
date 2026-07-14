const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

// ============================================
// M-Pesa Daraja API Service
// ============================================

let accessToken = null;
let tokenExpiry = null;

const MPESA_BASE_URL = env.MPESA_ENVIRONMENT === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// ============================================
// Authentication
// ============================================

const getAccessToken = async () => {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const auth = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString('base64');

    const response = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    accessToken = response.data.access_token;
    tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min before expiry

    logger.info('M-Pesa access token generated');
    return accessToken;
  } catch (error) {
    logger.error('M-Pesa auth error:', error.response?.data || error.message);
    throw new Error('Failed to generate M-Pesa access token');
  }
};

// ============================================
// STK Push (Lipa Na M-Pesa Online)
// ============================================

const stkPush = async ({ phone, amount, accountRef, description }) => {
  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    // Format phone to 254XXXXXXXXX
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = `254${formattedPhone.slice(1)}`;
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = `254${formattedPhone}`;
    }

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
      {
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount),
        PartyA: formattedPhone,
        PartyB: env.MPESA_SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: `${env.MPESA_CALLBACK_BASE_URL}`,
        AccountReference: accountRef || 'BizHub',
        TransactionDesc: description || 'Payment',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    logger.info('M-Pesa STK push sent:', {
      phone: formattedPhone,
      amount,
      checkoutRequestId: response.data.CheckoutRequestID,
    });

    return {
      success: true,
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription,
      customerMessage: response.data.CustomerMessage,
    };
  } catch (error) {
    logger.error('M-Pesa STK push error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.errorMessage || 'Payment request failed',
    };
  }
};

// ============================================
// Query Transaction Status
// ============================================

const queryStatus = async (checkoutRequestId) => {
  try {
    const token = await getAccessToken();
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const password = Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString('base64');

    const response = await axios.post(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        BusinessShortCode: env.MPESA_SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      resultCode: response.data.ResultCode,
      resultDesc: response.data.ResultDesc,
      mpesaReceiptNumber: response.data.MpesaReceiptNumber,
      amount: response.data.Amount,
      phoneNumber: response.data.PhoneNumber,
    };
  } catch (error) {
    logger.error('M-Pesa query error:', error.response?.data || error.message);
    return {
      success: false,
      error: 'Failed to query transaction status',
    };
  }
};

// ============================================
// Process Callback
// ============================================

const processCallback = (callbackData) => {
  try {
    const { Body } = callbackData;

    if (!Body || !Body.stkCallback) {
      return { success: false, error: 'Invalid callback data' };
    }

    const callback = Body.stkCallback;

    const result = {
      success: callback.ResultCode === 0,
      resultCode: callback.ResultCode,
      resultDesc: callback.ResultDesc,
      merchantRequestId: callback.MerchantRequestID,
      checkoutRequestId: callback.CheckoutRequestID,
    };

    if (callback.ResultCode === 0 && callback.CallbackMetadata) {
      const metadata = callback.CallbackMetadata.Item;
      metadata.forEach((item) => {
        switch (item.Name) {
          case 'Amount':
            result.amount = item.Value;
            break;
          case 'MpesaReceiptNumber':
            result.mpesaReceiptNumber = item.Value;
            break;
          case 'PhoneNumber':
            result.phoneNumber = item.Value;
            break;
          case 'TransactionDate':
            result.transactionDate = item.Value;
            break;
        }
      });
    }

    logger.info('M-Pesa callback processed:', result);
    return result;
  } catch (error) {
    logger.error('M-Pesa callback processing error:', error);
    return { success: false, error: 'Failed to process callback' };
  }
};

module.exports = {
  getAccessToken,
  stkPush,
  queryStatus,
  processCallback,
};