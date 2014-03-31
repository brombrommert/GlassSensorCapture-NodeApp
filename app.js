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

app.get('/', function(req, res){

  var params = {
    TableName: 'wearDump', // required
  };

  db.describeTable( params, function(err, data) {
    if (err) res.send(err + err.stack);
    else res.send(data);
  });

});

app.get('/place', function(req, res){

  var params = {
    Item: {
      id: {
        S: uuid.v1()
      },
      timestamp: {
        N: Date.now().toString()
      },
      blob: {
        SS: ['data:{test:"for science!"}', 'and:{other:"things to be tested"}']
      }
    },
    TableName: 'wearDump'
  };

  db.putItem(params, function(err, data){
    if (err) res.send(err + err.stack);
    else res.send(data);
  });

});

app.get('/put', function(req, res){

  var body = '<html><head><title>Put</title><script src="https://cdnjs.cloudflare.com/ajax/libs/zepto/1.0/zepto.min.js"></script></head><body><a href="#" id="btn">Put request</a></body></html>';

  res.send(body);

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
