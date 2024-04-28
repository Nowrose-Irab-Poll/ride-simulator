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

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  return distance;
};

// Convert degrees to radians
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Find nearest driver
const findNearestDriver = (riderLocation, drivers) => {
  let nearestDriver = null;
  let shortestDistance = Infinity;

  drivers.forEach((driver) => {
    const distance = calculateDistance(
      riderLocation.latitude,
      riderLocation.longitude,
      driver.latitude,
      driver.longitude
    );

    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestDriver = driver;
    }
  });

  return nearestDriver;
};

module.exports = {
  validateEmail,
  validatePhone,
  sendOTPtoPhone,
  generateOTP,
  calculateDistance,
  findNearestDriver,
};
