function Packet(define) {
	for(key in define)
		this[key] = define[key];
	if((this.lengthMin == null) && (this.lengthMax == null) && (this.length != null)) {
		this.lengthMin = this.length;
		this.lengthMax = this.length;
	}
}

Packet.prototype.getBuffer = function(param) {
	var buffer = new Buffer(this.lengthMax);
	var offset = this.writeBuffer(buffer, 0, param, this.fields);
	if(offset < this.lengthMax)
		return buffer.slice(0, offset);
	else
		return buffer;
}

Packet.prototype.writeBuffer = function(buffer, offset, param, fields) {
	for(var field of fields) {
		if(field.type) {
			if(field.type == 'mask') {
				var length = field.length;
				buffer.fill(0, offset, offset + length);
				for(var maskField of field.fields)
					writeField(buffer, offset, param, maskField, length);
				offset += length;
			}
			else {
				var typeDefine = this.types[field.type];
				var typeParam = param[field.name];
				if(typeParam != null)
					offset = this.writeBuffer(buffer, offset, typeParam, typeDefine.fields);
			}
		}
		else
			offset = writeField(buffer, offset, param, field);
	}
	return offset;
}

function writeField(buffer, offset, param, field, length) {
	var key = field.name;
	var paramValue = param[key];
	var value;
	if(paramValue != null) {
		if((field.values) && (typeof paramValue == "string"))
			value = field.values[paramValue];
		else
			value = paramValue;
	}
	else if(field.value != null)
		value = field.value;
	else
		return offset;
	if(length == null)
		length = field.length;
	if((typeof value == "number") || (typeof value == "boolean")){
		if(field.format == "bcd")
			value = toBcd(value);
		if(length == 1) {
			if(field.bits) {
				var original = buffer[offset];
				var fieldValue = value * Math.pow(2, field.offset);
				buffer[offset] = original | fieldValue;
			}
			else
				buffer[offset] = value;
		}
	}
	return offset + length;
}

function toBcd(value) {
	if(value >= 10) {
		var tens = Math.floor(value / 10);
		var ones = value - 10 * tens;
		return tens * 16 + ones;
	}
	else
		return value;
}

function fromBcd(value) {
	if(value >= 16) {
		var tens = Math.floor(value / 16);
		var ones = value - 16 * tens;
		return tens * 10 + ones;
	}
	else
		return value;
}

Packet.prototype.parseBuffer = function(buffer) {
	var param = new Object();
	var offset = 0;
	if(buffer.length < this.lengthMin)
		offset = -1;
	else
		offset = this.readBuffer(buffer, offset, param, this.fields);
	return {length: offset, data: param};
}

Packet.prototype.readBuffer = function(buffer, offset, param, fields) {
	var complete = true;
	for(var field of fields) {
		if(offset >= buffer.length) {
			complete = false;
			break;
		}
		if(field.type) {
			if(field.type == 'mask') {
				var length = field.length;
				for(var maskField of field.fields)
					readField(buffer, offset, param, maskField, length);
				offset += length;
			}
			else {
				var key = field.name;
				var value = new Object();
				var typeDefine = this.types[field.type];
				offset = this.readBuffer(buffer, offset, value, typeDefine.fields);
				param[key] = value;
			}
		}
		else
			offset = readField(buffer, offset, param, field);
		if(offset < 0) {
			complete = false;
			break;
		}
	}
	return complete ? offset : -1;
}

function readField(buffer, offset, param, field, length) {
	var key = field.name;
	if(length == null)
		length = field.length;
	if(offset + length > buffer.length)
		return -1;
	if(length == 1) {
		var value = buffer[offset];
		if(field.bits)
			value = (value >> field.offset) & (Math.pow(2, field.bits) - 1);
		if(field.format == 'bcd')
			value = fromBcd(value);
		if(field.format == 'boolean')
			value = (value > 0) ? true : false;
		if(field.values) {
			for(var valueKey in field.values)
				if(field.values[valueKey] == value) {
					value = valueKey;
					break;
				}
		}
		param[key] = value;
	}
	return offset + length;
}

module.exports = Packet;
