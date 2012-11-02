# Create your views here.
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import ensure_csrf_cookie
from pj.models import Project, Image, Tag, Member
import collections
import datetime
import json
import markdown

def api_login(request):
    if 'username' not in request.POST or 'password' not in request.POST:
        return HttpResponse(json.dumps({'status': 'Username and password needed!'}))
    
    username = request.POST['username']
    password = request.POST['password']
    
    if '@' in username:
        username = username[:username.find('@')]
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        if user.is_active:
            login(request, user)
            return HttpResponse(json.dumps({'status': 'OK'}))
        else:
            return HttpResponse(json.dumps({'status': 'Disabled account.'}))
    else:
        return HttpResponse(json.dumps({'status': 'Invalid credentials.'}))

@login_required
def api_logout(request):
    logout(request)
    
    return HttpResponse(json.dumps({'status': 'OK'}))

def redirect_logout(request):
    logout(request)
    
    return HttpResponseRedirect('/')

def list_tags(tags):
    tags_list = []
    
    for tag in tags:
        tags_list.append({
                          'id': tag.pk,
                          'name': tag.name
                          })
        
    return tags_list

@ensure_csrf_cookie
def tag(request):
    if request.method == "POST":
        return post_project(request)
    else:
        tags = Tag.objects.all()
        if 'name' in request.GET:
            name = request.GET['name'].lower()
            tags = tags.filter(name__startswith=name)
            
        if 'contact' in request.GET:
            contact = request.GET['contact']
            tags = tags.filter(contact__startswith=contact)
            
        if 'id' in request.GET:
            pk = request.GET['id']
            tags = tags.filter(pk=pk)
            
        return HttpResponse(json.dumps(list_tags(tags)))

def list_images(images):
    images_list = []
    
    for image in images:    
        images_list.append({
                             'id': image.pk,
                             'image': image.image.url
                             })
        
    return images_list

def dict_member(member, user=None):
    member_dict = {
                   'id': member.pk,
                   'name': member.name,
                   'contact': member.contact_info
                   }
    
    if user:
        if user == member.user:
            member_dict['check'] = 'verified'
        elif not member.user and user.email == member.contact_info:
            member_dict['check'] = 'possible'
    
    return member_dict

def list_members(members, user=None):
    members_list = []
    
    for member in members:
        members_list.append(dict_member(member, user))
    
    return members_list

@ensure_csrf_cookie
def member(request):
    if request.method == "POST":
        return post_member(request)
    else:
        members = Member.objects.all()
        if 'name' in request.GET:
            name = request.GET['name'].lower()
            members = members.filter(name__startswith=name)
            
        if 'contact' in request.GET:
            contact = request.GET['contact']
            members = members.filter(contact__startswith=contact)
            
        if 'id' in request.GET:
            pk = request.GET['id']
            members = members.filter(pk=pk)
            
        return HttpResponse(json.dumps(list_members(members)))
    
@login_required
@ensure_csrf_cookie
def post_member(request):
    result = {'status' : 'OK'}
    
    if 'id' in request.POST:
        pk = request.POST['id']
        
        try:
            member = Member.objects.get(pk=pk)
            member.user = request.user
            member.save()
            
            result['member'] = dict_member(member, request.user)
        except ObjectDoesNotExist:
            result['status'] = 'Member not found.'
    else:
        result['status'] = 'No member id specified!'
    
    return HttpResponse(json.dumps(result))

def dict_project(project, user=None):
    t = {'id': project.pk, 
         'created': str(project.created),
         'title': project.title,
         'description': markdown.markdown(project.description),
         'images': list_images(project.images.all()),
         'tags': [str(tag) for tag in project.tags.all()],
         'members': list_members(project.members.all(), user)
         }
    
    return t

def list_projects(projects, user=None):
    """Returns a serialized string of the given projects."""
    list_projects = [] # empty list of projects
    for project in projects:
        list_projects.append(dict_project(project, user))
        
    return list_projects

def serialize_projects(projects, user=None):
    return json.dumps(list_projects(projects, user));

@ensure_csrf_cookie
def project(request):
    if request.method == "POST":
        return post_project(request)
    else:
        return get_project(request)
    
