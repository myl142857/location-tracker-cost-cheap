var mysql = require('mysql');
var MYSQL_USERNAME = 'testuser';
var MYSQL_PASSWORD = 'joliee';
var HOST_NAME = 'instance31603.db.xeround.com';

// init;
var client = mysql.createConnection({
  user: 'root',
  password: 'joliee!11',
  hostname: 'localhost'  
}); 



// destroy old db
/*client.query('DROP DATABASE IF EXISTS tracker_db', function(err) {
  if (err) { throw err; }
}); 

// create database
client.query('CREATE DATABASE tracker_db', function(err) {
  if (err) { throw err; }
}); */



client.query('USE tracker_db');

// create table
/*var sql = ""+ "create table locations("+
            " id int unsigned not null auto_increment,"+
            " latitude varchar(20) not null default 'unknown',"+
            " longitude varchar(20) not null default 'unknown',"+
            " accuracy varchar(20) not null default 'unknown',"+
            " location varchar(100) not null default 'unknown',"+
            " primary key (id)"+
            ");"; 

client.query(sql, function(err) {
  if (err) { throw err; }
}); */

console.log('database tracker_db is set.');

function extractKeywords(text) {
  if (!text) return [];

  return text.
    split(/\s+/).
    filter(function(v) { return v.length > 2; }).
    filter(function(v, i, a) { return a.lastIndexOf(v) === i; });
}

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


// Phone number table.

// Add phonenumber
exports.add_phone_number = function(user_id,phonenumber) {

// Generate access code with a random number.
var accesscode = Math.floor(Math.random()*10000001);

client.query("insert into phonenumbers (user_id,phoenumber,accesscode,authenticated) values (?,?,?,?)", 
        [user_id,phonenumber,accesscode,0], 
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

//Update phonumber: update authenticated to true/false with phonenumber as key.
exports.updatePhonenumberWithPh = function(phonenumber,authenticate) {
    client.query( "update phonumbers set authenticated=? where phonumber=?",
      [authenticate,phonenumber],
      function( err, results, fields)  {
          if( err) {
            throw err;
          }
      console.log(" ####### GET user  ########"+JSON.stringify(results));
      callback(results);
  });


}


// Get phonenumber. user_id as key
exports.getPhonenumberByUserId = function(user_id) {
  client.query( "select * from phonenumbers where user_id=?",
      [user_id],
      function( err, results, fields)  {
          if( err) {
            throw err;
          }
      console.log(" ####### GET user  ########"+JSON.stringify(results));
      callback(results);
  });


}

// Get phonenumber. phonenumber_id as key
exports.getPhonenumberById = function(id){
  client.query( "select * from phonenumbers where id=?",
      [id],
      function( err, results, fields)  {
          if( err) {
            throw err;
          }
      console.log(" ####### GET user  ########"+JSON.stringify(results));
      callback(results);
  });


}

// Delete phonenumber.
exports.deletePhonumerById = function(id) {
  client.query( " delete from phonumbers where id=?",
      [id],
      function( err, results, fields)  {
          if( err) {
            throw err;
          }
      console.log(" ####### GET user  ########"+JSON.stringify(results));
      callback(results);
  });
}

// Locations table.

// function to create location data
exports.add_location = function(data, callback) {
  console.log(" #########  add_location  ############# "+data.location);
  client.query("insert into locations (latitude, longitude, accuracy, location) values (?,?,?,?)", 
    [data.latitude, data.longitude, data.accuracy, data.location], 
    function(err, info) {
    if( err )  {
      callback(-1);
      return;
    }

    // callback function returns last insert id
    callback(info.insertId);
  });
}

// function to get list of employees
exports.get_locations = function(callback) {
  client.query("select * from locations", function(err, results, fields) {
    // callback function returns employees array
    callback(results);
  });
}