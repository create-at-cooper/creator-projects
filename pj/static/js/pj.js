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
	
	var members = $('<div>').addClass('members');
	$.each(project.members, function(i, member) {
		var memberDiv = $('<div>').addClass('info');
		
		$('<div>').addClass('member').append(memberDiv).appendTo(members);
		
		$('<a>').addClass("name").attr("href", "?member=" + member.id).html(member.name).appendTo(memberDiv);
		
		var contact;
		
		if (member.contact.search("@") > 0 && member.contact.search("@") > 1) {
			contact = $('<a>').attr("href", "mailto:" + member.contact);
		} else {
			contact = $('<a>').attr("href", member.contact);;
		}
		
		contact.addClass("contact").html(member.contact).appendTo(memberDiv);
		
		if (member.check == "possible") {
			$('<div>').addClass('check').html("me!").click(function() {
				
				var me = $(this);
				
				$.post("/api/member", {id: member.id}, function(data) {
					if (data.status == 'OK') {
						me.html("&#x2713;");
						me.removeClass('check');
						me.addClass('verified');
					} else {
						displayError(data.status);
					}
				}, "json");
			
			}).appendTo(memberDiv);
		} else if (member.check == "possible") {
			$('<div>').addClass('verified').html("&#x2713;").appendTo(memberDiv);
		}
	});
	
	// TODO: do something if user clicks check
	
	members.appendTo(projectDiv);
	
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
		$('<a>').addClass('tag').attr("href", "?tag=" + tag).html(tag).appendTo(tags);
	});
	
	tags.appendTo(projectDiv);
	
	if (append) {
		$('#projects').append(projectDiv);
	} else {
		$('#projects').prepend(projectDiv);
	}
	
}

function loadProject(query) {
	$.getJSON("/api/project", query, function(data) {
		projects = projects.concat(data);
		
		$.each(data, function(i, project) {
			addProject(project, false);
		});
	});
}

