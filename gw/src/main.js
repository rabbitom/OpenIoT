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
var portFound = false;
var serialPortEnumTimer = setInterval(()=> {
	console.log("listing serial ports");
	SerialPort.list(function (err, ports) {
		if(err)
			console.log("list serial port failed with error: " + err);
		else
			ports.forEach(function(port) {
				if(portFound)
					return;
				if(port.comName.indexOf(portName) > 0) {
					console.log("found serial port " + port.comName);
					portFound = true;
					onPortFound(port);
					clearInterval(serialPortEnumTimer);
				}
			});
	});
}, 10000);

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
		reportState();
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

// local http server
var express = require('express');
var bodyParser = require('body-parser');

var app = express();
var server = require('http').Server(app);

server.listen(process.env.HTTP_LISTEN_PORT || 80);
app.use(bodyParser.json());
app.post('/command/:category/:command', function(req, res) {
	var commandPath = `${req.params.category}.${req.params.command}`;
	if(host != null) {
		var result = host.onUserCommand(commandPath, req.body);
		if(result === true)
			res.status(200).json({message: "OK"});
		else if(typeof result == 'string')
			res.status(500).json({message: result});
		else
			res.status(500).json({message: "unusual result"});
	}
	else {
		res.status(500).json({message: "host is not initialized."});
	}
});

var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();

app.post('/config-aws-iot', multipartMiddleware, function(req, res) {
	if((req.body.clientId === undefined) || (req.body.clientId == ""))
		res.status(500).json({message:"clientId required"});
	else {
		awsIoTConfig.configs.clientId = req.body.clientId;
		for(var fileKey in req.files) {
			var file = req.files[fileKey];
			awsIoTConfig.saveFile(fileKey, file);
		}
		res.status(200).json({message:"OK"});
	}
});

app.post('/connect-to-aws', function(req, res) {
	if(thingShadows == null) {
		if(awsIoTConfig.isValid()) {
			initThingShadows();
			res.status(200).json({message: "OK"});
		}
		else
			res.status(500).json({message: "certificate is not configured"});
	}
	else
		res.status(500).json({message:"thing shadows already inited"});
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/static/dashboard.html');
});

app.use(express.static(__dirname + '/static'));

app.post('/lights/:lightId/status', function(req, res) {
	var lightId = req.params.lightId;
	if(host) {
		var light = host.getLight('id', lightId);
		if(light) {
			//update thing shadow
			if((thingShadows !== undefined) && thingShadowsConnected) {
				var newState = new Object();
				newState[lightId] = req.body;
				var state = {
					"state": {
						"desired": newState
					}
				};
				var clientUpdateToken = thingShadows.update(gatewayId, state);
				if(clientUpdateToken)
					console.log("updated desired thing shadow:", newState);
				else
					console.log("update desired thing shadow failed");
			}
			//set state
			host.setLightState(light, req.body);	
			res.status(200).json({message:"OK"});
		}
		else
			res.status(500).json({message:`${lightId} does not exist`});
	}
	else
		res.status(500).json({message:'host not initialized'});
});

// aws iot thing shadows

var awsIot = require('aws-iot-device-sdk');

var thingShadows;
var thingShadowsConnected = false;

var gatewayId;

var awsIoTConfig =  {
	configs: {},
	isValid: function() {
		if((this.configs.clientId !== undefined) && (this.configs.private_key !== undefined) && (this.configs.certificate !== undefined) && (this.configs.ca !== undefined))
			return true;
		else
			return false;
	},
	load: function() {
		fs.readFile(dataPath+"configs.json", {encoding: "utf8", flag: "r"}, function(err, data) {
			if(err)
				console.log("failed to open configs file due to error: " + err);
			else {
				try {
					awsIoTConfig.configs = JSON.parse(data);
				}
				catch(err) {
					console.log("failed to load configs file due to error: " + err);
				}
				if(awsIoTConfig.isValid())
					initThingShadows();
			}
		});
	},
	save: function() {
		fs.writeFile(dataPath+"configs.json", JSON.stringify(this.configs), {encoding:"utf8",flag:"w"}, function(err) {
			if(err)
				console.log("failed to write configs file due to error: " + err);
		})
	},
	saveFile: function(fileKey, file) {
		var tmpPath = file.path;
		console.log("uploaded cert file: " + tmpPath);
		var targetPath = dataPath + file.name;
		fs.rename(tmpPath, targetPath, (err)=>{
			if(err)
				console.log("move file failed: " + err);
			else
				awsIoTConfig.configs[fileKey] = targetPath;
		});
	}
};

awsIoTConfig.load();

function initThingShadows() {
	gatewayId = awsIoTConfig.configs.clientId;

	thingShadows = awsIot.thingShadow({
		keyPath: awsIoTConfig.configs.private_key,
		certPath: awsIoTConfig.configs.certificate,
		caPath: awsIoTConfig.configs.ca,
		clientId: gatewayId,
		region: 'ap-northeast-1',
	});

	thingShadows.on('connect', function() {
		console.log("connected to aws iot");
		awsIoTConfig.save();
		thingShadows.register(gatewayId);
		thingShadowsConnected = true;
	});

	thingShadows.on('disconnect', function() {
		console.log("disconnected from aws iot");
		thingShadowsConnected = false;
	});

	thingShadows.on('status', function(thingName, stat, clientToken, stateObject) {
		console.log(`received ${stat} on ${thingName}: `, stateObject);
		if(latestStateReportFailed)
			reportState();
	});

	thingShadows.on('delta', function(thingName, stateObject) {
		console.log(`received delta on ${thingName}: `, stateObject);
		var deltaState = stateObject.state;
		if(host) {
			for(var lightId in deltaState) {
				var light = host.getLight(lightId);
				if(light) {
					var newState = deltaState[lightId];
					host.setLightState(light, newState);
				}
			}
		}
	});

	thingShadows.on('timeout', function(thingName, clientToken) {
		console.log(`received timeout on ${thingName} with token: ${clientToken}`);
	});
}

var latestStateReportFailed = false;

function reportState() {
	if((thingShadows == null) || (!thingShadowsConnected) || (host == null))
		return;
    var curState = new Object();
    for(var light of host.lights) {
        curState[light.id] = {
            power: light.power
        };
    }
    var state = {
        "state": {
            "reported": curState
        }
    };
    var clientTokenUpdate = thingShadows.update(gatewayId, state);
    if (clientTokenUpdate) {
		latestStateReportFailed = false;
        console.log('updated reported thing shadow: ', curState);
	}
    else {
		latestStateReportFailed = true;
        console.log('update reported thing shadow failed');
	}
}
