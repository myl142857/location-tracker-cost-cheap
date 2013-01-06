var fs = require('fs');
var http = require('http');
var express = require('express');
var geocoder = require('geocoder');
var mongoStore = require('connect-mongodb');
var connectTimeout = require('connect-timeout');
var stylus = require('stylus');
var mongoose = require('mongoose');
var flash = require('connect-flash');
var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);
var push_message_socket = io.of("/push_messages");
var location_movement_socket = io.of("/locations");
var connect = require('express/node_modules/connect');
var parseSignedCookie = connect.utils.parseSignedCookie;
var cookie = require('express/node_modules/cookie');
var db_helper = require("./js/db_helper.js");
var tracker = require('./js/tracker');
var sql_model = require('./js/db_helper');
var models = require('./js/models');
var push = require('./js/push_message');

server.listen(3000);

app.configure('development', function() {
  console.log(" ######## development ############");
  app.set('db-uri', 'mongodb://Mani.local:27017/nodepad-development');
  app.use(express.errorHandler({ dumpExceptions: true }));
  app.set('view options', {
    pretty: true
  });
});

app.configure('test', function() {
  console.log(" ######## test ############");
  app.set('db-uri', 'mongodb://Mani.local:27017/nodepad-test');
  app.set('view options', {
    pretty: true
  });  
});

app.configure('production', function() {
  console.log(" ######## production ############");
  app.set('db-uri', 'mongodb:/Mani.local:27017nodepad-production');
});

app.configure(function(){
  app.set('views', __dirname + '/views'); //specifying template path
  app.set('view engine', 'ejs'); //specifying template engine
  app.engine('ejs', require('ejs-locals'));
  app.use(express.favicon());
  app.use(express.bodyParser());
  app.use(express.cookieParser()); 
  app.use(connectTimeout({ time: 20000 }));
  app.use(express.session({secret: 'secret', key: 'express.sid'}));
  //app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: 'avinashmahesh' }));
  app.use(express.logger({ format: '\x1b[1m:method\x1b[0m \x1b[33m:url\x1b[0m :response-time ms' }))
  app.use(express.methodOverride());
  app.use(flash());
  app.use(express.static(__dirname + '/'));
});

models.defineModels(mongoose, function() {
  console.log(" ######## defineMdels ############");
  app.LoginToken = LoginToken = mongoose.model('LoginToken');
  db = mongoose.connect(app.set('db-uri'));
})

function loadUser(req, res, next) {
  console.log(" ####### Load user ######## "+req.session.user_id);
  // Check if session has user_id
  if( req.session.user_id) {
    sql_model.findUserId(req.session.user_id, function(results) {
      if( results.length >0 ) {
        console.log(" ######## SQL found UserId result  ########## "+results[0].email+":"+results[0].salt+":"+results[0].hashed_password);
        // Set the session user id.
        req.currentuser = results[0].email;
        next();
      } else {
        res.redirect('/index');
      }
    });
  } else if (req.cookies.logintoken) {
    console.log(" ####### Load user cookies login token ##########"+req.cookies.logintoken);
    authenticateFromLoginToken(req, res, next);
  } else {
    console.log(" ####### Load user redirect /sessions/new ###### ");
    res.redirect('/index');
  }
} // End of loadUser.

