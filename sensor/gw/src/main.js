#!/usr/bin/env node

var Packet = require('./lib/packet.js');
var BleDevice = require('./lib/bledevice.js');

var sensorDevice;
var packets;

function initDevice(definition) {
	sensorDevice = new BleDevice(definition);
	sensorDevice.on('ready', onDeviceReady);
	sensorDevice.onReceive('Key_Press_State', onKeyPressData);
// sensorDevice.onReceive('Movement_Data', (data)=>{
// 	console.log("movement data:", data);
// });
	sensorDevice.onReceive('Light_Sensor_Data', onLightSensorData);
}

var sensortag = require('./ti-sensortag-2015.json');
initDevice(sensortag);
if(sensortag.packets) {
	if(packet == null)
		packets = new Object();
	for(var packet in sensortag.packets) {
		var packetDefine = sensortag.packets[packet];
		packets[packet] = new Packet(packetDefine);
	}
}

function onDeviceReady() {
	console.log('ble device is ready!');
	sensorDevice.startReceiveData('Key_Press_State');
	// sensorDevice.startReceiveData('Movement_Data');
	// setTimeout(()=>{
	// 	var command = packets.Movement_Config.getBuffer({
	// 		Accelerometer: 'on',
	// 		Gyroscope: 'on',
	// 		Magnetometer: 'on'
	// 	 });
	// 	sensorDevice.sendData(command, 'Movement_Config');
	// 	sensorDevice.sendData(new Buffer([100]), 'Movement_Period');
	// }, 500);
	sensorDevice.startReceiveData('Light_Sensor_Data');
	setTimeout(()=>{
		var command = packets.Light_Sensor_Config.getBuffer({
			"Switch": "on"
		});
		sensorDevice.sendData(command, 'Light_Sensor_Config');
	}, 500);
}

function onKeyPressData(data) {
	console.log('receive key press data:', data);
	if(packets.Key_Press_State) {
		var result = packets.Key_Press_State.parseBuffer(data);
		console.log('key press:', result.data);
		if((result.data.Key1 == "down") && (result.data.Key2 == "up"))
			sendAllLightPowerRequest("on");
		else if((result.data.Key1 == "up") && (result.data.Key2 == "down"))
			sendAllLightPowerRequest("off");
	}
}

const lowLightThreshold = 500;
var lowLightMax = 10;
var lowLightCount = 0;

var http = require('http');
var queryString = require('querystring');

function onLightSensorData(data) {
	console.log("light sensor data:", data);
	var value = data[0] + data[1] * 0x100;
	var e = value >> 12;
	var m = value & 0x0FFF;
	var o = m * Math.pow(2, e) / 100;
	console.log('light sensor: ' + o);
	io.emit('light-sensor-value', '' + o);
	if(o < lowLightThreshold) {
		if(lowLightCount <= lowLightMax) {
			lowLightCount++;
			if(lowLightCount == lowLightMax)
				sendAllLightPowerRequest("on");
		}	
	}
	else
		lowLightCount = 0;
}

var lighting_host = 'localhost';
var argc = process.argv.length;
if(argc > 2) {
	lighting_host = process.argv[2];
}

function sendAllLightPowerRequest(operation)
{
	var postData = queryString.stringify({
		"id": "Light1",
		"operation": operation
	});
	var req = http.request({
		host: lighting_host,
		port: 9000,
		path: '/api/command/light/power',
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(postData)
		}
	}, (res)=>{
		console.log(`STATUS: ${res.statusCode}`);
		console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
		res.setEncoding('utf8');
		res.on('data', (chunk) => {
			console.log(`BODY: ${chunk}`);
		});
		res.on('end', () => {
			console.log('No more data in response.');
		});
	}); 
	req.on('error', (e) => {
		console.log(`problem with request: ${e.message}`);
	});
	req.write(postData);
	req.end();
}


var noble = require('noble');

noble.on('stateChange', function(state) {
	console.log('ble state changed: ' + state);
	if(state == 'poweredOn')
		startScanning();
})

noble.on('discover', function(peripheral) {
	console.log('ble found peripheral: ', {
		id: peripheral.id,
		rssi: peripheral.rssi
	}, 'advertisement: ', peripheral.advertisement);
	if(sensorDevice.peripheral == null) {
		noble.stopScanning();
		sensorDevice.setPeripheral(peripheral);
		peripheral.connect(function(error) {
			if(error)
				console.log('cannot connect peripheral');
			else {
				console.log('connected to device: ' + peripheral.id);
				peripheral.discoverServices(null, function(error, services) {
					if(error)
						console.log('failed to discover services');
					else
						for(var service of services) {
							console.log('discovered service: ' + service.uuid);
							service.discoverCharacteristics(null, function(error, characteristics) {
								if(error)
									console.log('cannot discover characteristics of service: ' + service.uuid);
								else {
									console.log('discovered characteristics: ');
									for(var characteristic of characteristics) {
										console.log('characteristic uuid: ' + characteristic.uuid + ' properties: ' + characteristic.properties);
										sensorDevice.addCharacteristic(characteristic);
									}
									sensorDevice.checkCharacteristics();
								}
							})
						}
				});
			}
		});
	}
})

function startScanning() {
	if((sensorDevice != null) && (noble.state == 'poweredOn'))
		noble.startScanning([sensorDevice.define.mainService], false);
}

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(80);

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/www/index.html');
});

app.use(express.static(__dirname + '/www'));

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});
