#!/usr/bin/env node
var dataUtils = require("./data-utils.js");
var awsIot = require('aws-iot-device-sdk');

console.log("This is a smart lighting gateway, which communicates to Zigbee Home Automation network via USB dongle, and connects to AWS IoT service.");

var initCommandPath = false;
var initCommandParam = null;
var argc = process.argv.length;
if(argc > 2) {
	initCommandPath = process.argv[2];
	if(argc > 3)
		initCommandParam = process.argv[3];
}

process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
	var chunk = process.stdin.read();
	if (chunk !== null) {
		//process.stdout.write(`data: ${chunk}`);
		var parts = chunk.replace(/\n/, '').split(' ', 2);
		if(parts.length == 1)
			gateway.onUserCommand(parts[0]);
		else
			gateway.onUserCommand(parts[0], parts[1]);
	}
});

var portName = 'USB';//'SLAB_USBtoUART';

var SerialPort = require("serialport");
SerialPort.list(function (err, ports) {
	var portCount = 0;
	ports.forEach(function(port) {
		if(port.comName.indexOf(portName) > 0) {
			portCount++;
			onPortFound(port);
			return;
		}
	});
	if(portCount == 0)
		console.log('port not found');
});

function dumpObject(object) {
	console.log('an object of: ' + object.constructor.name);
	for(key in object)
		console.log(key + ': ' + object[key]);
}

var myPort = null;

function onPortFound(port) {
	myPort = new SerialPort(port.comName, {
		baudRate: 115200 
	}, onPortOpen);
}

function onPortOpen(error) {
	if(error != null) {
		console.log('open serial port failed: ' + error);
		return;
	}
	//myPort.write('hello, serial!');		
	console.log('Serial port opened!');
	myPort.on('data', onPortReceive);
	if(initCommandPath)
		gateway.onUserCommand(initCommandPath, initCommandParam);
	else
		gateway.onInit();
}

function onPortReceive(data) {
	console.log('received:')
	console.log(data);
	if(((rxBufferLen == 0) && (data[0] == 0xFE)) || (rxBufferLen > 0)) {
		data.copy(rxBuffer, 0, 0, data.length);
		rxBufferLen += data.length;
	}
	while(rxBufferLen >= messageLengthMin) {
		// var rxMessage = {
		// 	length: rxBuffer[1],
		// 	layer: rxBuffer[2],
		// 	command: rxBuffer[3],
		// 	addrType: rxBuffer[4],
		// 	nwkAddr: rxBuffer.readUInt16LE(5),
		// 	endpoint: rxBuffer[7],
		// 	messageSQ: rxBuffer[8]
		// }
		console.log(`length of rx buffer: ${rxBufferLen}`);
		var rxMessageLen = rxBuffer[1];
		if(rxMessageLen > rxBufferLen)
			break;//message has not arrived completely
		if(rxMessageLen < messageLengthMin) {
			rxBufferLen = 0;
			console.log(`malformed message - length(${rxMessageLen}) field too short`);
			break;
		}
		console.log("parse rx message: " + dataUtils.hexString(rxBuffer.slice(0, rxMessageLen)));
		//console.log(rxBuffer.slice(0, rxMessageLen));
		var rxMessage = new Message(rxBuffer[2], rxBuffer[3]);
		rxMessage.length = rxMessageLen;
		rxMessage.addrType = rxBuffer[4];
		rxMessage.nwkAddr = rxBuffer.readUInt16LE(5);
		rxMessage.endpoint = rxBuffer[7];
		rxMessage.messageSQ = rxBuffer[8];
		var dataLength = rxMessageLen - messageLengthMin;
		if(dataLength > 0) {
			rxMessage.data = new Buffer(dataLength);
			rxBuffer.copy(rxMessage.data, 0, 9, 9 + dataLength);
		}
		var commandId = rxMessage.command & 0x3F;
		var command = false;
		for(var categoryKey in commands) {
			var category = commands[categoryKey];
			for(var commandKey in category) {
				var iCommand = category[commandKey];
				if(iCommand.layer != rxMessage.layer)
					break;//not this category
				if(iCommand.id == commandId) {
					console.log("got ack/response for command: " + commandKey);
					command = iCommand;
					break;//found command
				}
			}
			if(command)
				break;//found command
		}
		if(command) {
			if(((rxMessage.command & 0x40) == 0x40) && command.onAck) {
				console.log("will call onAck");
				command.onAck(rxMessage);
			}
			if(((rxMessage.command & 0x80) == 0x80) && command.onResponse) {
				console.log("will call onResponse");
				command.onResponse(rxMessage);
			}
			if(rxBufferLen == rxMessageLen) {
				rxBufferLen = 0;
				break;//no more data to process
			}
		}
		else
			console.log(`no command found of ${rxMessage.layer}.${rxMessage.command}`);
		rxBuffer.copy(rxBuffer, 0, rxMessageLen);
		rxBufferLen -= rxMessageLen;
	}
}