@ensure_csrf_cookie
def get_project(request):
    projects = Project.objects.all()
        
    if 'id' in request.GET:
        ids = request.GET['id']
        if len(ids) > 0:
            pk = [int(n) for n in ids.split(',')]
            projects = projects.filter(pk__in=pk)
        else:
            return HttpResponse([])
   
    if 'tag' in request.GET:
        tags = request.GET['tag']
        if len(tags) > 0:
            tags = tags.split(',')
            projects = projects.filter(tags__name__in=tags)
        else:
            return HttpResponse([])
        
    if 'name' in request.GET:
        members = request.GET['name']
        if len(members) > 0:
            members = members.split(',')
            projects = projects.filter(members__name__in=members)
        else:
            return HttpResponse([])
        
    if 'member' in request.GET:
        members = request.GET['member']
        if len(members) > 0:
            members = members.split(',')
            projects = projects.filter(members__pk__in=members)
        else:
            return HttpResponse([])
   
    if 'since' in request.GET:
        since = datetime.datetime.strptime(request.GET['since'], '%Y-%m-%d %H:%M:%SZ')
        projects = projects.filter(creation_date__gt=since)
    elif 'since_id' in request.GET:
        since_id = request.GET['since_id']
        projects = projects.filter(pk__gt=since_id)
    elif 'before_id' in request.GET:
        before_id = request.GET['before_id']
        projects = projects.filter(pk__lt=before_id)
    
    projects = projects.order_by('-created')
        
    offset = int(request.GET.get('offset', '0'))
    limit = int(request.GET.get('limit', '5')) 
    projects = projects[offset : offset + limit]
    
    return HttpResponse(serialize_projects(projects, request.user), mimetype="application/json") # Send data back to the user.

@login_required
@ensure_csrf_cookie
def post_project(request):
    """User is submitting a project."""
    
    result = {'status' : 'OK'}
    
    if len(request.FILES.items()) < 1: # make sure we have multiple choices
        result['status'] = 'We need at least one image!'
        return HttpResponse(json.dumps(result))
    
    if len(request.POST.get('title', '')) < 3:
        result['status'] = 'Title too short!'
        return HttpResponse(json.dumps(result))
    
    if len(request.POST.get('description', '')) < 10:
        result['status'] = 'Description too short!'
        return HttpResponse(json.dumps(result))
    
    # limit number of tags
    if int(request.POST.get('tags', '0')) > 10:
        result['status'] = 'Too many tags!'
        return HttpResponse(json.dumps(result))
    
    # there should be at least one member
    if int(request.POST.get('members', '0')) < 1:
        result['status'] = 'Need at least one member.'
        return HttpResponse(json.dumps(result))
    elif int(request.POST.get('members', '0')) > 10:
        result['status'] = 'Too many members!'
        return HttpResponse(json.dumps(result))
    
    if len(request.FILES.items()) > 5: # limit number of images
        result['status'] = 'Image limit reached.'
        return HttpResponse(json.dumps(result))
    
    # check filesizes
    for key, f in request.FILES.items(): #@UnusedVariable
        if f.size > 1048576:
            result['status'] = '%s is above the 1 MB image size limit.' % (f.name)
            return HttpResponse(json.dumps(result))
        
    # check for duplicates
    title = request.POST.get('title', '')
    image_sizes = [int(f.size) for key, f in request.FILES.items()] #@UnusedVariable
    compare = lambda x, y: collections.Counter(x) == collections.Counter(y)
    
        # comparison
    projects = Project.objects.filter(title=title)
    for project in projects:
        project_image_sizes = [int(image.image.size) for image in project.images.all()]
        if compare(image_sizes, project_image_sizes):
            result['status'] = 'This project is identical to a previous one.'
            return HttpResponse(json.dumps(result))
        
    
    # Submission passed all checks, so create it!
    try:
        description = request.POST.get('description', '')
        project = Project.objects.create(title=title, description=description, created_by=request.user)
        
        for key, f in request.FILES.items(): #@UnusedVariable
            image = Image(project=project)
            
            image.image.save(f.name, f, save=True)
            image.save()
        
        if int(request.POST.get('members', '0')) > 0:
            for i in range(0, int(request.POST.get('members', '0'))):
                name = request.POST.get('member-name-' + str(i), '')
                contact = request.POST.get('member-contact-' + str(i), '')
                
                if not name or not contact:
                    result['status'] = 'Missing contact information.'
                    return HttpResponse(json.dumps(result))
                
                # Make sure name and contact info are of a certain length.
                if len(name) < 3:
                    result['status'] = '"%s" is too short!' % (name, )
                    return HttpResponse(json.dumps(result))
                if len(contact) < 3:
                    result['status'] = '"%s" is too short!' % (contact, )
                    return HttpResponse(json.dumps(result))
                
                member, created = Member.objects.get_or_create(name=name, contact_info=contact) #@UnusedVariable
                project.members.add(member)
        
        if int(request.POST.get('tags', '0')) > 0:
            for i in range(0, int(request.POST.get('tags', '0'))):
                tag_str = request.POST.get('tag-' + str(i), '')
                if len(tag_str) > 1:
                    tag, created = Tag.objects.get_or_create(name=tag_str.lower()) #@UnusedVariable
                    project.tags.add(tag)
        
        result['project'] = dict_project(project)
    except Exception as e:
        if project:
            project.delete()
        result['status'] = str(e)
    
    return HttpResponse(json.dumps(result))