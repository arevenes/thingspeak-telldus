var TelldusAPI = require('telldus-live');
// var config = require('./myconfig.json')
var config = require('./myconfig.json')
var ThingSpeakClient = require('thingspeakclient');
var express = require('express');
var _ = require('lodash');

var publicKey    = config.telldus.publicKey;
var privateKey   = config.telldus.privateKey;
var token        = config.telldus.token;
var tokenSecret  = config.telldus.tokenSecret;

var cloud;
cloud = new TelldusAPI.TelldusAPI({ publicKey , privateKey });
cloud.login(token, tokenSecret, (err, user) => {
  // console.log(err,user);
});
var client = new ThingSpeakClient();


const setupChannels = () => {
  const { thingSpeak, channels } = config;
_.each(Object.keys(thingSpeak), (channelId) => {
  client.attachChannel(parseInt(channelId), { writeKey:thingSpeak[channelId].writeKey, readKey:thingSpeak[channelId].readKey}, (res) => {
    console.log(`Successfully setup channel ${channelId} - ${channels[channelId].name} in ThingSpeak`);
  });
});
};

const buildFields = (fields, sensor) => {
  let builtFields = {};
  _.each(fields, (field) => {
    builtFields[field.fieldId] = sensor.data[field.telldusDataId].value;
  });
  return builtFields;
};

const startPollingSensors = () => {
  console.log('Starting poll of sensors from telldus API');
  const { mappings, channels } = config;
  cloud.getSensors((err, sensors) => {
    let filteredSensors = _.filter(sensors, (s) => s.name != null);
    filteredSensors.forEach((sensor) => {
      setInterval(() => {
        cloud.getSensorInfo(sensor, function(err, sensor) {
          if (mappings[sensor.id]) {
            _.each(mappings[sensor.id], (channel) => {
              const fields = buildFields(channel.fields, sensor);
              console.log(`Updating channel ${channel.channelId} - ${channels[channel.channelId].name}`, fields);
              client.updateChannel(channel.channelId, fields, null);
            });


          };
        });
      }, config.telldus.pollInterval);
    });
  });
}


var app = express();


app.listen(3000, function () {
  console.log('Started server..');
  setupChannels();
  startPollingSensors();
});
