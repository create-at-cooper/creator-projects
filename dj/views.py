# Create your views here.
from dj.models import Test, Choice
from django.core.signing import BadSignature
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
import datetime
import json
import collections

def get_votes_for_choices(choices):
    choices = Choice.objects.filter(id__in=choices)
    list_choices = []
    
    for choice in choices:
        list_choices.append({
                             'id': choice.id,
                             'votes': choice.votes
                             })
        
    return list_choices
        

def list_choices(choices, votes=False):
    list_choices = []
    
    if votes:
        for choice in choices:    
            list_choices.append({
                                 'id': choice.pk,
                                 'image': choice.image.url,
                                 'votes': choice.votes
                                 })
    else:
        for choice in choices:    
            list_choices.append({
                                 'id' : choice.pk,
                                 'image': choice.image.url
                                 })
        
    return list_choices

def dict_test(test, votes=False, key=False):
    t = {'id': test.pk, 
         'pub_date': str(test.pub_date),
         'question': test.question,
         'choices': list_choices(test.choices.all(), votes)
         }
    
    if key:
        t['key'] = test.key
        
    if votes:
        t['results'] = True
    
    return t

def list_tests(tests, keys=[]):
    """Returns a serialized string of the given tests."""
    list_tests = [] # empty list of choices
    for i, test in enumerate(tests):
        if i < len(keys) and unicode(test.key) == unicode(keys[i]):
            list_tests.append(dict_test(test, True))
        else:
            list_tests.append(dict_test(test))
        
    return list_tests

def serialize_tests(tests, keys=[]):
    return json.dumps(list_tests(tests, keys));

def test(request):
    if request.method == "POST":
        return post_test(request)
    else:
        return get_test(request)

def get_test(request):
    tests = Test.objects.all()
    keys = []
        
    if 'id' in request.GET:
        ids = request.GET['id']
        if len(ids) > 0:
            pk = [int(n) for n in ids.split(',')]
            tests = tests.filter(pk__in=pk)
        else:
            return HttpResponse([])
                
        if 'key' in request.GET:
            keys = request.GET['key']
            if len(keys) > 0:
                keys = [n for n in keys.split(',')]
   
    if 'since' in request.GET:
        since = datetime.datetime.strptime(request.GET['since'], '%Y-%m-%d %H:%M:%SZ')
        tests = tests.filter(creation_date__gt=since)
    elif 'since_id' in request.GET:
        since_id = request.GET['since_id']
        tests = tests.filter(pk__gt=since_id)
    elif 'before_id' in request.GET:
        before_id = request.GET['before_id']
        tests = tests.filter(pk__lt=before_id)
    
    tests = tests.order_by('-pub_date')
        
    offset = int(request.GET.get('offset', '0'))
    limit = int(request.GET.get('limit', '5')) 
    tests = tests[offset : offset + limit]
    
    return HttpResponse(serialize_tests(tests, keys), mimetype="application/json") # Send data back to the user.

@csrf_exempt
def post_test(request):
    """User is submitting a test."""
    
    result = {'status' : 'OK'}
    
    if len(request.FILES.items()) < 2: # make sure we have multiple choices
        result['status'] = 'We need multiple choices!'
        return HttpResponse(json.dumps(result))
    
    if len(request.FILES.items()) > 5: # limit number of choices
        result['status'] = 'Image limit reached.'
        return HttpResponse(json.dumps(result))
    
    # check filesizes
    for key, f in request.FILES.items(): #@UnusedVariable
        if f.size > 1048576:
            result['status'] = '%s is above the 1 MB image size limit.' % (f.name)
            return HttpResponse(json.dumps(result))
        
    # check for duplicates
    question = request.POST.get('question', '')
    choice_sizes = [int(f.size) for key, f in request.FILES.items()] #@UnusedVariable
    compare = lambda x, y: collections.Counter(x) == collections.Counter(y)
    
        # comparison
    tests = Test.objects.filter(question=question)
    for test in tests:
        test_choice_sizes = [int(choice.image.size) for choice in test.choices.all()]
        if compare(choice_sizes, test_choice_sizes):
            result['status'] = 'This test is identical to a previous one.'
            return HttpResponse(json.dumps(result))
        
    
    # Submission passed all checks, so create it!
    test = Test.objects.create(question=question)
    
    for key, f in request.FILES.items(): #@UnusedVariable        
        c = Choice(test=test)
        
        c.image.save(f.name, f, save=True)
        c.save()
        
    result['test'] = dict_test(test, key=True)
    
    if test.pk == 1:
        salt = str(Test.objects.get(pk=1).pub_date)
        response = HttpResponse(json.dumps(result))
        response.set_signed_cookie('chosen', json.dumps([]), salt=salt)
        return response
    
    return HttpResponse(json.dumps(result))

def vote(request):
    if request.method == "POST":
        return post_vote(request)
    else:
        return get_vote(request)

def get_vote(request):
    result = {'status' : 'OK'}
    
    salt = str(Test.objects.get(pk=1).pub_date)
    if not salt:
        result['status'] = 'ERROR'
        result['message'] = 'Internal error.'
        return HttpResponse(json.dumps(result))
    
    chosen = request.get_signed_cookie('chosen', default='[]', salt=salt)
    result['votes'] = get_votes_for_choices(json.loads(chosen))
    
    response = HttpResponse(json.dumps(result))
    response.set_signed_cookie('chosen', chosen, salt=salt)
    
    return response

@csrf_exempt
def post_vote(request):
    """User is voting on a test."""
    
    result = {'status' : 'OK'}
    
    if 'choice' not in request.POST: # make sure we have multiple choices
        result['status'] = 'ERROR'
        result['message'] = 'Need to choose to vote!'
        return HttpResponse(json.dumps(result))
    
    salt = str(Test.objects.get(pk=1).pub_date)
    if not salt:
        result['status'] = 'ERROR'
        result['message'] = 'Internal error.'
        return HttpResponse(json.dumps(result))
    
    silentFailure = False
    
    try:
        chosen = json.loads(request.get_signed_cookie('chosen', salt=salt))
    except BadSignature:
        silentFailure = True
        chosen = []
    
    choice_id = request.POST.get('choice')
    
    try:
        choice = Choice.objects.get(pk=choice_id)
    except Choice.DoesNotExist:
        result['status'] = 'ERROR'
        result['message'] = 'Choice not found.'
        return HttpResponse(json.dumps(result))
    
    test_ids = [c.id for c in choice.test.choices.all()]
    
    if set(test_ids) & set(chosen):
        result['status'] = 'FORBIDDEN'
        result['message'] = 'You voted on this already!'
        return HttpResponse(json.dumps(result))
    
    if not silentFailure:
        choice.votes += 1
        choice.save()
        result['votes'] = choice.votes
    else:
        result['votes'] = choice.votes + 1
    
    result['id'] = choice.id
    
    chosen.append(choice.id)
     
    response = HttpResponse(json.dumps(result))
    response.set_signed_cookie('chosen', json.dumps(chosen), salt=salt)
    
    return response