function authenticateFromLoginToken(req, res, next) {
  var cookie = JSON.parse(req.cookies.logintoken);
  console.log(" ########## authenticateFromLoginToken cookie ######### "+ JSON.stringify(cookie));
  LoginToken.findOne({ email: cookie.email,
                       series: cookie.series,
                       token: cookie.token }, (function(err, token) {
                       
    console.log(" ########## LoginToken.findOne ######### "+ JSON.stringify(token)) ;                       
    if (!token) {
      res.redirect('/index');
      return;
    }
    
    sql_model.findUser(token.email, function(results) {
      if( results.length >0 ) {
        console.log(" ######## SQL findUser result  ########## "+results[0].email+":"+results[0].salt+":"+results[0].hashed_password);
        req.session.user_id = results[0].id;
        req.currentUser = results[0].email;
        token.token = token.randomToken();
        console.log(" ########## Generate Random token ###### "+token.token);
        token.save(function() {
        console.log(" ########## Token obtained SAVE to cookie ######### "+ token.cookieValue);
          res.cookie('logintoken', token.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
          next();
        });

      } else {
        console.log(" ######## SQL findUser NO result  ########## ");
        res.redirect('/index');
      }
      
    }); // sql query
  })); // LoginToken query
}

app.get('/', loadUser, function(req, res) {
    console.log(" ######### GET / ############ ");
    // Show index page
    res.redirect('/settings');
});

app.get('/index', function(req, res) {
    console.log(" ######### GET /index ############ ");
    // Show index page
    res.render('index1',{ user:null, header:{ tab:'home'} });
});

app.get('/about', function(req, res) {
  res.render('about',{ user:null,header:{ tab:'about'} });
});

app.get('/pricing', function(req, res) {
  res.render('pricing',{ user:null,header:{ tab:'pricing'} });
});

app.get('/register', function(req, res) {
  console.log(" ######### GET /register ########### ");
  res.render('register');
});

app.get('/help', function(req, res) {
  res.render('help');
});

app.post('/register', function(req, res) {

  // Store the user details.
  console.log(" ######### POST /register ########### "+req.body.email+" : "+req.body.password+" : "+req.body.confirm_password);
  req.flash('info', 'register show');
  var user = {
    email:req.body.email, password: req.body.password
  };
  // Add to sql_model.
  sql_model.add_user(user,function(result) {
    console.log(" ######### add user ####### "+ result);
    if( result != -1 && result != -2) {
        console.log(" ######### add user set the session sql user id ####### "+ result);
      req.session.user_id = result;
      req.currentuser = req.body.email;
      res.redirect('/settings');
    } else {
      res.redirect('/register');
    }
  });
});

app.get('/login', function(req, res) {
  console.log(" ######### LOGIN GET ###########");
  res.render('login',{ error: "Incorrect credentials" });
});

app.post('/login', function(req, res) {
  // Check for username & password.
  console.log(" ######### post /login ########### "+req.body.email+"  ::  "+req.body.password);
  
  sql_model.findUser( req.body.email, function(results) {

    // Check password.
    if( results.length > 0 && results[0].email) {
      console.log(" ######### results obtained found email ########## ");
      if( sql_model.authenticate(req.body.password,results[0].salt,results[0].hashed_password) )  {
        // set the session with id.
        console.log(" ######### PASSWORD MATCH ########## "+results[0].email+" : "+results[0].salt);
        req.session.user_id = results[0].id;
        req.currentuser = results[0].email;
        if (req.body.remember_me) {
            var loginToken = new LoginToken({ email: results[0].email });
            loginToken.save(function() {
              res.cookie('logintoken', loginToken.cookieValue, { expires: new Date(Date.now() + 2 * 604800000), path: '/' });
              console.log(" ######### post /login Remember ME logintoken ########### "+loginToken.cookieValue);
              //res.render('/user',{ user: {username:results[0].email} });
              res.redirect('/settings');
            });
        } else {
            console.log(" ######### PASSWORD MATCH redirect /user########## "+results[0].email);
            res.redirect('/settings');
            //res.render('user',{ user: {username:results[0].email},title:results[0].email });
        }

      } else {
        console.log(" ######### PASSWORD NOT MATCH ########## "); 
        res.redirect('/login');
      }
    } else {
        console.log(" ######### results obtained NOT found email ########## ");
        res.redirect('/login');
    }
  });
});

app.get('/logout', loadUser, function(req, res){
  console.log(" ######### GET /logout ########### "+req.session+"  ::  "+req.session.user_id);
  if (req.session) {
    LoginToken.remove({ email: req.currentuser.email }, function() {});
    res.clearCookie('logintoken');
    req.session.destroy(function() {
      console.log(" ######### session destroyed ########### "+req.session);
    });
  }
  res.redirect('/index');
});

// Delete user account.
app.delete('/user', loadUser, function(req,res) {
  console.log(" ######### DELETE /user ########### "+req.session+"  ::  "+req.session.user_id);
  if (req.session) {
    LoginToken.remove({ email: req.currentuser.email }, function() {});
    res.clearCookie('logintoken');
    req.session.destroy(function() {
      console.log(" ######### session destroyed ########### "+req.session);
    });
  }
  sql_model.deleteUserId(req.session.user_id, function(err,result) {
    if(err) {
      // TODO: Handle the error scenario.
    } else {
      console.log(" ######### account deleted ########### "+JSON.stringify(result));
      res.redirect('/index');
    }
  });
});

// Settings page
app.get('/settings', loadUser, function(req, res){
  console.log(" ######### GET /settings ########### "+req.currentuser+"  ::  "+req.session.user_id);
  sql_model.getAllDevices(req.session.user_id,function(err,results) {
    if( err) {
      // TODO: Handle the error scenario.
    }
    res.render('settings',{ user: {username:req.currentuser },title:req.currentuser,user_id:req.session.user_id,devices:results});  
  });                    
});

// Device page:: Phonenumber is input.
// GET URL: http://localhost:3000/device/1
app.get('/device/:id', loadUser, function(req, res){
  console.log(" ######### GET /device ########### "+req.currentuser+" : "+req.params.id);
  // Send devices details & location details. 
  var devicedata;
  var locationsList;
  sql_model.getDeviceById(req.params.id,function(err,result){
    //sql_model.getDeviceById(3,function(err,result){
    if( err ) {
      //TODO: Handle the error scenario.
    } else {
      devicedata = result;
      req.session.device_id = req.params.id;
      res.render('device',{ title:req.currentuser, user: {username:req.currentuser}, device: devicedata,locations:locationsList } );
    }
  });  
});

// Create a device 
app.post('/device', loadUser, function(req, res) {

  console.log("######### POST /user/device ########## "+req.body.device+" ::  "+req.session.user_id+"  :: "+req.body.countrycode);
    // Get the user id, device: Add to phone number table.
    if( ! req.body.device) {
      res.send(' {"code":"ER_NO_PHONE_NUMBER"}');
    } else if(! req.body.name) {
      res.send('{"code":"ER_NO_NAME"}');
    } else {
      // Add to sql_model.
      sql_model.add_device(req.session.user_id,req.body.name,req.body.countrycode,req.body.device,"",function(err,result) {
        res.contentType('application/json');
        if( err )  {
            res.send(JSON.stringify(err));
        } else {
          res.send(JSON.stringify(result));
        }
      }); // Add device 
    }
  console.log("######### POST /user/device FUNCTION ENDS ########## ");
});

// Delete a device.
app.delete('/device/:id', loadUser, function(req, res){
  console.log(" ######### DELETE /device ###########"+req.params.id+" :: ");

  // Delete the device with id.
  sql_model.deletePhonumerById( req.params.id, function( err,result) {
      res.contentType('application/json');
      if( err )  {
          res.send(JSON.stringify(err));
      } else {
        res.send(JSON.stringify(result));
      }    
  });

});

// Get devices list
app.get('/devices', loadUser, function(req, res) {
    console.log("######### POST /user/device ########## "+req.body.device+" ::  "+req.session.user_id);
    res.redirect('/index');
});

// Authenticate access code & phonenumber
// 422; 3001; Missing mandator Parameter for: phonenumber
// 422; 3002; Missing mandator Parameter for: accesscode
// 422; 3003; Missing mandator Parameter for: push_notification_id
// 422; 3004; Missing mandator Parameter for: device_os
// 422; 3005; Invalid parameter for: phonenumber
// 422; 3006; Invalid parameter for: accesscode
// 404; 3011; Record not found for: accesscode
// 404; 3012; Record not found for: phonenumber
// 400; 3012; Permission denied
// 401; 1013; Invalid session
app.post('/verify_accesscode', function(req, res) {
  console.log( " ##########  /POST verify_accesscode ############ "+req.body.phonenumber);
  console.log( " ##########  /POST push notification id ############ "+req.body.push_notification_id);
  console.log( " ##########  /POST device os ############ "+req.body.device_os);

  if( !req.body.phonenumber) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Phonenumber is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;    
  } else if(!req.body.accesscode) {
       var jsonResponse = [{status:'422'},{errorcode:'3002', error:"Missing mandatory parameters.", extra_info:"Accesscode is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;
  } else if(!req.body.push_notification_id) {
       var jsonResponse = [{status:'422'},{errorcode:'3003', error:"Missing mandatory parameters.", extra_info:"Push Notification ID is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;
  } else if(!req.body.device_os) {
       var jsonResponse = [{status:'422'},{errorcode:'3004', error:"Missing mandatory parameters.", extra_info:"Device OS is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;
  } else if( req.body.phonenumber instanceof string) {
      //TODO: Check if phonenumber contains valid number and between 8 to 10 number range.
      var jsonResponse = [{status:'422'},{errorcode:'3005', error:"Invalid Parameter.",extra_info:"phonenumber"}];
  } else if( req.body.accesscode instanceof string) {
      var jsonResponse = [{status:'422'},{errorcode:'3006', error:"Invalid Parameter.",extra_info:"accesscode"}];
  }

  // Return the userid,session_id,
  sql_model.getDeviceByPhNumber(req.body.phonenumber,function(err,result) {
    if(err) {
       var jsonResponse = [{status:'404'},{errorcode:'3001',error:"SQL error"}];
       res.send(JSON.stringify(jsonResponse));      
    } else {
      if(result.length > 0 ) {
        // Check for accesscode
        if(result[0].accesscode == req.body.accesscode) {
         var jsonResponse = [{status:'200'},{ user_id: result[0].user_id, device_id: result[0].id, session_id:result[0].session_id}];
         res.send(JSON.stringify(jsonResponse));      
         //Update the authenticated status & push_notification_id.
         sql_model.updateDeviceWithPh(req.body.phonenumber,req.body.push_notification_id,1,function(err,result){
            if( err ) {
              console.log("Update authenticated ERROR");
            } else {
              console.log("Update authenticated SUCCESS");
            }
         });

        } else {
         var jsonResponse = [{status:'404'},{errorcode:'3002',error:"Invalid accesscode"}];
         res.send(JSON.stringify(jsonResponse));                
        }
      } else {
       var jsonResponse = [{status:'404'},{errorcode:'3001', error:"Invalid phonenumber"}];
       res.send(JSON.stringify(jsonResponse));      
      }
    }
  });

});

// Generate the access code and send to the mobile user.
app.post('/send_accesscode',function(req,res) {
  console.log( " ##########  /POST send_accesscode ############ "+req.body.phonenumber+"   "+res.body.accesscode);

  if( !req.body.phonenumber) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Phonenumber is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;    
  } 

  sql_model.getDeviceByPhNumber(req.body.phonenumber,function(err,result) {
    if(err) {
       var jsonResponse = [{status:'422'},{ error:"SQL error"}];
       res.send(JSON.stringify(jsonResponse));      
    } else {
      if(result.length > 0 ) {
        // Check for accesscode
        // Get phone number, country code, send SMS.
        if(result[0].accesscode == req.body.accesscode) {
         var jsonResponse = [{status:'200'},{ user_id: result[0].user_id, session_id:result[0].session_id}];
         res.send(JSON.stringify(jsonResponse));      
         //Update the authenticated status.
         sql_model.updateDeviceWithPh(req.body.phonenumber,1,function(err,result){
            if( err ) {
              console.log("Update authenticated ERROR");
            } else {
              console.log("Update authenticated SUCCESS");
            }
         });
        } else {
         var jsonResponse = [{status:'422'},{errorcode:'3002', error:"Invalid accesscode"}];
         res.send(JSON.stringify(jsonResponse));                
        }
      } else {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Invalid phonenumber"}];
       res.send(JSON.stringify(jsonResponse));      
      }
    }
  });  


});

// Send push MSG GCM.
app.post('/device/push_message', function(req, res) {
  console.log( "##########  /POST push_message ############ "+req.body.push_message);
  console.log("####### /POST push_message  ###### "+req.body.push_notification_id);

  if( !req.body.push_message) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Push Message is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;    
  } else if(!req.body.push_notification_id) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Push Notification ID is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;
  } 

  push.sendPushMessage(req.body.push_message, req.body.push_notification_id,function(push_message_id,result) {
      console.log('###### Send Message result ######## '+push_message_id);
      // Check for messageId, Add to push_messages table.
      if( result && result.messageId) {
        var jsonResponse = [{ status: '200'}];
        console.log('###### Send Message result FOUND ######## '+result.messageId);
        sql_model.add_push_message(req.body.device_id,push_message_id,req.body.push_message,"server",req.body.latitude,
          req.body.longitude,req.body.accuracy,function(err,add_push_result){
            console.log(" ###### Result sql model push message ###### "+JSON.stringify(add_push_result));
          });
      } else {
        // Check for errorCode{"errorCode":"NotRegistered"},InvalidRegistration,MessageTooBig,InternalServerError
        if(result.errorCode && result.errorCode == 'NotRegistered') {
          var jsonResponse = [{status:'400'},{error:result.errorCode}];
          // Remove from db or mark it as not registered.

        } else {
          var jsonResponse = [{status:'400'},{error:result.errorCode}];
        }
      }
      console.log('###### Send Message result response SENT ######## ');
      res.send(JSON.stringify(jsonResponse));      
  });

});

// Send push MSG GCM.
app.post('/devices/push_message_to_all', function(req, res) {
  console.log( " ##########  /POST push_message ############ "+req.body.push_message);
  console.log("####### /POST push_message  ###### "+req.body.user_id);

  if( !req.body.push_message) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Push Message is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;    
  } else if(!req.body.user_id) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"User id is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;
  }

  push.sendMessageToAll(req.body.user_id,req.body.push_message, function(result) {
      console.log('###### Send Message result ######## '+result);
      var jsonResponse = [{ status: '200'}];
      res.send(JSON.stringify(jsonResponse));      
  });
});

// Get all push messages for a device.
app.get('/device/:id/push_messages',function(req,res){
  console.log( " ##########  /GET push_messages ############ "+req.params.id);

 if(!req.params.id) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Device id is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;
  }
  sql_model.getAllPushMessages(req.params.id,function(err,result) {
    
    if(err) {
      res.send([]);      
    } else {
      var jsonResponse = [{ status: '200'}];
      jsonResponse.push(JSON.stringify(result));
      console.log('###### Send Message result ######## '+JSON.stringify(jsonResponse));
      res.send(jsonResponse);
    }
  });
});

