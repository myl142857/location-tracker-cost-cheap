
L.Control.Push = L.Control.extend({
	includes: L.Mixin.Events, 
	
	options: {
		autoPan: true,  		//auto panTo when click on tooltip
		autoResize: true,		//autoresize on input change
		animatePan: true,		//animation after panTo
		zoom: null,				//zoom after pan to location found, default: map.getZoom()
		position: 'topleft',
		text: 'Send message. Max 200 characters.'		//placeholder value
	},

	initialize: function(options) {
		L.Util.setOptions(this, options);
		this._inputMinSize = this.options.text.length;
		this._textAreaMaxSize = 5;
		this.timeAutoclose = 1200;		//delay for autoclosing alert and collapse after blur

	},

	onAdd: function (map) {
		this._map = map;
		this._container = L.DomUtil.create('div', 'leaflet-control-push');	
		this._textarea = this._createTextArea(this.options.text, 'push-textarea');			
		this._createButton(this.options.text, 'push-button');
		return this._container;
	},
	
	_createTextArea: function (text, className) {
		var textarea = L.DomUtil.create('textarea', className, this._container);
		textarea.type = 'text';
		textarea.rows = '4';
		textarea.value = '';
		textarea.placeholder = text;
		textarea.style.display = 'none';
		
		L.DomEvent
			.disableClickPropagation(textarea)
			.addListener(textarea, 'keyup', this._handleKeypress, this)
			.addListener(textarea, 'blur', this.autoCollapse, this)
			.addListener(textarea, 'focus', this.autoCollapseStop, this);
						
		return textarea;
	},	
				
	_createButton: function (text, className) {
		var button = L.DomUtil.create('a', className, this._container);
		button.href = '#';
		button.title = text;

		L.DomEvent
			.disableClickPropagation(button)
			.addListener(button, 'focus', this.autoCollapseStop, this)
			.addListener(button, 'blur', this.autoCollapse, this)			
			.addListener(button, 'click', this._handleSubmit, this); 

		return button;
	},
	
	expand: function() {		
		this._textarea.style.display = 'block';
		L.DomUtil.addClass(this._container,'exp');		
		this._textarea.focus();
	},

	collapse: function() {
		this._textarea.value ='';
		this._textarea.size = this._inputMinSize;
		this._textarea.style.display = 'none';
		L.DomUtil.removeClass(this._container,'exp');		
	},
	
	autoCollapse: function() {	//collapse after delay, used on_input blur
		var that = this;
		this.timerCollapse = setTimeout(function() {
			that.collapse();
		}, this.timeAutoclose);
	},

	autoCollapseStop: function() {
		clearTimeout(this.timerCollapse);
	},
	
	_handleKeypress: function (e) {	//run _input keyup event

		switch(e.keyCode)
		{
			case 27: //Esc
				this.collapse();
			break;
			case 13: //Enter
				this._handleSubmit();	//do search
			break;
			case 37://Left
			case 39://Right
			case 16://Shift
			case 17://Ctrl
			//case 32://Space
			break;
			//TODO scroll tips, with shortcuts 38(up),40(down)
			default://All keys
	            var length = this._textarea.value.length;
    	        if(length >= this._textAreaMaxSize) {   
	                e.preventDefault();
    	        }
		}
	},	
	
	_handleSubmit: function(e) {
	
		if(this._textarea.style.display == 'none')	//on first click show _input only
			this.expand();
		else
		{
			if(this._textarea.value=='')	//hide _input only
				this.collapse();
			else
			{
				sendPushMessage(this._textarea.value);	
				this.collapse();			
			}
		}
		this._textarea.focus();	//block autoCollapse after _button blur
	}

});