var addrTypes = {
	multicast: 1,
	nwkUnicast: 2,
	macUnicast: 3,
	broadcast: 0x0f,
}

var commandStatus = {
	ok: 0,
	fail: 1
}

var lightingPower = {
	off: 0,
	on: 1,
	toggle: 2
}

var lightingEndpoint = 0xb;

var nwkAddrAll = 0xffff;

var commands =  {
	system: {
		networkSet: {layer: 1, id: 0x00, 
			onResponse: function(message) {
				console("network is set");
				if(message.data)
					gateway.updateVersion(message.data);
			}
		},
		getVersion: {layer: 1, id: 0x01, 
			onAck: function(message) {
				if(message.data)
					gateway.updateVersion(message.data);
			}
		},
		reset: {layer: 1, id: 0x02},
		restore: {layer: 1, id: 0x03},
		networkParam: {layer: 1, id: 0x04}
	},
	network: {
		switchNetwork: {layer: 2, id: 0x01},
		getAddress: {layer: 2, id: 0x02, 
			//will not send this message, only receive when device is on
			onResponse: function(message) {
				var macAddr = message.data.slice(2,10);
				gateway.updateLightNwkAddr(macAddr, message.nwkAddr);
			}
		},
		getEndpoint: {layer: 2, id: 0x03},
		getType: {layer: 2, id: 0x04},
		getNwkAddrByMac: {layer: 2, id: 0x05, 
			buildMessage: function(message, param) {
				message.addrType = addrTypes.macUnicast;
				var buffer = new Buffer(10);
				buffer.fill(0);
				param.macAddr.copy(buffer, 0, 0);
				message.data =  buffer;
				return true;
			},
			onResponse: function(message) {
				if(message.data) {
					if((message.data.length == 9) && (message.data[0] == commandStatus.ok)) {
						var macAddr = message.data.slice(1);
						gateway.updateLightNwkAddr(macAddr, message.nwkAddr);
					}
				}
			}
		},
		getMacAddrByNwk: {layer: 2, id: 0x06},
		bind: {layer: 2, id: 0x07},
		unbind: {layer: 2, id: 0x08},
		bindTable: {layer: 2, id: 0x09}
	},
	ha: {
		info: {layer: 4, id: 0x01},
		restore: {layer: 4, id: 0x02},
		flash: {layer: 4, id: 0x03},
		addGroup: {layer: 4, id: 0x04},
		removeGroup: {layer: 4, id: 0x05},
		clearGroups: {layer: 4, id: 0x06},
		getGroup: {layer: 4, id: 0x07},
		getSceneCount: {layer: 4, id: 0x08},
		getSceneStatus: {layer: 4, id: 0x09},
		saveScene: {layer: 4, id: 0x0A},
		callScene: {layer: 4, id: 0x0B},
		removeScene: {layer: 4, id: 0x0C},
		clearScenes: {layer: 4, id: 0x0D},
		getScene: {layer: 4, id: 0x0E}
	},
	light: {
		power: {layer: 5, id: 0x01,
			onAck: function(message) {
				var nwkAddr = message.nwkAddr;
				gateway.onCommand(commands.light.getPower, {'nwkAddr': nwkAddr});
			},
			buildMessage: function(message, param) {
				var light = gateway.getLight('id', param.id);
				if(light)
					message.nwkAddr = light.nwkAddr;
				else if(param.id == 'all')
					message.nwkAddr = nwkAddrAll;
				else
					return false;
				message.endpoint = lightingEndpoint;
				var buffer = new Buffer(1);
				if(param.power) {
					if(param.power == 'on')
						buffer[0] = lightingPower.on;
					else if(param.power == 'off')
						buffer[0] = lightingPower.off;
					else
						buffer[0] = lightingPower.toggle;
					message.data = buffer;
					return true;
				}
				else
					return false;
			}
		},
		lum: {layer: 5, id: 0x02},
		color: {layer: 5, id: 0x03},
		colorTemperature: {layer: 5, id: 0x04},
		getPower: {layer: 5, id: 0x05,
			buildMessage: function(message, param) {
				if(param.id) {
					var light = gateway.getLight('id', param.id);
					if(light)
						message.nwkAddr = light.nwkAddr;
					else
						return false;
				}
				else if(param.nwkAddr)
					message.nwkAddr = param.nwkAddr;
				else
					return false;
				message.endpoint = lightingEndpoint;
				var buffer = new Buffer(2);
				buffer.fill(0);
				message.data = buffer;
				return true;
			},
			onResponse: function(message) {
				var light = gateway.getLight('nwkAddr', message.nwkAddr);
				if(light) {
					if(message.data) {
						if(message.data.length == 2) {
							var power = message.data[1];
							if(power == lightingPower.on)
								light.power = 'on';
							else if(power == lightingPower.off)
								light.power = 'off';
							gateway.reportState();
						}
					}
				}
			}
		},
		getLum: {layer: 5, id: 0x06},
		getHueSaturation: {layer: 5, id: 0x07},
		getColorTemperature: {layer: 5, id: 0x08}
	}
}

