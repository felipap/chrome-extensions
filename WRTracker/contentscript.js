
(function(window, unsigned) {

	var t = document.querySelector(".WRD")
	if (!t)
		return // not a valid word page OR not a valid word
	
	var word = window.location.href.match(/\/\w+\/.*/)[0].split('/')[2].toLowerCase()

	console.log("sending word: ", word)
	chrome.extension.sendMessage({
		word: word
		, url: location.href }
	);

	chrome.extension.onMessage.addListener(function (msg, sender, callback) {

		if (msg['action'] === 'get_word')
			callback(word)
		
	})

})(window);
