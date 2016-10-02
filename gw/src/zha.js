var dataUtils = require("./data-utils.js");

function ZHAHost(port) {
    this.serialPort = port;
    this.messageSQ = 0;
    this.onInit();
}

function ZHALight(_id, _uid) {
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

var messageLengthMin = 10;
var messageLengthMax = 100;

var rxBuffer = new Buffer(messageLengthMax);
var rxBufferLen = 0;

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
		networkSet: {layer: 1, id: 0, data: {
            response: {
                hardwarePlatform: 1,
                major: 1,
                minor: 1
            }
        }},
		getVersion: {layer: 1, id: 1, data: {
            ack: {
                hardwarePlatform: 1,
                major: 1,
                minor: 1
            }
        }},
		reset: {layer: 1, id: 2},
		restore: {layer: 1, id: 3, data: {
            send: {
                configuration: {length: 1, value: 0x03}
            }
        }},
		networkParam: {layer: 1, id: 4, data: {
            send: {
                operation: {length: 1, values:{read:0, write:1}},
                configuration: {length: 1, values:{channel:1, epid: 3}}
            },
            ack: {
                operation: 1,
                configuration: 1,
                status: 1,
                value: -1
            }
        }}
	},
	network: {
		switchNetwork: {layer: 2, id: 1, data: {
            send: {time: {length:1, values:{off: 0, on:1, duration: -1}}},
            ack: {status: 1}
        }},
		updateAddress: {layer: 2, id: 2, data: {
            response: {nwkAddr: 2, macAddr: 8, deviceType: 1}
        }},
        //getEndpoints: {layer: 2, id: 3},
		getNwkAddrByMac: {layer: 2, id: 5, addrMode: 3, data: {
            send: {
                macAddr: {length: 8},
                requestType: {length: 1, value: 0},
                startIndex: {length: 1, value: 0}
            },
            response: {
                status: 1,
                macAddr: 8
            }
        }},
		getMacAddrByNwk: {layer: 2, id: 6, data: {
            send: {
                requestType: {length:1, value: 0},
                startIndex: {length:1, value: 0}
            },
            response: {
                status: 1,
                macAddr: 8
            }
        }},
        detach: {layer: 2, id: 21, data: {
            response: {
                status: 1,
                macAddr: 8
            }
        }}
	},
	ha: {
		//getEndpointInfo: {layer: 4, id: 0x01},
		restore: {layer: 4, id: 2, data: {
            response: {
                status: 1
            }
        }},
		blink: {layer: 4, id: 3, data: {
            send: {
                time: {length: 1}
            },
            response: {
                status: 1
            }
        }},
		// addGroup: {layer: 4, id: 0x04},
		// removeGroup: {layer: 4, id: 0x05},
		// clearGroups: {layer: 4, id: 0x06},
		// getGroup: {layer: 4, id: 0x07},
		// getSceneCount: {layer: 4, id: 0x08},
		// getSceneStatus: {layer: 4, id: 0x09},
		// saveScene: {layer: 4, id: 0x0A},
		// callScene: {layer: 4, id: 0x0B},
		// removeScene: {layer: 4, id: 0x0C},
		// clearScenes: {layer: 4, id: 0x0D},
		// getScene: {layer: 4, id: 0x0E}
	},
	light: {
		power: {layer: 5, id: 1, data: {
            send: {
                operation: {length: 1, values: {off: 0, on: 1, toggle: 2}}
            }
        }},
		lum: {layer: 5, id: 2, data: {
            send: {
                operation: {length: 1, value: 0x04},
                lum: {length: 1},
                duration: {length: 2}
            }
        }},
		hueSaturation: {layer: 5, id: 3, data: {
            send: {
                operation: {length: 1, value: 0x07},
                hue: {length: 1},
                saturation: {length: 1},
                duration: {length: 2}
            }
        }},
		colorTemperature: {layer: 5, id: 4, data: {
            send: {
                colorTemperature: {length: 2},
                duration: {length: 2}
            }
        }},
		getPower: {layer: 5, id: 5, data: {
            send: {
                propertyId: {length: 2, value: 0}
            },
            response: {
                status: 1,
                power: 1
            }
        }},
		getLum: {layer: 5, id: 6, data: {
            send: {
                propertyId: {length: 2, value: 0}
            },
            response: {
                status: 1,
                lum: 1
            }
        }},
		getHueSaturation: {layer: 5, id: 7, data: {
            send: {
                propertyId: {length: 2, vlaue: 0}
            },
            response: {
                status: 1,
                hue: 1,
                saturation: 1
            }
        }},
		getColorTemperature: {layer: 5, id: 8, data: {
            send: {
                propertyId: {length: 2, vlaue: 0}
            },
            response: {
                status: 1,
                colorTemperature: 2
            }
        }}
	}
}