var Light = function(_id, _uid) {
	this.id = _id;
	this.uid = _uid;
	var macAddrBuffer = dataUtils.hexDecode(this.uid);
	this.macAddr = new Buffer(macAddrBuffer);
	this.nwkAddr = 0;
	this.power = 'unknown';
	this.isOn = function() {
		return (this.power == 'on');
	}
}

var Message = function(_layer, _command) {
	this.layer = _layer;
	this.command = _command;
	this.addrType = addrTypes.nwkUnicast;
	this.nwkAddr = 0;
	this.endpoint = 0;
}

var gateway = {
	id: 'MyFirstGateway',
	sn: 'GW201601',
	// lights: [
	// 	{
	// 		id: '1',
	// 		uid: '8357FE0001881700',
	// 	},
	// 	{
	// 		id: '2',
	// 		uid: '8B5DF90001881700',
	// 	},
	// 	{
	// 		id: '3',
	// 		uid: '285EF90001881700',
	// 	}
	// ],
	lights : [
		new Light('Light1', '8357FE0001881700'),
		new Light('Light2', '8B5DF90001881700'),
		new Light('Light3', '285EF90001881700')
	],
	onInit: function() {
		this.onCommand(commands.system.getVersion);
		for(var light of this.lights) {
			this.onCommand(commands.network.getNwkAddrByMac, {
				macAddr: light.macAddr
			});
		}
	},
	onCommand: function(command, param) {
		//[ for debug only ----
		//console.log('on command: ' + command.constructor.name);
		var commandFound = false;
		for(var categoryKey in commands) {
			var category = commands[categoryKey];
			for(var commandKey in category) {
				var iCommand = category[commandKey];
				if(iCommand == command) {
					console.log('on command: ' + commandKey);
					commandFound = true;
					break;
				}
			}
			if(commandFound)
				break;
		}		
		//---- for debug only ]
		var message = new Message(command.layer, command.id);
		if(command.buildMessage) {
			if(!command.buildMessage(message, param)) {
				console.log("build message failed, may be something wrong with param: ");
				console.log(param);
				return;
			}
		}
		this.sendMessage(message);
	},
	onUserCommand: function(commandPath, paramStr) {
		console.log(`onUserCommand ${commandPath}` + (paramStr ? (': ' + paramStr) : ''));
		var parts = commandPath.split(".");
		if(parts.length == 2) {
			var categoryKey = parts[0];
			var commandKey = parts[1];
			var category = commands[categoryKey];
			if(category) {
				var command = category[commandKey];
				if(command) {
					if(paramStr) {
						var param = JSON.parse(paramStr);
						if(param)
							this.onCommand(command, param);
						else
							console.log("error: invalid param, cannot be parsed as JSON");
					}
					else
						this.onCommand(command);
				}
				else
					console.log(`no command of "${commandKey}" found in category "${categoryKey}"`);
			}
			else
				console.log(`no command category of "${categoryKey}" found`);
		}
		else
			console.log("cannot parse commandPath");
	},
	messageSQ: 0,
	sendMessage: function(message) {
		var dataLength = 0;
		if(message.data)
			dataLength = message.data.length;
		var length = messageLengthMin + dataLength;
		var buffer = new Buffer(length);
		buffer[0] = 0xFE;
		buffer[1] = length;
		buffer[2] = message.layer;
		buffer[3] = message.command;
		buffer[4] = message.addrType;
		buffer.writeUInt16LE(message.nwkAddr, 5);
		buffer[7] = message.endpoint;
		this.messageSQ = (this.messageSQ + 1) % 256;
		buffer[8] = this.messageSQ;
		if(dataLength > 0)
			message.data.copy(buffer, 9, 0, dataLength);
		var checksum = 0;
		for(var i=0; i<length-1; i++)
			checksum ^= buffer[i];
		buffer[length-1] = checksum;
		myPort.write(buffer);
		console.log("sent:");
		console.log(buffer);
	},
	updateVersion: function(data) {
		if(data.length < 3)
			return;
		this.version = {
			hardwarePlatform: data[0],
			major: data[1],
			minor: data[2]
		}
		console.log(this.version);
	},
	getLight: function(key, value) {
		for(var light of this.lights) {
			if(key == 'macAddr') {
				if(light.macAddr.equals(value))
					return light;
			}
			else if(light[key] == value)
				return light;
		}
		return null;
	},
	updateLightNwkAddr: function(macAddr, nwkAddr) {
		var light = this.getLight('macAddr', macAddr);
		if(light) {
			light.nwkAddr = nwkAddr;
			console.log('got nwkAddr: ' + nwkAddr.toString(16) + ' of ' + light.id);
			gateway.onCommand(commands.light.getPower, {'nwkAddr': nwkAddr});
		}
		else
			console.log('no light device found, should crate one.');
	},
	reportState: function() {
		var curState = new Object();
		for(var light of gateway.lights) {
			curState[light.id] = {
				power: light.power
			};
		}
		var state = {
			"state": {
				"reported": curState
			}
		};
		clientTokenUpdate = thingShadows.update(gateway.id, state);
		if (clientTokenUpdate)
			console.log('updated shadow: ' + JSON.stringify(state));
		else
			console.log('update shadow failed, operation still in progress');
	}
}

