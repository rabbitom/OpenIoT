var initCommand = false;
if(process.argv.length > 2)
	initCommand = process.argv[2];
	
var portName = 'SLAB_USBtoUART';

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
	if(initCommand) {
		console.log("initCommand: " + initCommand);
		var parts = initCommand.split(".");
		if(parts.length == 2) {
			console.log(parts[0] + ' ' + parts[1]);
			var category = commands[parts[0]];
			if(category) {
				var command = category[parts[1]];
				gateway.onCommand(command);
			}
		}
	}
	else
		gateway.onCommand(commands.system.getVersion);
}

function onPortReceive(data) {
	console.log('receive:')
	console.log(data);
	if(((rxBufferLen == 0) && (data[0] == 0xFE)) || (rxBufferLen > 0)) {
		data.copy(rxBuffer, 0, 0, data.length);
		rxBufferLen += data.length;
	}
	if(rxBufferLen >= messageLengthMin) {
		var rxMessage = {
			length: rxBuffer[1],
			layer: rxBuffer[2],
			command: rxBuffer[3],
			addrType: rxBuffer[4],
			nwkAddr: rxBuffer.readUInt16LE(5),
			endpoint: rxBuffer[7],
			messageSQ: rxBuffer[8]
		}
		var dataLength = rxMessage.length - messageLengthMin;
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
					break;
				if(iCommand.id == commandId) {
					command = iCommand;	
					break;
				}
			}
			if(command)
				break;
		}
		if(command) {
			if((rxMessage.command & 0x40 == 0x40) && command.onAck)
				command.onAck(rxMessage);
			if((rxMessage.command & 0x80 == 0x80) && command.onResponse)
				command.onResponse(rxMessage);
		}
	}
}

var commands =  {
	system: {
		networkSet: {layer: 1, id: 0x00, onResponse: function(message) {
			console("network is set");
			if(message.data)
				gateway.updateVersion(message.data);
		}},
		getVersion: {layer: 1, id: 0x01, onAck: function(message) {
			if(message.data)
				gateway.updateVersion(message.data);
		}},
		reset: {layer: 1, id: 0x02},
		restore: {layer: 1, id: 0x03},
		networkParam: {layer: 1, id: 0x04}
	},
	network: {
		switchNetwork: {layer: 2, id: 0x01},
		getAddress: {layer: 2, id: 0x02},
		getEndpoint: {layer: 2, id: 0x03},
		getType: {layer: 2, id: 0x04},
		getNwkAddrByMac: {layer: 2, id: 0x05},
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
		power: {layer: 5, id: 0x01},
		lum: {layer: 5, id: 0x02},
		color: {layer: 5, id: 0x03},
		colorTemperature: {layer: 5, id: 0x04},
		getPower: {layer: 5, id: 0x05},
		getLum: {layer: 5, id: 0x06},
		getHueSaturation: {layer: 5, id: 0x07},
		getColorTemperature: {layer: 5, id: 0x08}
	}
}

var gateway = {
	id: 'MyFirstGateway',
	sn: 'GW201601',
	onCommand: function(command, addr, param) {
		console.log('on command')
		console.log(command);
		var message = {
			layer: command.layer,
			command: command.id,
			addrType: 2,
			nwkAddr: 0,
			endpoint: 0
		};
		if(addr)
			message.nwkAddr = addr;
		this.sendMessage(message);
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
		console.log("send:");
		console.log(buffer);
		myPort.write(buffer);
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
	}
}

var messageLengthMin = 10;
var messageLengthMax = 100;

var rxBuffer = new Buffer(messageLengthMax);
var rxBufferLen = 0;
