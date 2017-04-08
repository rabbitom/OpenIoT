//Environment Configuration
var config = {};
config.IOT_BROKER_ENDPOINT = "https://a3ptlnx17k8ty6.iot.ap-northeast-1.amazonaws.com";//.toLowerCase();
config.IOT_BROKER_REGION = "ap-northeast-1";
config.IOT_THING_NAME = "MyFirstGateway";

var AWS = require('aws-sdk');
AWS.config.region = config.IOT_BROKER_REGION;

var iotData = new AWS.IotData({endpoint: config.IOT_BROKER_ENDPOINT});

exports.handler = (event, context, callback) => {
    var payloadObj={
        "state": {
            "desired": {
                "Group1": {
                  "power": "on"
                }
            }
        }
    };
    //Prepare the parameters of the update call
    var paramsUpdate = {
        "thingName" : config.IOT_THING_NAME,
        "payload" : JSON.stringify(payloadObj)
    };
    //Update Device Shadow
    iotData.updateThingShadow(paramsUpdate, function(err, data) {
        if (err){
            console.log(err);
        }
        else {
            console.log(data);
        }
    });
}