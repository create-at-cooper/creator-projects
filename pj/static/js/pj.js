"use strict";

var projects = [];
var votes;
var maxFiles = 5;
var disableScroll = false;

//using jQuery
function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
var csrftoken = getCookie('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
$.ajaxSetup({
    crossDomain: false, // obviates need for sameOrigin test
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type)) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

function addProject(project, append) {
	append = append === undefined ? false : append;
	
	var projectDiv = $("<li>").addClass("project").data("project", project);
	
	var title = $("<div>").addClass("title");
	title.append($('<a>').attr('href', '?project=' + project.id).html(project.title));
	
	projectDiv.append(title);
	
	var images = $("<div>").addClass("images");
	
	$.each(project.images, function(j, image) {		
		image.div = $("<div>").addClass("image").css("width", 100 / project.images.length + "%");
		$("<img>").attr("src", image.image).appendTo(image.div);
		
		images.append(image.div);
		image.div.data("image", image);
	});
	
	projectDiv.append(images);
	
	$('<div>').addClass('description').html(project.description).appendTo(projectDiv);
	
	var tags = $('<div>').addClass('tags');
	$.each(project.tags, function(i, tag) {
		$('<span>').addClass('tag').html(tag).appendTo(tags);
	});
	
	tags.appendTo(projectDiv);
	
	if (append) {
		$('#projects').append(projectDiv);
	} else {
		$('#projects').prepend(projectDiv);
	}
	
}

function loadProject(id, key) {
	var getData = {id: id};
	
	if (key !== undefined) {
		getData.key = key;
	}
	
	$.getJSON("/api/project", getData, function(data) {
		projects = projects.concat(data);
		
		$.each(data, function(i, project) {
			addProject(project, false);
		});
	});
}

function loadProjects(before_id, append) {
	var getData = {};
	
	if (before_id !== undefined) {
		getData.before_id = before_id;
	}
	append = append === undefined ? false : append;

	$.getJSON("/api/project", getData, function(data) {
		projects = projects.concat(data);
		
		if (!append) {
			data.reverse()
		}
		
		$.each(data, function(i, project) {
			addProject(project, append);
		});
	});
}

function markVotes() {
	$.each(votes, function(i, v) {
		$.each(projects, function(j, project) {
			$.each(project.images, function(k, choice) {
				if (v.id == choice.id) {
					choice.votes = v.votes;
					vote(choice);
				}
			});
		});
	});
}

function vote(choice) {
	if (choice.div.hasClass("chosen")) {
		$("span.votes", choice.div).html(choice.votes);
	} else {
		choice.div.addClass("chosen");
		$('<span>').addClass('votes').html(choice.votes).appendTo(choice.div);
	}
	
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
	$('#images').append(uchoice);

	$('#images .remove').hover(function() {
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
		// http://stackoverflow.com/titles/901115/how-can-i-get-query-string-values
	    var match = RegExp('[?&]' + name + '=([^&]*)')
	                    .exec(window.location.search);
	    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}
	
	var project = getParameterByName("project");
	if (project) {
		var key = getParameterByName("key");
		if (key)
			loadProject(project, key);
		else
			loadProject(project);
		
		$('#post').hide();
	} else {
		loadProjects();
		
		$(window).scroll(function(e) {
			// Check if we reached bottom of the document
			if( $(window).height() + $(window).scrollTop() >= $('#main').offset().top + $('#main').height() ) {
				loadProjects($('#projects .project').last().data("project").id, true);
			}
		});
	}
	
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
	
	$('#post').submit(function(e) {
		e.preventDefault();
		
		if (artFiles.length < 1) {
			displayError("We need at least one image!");
			return;
		}
		
		var data = new FormData();
		data.append('title', $('#title').val());
		data.append('description', $('#description').val());
		
		
		$.each($('#tags').tagit("assignedTags"), function(i, tag) {
			data.append('tag-' + i, tag);
		});
		
		data.append('tags', $('#tags').tagit("assignedTags").length);
		
		for (var i = 0; i < artFiles.length && i < maxFiles; i++) {
			data.append(i, artFiles[i]);
		}

		$.ajax({
			url: "/api/project",
			data: data,
			cache: false,
			processData: false,
			contentType: false,
			type: "POST",
			success: function(data) {				
				data = $.parseJSON(data);
				
				if (data.status == 'OK') {
					// empty list of files
					$('#images').empty();
					$('#title').val('');
					$('#description').val('');
					$("#fileselect").val('');
					$("#tags").tagit("removeAll");
					artFiles = [];
					
					$('#error').empty();
					
					addProject(data.project);
				} else {
					displayError(data.status);
				}
				
			}
		});
	});
	
	$('#images').on('click', '.remove', function() {	
		for (var i = 0; i < artFiles.length; i++) {
			if ($(this).parent().data("image") == artFiles[i]) {
				artFiles.splice(i, 1);
				$(this).parent().remove();
				break;
			}
		}
	});
	
	$("#tags").tagit({
		caseSensitive: false,
		allowSpaces: true,
		removeConfirmation: true,
		placeholderText: "tags",
		availableTags: []
	});
	
	$('#error').on('click', '.error', function() {
		$(this).remove();
	});
})