commands.system.networkSet.onResponse = function(host, message) {
    console("network is set");
    if(message.data)
        host.updateVersion(message.data);
};

commands.system.getVersion.onAck = function(host, message) {
    if(message.data)
        host.updateVersion(message.data);
};

//will not send this message, only receive when device is on
commands.network.updateAddress.onResponse = function(host, message) {
    var macAddr = message.data.slice(2,10);
    host.updateLightNwkAddr(macAddr, message.nwkAddr);
};

commands.network.getNwkAddrByMac.buildMessage = function(host, message, param) {
    message.addrType = addrTypes.macUnicast;
    var buffer = new Buffer(10);
    buffer.fill(0);
    param.macAddr.copy(buffer, 0, 0);
    message.data =  buffer;
    return true;
};

commands.network.getNwkAddrByMac.onResponse = function(host, message) {
    if(message.data) {
        if((message.data.length == 9) && (message.data[0] == commandStatus.ok)) {
            var macAddr = message.data.slice(1);
            host.updateLightNwkAddr(macAddr, message.nwkAddr);
        }
    }
};

commands.light.power.onAck = function(host, message) {
    var nwkAddr = message.nwkAddr;
    host.onCommand(commands.light.getPower, {'nwkAddr': nwkAddr});
};

commands.light.power.buildMessage = function(host, message, param) {
    var light = host.getLight('id', param.id);
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
};

commands.light.getPower.buildMessage = function(host, message, param) {
    if(param.id) {
        var light = host.getLight('id', param.id);
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
};

commands.light.getPower.onResponse = function(host, message) {
    var light = host.getLight('nwkAddr', message.nwkAddr);
    if(light) {
        if(message.data) {
            if(message.data.length == 2) {
                var power = message.data[1];
                if(power == lightingPower.on)
                    light.power = 'on';
                else if(power == lightingPower.off)
                    light.power = 'off';
                host.reportState();
            }
        }
    }
};

ZHAHost.prototype.onInit = function() {
    this.onCommand(commands.system.getVersion);
    this.onCommand(commands.system.networkParam, {
        operation: 'read',
        configuration: 'epid'
    });
};

ZHAHost.prototype.loadDevices = function(devices) {
    if(devices) {
        this.lights = devices;
        for(var light of this.lights) {
            this.onCommand(commands.network.getNwkAddrByMac, {
                macAddr: light.macAddr
            });
        }
    }
};

ZHAHost.prototype.onCommand = function(command, param) {
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
        if(!command.buildMessage(this, message, param)) {
            console.log("build message failed, may be something wrong with param: ");
            console.log(param);
            return;
        }
    }
    else if(command.data.send) {
        var dataSend = command.data.send;
        var dataLength = 0;
        for(var dataKey in dataSend) {
            var dataField = dataSend[dataKey];
            dataLength += dataField.length;
        }
        var dataBuffer = new Buffer(dataLength);
        dataBuffer.fill(0);
        var dataOffset = 0;
        for(var dataKey in dataSend) {
            console.log(dataKey);
            var dataField = dataSend[dataKey];
            var dataValue = dataField.value;
            if(dataValue == null) {
                var paramValue = param[dataKey];
                if(paramValue) {
                    if(dataField.values)
                        dataValue = dataField.values[paramValue];
                    else
                        dataValue = paramValue;
                }
            }
            var dataFieldLength = dataField.length;
            if(dataFieldLength == 1)
                dataBuffer[dataOffset] = dataValue;
            else if(dataFieldLength == 2)
                dataBuffer.writeUInt16LE(dataValue, dataOffset);
            else
                dataValue.copy(dataBuffer, 0, dataOffset, dataOffset+dataFieldLength);
            dataOffset += dataFieldLength;
        }
        message.data = dataBuffer;
    }
    this.sendMessage(message);
};

