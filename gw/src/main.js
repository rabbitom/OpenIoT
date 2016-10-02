#!/usr/bin/env node

function dumpObject(object) {
	console.log('an object of: ' + object.constructor.name);
	for(key in object)
		console.log(key + ': ' + object[key]);
}

var SerialPort = require("serialport");
var ZHA = require('./zha.js');
var Host = ZHA.host;
var Light = ZHA.light;

var host = null;

console.log("This is a smart lighting gateway based on AWS IoT, which communicates to Zigbee Home Automation network via USB dongle.");

//load start parameters as user command

var initCommandPath = false;
var initCommandParam = null;
var argc = process.argv.length;
if(argc > 2) {
	initCommandPath = process.argv[2];
	if(argc > 3)
		initCommandParam = process.argv[3];
}

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
    host = new Host(hostPort);
	hostPort.on('data', onPortReceive);
	if(initCommandPath)
		host.onUserCommand(initCommandPath, initCommandParam);
	else {
		host.loadDevices([
			new Light('Light1', '8357FE0001881700'),
			new Light('Light2', '8B5DF90001881700'),
			new Light('Light3', '285EF90001881700')
		]);
	}
}

function onPortReceive(data) {
	host.onReceive(data);
}