// Post: to get response message from user.
app.post('/respond_push_message', function(req, res) {

  console.log(" ####### /POST respond_push_message ####### "+req.body.respond_message+" : "+req.body.device_id+" : "+req.body.push_message_id);
  if( !req.body.respond_message) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Respond Message is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;    
  } else if(!req.body.device_id) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Device id is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;
  } else if(!req.body.push_message_id) {
       var jsonResponse = [{status:'422'},{errorcode:'3001', error:"Missing mandatory parameters.", extra_info:"Push Message id is missing"}];
       res.send(JSON.stringify(jsonResponse));  
       return;
  }
  
  

  sql_model.add_push_message(req.body.device_id,req.body.push_message_id,req.body.respond_message,"user",0,0,0,
      function(err,add_push_result){
        console.log(" ###### Result sql model push message ###### "+JSON.stringify(add_push_result));
        var jsonResponse = [{status:'200'},{push_message_id:req.body.push_message_id,respond_message:req.body.respond_message}];
        res.send(JSON.stringify(jsonResponse));  
        // Update the response to the UI, with help of sockets.
        push_message_socket.in("1,5").emit('update', { name:"device", message:"New push message"});
  });

});

// Get session_id, phonenumber
app.post('/update_location', function(request, response) {
  console.log( " ##########  request body ############ "+request.body.latitude+"   "+request.body.longitude+"  "+request.body.accuracy);
  var data = {
          latitude: request.body.latitude,
          longitude: request.body.longitude,
          accuracy: request.body.accuracy
  };

  add_location(data);
  console.log(JSON.stringify(request.body));
  response.contentType('application/json');

  // Normally, the would probably come from a database, but we can cheat:
  var people = [
    { name: 'Dave', location: 'Atlanta' },
    { name: 'Santa Claus', location: 'North Pole' },
    { name: 'Man in the Moon', location: 'The Moon' }
  ];

  var peopleJSON = JSON.stringify(people);
  response.send(peopleJSON);
});

