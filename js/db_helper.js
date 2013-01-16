var mysql = require('mysql');
var crypto = require('crypto');
var geoJSON = require('./geoJSON');

// init;
var client = mysql.createConnection({
  user: 'root',
  password: 'joliee!11',
  hostname: 'localhost'  
}); 

client.query('USE tracker_db');

// Inserts the user into the database.
exports.add_user = function(user, callback) {
  console.log(" #########  user  ############# "+user.email+"  ::  "+user.password);
  
  // Check for password validation.
  if(!validatePresenceOf(user.password)) {
  console.log(" #########  password not valid  ############# ");
    callback(-2);
    return;
  }
  
  user.salt = makeSalt();
  console.log(" #########  user salt  ############# "+user.salt);
  user.hashed_password = encryptPassword(user.password,user.salt);
  
  client.query("insert into user (email, hashed_password, salt) values (?,?,?)", 
    [user.email, user.hashed_password, user.salt], 
    function(err, info) {
        
          if( err )  {
            throw err;

            callback(-1);
            return;
          }
        
          // callback function returns last insert id
          callback(info.insertId);
      });
}

// Find the user given the email.
exports.findUser = function(email,callback) {

console.log(" ####### find user by email  ########"+email);
  client.query( "select * from user where email=?",
      [email],
      function( err, results, fields)  {
          if( err) {
            throw err;
          }
      console.log(" ####### GET user  ########"+JSON.stringify(results));
      callback(results);
  
  });
}

// Find the user given the id.
exports.findUserId = function(id,callback) {
console.log(" ####### find user by id  ########"+id);
  client.query( "select * from user where id=?",
      [id],
      function( err, results, fields)  {
          if( err) {
            throw err;
          }
      console.log(" ####### GET user  ########"+JSON.stringify(results));
      callback(results);
  });
}

// Delete the user account.
exports.deleteUserId = function(id,callback) {
console.log(" ####### delete user by id  ########"+id);
  client.query( "delete from user where id=?",
      [id],
      function( err, results, fields)  {
          if( err) {
            callback(err,null);
          }
      console.log(" ####### GET user  ########"+JSON.stringify(results));
      callback(null,results);
  });
}

// Util functions
validatePresenceOf = function(value) {
    return value && value.length;
}
  
makeSalt = function() {
  return Math.round((new Date().valueOf() * Math.random())) + '';
}

exports.authenticate = function(plainText,salt,hashed_password) {
  return encryptPassword(plainText,salt) === hashed_password;
}

encryptPassword = function(password,salt) {
    return crypto.createHmac('sha1', salt).update(password).digest('hex');
}
    
randomToken = function() {
  return Math.round((new Date().valueOf() * Math.random())) + '';
}

generateAccessCode = function() {
  return Math.floor(Math.random()*10000001);
}

// Phone number table.
// Add phonenumber
exports.add_device = function(user_id,name,countrycode,phonenumber,push_id,callback) {
      // Generate access code with a random number.
      var accesscode = generateAccessCode();
      console.log(" ####### SQL add device ########### "+user_id+" ::  "+phonenumber+"  :  "+push_id);
      client.query("insert into devices (user_id,name,countrycode,phonenumber,accesscode,push_notification_id,authenticated) values (?,?,?,?,?,?,?)", 
        [user_id, name,countrycode,phonenumber, accesscode, push_id, 0], 
        function(err, info) {
          // callback function returns last insert id
          if( err) {
            console.log(" ####### ERROR ######## "+JSON.stringify(err));
            callback(err,null);
          } else {
            console.log(" ####### SUCESS ######## "+JSON.stringify(info));
            callback(err,info.insertId);
          }
      });
}

//Update phonumber: update authenticated to true/false with phonenumber as key.
exports.updateDeviceWithPh = function(phonenumber,push_notification_id,authenticate,callback) {
    client.query( "update devices set authenticated=?,push_notification_id=? where phonenumber=?",
      [authenticate,push_notification_id,phonenumber],
      function( err, results, fields)  {
          if( err) {
            console.log(" ####### GET user  ########"+JSON.stringify(err));
            callback(err,null)
          } else {
            console.log(" ####### GET user  ########"+JSON.stringify(results));
            callback(err,results);
        }
  });
}

// Get phonenumber. phonenumber_id as key
exports.getDeviceById = function(id,callback){
  client.query( "select * from devices where id=?",
      [id],
      function( err, results, fields)  {
          if( err) {
            console.log(" ####### GET device SQL ERROR  ########"+JSON.stringify(err));
            callback(err,null);
          } else {
            console.log(" ####### GET device SQL  ########"+JSON.stringify(results));
            callback(null,results);
          }
  });
}

// Get accesscode using phonenumber.
exports.getDeviceByPhNumber = function(phonenumber,callback){
  client.query( "select * from devices where phonenumber=?",
      [phonenumber],
      function( err, results, fields)  {
          if( err) {
            console.log(" ####### GET device SQL ERROR  ########"+JSON.stringify(err));
            callback(err,null);
          } else {
            console.log(" ####### GET device SQL  ########"+JSON.stringify(results));
            callback(null,results);
          }
  });
}

// Get phonenumber. phonenumber_id as key
exports.getAllDevices = function(user_id,callback){
  client.query( "select * from devices where user_id=?",
      [user_id],function( err, results, fields)  {
          if( err) {
            console.log(" ####### GET all Devices SQL ERROR  ########"+JSON.stringify(err));
            callback(err,null);
          } else {
            console.log(" ####### GET all Devices  ########"+JSON.stringify(results));
            callback(null,results);
          }
  });
}

