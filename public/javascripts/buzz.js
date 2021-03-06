(function($, undefined) {
	var q = "html5",
		query = $('#query'),
		search = $('#search'),
		speak = $('#speak'),
		continuous = $('#continuousMode'),
		list = $("#altList"),
		speechLog = $("#speechLogs"),
		tweetPager = $("#tweetPager"),
		continuousMode = false,
		ds,
		SpeechRecognition;

	query.val(q);	
	
	// x-webkit-speech Example
	// We register for the 'speechchange' event on the query field and refresh the DataSource	
	query.on('webkitspeechchange', function() {
		ds.read();
	});
	// END Speech Input API Example

	search.on('click', function(e) {
		list.fadeOut("slow");
		
		ds.read();
	});

	// Speech JavaScript API Example
	function logSpeechCommand (msg) {
		var logEl = $("#log");

		logEl.text(msg);
	}

	function speechSearch(results, topResult) {
		var alts = "",
			i,
			len,
			tmpl;

		// Apply the transcript to the speech search input and 
		// trigger its click event
		query.val(topResult.transcript); 
		search.click();
		speak.val("Click to Speak");

		// Display a list of remaining results in "Did you mean?" style
		tmpl = kendo.template($("#altTemplate").html());
		
		for (i = 1, len = results.length; i < len; i++) {
			alts += tmpl({ 
				alternative: results[i].transcript,
				confidence: Math.floor(results[i].confidence*100) 
			});
		}

		// Show the alternative results list
		list.append(alts).fadeIn("slow");

		// When an alternative result is clicked, apply its value
		// to the search input and trigger the click event
		list.find('a').on('click', function(e) {
			e.stopPropagation();
			var id = e.currentTarget.id;

			query.val(id);
			search.click();
		});
	}

	// Function for managing continuous speech interactions with the page. 
	// For this sample, we'll allow the user to search and/or navigate the Pager control by voice
	function speechInteract(results, topResult) {
		var commandWords = topResult.transcript.trim().split(" "),
			len = commandWords.length,
			firstWord = commandWords[0],
			lastWord = commandWords[len-1],
			pager,
			pageCommands,
			currentPage,
			term;

		if (firstWord === "search" && len > 1) {
			term = commandWords.slice(1).join(" ");
			logSpeechCommand("Requested search for " + term);
			query.val(term);
			search.click();
		} else { // We'll assume that the user is attempting to page through results
			if (lastWord === "page") {
				pager = tweetPager.data("kendoPager");
				currentPage = pager.page();

				pageCommands = {
					first: function() {
						pager.page(1);
					},
					next: function() {
						if (currentPage !== pager.totalPages()) {
							pager.page(currentPage + 1);
						}
					},
					previous: function() {
						if (currentPage !== 1) {
							pager.page(currentPage - 1);
						}
					},
					last: function() {
						pager.page(pager.totalPages());
					}
				};

				if (commandWords[0] in pageCommands) {
					logSpeechCommand("Requested pager move to " + commandWords[0] + " page");
					pageCommands[commandWords[0]]();
				} else {
					logSpeechCommand("Did not recognize page command");
				}
			}
		}
	}

	SpeechRecognition = window.webkitSpeechRecognition || window.mozSpeechRecognition || 
						window.oSpeechRecognition || window.msSpeechRecognition || 
						window.SpeechRecognition;
	
	if (SpeechRecognition) {		
		var recognition = new SpeechRecognition();
		recognition.maxAlternatives = 5;

		recognition.onaudiostart = function() {
			speak.val("Speak now...");
		};

		speak.on('click', function() {
			list.fadeOut("slow");

			recognition.start();
		});

		recognition.onresult = function(event) { // SpeechRecognitionEvent
			if (event.results.length > 0) { // SpeechRecognitionResults
				// Results are ordered by confidence level, highest-confidence item first
				var results = event.results[0],
					topResult = results[0],
					speechFn;

				// If we're running in continuous mode, we'll always want the last command in the 
				// SpeechRecognitionResultList object. Otherwise, take the first item.
				if (continuousMode)	{
					results = event.results[event.results.length - 1];
					topResult = results[0];

					speechFn = speechInteract;
				} else {
					speechFn = speechSearch;
				}

				if (topResult.confidence > 0.5) {
					speechFn(results, topResult);
				} else {
					speak.val("Try again please...");
				}
			}
		};

		recognition.onnomatch = function() {
			speak.val("Try again please...");
		};

		recognition.onerror = function() {
			speak.val("Error. Try Again...");
		};

		// (Continuous Mode) Example
		continuous.on('click', function() {
			if (continuousMode) {
				recognition.stop();
				recognition.continuous = false;

				continuous.val("Enable Continuous Mode");
				speechLog.fadeOut("slow");
				continuousMode = false;
			} else {
				recognition.continuous = true;
				continuous.val("Disable Continuous Mode");
				speechLog.fadeIn("slow");

				recognition.start();
				continuousMode = true;
			}
		});

		// END (Continuous Mode)
	}
	// END Speech JavaScript API Example

	// Create a new Kendo DataSource. For the Twitter search query value, "q," we'll pass in a function 
	ds = new kendo.data.DataSource({
		transport: {
			read: {
				url: "http://search.twitter.com/search.json",
				dataType: "jsonp",
				data: {
					q: function() {
						return query.val();
					}
				}
			}
		},
		schema: {
			data: "results",
			total: "results_per_page"
		},
		pageSize: 5
	});

	tweetPager.kendoPager({
		dataSource: ds
	});

	$("#list").kendoListView({
		selectable: true,
		template:kendo.template($("#tweetTemplate").html()),
		dataSource: ds
	});  
	
}(jQuery));