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
	
	if (project.editable == true) {
		$('<a>').addClass("edit").attr('href', '?project=' + project.id + '&edit=1').html("edit").appendTo(title);
	}
	
	var members = $('<div>').addClass('members');
	$.each(project.members, function(i, member) {
		var memberDiv = $('<div>').addClass('info');
		
		$('<div>').addClass('member').append(memberDiv).appendTo(members);
		
		$('<a>').addClass("name").attr("href", "?member=" + member.id).html(member.name).appendTo(memberDiv);
		
		if (member.contact) {	
			var contact;
			
			if (member.contact.search("@") > 0 && member.contact.search("@") > 1) {
				contact = $('<a>').attr("href", "mailto:" + member.contact);
			} else {
				contact = $('<a>').attr("href", member.contact);;
			}
			
			contact.addClass("contact").html(member.contact).appendTo(memberDiv);
		}
		
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
	
	members.appendTo(projectDiv);
	
	var images = $("<div>").addClass("images");
	
	if (project.images.length == 1)
		images.addClass("single");
	
	$.each(project.images, function(j, image) {		
		image.div = $('<div>').addClass("image").css("width", 100 / project.images.length + "%").click(function(event) {
			event.preventDefault();
			
			if ($(this).hasClass('image-large')) {
				$(this).removeClass('image-large').addClass('image');
				$('.image', images).css("width", 100 / project.images.length + "%").show();
			} else {
				$(this).removeClass('image').addClass('image-large');
				$(this).css("width", "");
				$(this).siblings().hide();
			}
		});
		
		$('<img>').attr("src", image.image).appendTo(image.div);
		
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

function clearProject(callback) {
	// empty list of files
	$('#images').empty();
	$('#title').val('');
	$('#description').val('');
	$('#fileselect').val('');
	$('#members_list').empty();
	$('#member_contact').val('');
	$('#member_name').val('');

	newImages = [];
	$('#error').empty();
	
	if ($('#tags').tagit("assignedTags").length > 0) {
		var timer;
		
		// crazy hack to deal with the fact that assignedtags is not cleared
		// immediately when removeall is cleared
		// so tags are visually gone but cannot be added
		$("#tags").tagit({
		    onTagRemoved: function() {
		    	if (timer)
		    		return;
		    	
		    	timer = setTimeout(function() {
			    	if ($('#tags').tagit("assignedTags").length == 0) {
			    		if($.isFunction(callback))
			    			callback();
			    		
			    		$("#tags").tagit({
			    		    onTagRemoved: null
			    		});
			    		timer = undefined;
			    	}
			    }, 100)
		    }
		});
		
		$('#tags').tagit("removeAll");
	} else {
		callback();
	}
	
}

function editProject(project) {
	$('#title').val(project.title);
	$('#description').val(project.description);
	
	$.each(project.members, function(i, member) {
		addMember(member.name, member.contact);
	})
	
	$.each(project.tags, function(i, tag) {
		$("#tags").tagit("createTag", tag);
	});
	
	$.each(project.images, function(i, image) {
		addImage(image, image.image);
	})
}

function loadProjectEdit(query) {
	$.getJSON("/api/project", query, function(data) {
		projects = projects.concat(data);
		
		$.each(data, function(i, project) {
			editProject(project);
		});
	});
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
		
		// Fix for chrome not displaying images once they're downloaded
		$.each(data, function(i, project) {
			$.each(project.images, function(j, image) {
				image.div.show();
			});
		});
		
		if ($.isFunction(callback))
			callback(projects);
	});
}

// FILE STUFF

var newImages = [];
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
	addImage(image, event.target.result);
}

function addImage(image, url) {
	if (newImages.length >= maxFiles) {
		displayError("Image limit reached.");
		return;
	}
	
	newImages.push(image);
	
	var uchoice = $('<div class="uchoice" style="margin: 2pt; display: inline-block; position: relative; overflow: hidden; width: 160px"></div>').append(
			'<div class="remove"' +
					'style="color: gray; position: absolute; top: -8px; right: 0px; height: 25px"><table cellspacing="0" cellpadding="0" style="font-family: arial, sans-serif; font-size: 28px;"><tbody><tr><td>&#215;</td></tr></tbody></table></div><img style="width:160px" src="'
							+ url + '"/>').data("image", image);
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
	
	var query = getParameterByName("q");
	if (query)
		q["q"] = query;
	
	var tag = getParameterByName("tag");
	if (tag)
		q["tag"] = tag;
	
	var name = getParameterByName("name");
	if (name)
		q["name"] = name;
	
	var member = getParameterByName("member");
	if (member)
		q["member"] = member;
	
	return q;
}


function addMember(name, contact) {
	var member = $('<li>').addClass('member');
	
	$('<input>').addClass('name').attr({
		type: "text",
		maxlength: 140,
		placeholder: "member name"
	}).val(name).appendTo(member);
	
	$('<input>').addClass('contact').attr({
		type: "text",
		maxlength: 256,
		placeholder: "contact info (optional)"
	}).val(contact).appendTo(member);
	
	$('<button>').addClass('remove').html("&#215;").appendTo(member);
	
	$('#members_list').append(member);
}

function addMemberEvent(e) {
	if (e)
		e.preventDefault();
	
	var name = $('#member_name').val();
	if (name.length < 2)
		displayError("Member name \"" + name + "\" is too short!");
	else if (name.length > 140)
		displayError("Member name \"" + name + "\" is too long!");
	
	var contact = $('#member_contact').val();
	if (contact.length > 256)
		displayError("Member contact information is too long!");
	
	addMember(name, contact);
	
	$('#member_contact').val("");
	$('#member_name').val("");
	$('#member_name').focus();
}

function getMembers() {
	var members = [];
	$('#members_list .member').each(function(i, div) {
		if ($('.name', div).val()/* && $('.contact', div).val()*/) {
			members.push({
				name: $('.name', div).val(),
				contact: $('.contact', div).val()
			});
		}
	});
	
	return members;
}

function createProject() {
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
		
		if (newImages.length < 1) {
			displayError("We need at least one image!");
			return;
		}
		
		var data = new FormData();
		data.append('title', $('#title').val());
		data.append('description', $('#description').val());
		
		
		var members = getMembers();
		
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
		
		
		var image_ids = 0;
		for (var i = 0; i < newImages.length && i < maxFiles; i++) {
			if (newImages[i].id) {
				data.append('image-id-' + image_ids, newImages[i].id);
				image_ids++;
			} else
				data.append(i, newImages[i]);
		}
		
		data.append('image-ids', image_ids);
		
		var project_id = getParameterByName("project");
		
		if (project_id)
			data.append('project_id', project_id);

		$.ajax({
			url: "/api/project",
			data: data,
			cache: false,
			processData: false,
			contentType: false,
			type: "POST",
			success: function(data) {
				if (data.status == 'OK') {
					if (project_id) {
						clearProject(function() {
							editProject(data.project);
						});
					} else {
						addProject(data.project);
						clearProject();
					}
				} else {
					displayError(data.status);
				}
			},
			error: function() {
				displayError("Something went wrong!");
			}
		});
	});
	
	$('#images').on('click', '.remove', function() {	
		for (var i = 0; i < newImages.length; i++) {
			if ($(this).parent().data("image") == newImages[i]) {
				newImages.splice(i, 1);
				$(this).parent().remove();
				break;
			}
		}
	});
	
	$('#member_contact, #member_name').focus().keypress(function(e){
        if (e.which == 13) {
            addMemberEvent(e);
        }
    });
	
	$('#add_member').click(addMemberEvent);
	
	$('#members_list').on('click', '.remove', function() {
		$(this).parent().remove();
	});
	
	var pjMembers  = [];
	var pjMemberMap = {};
	
	$('#member_name').autocomplete({
		minLength: 1,
		source: function(request, response) {
			if (request.term.length == 0)
				response([]);
			
			var respMembers = pjMembers;
			
			$.get("api/member", {filter: request.term}, function(data) {
				respMembers = data;
				
				// keep complete list of members
				var new_members = [];
				
				$.map(data, function(member) {
					member.id == undefined;
					
					if (pjMemberMap[member.name] === undefined) {
						new_members.push(member);
						pjMemberMap[member.name] = member;
					}
				});
				
				$.merge(pjMembers, new_members);
			}, "json").complete(function() {
				response(subtractArray(respMembers, getMembers()));
			});
		},
		select: function(event, ui) {
			$('#member_name').val(ui.item.name);
			$('#member_contact').val(ui.item.contact);
			$('#add_member').click();
			
			return false;
		}
	}).data("autocomplete")._renderItem = function(ul, item) {
		return $("<li>")
		.data("item.autocomplete", item)
		.append("<a><span class='suggest name'>" + item.name + "</span>" +
				"<br><span class='suggest contact'>" + item.contact + "</span></a>" )
		.appendTo(ul);
	};
	
	var tags  = [];
	var tagMap = {};	
    var old_search_tag;
    
	$("#tags").tagit({
		caseSensitive: false,
		allowSpaces: true,
		removeConfirmation: false,
		placeholderText: "tags",
		tabIndex: 8,
		tagSource: function(search, showChoices) {
			
			if (search.term != old_search_tag) {
				old_search_tag = search.term;
				
				$.get("api/tag", {filter: search.term}, function(data) {		
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
}

function subtractArray(a1, a2) {
    var result = [];
    for (var i = 0; i < a1.length; i++) {
        if ($.inArray(a1[i], a2) == -1) {
            result.push(a1[i]);
        }
    }
    return result;
};

$(function() {
	
	var project = getParameterByName("project");
	
	if (project) {
		var edit = getParameterByName("edit");
		
		if (edit == "1") {
			loadProjectEdit({id: project, edit: 1});
			$('#submit').val("edit");
			$('#project').show();
		} else {
			loadProject({id: project});
			$('#project').hide();
		}
		
	} else {
		
		$('#add-project').click(function(event) {
			if ($('#project').css('display') == 'none') {
				$('#project').show();
			} else {
				$('#project').hide();
			}
		});
		
		var q = buildQuery();
		$('#query').val(q.q);
		
		if (q.member) {			
			$.getJSON("/api/member", {id: q.member}, function(data) {
				if (data.length > 0)
					$('#filters').show();
				
				$.each(data, function(i, member) {
					var memberDiv = $('<div>').addClass('info');
					
					$('<div>').addClass('member').append(memberDiv).appendTo($('#filters'));
					
					$('<a>').addClass("name").attr("href", "?member=" + member.id).html(member.name).appendTo(memberDiv);
					
					if (member.contact) {
						var contact;
						
						if (member.contact.search("@") > 0 && member.contact.search("@") > 1) {
							contact = $('<a>').attr("href", "mailto:" + member.contact);
						} else {
							contact = $('<a>').attr("href", member.contact);;
						}
						
						contact.addClass("contact").html(member.contact).appendTo(memberDiv);
					}
				});
			});
		}
		
		if (q.tag) {
			var tags = q.tag.split(",");
			
			if (tags.length > 0)
				$('#filters').show();
			
			$.each(tags, function(i, tag) {
				$('<a>').addClass('tag').attr("href", "?tag=" + tag).html(tag).appendTo($('#filters'));
			});
		}
		
		loadProjects(undefined, false, function(projects) {
			if (projects.length == 0) {
				if (q.q)
					displayError('No projects found for "' + q.q + '"');
				else
					displayError('No projects found!');
			}
		});
		
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
	
	if ($('#project').length > 0) {
		createProject();
	}
	
	$('#error').on('click', '.error', function() {
		$(this).remove();
	});
	
	var tags  = [];
	var members = [];
	var tagMap = {};
	var memberMap = {};
	
	$('#query').autocomplete({
		minLength: 1,
		source: function(request, response) {
			if (request.term.length == 0)
				response([]);
			
			
			var tagDone = false;
			var memberDone = false;
			
			var respTags = tags;
			var respMembers = members;
			
			$.get("api/tag", {q: request.term}, function(data) {
				respTags = data;
				var new_tags = [];
				
				$.map(data, function(tag) {
					tag.url = '?tag=' + tag.name;
					
					if (tagMap[tag.name] === undefined) {
						new_tags.push(tag.name);
						tagMap[tag.name] = tag;
					}
				});
				
				$.merge(tags, new_tags);
			}, "json").complete(function() {
				tagDone = true;
				
				if (memberDone)
					response($.merge(respTags, respMembers));
			});
			
			$.get("api/member", {q: request.term}, function(data) {
				respMembers = data;
				var new_members = [];
				
				$.map(data, function(member) {
					member.url = '?member=' + member.id;
					
					if (memberMap[member.name] === undefined) {
						new_members.push(member.name);
						memberMap[member.name] = member;
					}
				});
				
				$.merge(members, new_members);
			}, "json").complete(function() {
				memberDone = true;
				
				if (tagDone)
					response($.merge(respTags, respMembers));
			});
		},
		focus: function(event, ui) {
			/*if (ui.item.name)
				$('#query').val(ui.item.name);*/
			
			return false;
		},
		select: function(event, ui) {
			if (ui.item.name && ui.item.url)
				window.location = ui.item.url;
			
			return false;
		},
	}).data("autocomplete")._renderItem = function(ul, item) {
		
		var entry = $('<li>').data('item.autocomplete', item);
		
		if (item.contact) {
			item.div = entry.append('<a href="' + item.url + '"><span class="suggest member">' + item.name + ' (' + item.contact + ')</span></a>');
			item.div.appendTo(ul);
		} else {
			item.div = entry.append('<a href="' + item.url + '"><span class="suggest name">' + item.name + '</span></a>');
			item.div.appendTo(ul);
		}
		
		return entry;
	};
})