var clientcon;

io.configure(function() {
    io.set('authorization', function (handshakeData, accept) {
      console.log(" ######## Socket io authorization ######### "+JSON.stringify(handshakeData));    
      if (handshakeData.headers.cookie) {
        
        handshakeData.cookie = cookie.parse(handshakeData.headers.cookie);
        handshakeData.sessionID = parseSignedCookie(handshakeData.cookie['express.sid'], 'secret');
        console.log(" ######## Socket io authorization cookie ######### "+handshakeData.cookie['express.sid']+" : "+handshakeData.sessionID);
        
        if (handshakeData.cookie['express.sid'] == handshakeData.sessionID) {
          console.log(" ######## Socket io authorization MATCH ######### "+handshakeData.cookie['express.sid']+" : "+handshakeData.sessionID);
          return accept('Cookie is invalid.', false);
        }

      } else {
        console.log(" ######## Socket io no cookie transmitted ######### ");
        return accept('No cookie transmitted.', false);
      } 
      console.log(" ######## Socket io accepted ######### ");
      accept(null, true);
  });
}); 


push_message_socket.on('connection', function(socket) {

  var hs = socket.handshake;
  console.log('########## A client connected ####### socketID ' +socket.id+' #### '+JSON.stringify(socket.handshake));

  socket.on("device", function(data)
  {
      try
      {
        console.log('########## user emit #######' + JSON.stringify(data));
        console.log('########## user emit #######' + data.device_id);
        // Make sure we have the data we need...
        if (data == null || (data.device_id || null) == null) {
            return;
        }
        // Join the user to their own private channel so we can send them notifications...
        socket.join(data.device_id);  
      } catch (e) { 
        console.log(e); 
      }
  });

  socket.emit('populate', "XXXxxxxxxxxxx");
  
  //client.on('add location', add_location); 
  
}); // End of push_messages socket.io

