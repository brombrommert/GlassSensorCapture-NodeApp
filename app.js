/*
 * Copyright 2013. Amazon Web Services, Inc. All Rights Reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
**/

// Load the SDK and UUID
var AWS = require('aws-sdk');
var uuid = require('node-uuid');

var express = require('express');
var app = express();
// Set port explicitly
app.set('port', process.env.PORT || 8081);

// use json encoding
app.use(express.json());
app.use(express.urlencoded());

// Load AWS cfg
AWS.config.loadFromPath('./aws.config.json');
AWS.config.region = "eu-west-1";
var db = new AWS.DynamoDB({apiVersion: '2012-08-10'});

// Parse the packets from the old Table
function parseOldPackets(packets) {

  var chunks = [];

  for (var i = 0; i < packets.length; i++) {

    var packet = packets[i].blob.S;

    if (packet !== undefined) {

      packet = JSON.parse(packet);

      // I know.. nested for loops. Needed to normalize the data
      for (var j = 0; j < packet.length; j++) {
        var chunk = packet[j];

        chunks.push(chunk);
      }

    }

  }

  return chunks;
}

app.get('/', function(req, res){

  var params = {
    TableName: 'wearDump', // required
  };

  db.describeTable( params, function(err, data) {
    if (err) res.send(err + err.stack);
    else res.send(data);
  });

});

app.get('/get', function(req, res){

  var params = {
    TableName: 'wearDump',
    ScanFilter: {
      timestamp: {
        ComparisonOperator: 'BETWEEN',
        AttributeValueList: [
          { N: '1390000000000' },
          { N: '1400000000000' }
        ]
      }
    }
  };

  db.scan(params, function(err, data){
    if (err) res.send(err + err.stack);
    else {

      var packets = data.Items;

      var result = parseOldPackets(packets)

      res.send(result);

    }
  });

});

app.get('/mutate', function(req, res){

  var params = {
    TableName: 'wearDump',
    ScanFilter: {
      timestamp: {
        ComparisonOperator: 'BETWEEN',
        AttributeValueList: [
          { N: '1390000000000' },
          { N: '1400000000000' }
        ]
      }
    }
  };

db.scan(params, function(err, data){
  if (err) res.send(err + err.stack);
  else {

    var packets = data.Items,
        result = parseOldPackets(packets);

    // Transmute data
    for (var i = 0; i < result.length; i++) {

      var chunk = result[i],
          params = {
        TableName: 'wearDump2',
        Item: {
          id: { S: uuid.v1() },
          timestamp: { N: Math.round(chunk.timestamp).toString() },
          name: { S: chunk.name },
          timestampRaw: { N: Math.round(chunk.timestampRaw).toString() },
          type: { N: chunk.type.toString() },
          values: { S: JSON.stringify(chunk.values) }
        }
      };

      db.putItem(params, function(err, data){
        if (err) console.log(err + err.stack);
        else console.log('#' + params.Item.id + ' saved');
      });

    }

    res.send('Mutation done.');
  }
});  

});

app.post('/push', function(req, res){

  console.log(req.body.data);

  var params = {
    Item: {
      id: {
        S: uuid.v1()
      },
      timestamp: {
        N: Date.now().toString()
      },
      blob: {
        S: req.body.data
      }
    },
    TableName: 'wearDump'
  };

  db.putItem(params, function(err, data){
    if (err) res.send(err + err.stack);
    else res.status(200).send('Packet received, containing ' + Buffer.byteLength(req.body.data) + ' bytes.');
  });

});

app.listen(app.get('port'));
