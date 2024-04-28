/*
 Utils
*/

// Validate email function
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone function
const validatePhone = (phone) => {
  if (phone.length != 11) return false;
  if (!phone.startsWith("01")) return false;
  return true; // Placeholder for demonstration
};

const generateOTP = (phone) => {
  // will be generating otp from any other API
  return "123456"; // default otp

  //   return Math.floor(100000 + Math.random() * 900000);
};

function sendOTPtoPhone(phone, otp) {
  // In a real application, we would send this OTP to the driver's phone number via SMS
  console.log(`OTP for ${phone}: ${otp}`);
}

module.exports = { validateEmail, validatePhone, sendOTPtoPhone, generateOTP };