location_movement_socket.on('connection', function(socket) {

  var hs = socket.handshake;
  console.log('########## A client connected ####### socketID ' +socket.id+' #### '+JSON.stringify(socket.handshake));

  socket.on("device", function(data)
  {
      try
      {
        console.log('########## user emit #######' + JSON.stringify(data));
        console.log('########## user emit #######' + data.device_id);
        // Make sure we have the data we need...
        if (data == null || (data.device_id || null) == null) {
            return;
        }
        // Join the user to their own private channel so we can send them notifications...
        socket.join(data.device_id);  
      } catch (e) { 
        console.log(e); 
      }
  });

  socket.emit('populate', "XXXxxxxxxxxxx");
  
  //client.on('add location', add_location); 
  
}); // End of location movement socket.io

add_location = function(data) {

  geocoder.reverseGeocode( data.latitude, data.longitude, function ( err, resultdata ) {
        // do stuff with data
        var result = JSON.stringify(resultdata);
        var jsonData = JSON.parse(result);
        console.log( '############# parse json  ########## '+ jsonData.results[0].formatted_address);

        data.location = jsonData.results[0].formatted_address;
            // create location, when its done repopulate locations on client
        db_helper.add_location(data, function(lastId) {
          // repopulate employees on client
          db_helper.get_locations(function(locations) {
            console.log('************** Emit populate *********** '); 
            clientcon.emit('populate', locations);
          });
        });
  }); // End of reverse geocode.
} 









