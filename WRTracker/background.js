
// the db is called 'words'
// npm style BD

// TODO:
// add "learned" tag and special session.
// "dont count access" button. special icon for those and invalid pages
// show action page even on invalid pages and main page (notify no word has been added)
// fuck, that's a lot to do

(function () {

	try {
		var indexedDB = window.indexedDB || window.webkitIndexedDB
			, IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction
			, IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange
			, IDBCursor = window.IDBCursor || window.webkitIDBCursor
	} catch ( error ) {
		if (! error instanceof ReferenceError)
			throw error
		console.error("undefined variables.", error.name, error.message)
		return 1 // can't proceed.
	}

	function DatabaseObj () {
	
		var _this = this
		this.indexedDB = {}
		this.indexedDB.db = null

		this.indexedDB.onerror = function ( error ) {
			console.error(error) }
		
		this.indexedDB._create_obj_store =	function ( version, db, callback ) {
			var setVrequest = db.setVersion(version)
			setVrequest.onsuccess = function ( event ) {

				if (db.objectStoreNames.contains("words"))
					db.deleteObjectStore("words") // throw away old version
				
				var store = db.createObjectStore("words", {
					autoIncerment: false,
					keyPath: "word"
				})

				store.createIndex("word", "word", { unique: false })
				store.createIndex("time_added", "time_added", { unique: false })
				store.createIndex("accesses", "accesses", { unique: false })
				store.createIndex("last_access", "last_access", { unique: false })

				if (typeof callback !== "undefined")
					callback()
			}
			setVrequest.onerror = _this.onerror
		}

		this.indexedDB.removeWord = function ( word, callback ) {
			var db = _this.indexedDB.db
				, request = db.transaction(["words"], IDBTransaction.READ_WRITE)
								.objectStore("words").delete(word)

			request.onsuccess = function ( event ) {
				console.log("word "+word+" deleted.")
				if (callback)
					callback(event)
			}
			request.onerror = _this.indexedDB.onerror
		}

		this.indexedDB.open = function ( callback ) {		
			var request = indexedDB.open("words")
			request.onsuccess = function ( event ) {
				var version = "1.05"
					, db = event.target.result
				
				_this.indexedDB.db = db

				if (version == db.version) {
					console.log("version matched. v."+db.version)
					if (typeof callback !== "undefined")
						callback()
				} else {
					
					console.log("version not matched. creating obj store.")
					console.log("skipping callback.") // skip?

					_this.indexedDB._create_obj_store(version, db, callback)
				}
			}
				
			request.onerror = _this.onerror
		}
		
		this.indexedDB.writeWord = function ( obj, callback ) {
			var db = _this.indexedDB.db
				, trans = db.transaction(["words"], IDBTransaction.READ_WRITE)
				, store = trans.objectStore("words")
				, request = store.put(obj)

			request.onsuccess = function ( event ) {
				if (typeof callback !== "undefined")
					callback(event)
			}
			
			request.onerror = function ( event ) {
				console.error("Error Adding: ", event)
			}
		}

		this.indexedDB.getLast = function ( callback, key ) {
			var db = _this.indexedDB.db
				, trans = db.transaction(['words'], IDBTransaction.READ_WRITE)
				, store = trans.objectStore('words')

			var cursorRequest = store.openCursor(IDBKeyRange.lowerBound(0), IDBCursor.PREV)

			cursorRequest.onerror = _this.indexedDB.onerror
			cursorRequest.onsuccess = function ( event ) {
				var result = event.target.result
				if (typeof result === "undefined" || result === null)
					return

				callback(result.value)
			}
		}

		this.indexedDB.retrieveAll = function ( callback, key ) {
			var db = _this.indexedDB.db
				, trans = db.transaction(["words"], IDBTransaction.READ_WRITE)
				, store = trans.objectStore("words")

			if (key)
				var cursorRequest = store.index(key).openCursor(null, IDBCursor.PREV)
			else
				var cursorRequest = store.openCursor(null, IDBCursor.PREV)
			
			cursorRequest.onerror = _this.indexedDB.onerror
			cursorRequest.onsuccess = function ( event ) {
				var result = event.target.result
				if (typeof result === "undefined" || result === null)
					return

				if (typeof callback !== "undefined")
					callback(result.value)

				result.continue()
			}
		}

		this.indexedDB.clear = function ( callback ) {

			var db = _this.indexedDB.db
				, trans = db.transaction(['words'], IDBTransaction.READ_WRITE)
				, store = trans.objectStore('words')

			request = store.clear()
			request.onerror = _this.indexedDB.onerror
			request.onsuccess = callback
		}

		this.indexedDB.getWord = function ( key, callback ) {
			var db = _this.indexedDB.db
				, transaction = db.transaction(['words'])
				, objectStore = transaction.objectStore('words')
				, request = objectStore.get(key)

			request.onerror = _this.indexedDB.onerror
			request.onsuccess = function ( event ) {
				// if (typeof callback !== "undefined")
				callback(event.target.result)
			}
		}

		this.indexedDB.keyExists = function ( key, callback ) {
			_this.indexedDB.getWord(key, function ( result ) {
				if (typeof result === "undefined")
					return callback(false)
				return callback(true)
			})
		}

		this.indexedDB.updateWord = function ( data, callback ) {
			_this.indexedDB.getWord(data['word'], function ( result ) {
				if (typeof result === "undefined")
					throw Error("update of non-existent word. abort!")

				var updatedData = result
				for (key in data) {
					if (!data.hasOwnProperty(key))
						continue // skip default methods and stuff

					if (!result.hasOwnProperty(key))
						throw Error("update of non-existent field. abort!")

					updatedData[key] = data[key]
				}

				_this.indexedDB.writeWord(updatedData, callback)
			})
		}
	}

	storage = new DatabaseObj()
	storage.indexedDB.open(function () {
		_start_action()
	})
})();


function processWord ( word, url, callback ) {

	var on_open = function () {
		storage.indexedDB.getWord(word, function ( entry ) {

			var now = new Date().getTime()
			if (typeof entry === "undefined") { // write word for first time
				storage.indexedDB.writeWord({ word: word
					, accesses: 1
					, time_added: now
					, last_access: now
					, url: url }, function () {
						storage.indexedDB.retrieveAll(function ( t ) {
						//	console.log(t['word'], t['accesses'])
						})
					})
			} else { // update word entry
				
				var diff = (now - entry['last_access'])/(60*1000)
				if (diff < 10) // if last access was less than 10 minutes ago, don't count
					return

				storage.indexedDB.updateWord({ word: word
					, accesses: entry['accesses'] + 1
					, last_access: now }, function () {
						storage.indexedDB.retrieveAll(function ( t ) {
						//	console.log(t['word'], t['accesses'])
						})
					})
			}

		})
	}

	while (!storage.indexedDB.db) // wait until db is open
		;
	
	console.log("processing word ", word)
	on_open()
}

function contentScriptReceive ( msg, sender ) {
	console.log('new message: ', msg, '\n', 'sender: ', sender)
	processWord(msg['word'], msg['url'])
	chrome.pageAction.show(sender.tab.id)
}

// only called after database is open on storage.indexedDB.db
function _start_action () {
	chrome.extension.onMessage.addListener(contentScriptReceive)
	// processWord("banana") // test
}
