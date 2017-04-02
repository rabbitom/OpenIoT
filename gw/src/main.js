#!/usr/bin/env node

var fs = require("fs");
var SerialPort = require("serialport");
var ZHA = require("./zha.js");
var Host = ZHA.host;
var Light = ZHA.light;

var host = null;

console.log("lighting gateway started");

//load start parameters as user command

// var initCommandPath = false;
// var initCommandParam = null;
// var argc = process.argv.length;
// if(argc > 2) {
// 	initCommandPath = process.argv[2];
// 	if(argc > 3)
// 		initCommandParam = process.argv[3];
// }

var dataPath = process.env.SNAP_DATA;
if(dataPath == null) {
	dataPath = "data/"
}
else if(dataPath.slice(-1) != "/")
	dataPath += "/"

//read user command from stdin

process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
	var chunk = process.stdin.read();
	if(chunk == null)
		return;
	if (host) {
		//process.stdout.write(`data: ${chunk}`);
		var parts = chunk.replace(/\n/, '').split(' ', 2);
		if(parts.length == 1)
			host.onUserCommand(parts[0]);
		else
			host.onUserCommand(parts[0], parts[1]);
	}
});

//find a USB serial port and init the host

var portName = 'USB';
SerialPort.list(function (err, ports) {
	var portCount = 0;
	ports.forEach(function(port) {
        if(portCount > 1)
            return;
		if(port.comName.indexOf(portName) > 0) {
			portCount++;
			onPortFound(port);
			return;
		}
	});
	if(portCount == 0) {
		console.log('serial port not found');
        process.exit(1);
    }
});

var hostPort = null;

function onPortFound(port) {
	hostPort = new SerialPort(port.comName, {
		baudRate: 115200 
	}, onPortOpen);
}

function onPortOpen(error) {
	if(error != null) {
		console.log('open serial port failed: ' + error);
        process.exit(1);      
		return;
	}
	console.log('serial port opened!');
	hostPort.on('data', onPortReceive);
	initHost();
}

function onPortReceive(data) {
	if(host)
		host.onReceive(data);
}

//host application

function initHost() {
    host = new Host(hostPort);
	// if(initCommandPath)
	// 	host.onUserCommand(initCommandPath, initCommandParam);
	// else {
	// }
	host.on("versionUpdated", function(version) {
		console.log("version updated: " + JSON.stringify(version));
	});
	host.on("epidUpdated", function(epidValue) {
		console.log("epid updated: " + epidValue);
	});
	host.on("lightPowerUpdated", function(light) {
		console.log("light power updated: " + JSON.stringify({
			"id": light.id,
			"power": light.power
		}));
	});
	host.on("foundNewLight", function(light) {
		console.log("found new light: " + JSON.stringify({
			"id": light.id,
			"uid": light.uid
		}));
		saveDevices();
	});
	host.on("deviceDetached", function(light) {
		console.log("device detached: " + JSON.stringify({
			"id": light.id,
			"uid": light.uid
		}));
		saveDevices();
	});
	host.onInit();
	fs.readFile(dataPath+"devices.json", {encoding: "utf8", flag: "r"}, function(err, data) {
		if(err)
			console.log("failed to open devices file due to error: " + err);
		else {
			var devices = JSON.parse(data);
			host.loadDevices(devices);
		}
	});
}

function saveDevices() {
	if(host.lights == null)
		return;
	var devices = new Array();
	for(var light of host.lights) {
		var device = new Object();
		device.id = light.id;
		device.uid = light.uid;
		devices.push(device);
	}
	fs.writeFile(dataPath+"devices.json", JSON.stringify(devices), {encoding:"utf8",flag:"w"}, function(err) {
		if(err)
			console.log("failed to write devices file due to error: " + err);
	})
}
