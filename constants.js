// redis config
const EXPIRATION = {
  // seconds
  DEFAULT: 30,
  OTP: 60,
  LOCATION: 3000,
};
const REDIS_PATTERN = {
  DRIVER_LOCATION: "location?driverId=",
  OTP: "otp?phone=",
};

const STATUS_MESSAGES = {
  INVALID_TOKEN: "Invalid token",
  INVALID_EMAIL: "Invalid email format",
  INVALID_PHONE: "Invalid phone number",
  INVALID_OTP: "Invalid OTP",
  CONFLICT_PHONE: "Phone number already registered",
  CONFLICT_EMAIL: "Email already registered",
  INTERNAL_SERVER_ERROR: "Internal server error",
  NOT_FOUND_PHONE: "Phone not found",
  NOT_FOUND_EMAIL: "Email not found",
  NOT_FOUND_PHONE_OTP: "Phone or OTP missing",
  NOT_REGISTERED_DRIVER: "Driver not registered",
  NOT_REGISTERED_RIDER: "Rider not registered",
  SUCCESS_OTP_SENT: "OTP sent successfully",
  SUCCESS_LOCATION: "Location updated",
  INACTIVE_DRIVER: "Driver not online",
  UNAUTHORIZED: "Unauthorized",
  NOT_FOUND_LAT_LON: "Latitude or Longitude not found",
};

module.exports = { EXPIRATION, REDIS_PATTERN, STATUS_MESSAGES };
