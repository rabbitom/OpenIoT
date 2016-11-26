#!/usr/bin/env node

var fs = require('fs');
var Packet = require('./lib/packet.js');
var BleDevice = require('./lib/bledevice.js');

var featureDefines;

fs.readFile('sensor-features.json', {encoding: "utf8", flag: "r"}, function(err, data) {
	if(err)
		console.log("failed to open packet definition file due to error: " + err);
	else {
		featuredDefines = JSON.parse(data);
	}
});

var sensorDevice;
var myPeripheral;

function initDevice(definition) {
	sensorDevice = new BleDevice(definition);
	sensorDevice.on('ready', onDeviceReady);
	sensorDevice.onReceive('COMMAND_REPLY', onDeviceReceiveData);
	startScanning();
}

fs.readFile('dialog-iot-sensor.json', {encoding: "utf8", flag: "r"}, function(err, data) {
	if(err)
		console.log("failed to open device definition file due to error: " + err);
	else {
		var definition = JSON.parse(data);
		initDevice(definition);
	}
});

function onDeviceReady() {
	console.log('ble device is ready!');
	sensorDevice.startReceiveData('COMMAND_REPLY');
	setTimeout(()=>{
		var command = new Buffer(1);
		command[0] = 11;
		sensorDevice.sendData(command, 'CONTROL_POINT');
	}, 500);
}

var receiveBuffer;

function onDeviceReceiveData(data) {
	if(receiveBuffer == null)
		receiveBuffer = data;
	else
		receiveBuffer = Buffer.concat([receiveBuffer, data]);
	console.log('receive buffer: ', receiveBuffer);
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
	if(myPeripheral == null) {
		noble.stopScanning();
		myPeripheral = peripheral;
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
		noble.startScanning(sensorDevice.define.services, false);
}
