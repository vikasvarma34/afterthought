// Soniox API helper - handles temporary API key generation
const SONIOX_API_KEY = import.meta.env.VITE_SONIOX_API_KEY;

export const getTemporaryApiKey = async () => {
  if (!SONIOX_API_KEY) {
    throw new Error('Soniox API key not configured');
  }

  try {
    const response = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SONIOX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: 60,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get temporary API key');
    }

    const data = await response.json();
    return data.api_key;
  } catch (error) {
    console.error('Soniox API error:', error);
    throw error;
  }
};
