# ride-simulator

You can find documentation in https://documenter.getpostman.com/view/19998146/2sA3JDfjXu

#### Register Rider

- POST http://localhost:3000/riders/create
  Json Body Payload:

```json
{
  "email": "kabul@gmail.comsdf",
  "name": "kabul",
  "phone": "01715662034"
}
```

Response

```json
{
  "rider_id": 29,
  "name": "kabul",
  "email": "kabul@gmail.comsdf",
  "phone": "01715662034",
  "type": "rider"
}
```

---

#### Register Driver

- POST http://localhost:3000/drivers/create
  Json Body Payload:

```json
{
  "name": "lalbanu",
  "phone": "01715662034"
}
```

Response

```json
{
  "driver_id": 11,
  "name": "lalbanu",
  "phone": "01715662034",
  "type": "driver"
}
```

---

#### Login Driver

- POST http://localhost:3000/drivers/login
  Json Body Payload:

```json
{
  "phone": "01715662034"
}
```

Response

```json
{
  "message": "OTP sent successfully"
}
```

---

#### Login Rider

- POST http://localhost:3000/riders/login
  Json Body Payload:

```json
{
  "phone": "01715662038"
}
```

It will return a token object (AES Encrypted email string)

```json
{
  "token": "this is user token"
}
```

---

#### Verify Rider OTP

- POST http://localhost:3000/riders/verify
  Json Body Payload:

```json
{
  "phone": "01715662034",
  "otp": "123456"
}
```

Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyaWRlcl9pZCI6MjksIm5hbWUiOiJrYWJ1bCIsImVtYWlsIjoia2FidWxAZ21haWwuY29tc2RmIiwicGhvbmUiOiIwMTcxNTY2MjAzNCIsInJvbGUiOiJyaWRlciIsImlhdCI6MTcxNDQyMjg5NywiZXhwIjoxNzE0NDI2NDk3fQ.mYFAXFRbkksp11PE0KcZyB_qgkj7P3FXr1yM5xaTKd0"
}
```

---

#### Verify Driver OTP

- POST http://localhost:3000/drivers/verify
  Json Body Payload:

```json
{
  "phone": "01303108598",
  "otp": "123456"
}
```

Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyaWRlcl9pZCI6MjksIm5hbWUiOiJrYWJ1bCIsImVtYWlsIjoia2FidWxAZ21haWwuY29tc2RmIiwicGhvbmUiOiIwMTcxNTY2MjAzNCIsInJvbGUiOiJyaWRlciIsImlhdCI6MTcxNDQyMjg5NywiZXhwIjoxNzE0NDI2NDk3fQ.mYFAXFRbkksp11PE0KcZyB_qgkj7P3FXr1yM5xaTKd0"
}
```

---

#### Driver Location Ping

- POST http://localhost:3000/drivers/location
  Json Body Payload:

```json
{
  "latitude": "22.82",
  "longitude": "89.55"
}
```

Add auth token to header

`token`: {token from login request}

Response

```json
{
  "status": "Location updated"
}
```

---

#### All Active Drivers

- GET http://localhost:3000/drivers/location/all
  Json Body Payload:

```json
{
  "latitude": "22.82",
  "longitude": "89.55"
}
```

Response

```json
["11", "8"]
```

---

#### Location of Driver

- GET http://localhost:3000/drivers/location/11
  Json Body Payload:

Add auth token to header

`token`: {token from login request}

Response

```json
{
  "latitude": "22.82",
  "longitude": "89.55",
  "phone": "01715662034",
  "role": "driver"
}
```

---

#### Find Nearest Driver

- POST http://localhost:3000/drivers/location/nearest
  Json Body Payload:

```json
{
  "latitude": "22.82",
  "longitude": "89.55"
}
```

Add auth token to header

`token`: {token from login request}

Response

```json
{
  "latitude": "22.82",
  "longitude": "89.55",
  "phone": "01715662034",
  "role": "driver"
}
```

---

#### Make Ride Request

- POST http://localhost:3000/rides/create
  Json Body Payload:

```json
{
  "pickupLon": "23.79",
  "pickupLat": "90.35",
  "dropoffLon": "23.75",
  "dropoffLat": "90.46"
}
```

Add auth token to header

`token`: {token from login request}

Response

```json
{
  "ride_id": 5,
  "ride_status": "requested",
  "rider_id": 24,
  "driver_id": null,
  "pickup_lon": 23.79,
  "pickup_lat": 90.35,
  "dropoff_lon": 23.75,
  "dropoff_lat": 90.46
}
```

---

#### Update Ride Status

- PATCH http://localhost:3000/rides/update/3
  Json Body Payload:

```json
{
  "status": "start"
}
```

You can use "accept", "start", "end" and "cancel" in status
Add auth token to header

`token`: {token from login request}

Response

```json
{
  "ride_id": 4,
  "ride_status": "start",
  "rider_id": 24,
  "driver_id": 11,
  "pickup_lon": 23.79,
  "pickup_lat": 90.35,
  "dropoff_lon": 23.75,
  "dropoff_lat": 90.46
}
```

---

## Architecture

![Alt text](architecture.png "ARCHITECTURE")
