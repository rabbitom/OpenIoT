exports.handler = (event, context, callback) => {
    var access_token = event['payload']['accessToken'];
    if(event['header']['namespace'] == 'Alexa.ConnectedHome.Discovery')
        callback(null, handleDiscovery(context, event));
    else if(event['header']['namespace'] == 'Alexa.ConnectedHome.Control')
        handleControl(context, event, callback);
};

function handleDiscovery(context, event) {
    var payload = ''
    var header = {
        "namespace": "Alexa.ConnectedHome.Discovery",
        "name": "DiscoverAppliancesResponse",
        "payloadVersion": "2"
    };

    if(event['header']['name'] == 'DiscoverAppliancesRequest') {
        payload = {
            "discoveredAppliances":[
                {
                    "applianceId":"MyFirstGateway",
                    "manufacturerName":"CoolTools Co.,Ltd.",
                    "modelName":"LightingGateway",
                    "version":"0.1.2",
                    "friendlyName":"Lights",
                    "friendlyDescription":"Virtual Device for simple Lighting Control Skill",
                    "isReachable":true,
                    "actions":[
                        "turnOn",
                        "turnOff"
                    ],
                    "additionalApplianceDetails":{
                        "extraDetail1":"optionalDetailForSkillAdapterToReferenceThisDevice",
                        "extraDetail2":"There can be multiple entries",
                        "extraDetail3":"but they should only be used for reference purposes.",
                        "extraDetail4":"This is not a suitable place to maintain current device state"
                    }
                }
            ]
        }
    }
    return { 'header': header, 'payload': payload }
}

function handleControl(context, event, callback) {
    var device_id = event['payload']['appliance']['applianceId'];
    var message_id = event['header']['messageId'];
    var action = event['header']['name'];

    var header = {
        "namespace":"Alexa.ConnectedHome.Control",
        "payloadVersion":"2",
        "messageId": message_id
    }
    
    var status;
    
    if (action == 'TurnOnRequest') {
        header.name = "TurnOnConfirmation";
        status = "on";
    }
    else if(action == "TurnOffRequest") {
        header.name = "TurnOffConfirmation";
        status = "off";
    }
    else
        callback("unspported action: " + action);
    
    if(status) {
        setLightsStatus(status, (err,data)=>{
            if(err)
                callback(err);
            else
                callback(null, { 'header': header, 'payload': {} });
        });
    }
}

//Environment Configuration
var config = {};
config.IOT_BROKER_ENDPOINT = "https://a3ptlnx17k8ty6.iot.ap-northeast-1.amazonaws.com";//.toLowerCase();
config.IOT_BROKER_REGION = "ap-northeast-1";
config.IOT_THING_NAME = "MyFirstGateway";

var AWS = require('aws-sdk');
AWS.config.region = config.IOT_BROKER_REGION;

var iotData = new AWS.IotData({endpoint: config.IOT_BROKER_ENDPOINT});

function setLightsStatus(newStatus, onResult) {
    var payloadObj={
        "state": {
            "desired": {
                "Group1": {
                  "power": newStatus
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
    iotData.updateThingShadow(paramsUpdate, onResult);
}