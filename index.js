const express = require("express");
const cors = require("cors");
const http = require("http");
const axios = require("axios");
const multer = require('multer');
// const fs = require('fs');

const PORT = 3000;
const HOST = '0.0.0.0';
const app = express();

// Cookies
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", true);
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, authorization"
    );
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
    next();
});

app.use(express.json());

app.use(
    cors({
        credentials: true,
        origin: function (origin, callback) {
            return callback(null, true);
        }
    })
);

// Configura Multer para manejar form-data
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ============ ROUTES ===========
app.get("/", (req, res) => {
    res.status(200).send({ "message": "Route working" });
});

app.post("/decodeUplink", upload.single('archivo'), (req, res) => {
    console.log("Datos recibidos");
    const body = req.body;

    let data;
    if (body.data !== undefined && body.data != null) {
        console.log(body.data);
        data = decodeUplink(body.data);
    }

    console.log("Data: ", data)
    res.status(200).send(data);
});

app.get("/check", (req, res) => {
    res.status(200).send("Server is running");
});

// ============ LISTEN SERVER ===========
app.listen(PORT, HOST, () => {
    console.log("Listening on *:" + PORT);
});

// const httpServer = http.createServer(app);
// httpServer.listen(PORT);

function hexStringToByteArray(hexString) {
    var byteArray = [];
    for (var i = 0; i < hexString.length; i += 2) {
        byteArray.push(parseInt(hexString.substr(i, 2), 16));
    }
    return byteArray;
}

/**
 * Payload Decoder for Chirpstack v4
 *
 * Copyright 2023 Milesight IoT
 *
 * @product AM307 / AM308 / AM319
 */
function decodeUplink(input) {
    let bytes = hexStringToByteArray(input);
    var decoded = milesight(bytes);
    return { data: decoded };
}

