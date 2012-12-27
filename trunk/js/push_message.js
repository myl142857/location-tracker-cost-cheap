var gcm = require('node-gcm');
var sql_model = require('./db_helper');

var sender = new gcm.Sender('AIzaSyD0HF69RdZGKmy5CNQkjEl4HqoBD2ukUsw');
var registrationIds = [];


// At least one required
registrationIds.push('APA91bF9Q7A9ZT02xOLWTNTgn3Bzd9BSIR1gh8tMd5S8dBC3BoPD0hnZeUkB0JKVyzawsuZTNJPDmvLcER9I7c52xFtuFbqwRvQ-o8lWa9pd64CtoYP_F1YhglLTNWLNH6TlRMu5zhdB');


exports.sendPushMessage = function(push_message,push_notification_id,callback) {
	var push_message_id = generatePushMessageId();
  	sql_model.checkPushMessageIdPresent(push_message_id,function(result){
  		console.log(" ####### checkPushMessageIdPresent Result ######## "+push_message_id+"  : "+result);
		if( result ) {
	     	//return push_message_id;
	     	sendMessage(push_message,push_notification_id,push_message_id,callback);
	    }
	    else {
	      console.log(" ####### checkPushMessageIdPresent Result ######## "+push_message_id+"  : "+result);
	      sendPushMessage(push_message,push_message_id,callback)
	    }
  	});
}

/**
 * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
 */
sendMessage = function(push_message,push_id,push_message_id,callback) {
	console.log('###### sendMessage ######## '+push_message);
	console.log('###### sendMessage ######## '+push_id);	

	// Create the message
	var message = new gcm.Message();
	
	console.log(" ######## Send Message before ####### "+push_message_id);
	message.addData('reminder_message',push_message);
	message.addData('push_message_id',push_message_id);
	message.collapseKey = 'demo';
	message.delayWhileIdle = true;
	message.timeToLive = 3;
	var registrationIds = [];
	registrationIds.push(push_id);
	//registrationIds.push('APA91bF9Q7A9ZT02xOLWTNTgn3Bzd9BSIR1gh8tMd5S8dBC3BoPD0hnZeUkB0JKVyzawsuZTNJPDmvLcER9I7c52xFtuFbqwRvQ-o8lWa9pd64CtoYP_F1YhglLTNWLNH6TlRMu5zhdB');
	sender.send(message, registrationIds, 4, function (result) {
    	console.log(" #### Push message Result  ####### "+JSON.stringify(result));
    	if( !result) {
    		//TODO: Handler the error scenario.
    		console.log(" #### NO Result  ####### ");
    		callback(push_message_id,null);
    	} else {
    		callback(push_message_id,result);
    	}	
	});
};

exports.sendMessageToAll = function(user_id,push_message,callback) {
	console.log('###### sendMessage To All ######## '+user_id+"  :  "+push_message);
	// Get the list of notification ids.
	sql_model.getAllDevices(user_id,function(err,results) {
	    if( err) {
	      // TODO: Handle the error scenario.

	    } else {
	    	// Get list of push notification ids.
	    	var pushIds = [];
	    	for( var i = 0; i< results.length; i++) {
	    		// Get the push notification id.
	    		pushIds.push(results[0].push_notification_id);
	    		console.log("####### Push notification id ######### "+results[0].push_notification_id);
	    	}
	    		// Create the message
			var message = new gcm.Message();
			message.addData('reminder_message',push_message);
			message.collapseKey = 'demo';
			message.delayWhileIdle = true;
			message.timeToLive = 3;

			sender.send(message, pushIds, 1, function (result) {
		    	console.log(" #### GCM send Result  ####### "+JSON.stringify(result));
		    	if( !result) {
		    		//TODO: Handler the error scenario.
		    		callback(null);
		    	} else {
		    		callback(result);
		    	}	

			});
	    }    
  	});  
};