function loadProjects(before_id, append, callback) {
	var getData = buildQuery();
	
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
		
		if ($.isFunction(callback))
			callback();
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

function getParameterByName(name) {
	// http://stackoverflow.com/titles/901115/how-can-i-get-query-string-values
    var match = RegExp('[?&]' + name + '=([^&]*)')
                    .exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

function buildQuery() {
	var q = {};
	
	var tag = getParameterByName("tag")
	if (tag)
		q["tag"] = tag;
	
	var name = getParameterByName("name")
	if (name)
		q["name"] = name;
	
	var member = getParameterByName("member")
	if (member)
		q["member"] = member;
	
	return q;
}

$(function() {
	
	var project = getParameterByName("project");
	
	if (project) {
		loadProject({id: project});
	} else {
		loadProjects();
		
		var loading = false;
		
		$(window).scroll(function(e) {
			// Check if we reached bottom of the document
			if(!loading && $(window).height() + $(window).scrollTop() >= $('#main').offset().top + $('#main').height() - $(window).height() / 20) {
				if ($('#projects .project').length > 0) {
					loading = true;
					
					loadProjects($('#projects .project').last().data("project").id, true, function() {
						loading = false;
					});
				}
					
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
	
	$('#project').submit(function(e) {
		e.preventDefault();
		
		if (artFiles.length < 1) {
			displayError("We need at least one image!");
			return;
		}
		
		var data = new FormData();
		data.append('title', $('#title').val());
		data.append('description', $('#description').val());
		
		
		var members = [];
		$('#members_list .member').each(function(i, div) {
			if ($('.name', div).val() && $('.contact', div).val()) {
				members.push({
					name: $('.name', div).val(),
					contact: $('.contact', div).val()
				});
			}
		});
		
		if (members.length < 1) {
			displayError("We need at least one member!");
			return;
		}
		
		data.append('members', members.length);
		
		$.each(members, function(i, member) {
			data.append('member-name-' + i, member.name);
			data.append('member-contact-' + i, member.contact);
		});
		
		
		data.append('tags', $('#tags').tagit("assignedTags").length);
		
		$.each($('#tags').tagit("assignedTags"), function(i, tag) {
			data.append('tag-' + i, tag);
		});
		
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
					addProject(data.project);
					
					// empty list of files
					$('#images').empty();
					$('#title').val('');
					$('#description').val('');
					$("#fileselect").val('');
					$("#members_list").empty();
					$('#member_contact').val("");
					$('#member_name').val("");
					$("#tags").tagit("removeAll");
					artFiles = [];
					
					$('#error').empty();
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
	
	function addMember(e) {
		var member = $('<li>').addClass('member');
		
		$('<input>').addClass('name').attr({
			type: "text",
			maxlength: 140,
			placeholder: "member name"
		}).val($('#member_name').val()).appendTo(member);
		
		$('<input>').addClass('contact').attr({
			type: "text",
			maxlength: 256,
			placeholder: "contact"
		}).val($('#member_contact').val()).appendTo(member);
		
		$('#member_contact').val("");
		$('#member_name').val("");
		$('#member_name').focus();
		
		$('<button>').addClass('remove').html("&#215;").appendTo(member);
		
		$('#members_list').append(member);
		
		e.preventDefault();
	}
	
	$('#member_contact, #member_name').focus().keypress(function(e){
        if (e.which == 13) {
            addMember(e);
        }
    });
	
	$('#add_member').click(addMember);
	
	$('#members_list').on('click', '.remove', function() {
		$(this).parent().remove();
	});
	
	var pjMembers  = [];
	var pjMemberMap = {};
	var old_search_member;
	
	$('#member_name').autocomplete({
		minLength: 0,
		source: function(request, response) {
			if (old_search_member != request.term) {
				$.get("api/member", {name: request.term}, function(data) {		
					var new_members = [];
					
					$.map(data, function(member) {
						member.value = member.name;
						
						if (pjMemberMap[member.name] === undefined) {
							new_members.push(member);
							pjMemberMap[member.name] = member;
						}
					});
					
					$.merge(pjMembers, new_members);
				}, "json").complete(function() {
					response(pjMembers);
				});
			} else {
				response(pjMembers);
			}
		},
		select: function(event, ui) {
			$('#member_name').val(ui.item.value);
			$('#member_contact').val(ui.item.contact);
			$('#add_member').click();
			
			return false;
		}
	}).data("autocomplete")._renderItem = function(ul, item) {
		return $("<li>")
		.data("item.autocomplete", item)
		.append("<a><span class='suggest name'>" + item.value + "</span>" +
				"<br><span class='suggest contact'>" + item.contact + "</span></a>" )
		.appendTo(ul);
	};
	
	var tags  = [];
	var tagMap = {};
	
	function subtractArray(a1, a2) {
        var result = [];
        for (var i = 0; i < a1.length; i++) {
            if ($.inArray(a1[i], a2) == -1) {
                result.push(a1[i]);
            }
        }
        return result;
    };
	
    var old_search_tag;
    
	$("#tags").tagit({
		caseSensitive: false,
		allowSpaces: true,
		removeConfirmation: true,
		placeholderText: "tags",
		tagSource: function(search, showChoices) {
			
			if (search.term != old_search_tag) {
				old_search_tag = search.term;
				
				$.get("api/tag", {name: search.term}, function(data) {		
					var new_tags = [];
					
					$.map(data, function(tag) {
						if (tagMap[tag.name] === undefined) {
							new_tags.push(tag.name);
							tagMap[tag.name] = tag;
						}
					});
					
					$.merge(tags, new_tags);
				}, "json").complete(function() {
					showChoices(subtractArray(tags, $("#tags").tagit("assignedTags")));
				});
			} else {
				showChoices(subtractArray(tags, $("#tags").tagit("assignedTags")));
			}
        }
	});
	
	$('#error').on('click', '.error', function() {
		$(this).remove();
	});
})