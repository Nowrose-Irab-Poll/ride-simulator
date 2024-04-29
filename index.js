// dependencies
const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const Redis = require("redis");
const { Pool } = require("pg");
const {
  EXPIRATION,
  REDIS_PATTERN,
  STATUS_MESSAGES,
  DRIVER_RIDE_STATUS,
} = require("./constants.js");
const {
  validateEmail,
  validatePhone,
  sendOTPtoPhone,
  generateOTP,
  findNearestDriver,
  matchOTP,
} = require("./util.js");

const app = express();
require("dotenv").config();

// API port
const port = process.env.PORT || 3000;

// Postgresql Client Initialization
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Redis Client Initiazation
const redisClient = Redis.createClient();
redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.connect();

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers?.token;
  if (!token)
    return res.status(401).json({ message: STATUS_MESSAGES.UNAUTHORIZED });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.phone = decoded.phone;
    // req.id = decoded.driver_id;
    req.decoded = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: STATUS_MESSAGES.INVALID_TOKEN });
  }
};

// Register rider
app.post("/riders/create", async (req, res) => {
  const { name, phone, email } = req.body;

  // Validate email and phone
  if (!validateEmail(email)) {
    return res.status(400).json({ message: STATUS_MESSAGES.INVALID_EMAIL });
  }

  if (!validatePhone(phone)) {
    return res.status(400).json({ message: STATUS_MESSAGES.INVALID_PHONE });
  }

  // Insert rider into database
  try {
    const client = await pool.connect();
    const query =
      "INSERT INTO Riders (name, phone, email) VALUES ($1, $2, $3) RETURNING *";
    const values = [name, phone, email];
    const result = await client.query(query, values);
    client.release();

    const response = result.rows[0];
    response.type = "rider";
    res.status(201).json(response);
  } catch (error) {
    // Check if error is due to unique violation
    if (error.code === "23505" && error.constraint === "phone") {
      return res.status(409).json({ message: STATUS_MESSAGES.CONFLICT_PHONE });
    } else if (error.code === "23505" && error.constraint === "email") {
      return res.status(409).json({ message: STATUS_MESSAGES.CONFLICT_EMAIL });
    } else {
      console.error("Error inserting rider:", error);
      return res
        .status(500)
        .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
});

// Register driver
app.post("/drivers/create", async (req, res) => {
  const { name, phone } = req.body;

  // Validate phone
  if (!validatePhone(phone)) {
    return res.status(400).json({ message: STATUS_MESSAGES.INVALID_PHONE });
  }

  // Insert driver into database
  try {
    const client = await pool.connect();
    const query =
      "INSERT INTO Drivers (name, phone) VALUES ($1, $2) RETURNING *";
    const values = [name, phone];
    const result = await client.query(query, values);
    client.release();

    const response = result.rows[0];
    response.type = "driver";
    res.status(201).json(response);
  } catch (error) {
    // Check if error is due to unique violation
    if (error.code === "23505" && error.constraint === "drivers_phone_key") {
      return res.status(409).json({ message: STATUS_MESSAGES.CONFLICT_PHONE });
    } else {
      console.error("Error inserting rider:", error);
      return res
        .status(500)
        .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
    }
  }
});

// Driver login
app.post("/drivers/login", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ message: STATUS_MESSAGES.NOT_FOUND_PHONE });
    }

    // Check if driver exists in the database
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM Drivers WHERE phone = $1",
      [phone]
    );
    const driverEntity = result.rows[0];
    client.release();

    if (!driverEntity) {
      return res
        .status(401)
        .json({ message: STATUS_MESSAGES.NOT_REGISTERED_DRIVER });
    }

    const otp = generateOTP();

    redisClient.setEx(`${REDIS_PATTERN.OTP}${phone}`, EXPIRATION.OTP, otp);

    sendOTPtoPhone(phone, otp);

    res.status(200).json({ message: STATUS_MESSAGES.SUCCESS_OTP_SENT });
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// Rider login
app.post("/riders/login", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ message: STATUS_MESSAGES.NOT_FOUND_PHONE });
      return;
    }

    // Check if driver exists in the database
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM Riders WHERE phone = $1", [
      phone,
    ]);
    const riderEntity = result.rows[0];
    client.release();

    if (!riderEntity) {
      res.status(401).json({ message: STATUS_MESSAGES.NOT_REGISTERED_RIDER });
      return;
    }

    const otp = generateOTP();

    redisClient.setEx(`${REDIS_PATTERN.OTP}${phone}`, EXPIRATION.OTP, otp);

    sendOTPtoPhone(phone, otp);

    res.status(200).json({ message: STATUS_MESSAGES.SUCCESS_OTP_SENT });
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// Verify Driver OTP
app.post("/drivers/verify", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Check if phone and OTP exists
    if (!phone || !otp) {
      // data missing
      return res
        .status(400)
        .json({ message: STATUS_MESSAGES.NOT_FOUND_PHONE_OTP });
    }
    // Check if OTP is valid

    const sentOTP = await redisClient.get(`${REDIS_PATTERN.OTP}${phone}`);
    if (sentOTP != otp) {
      // Invalid OTP
      return res.status(400).json({ message: STATUS_MESSAGES.INVALID_OTP });
    }
    // Check if driver exists in the database

    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM Drivers WHERE phone = $1",
      [phone]
    );
    client.release();

    if (result.rows.length > 0) {
      const driverEntity = result.rows[0];
      driverEntity.role = "driver";
      // Driver exists, generate JWT token
      const token = jwt.sign(driverEntity, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      redisClient.del(`${REDIS_PATTERN.OTP}${phone}`);

      res.status(200).json({ token });
    } else {
      // Driver not found in the database
      res.status(404).json({ message: STATUS_MESSAGES.NOT_REGISTERED_DRIVER });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// Verify Rider OTP
app.post("/riders/verify", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Check if phone and OTP exists
    if (!phone || !otp) {
      // data missing
      return res
        .status(400)
        .json({ message: STATUS_MESSAGES.NOT_FOUND_PHONE_OTP });
    }
    // Check if OTP is valid

    const sentOTP = await redisClient.get(`${REDIS_PATTERN.OTP}${phone}`);
    console.log(sentOTP, otp);
    if (!matchOTP(sentOTP, otp)) {
      // Invalid OTP
      return res.status(400).json({ message: STATUS_MESSAGES.INVALID_OTP });
    }

    // Check if driver exists in the database

    const client = await pool.connect();
    const result = await client.query("SELECT * FROM Riders WHERE phone = $1", [
      phone,
    ]);
    client.release();

    if (result.rows.length > 0) {
      const riderEntity = result.rows[0];
      riderEntity.role = "rider";
      // Driver exists, generate JWT token
      const token = jwt.sign(riderEntity, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      redisClient.del(`${REDIS_PATTERN.OTP}${phone}`);

      res.status(200).json({ token });
    } else {
      // Driver not found in the database
      res.status(404).json({ message: STATUS_MESSAGES.NOT_REGISTERED_RIDER });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// Update driver location
app.post("/drivers/location", verifyToken, (req, res) => {
  try {
    const { phone, driver_id, role } = req.decoded;
    if (role != "driver") {
      return res.status(401).json({ message: STATUS_MESSAGES.UNAUTHORIZED });
    }
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: STATUS_MESSAGES.NOT_FOUND_LAT_LON });
    }
    console.log("Location Ping:", {
      latitude,
      longitude,
      phone,
      driver_id,
      role,
    });

    // updating driver's location in redis
    redisClient.setEx(
      `${REDIS_PATTERN.DRIVER_LOCATION}${driver_id}`,
      EXPIRATION.LOCATION,
      JSON.stringify({
        latitude,
        longitude,
        phone,
        role,
      })
    );

    res.status(200).json({ status: STATUS_MESSAGES.SUCCESS_LOCATION });
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// get all active drivers
// for debugging purpose, so no token verification added
app.get("/drivers/location/all", async (req, res) => {
  try {
    // fetching all active drivers from  redis
    const data = await redisClient.keys(`${REDIS_PATTERN.DRIVER_LOCATION}*`);
    console.log(data);
    const allActiveDrivers = data.map((item) =>
      item.substring(REDIS_PATTERN.DRIVER_LOCATION.length)
    );
    res.json(allActiveDrivers);
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// finding a nearest driver available
app.post("/drivers/location/nearest", verifyToken, async (req, res) => {
  try {
    const { phone, rider_id, role } = req.decoded;

    // check if rider or not
    // decoded data from token
    console.log("Find nearest driver Request from:", {
      phone,
      rider_id,
      role,
    });
    if (role == "rider") {
      const { latitude, longitude } = req.body;
      if (!latitude || !longitude) {
        return res.status(401).json({ message: STATUS_MESSAGES.UNAUTHORIZED });
      }
      console.log("Rider Location Ping:", {
        latitude,
        longitude,
        phone,
        rider_id,
        role,
      });

      // fetching all active drivers from  redis
      const data = await redisClient.keys(`${REDIS_PATTERN.DRIVER_LOCATION}*`);
      console.log(data);
      const allActiveDrivers = data.map((item) =>
        item.substring(REDIS_PATTERN.DRIVER_LOCATION.length)
      );

      // fetching live locations of active drivers
      const activeDriverLocations = await Promise.all(
        allActiveDrivers.map(async (driverId) => {
          return JSON.parse(
            await redisClient.get(`${REDIS_PATTERN.DRIVER_LOCATION}${driverId}`)
          );
        })
      );

      // finding nearest driver
      const riderLocation = { latitude, longitude };
      const nearestDriver = findNearestDriver(
        riderLocation,
        activeDriverLocations
      );
      console.log("nearestDriver:", nearestDriver);
      res.json(nearestDriver);
    } else {
      res.status(400).json({ message: STATUS_MESSAGES.NOT_FOUND_LAT_LON });
    }
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// get live location of driver by id
app.get("/drivers/location/:id", verifyToken, async (req, res) => {
  try {
    // decoded data from token
    const { phone, rider_id, role } = req.decoded;

    // check if rider or not
    if (role != "rider") {
      return res.status(401).json({ message: STATUS_MESSAGES.UNAUTHORIZED });
    }
    const driverId = req.params.id;
    console.log("Request received from:", { phone, rider_id, role }, "for:", {
      driverId,
    });

    // fetching driver's live location from  redis
    const data = await redisClient.get(
      `${REDIS_PATTERN.DRIVER_LOCATION}${driverId}`
    );

    if (data) res.status(200).json(JSON.parse(data));
    else res.status(404).json({ message: STATUS_MESSAGES.INACTIVE_DRIVER });
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// Ride Request
app.post("/rides/create", verifyToken, async (req, res) => {
  try {
    const { pickupLon, pickupLat, dropoffLon, dropoffLat } = req.body;

    console.log(pickupLon, pickupLat, dropoffLon, dropoffLat);
    // Check pickup and dropoff locations
    if (!(pickupLon && pickupLat && dropoffLon && dropoffLat)) {
      return res
        .status(400)
        .json({ message: STATUS_MESSAGES.NOT_FOUND_LAT_LON });
    }

    // decoded data from token
    const { phone, rider_id, role } = req.decoded;

    // check if rider or not
    if (role != "rider") {
      return res.status(401).json({ message: STATUS_MESSAGES.UNAUTHORIZED });
    }

    // Insert rider into database

    const client = await pool.connect();
    const query =
      "INSERT INTO Rides (rider_id, pickup_lon, pickup_lat, dropoff_lon, dropoff_lat, ride_status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *";
    const values = [
      rider_id,
      pickupLon,
      pickupLat,
      dropoffLon,
      dropoffLat,
      "requested",
    ];
    const result = await client.query(query, values);
    client.release();

    const response = result.rows[0];
    res.status(201).json(response);
  } catch (error) {
    console.error("Error inserting ride:", error);
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

// Ride Request
app.patch("/rides/update/:id", verifyToken, async (req, res) => {
  try {
    // decoded data from token
    const { phone, driver_id, role } = req.decoded;

    // check if rider or not
    if (role != "driver") {
      return res.status(401).json({ message: STATUS_MESSAGES.UNAUTHORIZED });
    }
    const rideId = req.params.id;
    const newStatus = req.body.status;
    console.log({ rideId, newStatus });

    if (!DRIVER_RIDE_STATUS.get(newStatus)) {
      return res
        .status(401)
        .json({ message: STATUS_MESSAGES.INVALID_RIDE_STATUS });
    }
    const client = await pool.connect();

    // check current ride status
    const getRideStatusQuery =
      "SELECT ride_status FROM Rides WHERE ride_id = $1";
    const rideStatusQueryValues = [rideId];
    const rideStatusResult = await client.query(
      getRideStatusQuery,
      rideStatusQueryValues
    );

    const rideStatusEntity = rideStatusResult.rows[0];

    // making sure that ride status only moves forward
    if (
      DRIVER_RIDE_STATUS.get(newStatus) ==
      DRIVER_RIDE_STATUS.get(rideStatusEntity.ride_status)
    ) {
      return res
        .status(302)
        .json({ message: STATUS_MESSAGES.UNMODIFIED_RIDE_STATUS });
    } else if (
      DRIVER_RIDE_STATUS.get(newStatus) <
      DRIVER_RIDE_STATUS.get(rideStatusEntity.ride_status)
    ) {
      return res
        .status(401)
        .json({ message: STATUS_MESSAGES.INVALID_RIDE_STATUS });
    }

    // Update ride status into database
    const updateQuery =
      "UPDATE Rides SET ride_status = $1, driver_id = $2 WHERE ride_id = $3 RETURNING *";
    const values = [newStatus, driver_id, rideId];
    const result = await client.query(updateQuery, values);
    client.release();

    const rideEntity = result.rows[0];

    res.status(200).json(rideEntity);
  } catch (e) {
    return res
      .status(500)
      .json({ message: STATUS_MESSAGES.INTERNAL_SERVER_ERROR });
  }
});

app.get("/", (req, res) => {
  res.json({ info: "Ride Simulator API" });
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});
