var tests = [];
var votes;

function addTest(test, append) {
	append = append === undefined ? false : append;
	
	var testDiv = $("<li>").addClass("test").data("test", test);
	if (!test.question || test.question.length < 2)
		test.question = "Which is your favorite?";
	testDiv.append($("<div>").addClass("question").html(test.question));
	
	var choices = $("<div>").addClass("choices");
	
	$.each(test.choices, function(j, choice) {
		choice.div = $("<div>").addClass("choice").css("width", 100 / test.choices.length + "%");
		$("<img>").attr("src", choice.image).appendTo(choice.div);
	
		choices.append(choice.div);
		choice.div.data("choice", choice);
	});
	
	testDiv.append(choices);
	if (append) {
		$("#tests").append(testDiv);
	} else {
		$("#tests").prepend(testDiv);
	}
	
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
		
		if (tests) {
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
}

$(function() {
	loadTests();
	loadVotes();
})

// FILE STUFF

var artFiles = [];

// init event handlers

// drag + drop
$(function() {
	$('#dropbox').get(0).addEventListener("drop", dropAction, false);
	$('#dropbox').get(0).addEventListener("dragover", function(evt) {
		evt.stopPropagation();
		evt.preventDefault();
	}, false);

	$('#fileselect').get(0).addEventListener("change", handleFileSelect, false);
});

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

	var files = event.dataTransfer.files;
	var count = files.length;

	// Only call the handler if 1 or more files was dropped.
	if (count > 0)
		handleFiles(files)
}

function handleFiles(files) {
	for ( var i = 0, f; f = files[i]; i++) {

		// Only process image files.
		if (!f.type.match('image.*')) {
			continue;
		}

		artFiles.push(f);

		var reader = new FileReader();

		reader.onloadend = handleReaderLoadEnd;
		reader.readAsDataURL(f);
	}
}

function handleReaderLoadEnd(event) {
	$('#choices')
			.append(
					'<div style="margin: 2pt; display: inline-block; position: relative; overflow: hidden; width: 160px"><div class="remove" style="color: gray; position: absolute; top: -8px; right: 0px; height: 25px"><table cellspacing="0" cellpadding="0" style="font-family: arial, sans-serif; font-size: 28px;"><tbody><tr><td>&#215;</td></tr></tbody></table></div><img style="width:160px" src="'
							+ event.target.result + '"/></div>');

	$('#choices .remove').hover(function() {
		$(this).css("cursor", "pointer");
		$(this).css("background", "black");
		$(this).css("color", "white");
	}, function() {
		$(this).css("cursor", "auto");
		$(this).css("color", "gray");
		$(this).css("background", "transparent");
	});

	// TODO: screws up if you have the same image more than once
	$('#choices .remove').click(function() {
		for ( var i = 0; i < artFiles.length; i++) {
			if (artFiles[i].data == $(this).next("img").attr("src")) {
				artFiles.splice(i, 1);
				$(this).parent().remove();

				break;
			}
		}
	});

	artFiles.push({
		data : event.target.result
	});
}

$(function() {
	$('#ask').submit(function(e) {
		var data = new FormData();

		data.append("question", $("#question").val());
		
		for ( var i = 0; i < artFiles.length; i++) {
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
				// empty list of files
				$('#choices').empty();
				$('#question').val('');
				artFiles = [];
				
				data = $.parseJSON(data);
				addTest(data.test);
			}
		});
		
		e.preventDefault();
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
	
	$(window).scroll(function(e) {

		// Check if we reached bottom of the document
		if( $(window).height() + $(window).scrollTop() >= $('#main').offset().top + $('#main').height() ) {
			loadTests($('#tests .test').last().data("test").id, true);
		}
	});
})

function uploadFailed(event) {
	alert("There was an error attempting to upload the file.");
}

function uploadCanceled(event) {
	alert("The upload has been canceled by the user or the browser dropped the connection.");
}