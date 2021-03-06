// RoomPanel

require('styles/room_panel.css');
var RTCWrapper = require('utils/rtc_wrapper.js');
var UserService = require('utils/user_service.js');

var Slider = require('bootstrap-slider');
require('bootstrap-slider/dist/css/bootstrap-slider.css');

module.exports = Backbone.View.extend({
	id: 'RoomPanel',
	template: `
		<div class="sub-panel">
			<br>
			<div class="room-subject">
				<button class="btn btn-default">
					<span rv-hide="scope.editing">EDIT</span>
					<span rv-show="scope.editing">SAVE</span>
				</button>
				<div class="editor" rv-html="scope.roomSubject |or scope.defaultSubject | linky | chatMarkdown | emojione"></div>
			</div>
			<div class="user-controls">
				<div class="btn-group" data-toggle="buttons">
					<label class="disconnect btn btn-default active fa fa-times">Disconnected
						<input id="disconnected" type="radio" name="media-status" checked></input>
					</label>
					<label class="voice btn btn-default fa fa-phone">Voice
						<input id="voice" type="radio" name="media-status"></input>
					</label>
					<label class="video btn btn-default fa fa-video-camera">Video
						<input id="video" type="radio" name="media-status"></input>
					</label>
					<label class="screenshare btn btn-default fa fa-television">Screenshare
						<input id="screenshare" type="radio" name="media-status"></input>
					</label>
				</div>
				<div class="more-controls hidden">
					<div class="btn btn-default fa fa-microphone-slash" data-toggle="button">Mute</div>
					<div class="btn btn-default fa fa-volume-up" data-toggle="button"></div>
					<input class="volume-slider" type="text"></input>
				</div>
			</div>
			<br><br>Users:
			<ul class="users-panel">
				<li rv-each-user="scope.users">
					{ user.extra.name }
				</li>
			</ul>
		</div>
		<div class="sub-panel">
			<div data-subview="chat"></div>
		</div>
		<div class="sub-panel hidden">
			<div class="video-container"></div>
		</div>
	`,
	events: {
		'click .room-subject .btn': function() {
			var div = this.$('.room-subject > .editor');
			div.attr('contenteditable', !this.scope.editing);
			if (this.scope.editing) {
				RTCWrapper.updateState({roomSubject: div.html()});
			} else {
				div.focus();
			}
			this.scope.editing = !this.scope.editing;
		},
		'click .user-controls .btn-group': function(e) {
			if ($(e.target).is('.disconnect')) {
				this.$('.more-controls').addClass('hidden');
				RTCWrapper.removeStreams();
			} else {
				this.$('.more-controls').removeClass('hidden');
				RTCWrapper.addVoiceStream();
			}
		},
		'click .more-controls .btn': function(e) {
			var target = $(e.target);
			target.toggleClass('btn-default btn-danger');
			if (target.is('.fa-volume-up')) {
				this.$('.more-controls .slider').toggleClass('disabled');
				//TODO: styles
			}
		},
	},
	initialize: function() {
		Backbone.Subviews.add( this );
	},
	subviewCreators: {
		chat: function() { return new RTChat.Views.ChatPanel(); },
	},
	render: function(){
		var self = this;
		this.scope = {}; //NOTE: on re-init, this doesnt get reset automatically.

		this.$el.html(this.template);
		Rivets.bind(this.$el, {scope: this.scope});

		// Make the magic happen~~
		RTCWrapper.joinRoom(window.location.hash,
			{xVideoContainer: this.$('.video-container')}
		);

		//NOTE: handlers get reset on "joinRoom"
		RTCWrapper.onStateChange(function(old, newState) {
			console.log("StateUpdate", old, newState);
			self.scope.roomSubject = newState.roomSubject;
		});

		this.scope.roomName = window.location.hash.substring(1);
		this.scope.defaultSubject = "Welcome to #"+this.scope.roomName;
		this.scope.users = RTCWrapper.users;

		// Update room_history
		this.scope.appData = UserService.getAppData();
		if (!this.scope.appData.room_history) this.scope.appData.room_history = [];
		UserService.setAppData({
			room_history: _.uniq([this.scope.roomName].concat(this.scope.appData.room_history)).splice(0, 10)
		})

		var slider = new Slider('.volume-slider', {
			min: 0,
			max: 10,
		});

		return this;
	},
	remove: function() {
		// Ensure we leave the room when navigating away.
		RTCWrapper.leaveRoom();
		Backbone.View.prototype.remove.apply(this, arguments); // "super"
	},
});
