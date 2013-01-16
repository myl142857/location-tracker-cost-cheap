
L.Control.Push_History = L.Control.extend({
	includes: L.Mixin.Events, 
	
	options: {
		autoPan: true,  		//auto panTo when click on tooltip
		autoResize: true,		//autoresize on input change
		animatePan: true,		//animation after panTo
		zoom: null,				//zoom after pan to location found, default: map.getZoom()
		position: 'topleft',
		text: 'Messages sent history.'		//placeholder value
	},

	initialize: function(options) {
		L.Util.setOptions(this, options);
		this.timeAutoclose = 1200;		//delay for autoclosing alert and collapse after blur

	},

	onAdd: function (map) {
		this._map = map;
		this._container = L.DomUtil.create('div', 'leaflet-control-push');	
		this._createButton(this.options.text, 'push-button');	
		this._historyarea = this._createHistoryArea('push-historyarea');		
		return this._container;
	},
					
	_createHistoryArea: function (className) {

		var historyDiv = L.DomUtil.create('div', className, this._container);
		historyDiv.style.display = 'none';
		historyDiv.innerHTML = 'No Messages sent.';
		L.DomEvent
			.disableClickPropagation(historyDiv)
			.addListener(historyDiv, 'keyup', this._handleKeypress, this)
			.addListener(historyDiv, 'blur', this.autoCollapse, this)
			.addListener(historyDiv, 'focus', this.autoCollapseStop, this);
		return historyDiv;
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
		this._historyarea.style.display = 'block';
		L.DomUtil.addClass(this._container,'exp');		
		this._historyarea.focus();
	},

	collapse: function() {
		this._historyarea.style.display = 'none';
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

		}
	},	
	
	_handleSubmit: function(e) {
	
		if(this._historyarea.style.display == 'none')	//on first click show _input only
			this.expand();
		else
		{			
			this.collapse();			
		}
		this._historyarea.focus();	//block autoCollapse after _button blur
	},

	addData: function(data) {
		alert(data);
		this._historyarea.innerHTML = data;
		//historyDiv.innerHTML = 'Data received';
		// Add the data to the container.

	}

});
