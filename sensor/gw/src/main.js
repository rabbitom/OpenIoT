#!/usr/bin/env node

var fs = require('fs');
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
	startScanning();
}

fs.readFile('ti-sensortag-2015.json', {encoding: "utf8", flag: "r"}, function(err, data) {
	if(err)
		console.log("failed to open device definition file due to error: " + err);
	else {
		var definition = JSON.parse(data);
		initDevice(definition);
		if(definition.packets) {
			if(packet == null)
				packets = new Object();
			for(var packet in definition.packets) {
				var packetDefine = definition.packets[packet];
				packets[packet] = new Packet(packetDefine);
			}
		}
	}
});

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
	}
}

function onLightSensorData(data) {
	console.log("light sensor data:", data);
	var value = data[0] + data[1] * 0x100;
	var e = value >> 12;
	var m = value & 0x0FFF;
	var o = m * Math.pow(2, e) / 100;
	console.log('light sensor: ' + o);
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
