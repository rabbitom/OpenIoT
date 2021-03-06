(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
 * Copyright 2015-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

/*
 * NOTE: You must set the following string constants prior to running this
 * example application.
 */
var awsConfiguration = {
   poolId: 'ap-northeast-1:4f7991ba-71f1-40d3-a041-2c09060e7e15', // 'YourCognitoIdentityPoolId'
   region: 'ap-northeast-1'// 'YourAwsRegion', e.g. 'us-east-1'
};
module.exports = awsConfiguration;

},{}],2:[function(require,module,exports){
/*
 * Copyright 2015-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

//
// Instantiate the AWS SDK and configuration objects.  The AWS SDK for 
// JavaScript (aws-sdk) is used for Cognito Identity/Authentication, and 
// the AWS IoT SDK for JavaScript (aws-iot-device-sdk) is used for the
// WebSocket connection to AWS IoT and device shadow APIs.
// 
var AWS = require('aws-sdk');
var AWSIoTData = require('aws-iot-device-sdk');
var AWSConfiguration = require('./aws-configuration.js');

console.log('Loaded AWS SDK for JavaScript and AWS IoT SDK for Node.js');

//
// Initialize our configuration.
//
AWS.config.region = AWSConfiguration.region;

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
   IdentityPoolId: AWSConfiguration.poolId
});

var defaultThingName = 'MyFirstGateway';

//
// Keep track of whether or not we've registered the shadows used by this
// example.
//
var shadowsRegistered = false;

//
// Create the AWS IoT shadows object.  Note that the credentials must be 
// initialized with empty strings; when we successfully authenticate to
// the Cognito Identity Pool, the credentials will be dynamically updated.
//
const shadows = AWSIoTData.thingShadow({
   //
   // Set the AWS region we will operate in.
   //
   region: AWS.config.region,
   //
   // Use a random client ID.
   //
   clientId: 'lighting-control-browser-' + (Math.floor((Math.random() * 100000) + 1)),
   //
   // Connect via secure WebSocket
   //
   protocol: 'wss',
   //
   // Set the maximum reconnect time to 8 seconds; this is a browser application
   // so we don't want to leave the user waiting too long for reconnection after
   // re-connecting to the network/re-opening their laptop/etc...
   //
   maximumReconnectTimeMs: 8000,
   //
   // Enable console debugging information (optional)
   //
   debug: true,
   //
   // IMPORTANT: the AWS access key ID, secret key, and sesion token must be 
   // initialized with empty strings.
   //
   accessKeyId: '',
   secretKey: '',
   sessionToken: ''
});

//
// Update divs whenever we receive delta events from the shadows.
//
shadows.on('delta', function(name, stateObject) {
      console.log('received delta of ' + name + ': ' + JSON.stringify(stateObject));
      if (name === defaultThingName) {
            //var htmlText = '';
            $('.lightSwitch').off('switchChange.bootstrapSwitch');
            var lights = stateObject.state;
            for(var light in lights) {
                  var state = lights[light];
                  //document.getElementById(light + '-state').innerHTML = state.power;
                  $('#' + light + '-state').bootstrapSwitch('state', (state.power == 'on'));
            }
            $('.lightSwitch').on('switchChange.bootstrapSwitch', onLightSwitchChange);
      }
});

//
// Update divs whenever we receive status events from the shadows.
//
shadows.on('status', function(name, statusType, clientToken, stateObject) {
      console.log('received status of ' + name + ' ' + statusType + ': ' + JSON.stringify(stateObject));
      if (statusType === 'rejected') {
      //
      // If an operation is rejected it is likely due to a version conflict;
      // request the latest version so that we synchronize with the shadow
      // The most notable exception to this is if the thing shadow has not
      // yet been created or has been deleted.
      //
            if (stateObject.code !== 404) {
                  console.log('resync with thing shadow');
                  var opClientToken = shadows.get(name);
                  if (opClientToken === null) {
                  console.log('operation in progress');
                  }
            }
      } else { // statusType === 'accepted'
            if (name === defaultThingName) {
                  //var htmlText = '';
                  //$('#lighting-control-div').empty();
                  $('#lighting-control-div > p').hide();
                  $('.lightSwitch').off('switchChange.bootstrapSwitch');
                  var lights = stateObject.state.reported;
                  for(var light in lights) {
                        var state = lights[light];
                        ////htmlText += ('<p>' + light + ': <span id="' + light + '-state">' + state.power + '</span></p>');
                        //htmlText += '<input type="checkbox" class="lightSwitch" id="' + light + '-state" checked>';
                        var lightSwitch = $('#' + light + '-state');
                        if(lightSwitch.size() == 0)
                              $('#lighting-control-div').append('<input type="checkbox" class="lightSwitch" id="' + light + '-state" lightId="' + light + '" checked>');
                        $('#' + light + '-state').bootstrapSwitch();
                        $('#' + light + '-state').bootstrapSwitch('state', (state.power == 'on'));
                  }
                  //document.getElementById('lighting-control-div').innerHTML = htmlText;
                  //$(".lightSwitch").bootstrapSwitch();
                  $('.lightSwitch').on('switchChange.bootstrapSwitch', onLightSwitchChange);
            }
      }
});

function onLightSwitchChange(event, state) {
      //console.log(event); // jQuery event
      //console.log(state); // true | false
      var lightId = $(this).attr('lightId');
      var curState = new Object();
      curState[lightId] = {
            power: state ? "on" : "off"
      };
      var state = {
            "state": {
                  "desired": curState
            }
      };
      var clientTokenUpdate = shadows.update(defaultThingName, state);
      if (clientTokenUpdate)
            console.log('updated shadow: ' + JSON.stringify(state));
      else
            console.log('update shadow failed, operation still in progress');
}

//
// Attempt to authenticate to the Cognito Identity Pool.  Note that this
// example only supports use of a pool which allows unauthenticated 
// identities.
//
var cognitoIdentity = new AWS.CognitoIdentity();
AWS.config.credentials.get(function(err, data) {
   if (!err) {
      console.log('retrieved identity: ' + AWS.config.credentials.identityId);
      var params = {
         IdentityId: AWS.config.credentials.identityId
      };
      cognitoIdentity.getCredentialsForIdentity(params, function(err, data) {
         if (!err) {
            //
            // Update our latest AWS credentials; the MQTT client will use these
            // during its next reconnect attempt.
            //
            shadows.updateWebSocketCredentials(data.Credentials.AccessKeyId,
               data.Credentials.SecretKey,
               data.Credentials.SessionToken);
         } else {
            console.log('error retrieving credentials: ' + err);
            alert('error retrieving credentials: ' + err);
         }
      });
   } else {
      console.log('error retrieving identity:' + err);
      alert('error retrieving identity: ' + err);
   }
});

//
// Connect handler; update div visibility and fetch latest shadow documents.
// Register shadows on the first connect event.
//
window.shadowConnectHandler = function() {
   console.log('connect');
   document.getElementById("connecting-div").style.visibility = 'hidden';
   document.getElementById("lighting-control-div").style.visibility = 'visible';

   //
   // We only register our shadows once.
   //
   if (!shadowsRegistered) {
      shadows.register(defaultThingName, {
         persistentSubscribe: true
      });
      shadowsRegistered = true;
   }
   //
   // After connecting, wait for a few seconds and then ask for the
   // current state of the shadows.
   //
   setTimeout(function() {
      var opClientToken = shadows.get(defaultThingName);
      if (opClientToken === null) {
         console.log('operation in progress');
      }
   }, 3000);
};

//
// Reconnect handler; update div visibility.
//
window.shadowReconnectHandler = function() {
   console.log('reconnect');
   document.getElementById("connecting-div").style.visibility = 'visible';
   document.getElementById("lighting-control-div").style.visibility = 'hidden';
};

//
// Install connect/reconnect event handlers.
//
shadows.on('connect', window.shadowConnectHandler);
shadows.on('reconnect', window.shadowReconnectHandler);

//
// Initialize divs.
//
document.getElementById('connecting-div').style.visibility = 'visible';
document.getElementById('lighting-control-div').style.visibility = 'hidden';
document.getElementById('connecting-div').innerHTML = '<p>attempting to connect to aws iot...</p>';
document.getElementById('lighting-control-div').innerHTML = '<p>getting latest status...</p>';

},{"./aws-configuration.js":1,"aws-iot-device-sdk":"aws-iot-device-sdk","aws-sdk":"aws-sdk"}]},{},[2]);
