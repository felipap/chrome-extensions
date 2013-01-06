/*
* CheckYourFollowers, v. 1.4.
* 
* My twitter: http://twitter.com/#!/f03lipe
* This script won't use any of your personal information, but your twitter account.
* Please rate and comment at
* https://chrome.google.com/webstore/detail/hgppmhiicafodcmhllmennhildnhlebg
* 
* MIT license.
*/

if (typeof(String.prototype.trim) === "undefined") {
    String.prototype.trim = function() {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}


(FriendshipChecker = {

	_get_logged: function () {
		
		// in normal user pages, .screen-name is bound to the page's account username
		// and #screen-name is bound to the logged user account
		// in the timeline page or on other non-user-related twitter pages, #screen-name
		// is bound to nothing and .screen-name is bound to the logged user account
		// therefore, the order of the queries below is essencial and MUST BE KEPT.

		if ($("#screen-name")[0]) // viewing ordinary twitter pages
			this.logged = $("#screen-name")[0].innerHTML.trim();
		else if ($(".screen-name")[0]) // viewing  service related pages
			this.logged = $(".screen-name")[0].innerHTML.trim();
		else {
			console.error("failed again =O");
			return;
		}
		return this.logged;
		
	},

	_get_account: function () { // screen name of the account being visualized
		
		if (!location.hash) {
			if (location.pathname.split('/').indexOf('media')>1) // media display
				this.account = location.pathname.split('/')[1];
			else // not another user related page
				this.account = this._get_logged();
		} else if ($('.screen-name')[0]) {
			if ($('.screen-name')[0].innerHTML.match('^<strong>')) // following/followers page
				this.account = $($(".screen-name")[0].innerHTML)[0].innerHTML.trim().slice(1, 100);
			else
				this.account = $(".screen-name")[0].innerHTML.trim().slice(1, 100);
		} else if ($('#screen-name')[0]) {
			this.account = $("#screen-name")[0].innerHTML.trim();
		}

		return this.account;
	},

	get_friendship: function (user1, user2, callback, failure) { // returns friendship btw two users

		var arg1 = "source_screen_name="+user1;
		var arg2 = "target_screen_name="+user2;
		
		$.ajax({
			"type": "GET",
			"dataType": "json",
			"url": "http://api.twitter.com/1/friendships/show.json?"+arg1+"&"+arg2, 
			"success": function(data, state) {
				callback(data, state);
			},
			"error": function() {
				failure();
			}
		});
	},

	_make_box: function(bool, option) {
		if (bool) var msg = "follows you";
		else var msg = "doesn't follow you";

		if (option==='panel')
			var box = $('<div id="friendship-checker-message-panel">'+msg+'</div>');
		else
			var box = $('<div id="friendship-checker-message">'+msg+'</div>');
		
		box.css({
			'margin':'4px 10px',
			'font-size':'13px',
			'font-style': 'italic',
			'color': '#666',
			'display': 'inline-block'
		});
		
		return box;
	},

	handlerB: function () {

		if (!($(".inner-pane")[0])) { // no panel opened
			if (this.panel_account) this.panel_account = '';
			return;	
		}

		var panel = $(".inner-pane");
		if (!panel.find(".screen-name")) return; // not built yet
		if (!$(panel).find(".screen-name")[0]) return; // not profile side panel
		var account = $($(panel).find(".screen-name")[0].innerHTML)[0].innerHTML.trim().slice(1, 100);

		if (account!==this.panel_account) {
			
			if (account===this.logged) { // logged user panel
				this.panel_account = account;
				return;
			}

			this.get_friendship(this._get_logged(), account,
				function(data) {

					var fstatus = data['relationship']['target']['following'];
					var screenname = data['relationship']['target']['screen_name'];

					var panel = $(".inner-pane");
					
					if (!$(panel).find(".screen-name")[0]) return; // not profile side panel

					var account = $(panel.find(".screen-name")[0].innerHTML)[0].innerHTML.trim().slice(1, 100);

					if (account===screenname) { // match!
						var box = FriendshipChecker._make_box(fstatus, 'panel');
						if (!$("#friendship-checker-message-panel")[0]) {
							$(panel.find(".profile-actions")[0]).append(box);
							FriendshipChecker.panel_account = screenname;
						}
					}

			}, function() {
				var i = $(".screen-name").length-1;
				var screenname = $($(".screen-name")[i].innerHTML)[0].innerHTML.trim().slice(1, 100);
				FriendshipChecker.panel_account = screenname;
			});
		}
	},

	handlerA: function () {
		
		if (!$("#scren-name")) return; // a twitter service page. who needs them?

		if (!$(".profile-actions")[0]||!$()) { // page not built yet
			setTimeout(function () { FriendshipChecker.handlerA(); }, 500);
			return;
		}

		var hash = location.hash;
		if (!hash||hash==='#!'||hash==='#!/') return; // timeline
		
		if (hash.slice(0, 3)==='#!/' && hash.length>3) {
			var logged = this._get_logged();
			var account = this._get_account();

			if (logged!==account) {

				this.get_friendship(logged, account,				
					function(data) {
						
						var fstatus = data['relationship']['target']['following'];
						var screenname = data['relationship']['target']['screen_name'];
						var box = FriendshipChecker._make_box(fstatus);
						
						if (($(".inner-pane").find("$.profile-actions")[0])&&
									($(".profile-actions").length===1)) return;

						if (!$("#friendship-checker-message")[0]) { // no message added yet (safe to go!)
							
							if (!$(".profile-actions")[0]) { // no profile-actions box
								FriendshipChecker.handlerA();
								return;
							}

							$($(".profile-actions")[0]).append(box);
							FriendshipChecker.account = screenname;
						}
						
					}, function() { // request failed
						FriendshipChecker.account = screenname;
				});
	
			}
		}

	},


});

window.addEventListener('load', function() {

	if (location.host === 'twitter.com') {
		FriendshipChecker._get_logged();

		setInterval(function () {
			FriendshipChecker.handlerB();
		}, 1000);

		FriendshipChecker.handlerA();
		$(window).bind('hashchange', function() {
			FriendshipChecker.handlerA();
		});
	}
});
