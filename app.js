var TelldusAPI = require('telldus-live');
// var config = require('./myconfig.json')
var config = require('./config.json')
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

const updateSensors = (channel, channelUpdates) => {
  console.log(`Updating channel ${channel} with data: ${JSON.stringify(channelUpdates)}`);
  client.updateChannel(channel, channelUpdates, null);
};

const startPollingSensors = () => {
  let updates = {};
  const { mappings, telldus } = config;
  cloud.getSensors((err, sensors) => {
    let filteredSensors = _.filter(sensors, (s) => s.name != null);
    filteredSensors.map((sensor) => {
      cloud.getSensorInfo(sensor, function(err, sensor) {
        if (sensor && mappings[sensor.id]) {
          _.each(mappings[sensor.id], (channel) => {
            const fields = buildFields(channel.fields, sensor);
            updates[channel.channelId] = _.assign(updates[channel.channelId], fields);
          });
        };
      });
    });
  });
  setTimeout(() => {
    _.map(updates, (channelUpdates, idx) => {
      updateSensors(idx, channelUpdates)
      console.log(`Will poll sensors from telldus API in ${telldus.pollInterval / 1000} seconds`);
    });
  }, 10000);
  setTimeout(() => {
    startPollingSensors();
  }, config.telldus.pollInterval);
};

var app = express();


app.listen(3000, function () {
  console.log('Started server..');
  setupChannels();
  startPollingSensors();
});
