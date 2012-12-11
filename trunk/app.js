var fs = require('fs');
var http = require('http');
var express = require('express');
var db_helper = require("./db_helper.js");
var tracker = require('./tracker');
var geocoder = require('geocoder');
var mongoStore = require('connect-mongodb');
var connectTimeout = require('connect-timeout');
var stylus = require('stylus');
var mongoose = require('mongoose');
var flash = require('connect-flash');
var app = express();
var server = http.createServer(app);
var sql_model = require('./db_helper');
var models = require('./models');

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
  app.use(express.session({ store: mongoStore(app.set('db-uri')), secret: 'avinashmahesh' }));
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
  console.log(" ######### DELETE /user ########### "+req.session+"  ::  "+req.session.user_id);
  if (req.session) {
    LoginToken.remove({ email: req.currentuser.email }, function() {});
    res.clearCookie('logintoken');
    req.session.destroy(function() {
      console.log(" ######### session destroyed ########### "+req.session);
    });
  }
  res.redirect('/index');
});

// Settings page
app.get('/settings', loadUser, function(req, res){
  console.log(" ######### GET /user/settings ########### "+req.currentuser+"  ::  "+req.session.user_id);
  sql_model.getAllDevices(req.session.user_id,function(results) {
    var deviceslist = [];
    for(var i = 0; i < results.length; i++) {
      deviceslist[i] = results[i].phonenumber;
    }       
    res.render('settings',{ user: {username:req.currentuser },title:req.currentuser,devices:deviceslist });  
  });                    
});

app.get('/user', loadUser, function(req, res) {
  // Get the devices registered list.
  console.log(" ######### GET /user ######### "+req.currentuser);
  res.render('user',{ user: {username:req.currentuser },title:req.currentuser } );
});

// Settings page
app.get('/device', loadUser, function(req, res){
  console.log(" ######### GET /device ########### ");
  res.redirect('/index');
});

// Create a device 
app.post('/device', loadUser, function(req, res) {

  console.log("######### POST /user/device ########## "+req.body.device+" ::  "+req.session.user_id);
    // Get the user id, device: Add to phone number table.
    // Add to sql_model.
    sql_model.add_device(req.session.user_id,req.body.device,"aas019jasjer-123923jdjdfuej",function(err,result) {
      console.log(" ######### add device ####### "+ result);
      var deviceslist = [];

      if( err )  {
          console.log(" Obtained error ####### ");
          if(err.code) {
            if( err.code == 'ER_DUP_ENTRY') {
              console.log(" ########## err ER_DUP_ENTRY FOUND ######### ");
              // TODO throw flash message. device already added.
            }
          }
          throw err;
      }

      // Get all the devices list. 
      sql_model.getAllDevices(req.session.user_id,function(results) {
        for(var i = 0; i < results.length; i++) {
          deviceslist[i] = results[i].phonenumber;
        }       
        console.log(" ####### DEVICES LIST ####### "+deviceslist);
        res.render('settings',{ user: {username:req.currentuser },title:req.currentuser,devices:deviceslist });
      });   // Get all device.

    }); // Add device 

});

// Get devices list
app.get('/devices', loadUser, function(req, res) {

    console.log("######### POST /user/device ########## "+req.body.device+" ::  "+req.session.user_id);
    res.redirect('/index');
});


function loadUser(req, res, next) {
  console.log(" ####### Load user ######## "+req.session.user_id);
  // SQL model.
  if( req.session.user_id) {
    sql_model.findUserId(req.session.user_id, function(results) {
      if( results.length >0 ) {
        console.log(" ######## SQL findUserId result  ########## "+results[0].email+":"+results[0].salt+":"+results[0].hashed_password);
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
var io = require('socket.io').listen(server);

io.sockets.on('connection', function(client) {

  clientcon = client;
  // populate employees on client
  db_helper.get_locations(function(locations) {
    console.log('************** Server Emit POPULATE *********** '+clientcon);
    client.emit('populate', locations);
  });
  
  // client add new employee
  client.on('add location', add_location); 
  
}); // End of socket.io

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