function milesight(bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length;) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // TEMPERATURE
        else if (channel_id === 0x03 && channel_type === 0x67) {
            // ℃
            decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;

            // ℉
            // decoded.temperature = readInt16LE(bytes.slice(i, i + 2)) / 10 * 1.8 + 32;
            // i +=2;
        }
        // HUMIDITY
        else if (channel_id === 0x04 && channel_type === 0x68) {
            decoded.humidity = bytes[i] / 2;
            i += 1;
        }
        // PIR
        else if (channel_id === 0x05 && channel_type === 0x00) {
            decoded.pir = bytes[i] === 1 ? "trigger" : "idle";
            i += 1;
        }
        // LIGHT
        else if (channel_id === 0x06 && channel_type === 0xcb) {
            decoded.light_level = bytes[i];
            i += 1;
        }
        // CO2
        else if (channel_id === 0x07 && channel_type === 0x7d) {
            decoded.co2 = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // TVOC
        else if (channel_id === 0x08 && channel_type === 0x7d) {
            decoded.tvoc = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // PRESSURE
        else if (channel_id === 0x09 && channel_type === 0x73) {
            decoded.pressure = readUInt16LE(bytes.slice(i, i + 2)) / 10;
            i += 2;
        }
        // HCHO
        else if (channel_id === 0x0a && channel_type === 0x7d) {
            decoded.hcho = readUInt16LE(bytes.slice(i, i + 2)) / 100;
            i += 2;
        }
        // PM2.5
        else if (channel_id === 0x0b && channel_type === 0x7d) {
            decoded.pm2_5 = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // PM10
        else if (channel_id === 0x0c && channel_type === 0x7d) {
            decoded.pm10 = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // O3
        else if (channel_id === 0x0d && channel_type === 0x7d) {
            decoded.o3 = readUInt16LE(bytes.slice(i, i + 2)) / 100;
            i += 2;
        }
        // BEEP
        else if (channel_id === 0x0e && channel_type === 0x01) {
            decoded.beep = bytes[i] === 1 ? "yes" : "no";
            i += 1;
        }
        // HISTORY DATA (AM307)
        else if (channel_id === 0x20 && channel_type === 0xce) {
            var data = {};
            data.timestamp = readUInt32LE(bytes.slice(i, i + 4));
            data.temperature = readInt16LE(bytes.slice(i + 4, i + 6)) / 10;
            data.humidity = readUInt16LE(bytes.slice(i + 6, i + 8)) / 2;
            data.pir = bytes[i + 8] === 1 ? "trigger" : "idle";
            data.light_level = bytes[i + 9];
            data.co2 = readUInt16LE(bytes.slice(i + 10, i + 12));
            data.tvoc = readUInt16LE(bytes.slice(i + 12, i + 14));
            data.pressure = readUInt16LE(bytes.slice(i + 14, i + 16)) / 10;
            i += 16;

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // HISTORY DATA (AM308)
        else if (channel_id === 0x20 && channel_type === 0xce) {
            var data = {};
            data.timestamp = readUInt32LE(bytes.slice(i, i + 4));
            data.temperature = readInt16LE(bytes.slice(i + 4, i + 6)) / 10;
            data.humidity = readUInt16LE(bytes.slice(i + 6, i + 8)) / 2;
            data.pir = bytes[i + 8] === 1 ? "trigger" : "idle";
            data.light_level = bytes[i + 9];
            data.co2 = readUInt16LE(bytes.slice(i + 10, i + 12));
            data.tvoc = readUInt16LE(bytes.slice(i + 12, i + 14));
            data.pressure = readUInt16LE(bytes.slice(i + 14, i + 16)) / 10;
            data.pm2_5 = readUInt16LE(bytes.slice(i + 16, i + 18));
            data.pm10 = readUInt16LE(bytes.slice(i + 18, i + 20));
            i += 20;

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // HISTORY DATA (AM319 CH2O)
        else if (channel_id === 0x20 && channel_type === 0xce) {
            var data = {};
            data.timestamp = readUInt32LE(bytes.slice(i, i + 4));
            data.temperature = readInt16LE(bytes.slice(i + 4, i + 6)) / 10;
            data.humidity = readUInt16LE(bytes.slice(i + 6, i + 8)) / 2;
            data.pir = bytes[i + 8] === 1 ? "trigger" : "idle";
            data.light_level = bytes[i + 9];
            data.co2 = readUInt16LE(bytes.slice(i + 10, i + 12));
            data.tvoc = readUInt16LE(bytes.slice(i + 12, i + 14));
            data.pressure = readUInt16LE(bytes.slice(i + 14, i + 16)) / 10;
            data.pm2_5 = readUInt16LE(bytes.slice(i + 16, i + 18));
            data.pm10 = readUInt16LE(bytes.slice(i + 18, i + 20));
            data.hcho = readUInt16LE(bytes.slice(i + 20, i + 22)) / 100;
            i += 22;

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        }
        // HISTORY DATA (AM319 O3)
        else if (channel_id === 0x20 && channel_type === 0xce) {
            var data = {};
            data.timestamp = readUInt32LE(bytes.slice(i, i + 4));
            data.temperature = readInt16LE(bytes.slice(i + 4, i + 6)) / 10;
            data.humidity = readUInt16LE(bytes.slice(i + 6, i + 8)) / 2;
            data.pir = bytes[i + 8] === 1 ? "trigger" : "idle";
            data.light_level = bytes[i + 9];
            data.co2 = readUInt16LE(bytes.slice(i + 10, i + 12));
            data.tvoc = readUInt16LE(bytes.slice(i + 12, i + 14));
            data.pressure = readUInt16LE(bytes.slice(i + 14, i + 16)) / 10;
            data.pm2_5 = readUInt16LE(bytes.slice(i + 16, i + 18));
            data.pm10 = readUInt16LE(bytes.slice(i + 18, i + 20));
            data.o3 = readUInt16LE(bytes.slice(i + 20, i + 22)) / 100;
            i += 22;

            decoded.history = decoded.history || [];
            decoded.history.push(data);
        } else {
            break;
        }
    }

    return decoded;
}

/* ******************************************
 * bytes to number
 ********************************************/
function readUInt16LE(bytes) {
    var value = (bytes[1] << 8) + bytes[0];
    return value & 0xffff;
}

function readInt16LE(bytes) {
    var ref = readUInt16LE(bytes);
    return ref > 0x7fff ? ref - 0x10000 : ref;
}

function readUInt32LE(bytes) {
    var value = (bytes[3] << 24) + (bytes[2] << 16) + (bytes[1] << 8) + bytes[0];
    return (value & 0xffffffff) >>> 0;
}

function readInt32LE(bytes) {
    var ref = readUInt32LE(bytes);
    return ref > 0x7fffffff ? ref - 0x100000000 : ref;
}