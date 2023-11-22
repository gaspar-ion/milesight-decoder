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

    let data, sensorData;
    if (body.data !== undefined && body.data != null) {
        data = decodeUplinkAM319(body.data);
        sensorData = SensorDataDecoder(body.data);
    }

    console.log("Data: ", {data, sensorData})
    res.status(200).send({ data, sensorData });
});

app.post("/decodeEM310", upload.single('archivoEM310'), (req, res) => {
    console.log("Datos recibidos");
    const body = req.body;

    let data, sensorData;
    if (body.data !== undefined && body.data != null) {
        data = DecodeEM310(null, body.data);
        sensorData = SensorDataDecoder(body.data);
    }

    console.log("Data: ", { data, sensorData })
    res.status(200).send({ data, sensorData });
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
 * Payload Decoder for Milesight Network Server
 *
 * Copyright 2023 Milesight IoT
 *
 * @product EM310-UDL
 */
function DecodeEM310(fPort, input) {
    console.log(input);
    let bytes = hexStringToByteArray(input);
    return milesightEM310(bytes);
}

function milesightEM310(bytes) {
    var decoded = {};

    for (var i = 0; i < bytes.length;) {
        var channel_id = bytes[i++];
        var channel_type = bytes[i++];
        // BATTERY
        if (channel_id === 0x01 && channel_type === 0x75) {
            decoded.battery = bytes[i];
            i += 1;
        }
        // DISTANCE
        else if (channel_id === 0x03 && channel_type === 0x82) {
            decoded.distance = readUInt16LE(bytes.slice(i, i + 2));
            i += 2;
        }
        // POSITION
        else if (channel_id === 0x04 && channel_type === 0x00) {
            decoded.position = bytes[i] === 0 ? "normal" : "tilt";
            i += 1;
        } else {
            break;
        }
    }

    return decoded;
}

/**
 * Payload Decoder for Chirpstack v4
 *
 * Copyright 2023 Milesight IoT
 *
 * @product AM307 / AM308 / AM319
 */
function decodeUplinkAM319(input) {
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

let deviceData = {};
function SensorDataDecoder(hexData) {
    const toBool = value => value == '1';
    let decbin = (number) => {
        if (number < 0) {
            number = 0xFFFFFFFF + number + 1
        }
        return parseInt(number, 10).toString(2)
    }

    const handleKeepAliveData = (byteArray) => {
        let tmp = ("0" + byteArray[6].toString(16)).substr(-2);
        let motorRange1 = tmp[1];
        let motorRange2 = ("0" + byteArray[5].toString(16)).substr(-2);
        let motorRange = parseInt(`0x${motorRange1}${motorRange2}`, 16);

        let motorPos2 = ("0" + byteArray[4].toString(16)).substr(-2);
        let motorPos1 = tmp[0];
        let motorPosition = parseInt(`0x${motorPos1}${motorPos2}`, 16);

        let batteryTmp = ("0" + byteArray[7].toString(16)).substr(-2)[0];
        let batteryVoltageCalculated = 2 + parseInt(`0x${batteryTmp}`, 16) * 0.1;

        let byteBin = decbin(byteArray[7]);
        let openWindow = byteBin.charAt(4);
        let highMotorConsumption = byteBin.charAt(5);
        let lowMotorConsumption = byteBin.charAt(6);
        let brokenSensor = byteBin.charAt(7);
        let childLockBin = decbin(byteArray[8]);
        let childLock = childLockBin.charAt(0);

        let sensorTemp;
        if (byteArray[0] == 1) {
            sensorTemp = (byteArray[2] * 165) / 256 - 40;
        }
        if (byteArray[0] == 129) {
            sensorTemp = (byteArray[2] - 28.33333) / 5.66666;
        }

        let keepaliveData = {
            reason: byteArray[0],
            targetTemperature: byteArray[1],
            sensorTemperature: sensorTemp,
            relativeHumidity: (byteArray[3] * 100) / 256,
            motorRange: motorRange,
            motorPosition: motorPosition,
            batteryVoltage: batteryVoltageCalculated,
            openWindow: toBool(openWindow),
            childLock: toBool(childLock),
            highMotorConsumption: toBool(highMotorConsumption),
            lowMotorConsumption: toBool(lowMotorConsumption),
            brokenSensor: toBool(brokenSensor)
        }

        Object.assign(deviceData, { ...deviceData }, { ...keepaliveData })
    }

    if (hexData) {
        let byteArray = hexData.match(/.{1,2}/g).map(byte => { return parseInt(byte, 16) })
        if (byteArray[0] == 1 || byteArray[0] == 129) {
            // its a keeapalive
            handleKeepAliveData(byteArray);
        } else {
            let resultToPass = {};
            let data = hexData.slice(0, -18);
            let commands = data.match(/.{1,2}/g);
            let command_len = 0;
            // console.log(data)

            commands.map((command, i) => {
                switch (command) {
                    case '04':
                        {
                            command_len = 2;
                            let data = { deviceVersions: { hardware: Number(commands[i + 1]), software: Number(commands[i + 2]) } };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '12':
                        {
                            command_len = 1;
                            let data = { keepAliveTime: parseInt(commands[i + 1], 16) };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '13':
                        {
                            command_len = 4;
                            let enabled = toBool(parseInt(commands[i + 1], 16));
                            let duration = parseInt(commands[i + 2], 16) * 5;
                            let tmp = ("0" + commands[i + 4].toString(16)).substr(-2);
                            let motorPos2 = ("0" + commands[i + 3].toString(16)).substr(-2);
                            let motorPos1 = tmp[0];
                            let motorPosition = parseInt(`0x${motorPos1}${motorPos2}`, 16);
                            let delta = Number(tmp[1]);

                            let data = { openWindowParams: { enabled: enabled, duration: duration, motorPosition: motorPosition, delta: delta } };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });

                        }
                        break;
                    case '14':
                        {
                            command_len = 1;
                            let data = { childLock: toBool(parseInt(commands[i + 1], 16)) };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '15':
                        {
                            command_len = 2;
                            let data = { temperatureRangeSettings: { min: parseInt(commands[i + 1], 16), max: parseInt(commands[i + 2], 16) } };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '16':
                        {
                            command_len = 2;
                            let data = { internalAlgoParams: { period: parseInt(commands[i + 1], 16), pFirstLast: parseInt(commands[i + 2], 16), pNext: parseInt(commands[i + 3], 16) } };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '17':
                        {
                            command_len = 2;
                            let data = { internalAlgoTdiffParams: { warm: parseInt(commands[i + 1], 16), cold: parseInt(commands[i + 2], 16) } };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '18':
                        {
                            command_len = 1;
                            let data = { operationalMode: (commands[i + 1]).toString() };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '19':
                        {
                            command_len = 1;
                            let commandResponse = parseInt(commands[i + 1], 16);
                            let periodInMinutes = (commandResponse * 5) / 60;
                            let data = { joinRetryPeriod: periodInMinutes };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '1b':
                        {
                            command_len = 1;
                            let data = { uplinkType: commands[i + 1] };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '1d':
                        {
                            command_len = 2;
                            let deviceKeepAlive = deviceData.keepAliveTime ? deviceData.keepAliveTime : 5;
                            let wdpC = commands[i + 1] == '00' ? false : (commands[i + 1] * deviceKeepAlive) + 7;
                            let wdpUc = commands[i + 2] == '00' ? false : parseInt(commands[i + 2], 16);
                            let data = { watchDogParams: { wdpC, wdpUc } };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '1f':
                        {
                            command_len = 1;
                            let data = { primaryOperationalMode: commands[i + 1] };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '21':
                        {
                            command_len = 6;
                            let data = {
                                batteryRangesBoundaries: {
                                    Boundary1: parseInt(`${commands[i + 1]}${commands[i + 2]}`, 16),
                                    Boundary2: parseInt(`${commands[i + 3]}${commands[i + 4]}`, 16),
                                    Boundary3: parseInt(`${commands[i + 5]}${commands[i + 6]}`, 16),

                                }
                            };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '23':
                        {
                            command_len = 4;
                            let data = {
                                batteryRangesOverVoltage: {
                                    Range1: parseInt(commands[i + 2], 16),
                                    Range2: parseInt(commands[i + 3], 16),
                                    Range3: parseInt(commands[i + 4], 16),
                                }
                            };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '27':
                        {
                            command_len = 1;
                            let data = { OVAC: parseInt(commands[i + 1], 16) };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;
                    case '28':
                        {
                            command_len = 1;
                            let data = { manualTargetTemperatureUpdate: parseInt(commands[i + 1], 16) };
                            Object.assign(resultToPass, { ...resultToPass }, { ...data });
                        }
                        break;

                }
                commands.splice(i, command_len);
            })

            Object.assign(deviceData, { ...deviceData }, { ...resultToPass });

            // get only keepalive from device response
            let keepaliveData = hexData.slice(-18);
            let dataToPass = keepaliveData.match(/.{1,2}/g).map(byte => { return parseInt(byte, 16) });

            handleKeepAliveData(dataToPass);
        }
        return deviceData;
    }

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