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
  app.set('db-uri', 'mongodb://Mani.local:27017/nodepad-development');
  app.use(express.errorHandler({ dumpExceptions: true }));
  app.set('view options', {
    pretty: true
  });
});

app.configure('test', function() {
  app.set('db-uri', 'mongodb://Mani.local:27017/nodepad-test');
  app.set('view options', {
    pretty: true
  });  
});

app.configure('production', function() {
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
  app.LoginToken = LoginToken = mongoose.model('LoginToken');
  db = mongoose.connect(app.set('db-uri'));
})

app.get('/', loadUser, function(req, res) {
  console.log(" ######### GET / ############ "+req.currentuser);
  if(req.currentuser) {
    // Show the users page.
    res.redirect('user');
  } else {
    // Show index page
    res.render('index1',{ user:null, header:{ tab:'home'} });
  } 
});

app.get('/about', function(req, res) {
  res.render('about',{ user:null,header:{ tab:'about'} });
});

app.get('/pricing', function(req, res) {
  res.render('pricing',{ user:null,header:{ tab:'pricing'} });
});

app.get('/user', function(req, res) {
  // Get the devices registered list.
  console.log(" ######### GET /user ######### "+req.currentuser);
  res.render('user',{ user: {username:req.currentuser } } );
});

app.get('/register', function(req, res) {
  console.log(" ######### GET /register ########### ");
  res.render('register', { error: 'Password & Confirm password not correct' });
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
      req.session.sql_user_id = result;
      req.currentuser = req.body.email;
      res.redirect('user');
    } else {
      res.redirect('register');
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

    console.log(" ######### results obtained ########## "+results);
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
                res.redirect('/user');
              });
           } else {
              console.log(" ######### PASSWORD MATCH redirect /user########## "+req.currentuser);
              res.redirect('/user');
           }

      } else {
        console.log(" ######### PASSWORD NOT MATCH ########## "); 
        req.flash('error', 'Incorrect credentials');
        res.redirect('/login');
      }
    } else {
        console.log(" ######### results obtained found email ########## ");
        req.flash('error', 'Incorrect credentials');
        res.redirect('/login');
    }
  });
});


function loadUser(req, res, next) {
console.log(" ####### Load user SESSION ######## "+req.session.sql_user_id);
  // SQL model.
  if( req.session.sql_user_id) {
    sql_model.findUserId(req.session.sql_user_id, function(results) {
      if( results.length >0 ) {
        console.log(" ######## SQL findUserId result  ########## "+results[0].email+":"+results[0].salt+":"+results[0].hashed_password);
        // Set the session user id.
        req.currentuser = results[0].email;
        next();
      } else {
        console.log(" ####### Load user redirect /sessions/new ###### ");
        res.redirect('/');        
      }

    });
  } else if (req.cookies.logintoken) {
    console.log(" ####### Load user cookies login token ##########"+req.cookies.logintoken);
    authenticateFromLoginToken(req, res, next);
  } else {
    console.log(" ####### Load user redirect /sessions/new ###### ");
    res.redirect('/');
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
      res.redirect('/');
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
        next();
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









