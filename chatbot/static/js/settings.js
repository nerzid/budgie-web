// settings.js
const settings = {
  DIALOGUE_SYSTEM_HOST: "http://127.0.0.1",
  DIALOGUE_SYSTEM_PORT: "5000",
  BUDGIE_WEB_HOST: "http://127.0.0.1",
  BUDGIE_WEB_PORT: "8000",
  BUDGIE_WEB_SOCKET_HOST: "http://127.0.0.1",
  BUDGIE_WEB_SOCKET_PORT: "3000"
};

// Export the settings based on the environment
if (typeof module === 'object' && typeof module.exports === 'object') {
  // Node.js environment
  module.exports = settings;
} else if (typeof window === 'object') {
  // Browser environment
  window.MySettings = settings;
}
