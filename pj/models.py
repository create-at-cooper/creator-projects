from django.contrib.auth.models import User
from django.db import models
from django.db.models.fields.files import ImageField
from django.db.models.signals import post_save
from django.template.defaultfilters import slugify

class Project(models.Model):
    title = models.CharField(max_length=140)
    created = models.DateTimeField('date published', auto_now_add=True)
    created_by = models.ForeignKey(User)
    tags = models.ManyToManyField('Tag', blank=True)
    slug = models.SlugField(blank=True)
    description = models.TextField(blank=True)
    
    members = models.ManyToManyField('Member', related_name='projects', null=True, blank=True)
    
    period = models.CharField(max_length=100, blank=True, null=True)
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    
    def save(self, *args, **kwargs):
        self.slug = slugify(self.title)[:50]
        super(Project, self).save(*args, **kwargs)
    
    def get_absolute_url(self):
        return "/project/%s/" % self.slug
    
    def __unicode__(self):
        return u"%s" % (self.title, )

class Member(models.Model):
    # we need some way of aggregating members
    user = models.ForeignKey(User, related_name='memberships', blank=True, null=True)
    name = models.CharField(max_length=140)
    # this could be email/website/twitter/linkedin
    contact_info = models.CharField(max_length=256)
    
    def __unicode__(self):
        return u"%s (%s)" % (self.name, self.contact_info)
    
class UserProfile(models.Model):
    user = models.OneToOneField(User)
    bio = models.TextField(blank=True)
    
    def __unicode__(self):
        return u"%s's profile" % (self.user.username, )
    
class Tag(models.Model):
    name = models.CharField(max_length=30)
    
    def __unicode__(self):
        return u'%s' % (self.name, )

class Image(models.Model):
    project = models.ForeignKey(Project, related_name="images")
    image = ImageField(upload_to="images")
    
    def __unicode__(self):
        return u"%s: %s" % (self.project.title, self.image.name)
    
def create_profile(sender, **kw):
    """Creates a user profile for each user (if they don't have one already)."""
    user = kw["instance"]
    if kw["created"]:
        profile = UserProfile(user=user)
        profile.save()

post_save.connect(create_profile, sender=User, dispatch_uid="users-profilecreation-signal")