// Delete phonenumber.
exports.deletePhonumerById = function(id,callback) {
  console.log(" ######## sql deletePhonumerById ######### "+id);
  client.query( " delete from devices where id=?",[id],
      function( err, results, fields)  {
        if( err) {
          console.log(" ######## DELETE Error ######### "+JSON.stringify(err));
          callback(err,null);
        }
        console.log(" ####### DELETE device  ########"+JSON.stringify(results));
        callback(null,results);
  });
}

// Push Messages table.
// Schema:: [ id, device_id, push_message_id (random generated id), Sender(SERVER, DEVICE), 
// push_message,latitude, longitude, accuracy]

exports.add_push_message = function(delivery_id,push_message_id,push_message,sender,latitude,longitude,accuracy,callback) {

  var created_at = new Date().getTime();

  console.log(" #########  add_push_message  ############# "+delivery_id+" : "+push_message_id+" : "+push_message+" : "+sender+" : "+latitude+" : "+longitude+" : "+accuracy);
  // Insert to the table.
  client.query("insert into push_messages (delivery_id,push_message_id,push_message,sender,created_at,latitude,longitude,accuracy) values (?,?,?,?,?,?,?,?)", 
    [delivery_id,push_message_id,push_message,sender,created_at,latitude,longitude,accuracy], 
    function(err, info) {
      // callback function returns last insert id
      if( err) {
        console.log(" ####### ERROR ######## "+JSON.stringify(err));
        callback(err,null);
      } else {
        console.log(" ####### SUCESS ######## "+JSON.stringify(info));
        callback(err,info.insertId);
      }
  });

}

generatePushMessageId = function() {
  return Math.floor(Math.random()*10000000000001);
}

exports.checkPushMessageIdPresent = function(id,callback) {
console.log(" ######## checkPushMessageIdPresent ####### "+id);
  client.query("select * from push_messages where push_message_id=?",[id],
    function( err, results, fields)  {
      if( err) {
        console.log(" ######## checkPushMessageIdPresent Error ######### "+JSON.stringify(err));
        callback(false);  
      } else {
      console.log(" ####### checkPushMessageIdPresent device  ########"+JSON.stringify(results));
       callback(true);
    }
  });
}

// Get history of messages sent/received for a device.
exports.getAllPushMessages = function(delivery_id,callback){

  client.query( "select * from push_messages where delivery_id=? order by push_message_id,created_at",
      [delivery_id ],function( err, results, fields)  {
          if( err) {
            console.log(" ####### GET all push messages SQL ERROR  ########"+JSON.stringify(err));
            callback(err,null);
          } else {
            console.log(" ####### GET all push messages  ########"+JSON.stringify(results));
            callback(null,results);
          }
  });
}

// Delivery table.
exports.add_delivery = function(data,callback) {
  console.log(" #########  add_delivery  ############# "+data.content+" : "+data.bill_number+" : "+data.device_id);
  var startTime = new Date().getTime();
  // Insert to the table.
  client.query("insert into deliveries (device_id,delivery_content,bill_number,delivered,started_at,delivered_at) values (?,?,?,?,?,?)", 
    [data.device_id,data.content,data.bill_number,0,startTime,0], 
    function(err, info) {
      // callback function returns last insert id
      if( err) {
        console.log(" ####### ERROR ######## "+JSON.stringify(err));
        callback(err,null);
      } else {
        console.log(" ####### SUCESS ######## "+JSON.stringify(info));
        callback(err,info.insertId);
      }
  });
}

exports.updateDeliveryStatus = function(delivery_id,delivered,callback) {
    var endTime = new Date().getTime();
    console.log(" #########  updateDeliveryStatus  ############# "+" : "+delivered+" : "+endTime);
    client.query( "update deliveries set delivered=?,delivered_at=? where id=?",
      [delivered,endTime,delivery_id],
      function( err, results, fields)  {
          if( err) {
            console.log(" ####### GET user  ########"+JSON.stringify(err));
            callback(err,null)
          } else {
            console.log(" ####### GET user  ########"+JSON.stringify(results));
            callback(err,results);
        }
  });
}

// Get history of delivereis for a device.
exports.getAllDeliveries = function(device_id,callback){
  client.query( "select * from deliveries where device_id=? order by started_at",
      [device_id],function( err, results, fields)  {
          if( err) {
            console.log(" ####### GET all deliveries SQL ERROR  ########"+JSON.stringify(err));
            callback(err,null);
          } else {
            console.log(" ####### GET all deliveries  ########"+JSON.stringify(results));
            callback(null,results);
          }
  });
}

// Locations table.

// function to create location data
exports.add_location = function(data, callback) {
  
  var created_at = new Date().getTime();
  console.log(" #########  add_location  ############# : "+data.delivery_id+" : "+data.latitude+" : "+data.longitude+" : "+data.accuracy+" : "+data.location+" : "+created_at);
  client.query("insert into locations (delivery_id,latitude,longitude,accuracy,address,created_at) values (?,?,?,?,?,?)", 
    [data.delivery_id, data.latitude, data.longitude, data.accuracy, data.location, created_at], 
    function(err, info) {
    if( err ) {
      console.log(" #########  add_location error ############# "+JSON.stringify(err));
      callback(err,null);
    } else {
      console.log(" #########  add_location success ############# "+JSON.stringify(info));
      callback(null,info.insertId);  
    }
  });
}

// function to get list of employees
exports.get_locations = function(delivery_id,callback) {
  client.query("select * from locations where delivery_id=?",[delivery_id],function(err, results, fields) {
    // callback function returns employees array
    var geoJSONString = geoJSON.generateGeoJSON(results);
    console.log(" ####### get locations ######## "+JSON.stringify(geoJSONString));
    callback(null,geoJSONString);
  });
}

