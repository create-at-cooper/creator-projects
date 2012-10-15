"use strict";

var tests = [];
var votes;
var maxFiles = 5;
var disableScroll = false;

function addTest(test, append) {
	append = append === undefined ? false : append;
	
	var testDiv = $("<li>").addClass("test").data("test", test);
	
	if (!test.question || test.question.length < 2)
		test.question = "Which is your favorite?";
	
	var question = $("<div>").addClass("question");
	question.append($('<a>').attr('href', '?test=' + test.id).html(test.question));
	
	if (test.results) {
		question.html(question.html() + " (results)");
	}
	
	if (test.key) {
		question.append($("<a>").attr('href', '?test=' + test.id + '&key=' + test.key).addClass("save").html(" (link to see results)"));
	}
	testDiv.append(question);
	
	var choices = $("<div>").addClass("choices");
	
	// tally up total number of votes
	if (test.results) {
		var totalVotes = 0;
		
		$.each(test.choices, function(j, choice) {
			totalVotes += parseInt(choice.votes, 10);
		});
	}
	
	$.each(test.choices, function(j, choice) {		
		choice.div = $("<div>").addClass("choice").css("width", 100 / test.choices.length + "%");
		$("<img>").attr("src", choice.image).appendTo(choice.div);
		
		choices.append(choice.div);
		choice.div.data("choice", choice);
		
		if (choice.votes && test.results) {
			
			choice.div.addClass("results");
			$("<div>").addClass("votes-bar").css("width", 100 * parseInt(choice.votes, 10) / totalVotes + "%").appendTo(choice.div);
			vote(choice);
		}
	});
	
	
	
	testDiv.append(choices);
	if (append) {
		$("#tests").append(testDiv);
	} else {
		$("#tests").prepend(testDiv);
	}
	
}

function loadTest(id, key) {
	var getData = {id: id};
	
	if (key !== undefined) {
		getData.key = key;
	}
	
	$.getJSON("/api/test", getData, function(data) {
		tests = tests.concat(data);
		
		$.each(data, function(i, test) {
			addTest(test, false);
		});
		
		if (votes) {
			markVotes();
		}
	});
}

function loadTests(before_id, append) {
	var getData = {};
	
	if (before_id !== undefined) {
		getData.before_id = before_id;
	}
	append = append === undefined ? false : append;

	$.getJSON("/api/test", getData, function(data) {
		tests = tests.concat(data);
		
		if (!append) {
			data.reverse()
		}
		
		$.each(data, function(i, test) {
			addTest(test, append);
		});
		
		if (votes) {
			markVotes();
		}
	});
}

function loadVotes() {
	$.getJSON("/api/vote", function(data) {
		votes = data.votes;
		
		if (tests.length > 0) {
			markVotes();
		}
	});
}

function markVotes() {
	$.each(votes, function(i, v) {
		$.each(tests, function(j, test) {
			$.each(test.choices, function(k, choice) {
				if (v.id == choice.id) {
					choice.votes = v.votes;
					vote(choice);
				}
			});
		});
	});
}

function vote(choice) {
	choice.div.addClass("chosen");
	$('<span>').addClass('votes').html(choice.votes).appendTo(choice.div);
	$(choice.div).parent().addClass("voted");
	$('#error').empty();
}

// FILE STUFF

var artFiles = [];
var loaded = [];

function displayError(message) {
	$('#error').append($('<li>').addClass('error').html(message));
	$('#error').show();
}

function handleFileSelect(event) {
	var files = event.target.files;
	var count = files.length;

	// Only call the handler if 1 or more files was dropped.
	if (count > 0)
		handleFiles(files)
}

function dropAction(event) {	
	event.stopPropagation();
	event.preventDefault();
	
	$(this).removeClass("dropover");

	var files = event.dataTransfer.files;
	var count = files.length;

	// Only call the handler if 1 or more files was dropped.
	if (count > 0)
		handleFiles(files)
}

function handleFiles(files) {
	$('#error').empty();
	
	$.each(files, function(i, file){
		// Only process small image files.
		if (!file.type.match('image.*')) {
			displayError(file.name + " is not a recognized image file!");
			return;
		}
		
		if (file.size > 1048576) {
			displayError(file.name + " is too large!");
			return;
		}
		
		var reader = new FileReader();

		reader.onloadend = function(event) {
			handleReaderLoadEnd(file, event);
		};
		reader.readAsDataURL(file);
		
		reader.onabort = function() {
			displayError("Reading of " + file.name + " cancelled!");
		};
		reader.onerror = function() {
			displayError("Error reading " + file.name + "!");
		};
	});
}