ZHAHost.prototype.onUserCommand = function(commandPath, paramStr) {
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
};

ZHAHost.prototype.sendMessage = function(message) {
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
    if(this.serialPort) {
        this.serialPort.write(buffer);
        console.log("sent:");
    }
    else
        console.log("could not send:");
    console.log(buffer);
};

ZHAHost.prototype.updateVersion = function(data) {
    if(data.length < 3)
        return;
    this.version = {
        hardwarePlatform: data[0],
        major: data[1],
        minor: data[2]
    }
    console.log(this.version);
};

ZHAHost.prototype.getLight = function(key, value) {
    for(var light of this.lights) {
        if(key == 'macAddr') {
            if(light.macAddr.equals(value))
                return light;
        }
        else if(light[key] == value)
            return light;
    }
    return null;
};

ZHAHost.prototype.updateLightNwkAddr = function(macAddr, nwkAddr) {
    var light = this.getLight('macAddr', macAddr);
    if(light) {
        light.nwkAddr = nwkAddr;
        console.log('got nwkAddr: ' + nwkAddr.toString(16) + ' of ' + light.id);
        gateway.onCommand(commands.light.getPower, {'nwkAddr': nwkAddr});
    }
    else
        console.log('no light device found, should crate one.');
};

ZHAHost.prototype.reportState = function() {
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
    console.log('updated shadow: ' + JSON.stringify(state));
    // clientTokenUpdate = thingShadows.update(gateway.id, state);
    // if (clientTokenUpdate)
    //     console.log('updated shadow: ' + JSON.stringify(state));
    // else
    //     console.log('update shadow failed, operation still in progress');
};

ZHAHost.prototype.onReceive = function(data) {
	console.log('received:')
	console.log(data);
	if(((rxBufferLen == 0) && (data[0] == 0xFE)) || (rxBufferLen > 0)) {
		data.copy(rxBuffer, 0, 0, data.length);
		rxBufferLen += data.length;
	}
	while(rxBufferLen >= messageLengthMin) {
		//console.log(`length of rx buffer: ${rxBufferLen}`);
		var rxMessageLen = rxBuffer[1];
		if(rxMessageLen > rxBufferLen)
			break;//message has not arrived completely
		if(rxMessageLen < messageLengthMin) {
			rxBufferLen = 0;
			console.log(`malformed message - length(${rxMessageLen}) field too short`);
			break;
		}
		console.log("parse rx message: " + dataUtils.hexString(rxBuffer.slice(0, rxMessageLen)));
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
        var isAck = ((rxMessage.command & 0x40) == 0x40);
        var isResponse = ((rxMessage.command & 0x80) == 0x80);
		var command = false;
		for(var categoryKey in commands) {
			var category = commands[categoryKey];
			for(var commandKey in category) {
				var iCommand = category[commandKey];
				if(iCommand.layer != rxMessage.layer)
					break;//not this category
				if(iCommand.id == commandId) {
					console.log("got " + (isAck ? "ack": (isResponse ? "response" : "unkown")) + " for command: " + commandKey);
					command = iCommand;
					break;//found command
				}
			}
			if(command)
				break;//found command
		}
		if(command) {
			if(isAck && command.onAck) {
				//console.log("will call onAck");
				command.onAck(this, rxMessage);
			}
			if(isResponse && command.onResponse) {
				//console.log("will call onResponse");
				command.onResponse(this, rxMessage);
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
};

exports.host = ZHAHost;
exports.light = ZHALight;