import axios from 'axios';

const MSGCENTRAL_BASE_URL = 'https://cpaas.messagecentral.com';

interface TokenResponse {
  status: number;
  token: string;
}

interface SendOtpResponse {
  data: {
    verificationId: string;
    mobileNumber: string;
    responseCode: string;
  };
}

interface ValidateOtpResponse {
  data: {
    verificationId: string;
    verificationStatus: string;
    mobileNumber: string;
    responseCode: string;
  };
}

/**
 * Get auth token from MsgCentral API
 */
async function getMsgCentralToken(): Promise<string> {
  const customerId = process.env.MSGCENTRAL_CUSTOMER_ID;
  const base64Key = process.env.MSGCENTRAL_BASE64_KEY;
  const email = process.env.MSGCENTRAL_EMAIL;

  if (!customerId || !base64Key || !email) {
    throw new Error('MsgCentral credentials not configured. Check MSGCENTRAL_CUSTOMER_ID, MSGCENTRAL_BASE64_KEY, MSGCENTRAL_EMAIL in .env');
  }

  const response = await axios.get<TokenResponse>(
    `${MSGCENTRAL_BASE_URL}/auth/v1/authentication/token`, {
    params: {
      customerId,
      key: base64Key,
      scope: 'NEW',
      country: process.env.MSGCENTRAL_COUNTRY || '91',
      email,
    },
  }
  );

  const token = response.data?.token;
  if (!token) {
    throw new Error('Failed to get MsgCentral auth token');
  }

  return token;
}

/**
 * Send OTP to phone number via MsgCentral API.
 * Returns the verificationId from MsgCentral.
 */
export async function sendOtpToPhone(phoneNumber: string): Promise<string> {
  const token = await getMsgCentralToken();
  const customerId = process.env.MSGCENTRAL_CUSTOMER_ID;
  const countryCode = process.env.MSGCENTRAL_COUNTRY || '91';

  let cleanNumber = phoneNumber.replace(/\D/g, '');
  if (cleanNumber.length > 10 && cleanNumber.startsWith(countryCode)) {
    cleanNumber = cleanNumber.slice(countryCode.length);
  }

  const response = await axios.post<SendOtpResponse>(
    `${MSGCENTRAL_BASE_URL}/verification/v3/send`, null, {
    params: {
      countryCode,
      customerId,
      flowType: 'SMS',
      mobileNumber: cleanNumber,
      otpLength: 5,
    },
    headers: {
      authToken: token,
    },
  }
  );

  const verificationId = response.data?.data?.verificationId;
  if (!verificationId) {
    throw new Error('Failed to send OTP. No verificationId received from MsgCentral.');
  }

  console.log(`[MsgCentral OTP] Sent to ${cleanNumber} (original: ${phoneNumber}), verificationId: ${verificationId}`);
  return verificationId;
}

/**
 * Verify OTP code via MsgCentral API.
 * Returns true if OTP is valid and also the mobile number associated with the OTP.
 */
export async function verifyOtpCode(verificationId: string, otp: string): Promise<{ isValid: boolean; mobileNumber?: string }> {
  try {
    const token = await getMsgCentralToken();
    const customerId = process.env.MSGCENTRAL_CUSTOMER_ID;

    const response = await axios.get<ValidateOtpResponse>(
      `${MSGCENTRAL_BASE_URL}/verification/v3/validateOtp`, {
      params: {
        customerId,
        verificationId,
        code: otp,
      },
      headers: {
        authToken: token,
      },
    }
    );

    const status = response.data?.data?.verificationStatus;
    const responseCode = response.data?.data?.responseCode;
    const mobileNumber = response.data?.data?.mobileNumber;

    console.log(`[MsgCentral OTP] Verify result for ${verificationId}: status=${status}, responseCode=${responseCode}`);

    return {
      isValid: status === 'VERIFICATION_COMPLETED' && responseCode === '200',
      mobileNumber
    };
  } catch (error: any) {
    console.error(`[MsgCentral OTP] Verification failed for ${verificationId}:`, error?.response?.data || error.message);
    return { isValid: false };
  }
}