function handleReaderLoadEnd(image, event) {
	if (artFiles.length >= maxFiles) {
		displayError("Image limit reached.");
		return;
	}
	
	artFiles.push(image);
	
	var uchoice = $('<div class="uchoice" style="margin: 2pt; display: inline-block; position: relative; overflow: hidden; width: 160px"></div>').append(
			'<div class="remove"' +
					'style="color: gray; position: absolute; top: -8px; right: 0px; height: 25px"><table cellspacing="0" cellpadding="0" style="font-family: arial, sans-serif; font-size: 28px;"><tbody><tr><td>&#215;</td></tr></tbody></table></div><img style="width:160px" src="'
							+ event.target.result + '"/>').data("image", image);
	$('#choices').append(uchoice);

	$('#choices .remove').hover(function() {
		$(this).css("cursor", "pointer");
		$(this).css("background", "black");
		$(this).css("color", "white");
	}, function() {
		$(this).css("cursor", "auto");
		$(this).css("color", "gray");
		$(this).css("background", "transparent");
	});
}

$(function() {
	function getParameterByName(name) {
		// http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
	    var match = RegExp('[?&]' + name + '=([^&]*)')
	                    .exec(window.location.search);
	    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}
	
	var test = getParameterByName("test");
	if (test) {
		var key = getParameterByName("key");
		if (key)
			loadTest(test, key);
		else
			loadTest(test);
		
		$('#ask').hide();
	} else {
		loadTests();
		
		$(window).scroll(function(e) {
			// Check if we reached bottom of the document
			if( $(window).height() + $(window).scrollTop() >= $('#main').offset().top + $('#main').height() ) {
				loadTests($('#tests .test').last().data("test").id, true);
			}
		});
	}
	loadVotes();
	
	$('#dropbox').get(0).addEventListener("drop", dropAction, false);
	$('#dropbox').get(0).addEventListener("dragover", function(evt) {		
		evt.stopPropagation();
		evt.preventDefault();
	}, false);
	
	$('#dropbox').get(0).addEventListener("dragenter", function(evt) {
		$(this).addClass("dropover");
	}, false);
	
	$('#dropbox').get(0).addEventListener("dragleave", function(evt) {
		$(this).removeClass("dropover");
	}, false);

	$('#fileselect').get(0).addEventListener("change", handleFileSelect, false);
	
	$('#ask').submit(function(e) {
		e.preventDefault();
		
		if (artFiles.length < 2) {
			displayError("We need multiple choices!");
			return;
		}
		
		var data = new FormData();
		data.append('question', $('#question').val());
		
		for (var i = 0; i < artFiles.length && i < maxFiles; i++) {
			data.append(i, artFiles[i]);
		}

		$.ajax({
			url: "/api/test",
			data: data,
			cache: false,
			processData: false,
			contentType: false,
			type: "POST",
			success: function(data) {				
				data = $.parseJSON(data);
				
				if (data.status == 'OK') {
					// empty list of files
					$('#choices').empty();
					$('#question').val('');
					$("#fileselect").val('');
					artFiles = [];
					
					$('#error').empty();
					
					addTest(data.test);
				} else {
					displayError(data.status);
				}
				
			}
		});
	});
	
	$('#choices').on('click', '.remove', function() {	
		for (var i = 0; i < artFiles.length; i++) {
			if ($(this).parent().data("image") == artFiles[i]) {
				artFiles.splice(i, 1);
				$(this).parent().remove();
				break;
			}
		}
	});
	
	$('#tests').on('click', '.choice', function() {
		// make sure we haven't voted on this already
		if ($(this).parent().hasClass("voted"))
			return;
		
		var choice = $(this).data("choice");
		
		$.post("/api/vote", {choice: choice.id}, function(data) {
			data = $.parseJSON(data);
			choice.votes = data.votes;
			if (data.status == "OK") {
				vote(choice);
			}
		});
	});
	
	$('#error').on('click', '.error', function() {
		$(this).remove();
	});
})