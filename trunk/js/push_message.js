var gcm = require('node-gcm');
var sql_model = require('./db_helper');

var sender = new gcm.Sender('AIzaSyD0HF69RdZGKmy5CNQkjEl4HqoBD2ukUsw');
var registrationIds = [];


// At least one required
registrationIds.push('APA91bF9Q7A9ZT02xOLWTNTgn3Bzd9BSIR1gh8tMd5S8dBC3BoPD0hnZeUkB0JKVyzawsuZTNJPDmvLcER9I7c52xFtuFbqwRvQ-o8lWa9pd64CtoYP_F1YhglLTNWLNH6TlRMu5zhdB');

/**
 * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
 */
exports.sendMessage = function(message,push_id,callback) {
	console.log('###### sendMessage ######## '+message);

	// Create the message
	var message = new gcm.Message();
	message.addData('reminder_message',message);
	message.collapseKey = 'demo';
	message.delayWhileIdle = true;
	message.timeToLive = 3;

	sender.send(message, push_id, 4, function (result) {
    	console.log(" #### Result  ####### "+JSON.stringify(result));
    	callback(result);
	});
};

exports.sendMessageToAll = function(user_id,message,callback) {
	console.log('###### sendMessage To All ######## '+user_id+"  :  "+message);
	// Get the list of notification ids.
	sql_model.getAllDevices(req.session.user_id,function(err,results) {
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
			message.addData('reminder_message',message);
			message.collapseKey = 'demo';
			message.delayWhileIdle = true;
			message.timeToLive = 3;

			sender.send(message, registrationIds, 4, function (result) {
		    	console.log(" #### Result  ####### "+JSON.stringify(result));
		    	callback(result);
			});
	    }    
  	});  
};