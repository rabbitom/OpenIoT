var events = require('events');

var receiveCallbacks = new Object();

function BleDevice(define) {
	events.EventEmitter.call(this);
	this.define = define;
}

BleDevice.prototype.__proto__ = events.EventEmitter.prototype;

BleDevice.prototype.setPeripheral = function(peripheral) {
	this.allCharacteristics = new Object();
	this.characteristics = new Object();
	this.ready = false;
	this.peripheral = peripheral;
}

BleDevice.prototype.addCharacteristic = function(characteristic) {
	var uuid = characteristic.uuid;
	this.allCharacteristics[uuid] = characteristic;
	var endpoint = this.define.characteristics[uuid];
	if(endpoint != null) {
		var endpoints = endpoint.split(',');
		for(var e of endpoints)
			this.characteristics[e] = characteristic;
		characteristic.on('data', function(data) {
			onReceivedData(data, endpoints[0]);
		});
	}
}

BleDevice.prototype.checkCharacteristics = function() {
	if(this.ready)
		return true;
	var gotDefinedCharacteristics = true;
	for(var uuid in this.define.characteristics) {
		var endpoint = this.define.characteristics[uuid];
		var endpoints = endpoint.split(',');
		for(var e of endpoints) {
			if(this.characteristics[e] == null) {
				gotDefinedCharacteristics = false;
				break;
			}
		}
	}
	if(gotDefinedCharacteristics) {
		this.ready = true;
		this.emit('ready');
	}
	return gotDefinedCharacteristics;
}

BleDevice.prototype.sendData = function(data, endpoint) {
    if(endpoint == null)
        endpoint = 'send';
    var characteristic = this.characteristics[endpoint];
    if(characteristic != null)
        characteristic.write(data, false, function(error) {
            if(error)
                console.log(`ble write endpoint ${endpoint} failed due to error: ${error}`);
            else
                console.log(`ble wrote data to endpoint ${endpoint}: `, data);
        });
	else
		console.log(`ble cannot send data, no endpoint ${endpoint}`);
}

BleDevice.prototype.startReceiveData = function(endpoint) {
	if(endpoint == null)
		endpoint = "receive";
	var characteristic = this.characteristics[endpoint];
    if(characteristic != null)
		characteristic.notify(true, function (error) {
			if(error)
				console.log(`ble failed to start receiving data on endpoint ${endpoint} due to error: ${error}`);
			else
				console.log(`ble started receiving data on endpoint ${endpoint}`);
		});
	else
		console.log(`ble cannot start receiving data, no endpoint ${endpoint}`);
}

BleDevice.prototype.stopReceiveData = function(endpoint) {
	if(endpoint == null)
		endpoint = "receive";
	var characteristic = this.characteristics[endpoint];
    if(characteristic != null)
		characteristic.notify(false, function (error) {
			if(error)
				console.log(`ble stop receiving data on endpoint ${endpoint} failed due to error: ${error}`);
			else
				console.log(`ble stopped receiving data on endpoint ${endpoint}`);
		});
	else
		console.log(`ble cannot start receiving data, no endpoint ${endpoint}`);
}

BleDevice.prototype.onReceive = function(endpoint, callback) {
	receiveCallbacks[endpoint] = callback;
}

function onReceivedData(data, endpoint) {
	console.log(`ble received data on endpoint ${endpoint}: `, data);
	var callback = receiveCallbacks[endpoint];
	if(callback)
		callback(data);
}

module.exports = BleDevice;