var messageLengthMin = 10;
var messageLengthMax = 100;

var rxBuffer = new Buffer(messageLengthMax);
var rxBufferLen = 0;

var thingShadows = awsIot.thingShadow({
   keyPath: 'certs/private.pem.key',
  certPath: 'certs/certificate.pem.crt',
    caPath: 'certs/root-CA.crt',
  clientId: gateway.id,
    region: 'ap-northeast-1',
});

var thingShadowConnected = false;
var clientTokenUpdate;

thingShadows.on('connect', function() {
	thingShadows.register(gateway.id);
	thingShadowConnected = true;
	setTimeout(gateway.reportState, 5000);
});

thingShadows.on('disconnect', function() {
	thingShadowConnected = false;
});

thingShadows.on('status', function(thingName, stat, clientToken, stateObject) {
	console.log(`received ${stat} on ${thingName}: ${JSON.stringify(stateObject)}`);
});

thingShadows.on('delta', function(thingName, stateObject) {
	console.log(`received delta on ${thingName}: ${JSON.stringify(stateObject)}`);
	var deltaState = stateObject.state;
	for(var lightId in deltaState) {
		var lightState = deltaState[lightId];
		lightState.id = lightId;
		gateway.onCommand(commands.light.power, lightState); 
	}
});

thingShadows.on('timeout', function(thingName, clientToken) {
	console.log(`received timeout on ${thingName} with token: ${clientToken}`);
});
