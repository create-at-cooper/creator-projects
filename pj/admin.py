'''
Created on Apr 20, 2012

@author: Eric
'''
from django.contrib import admin
from pj.models import Project, Image, Tag

class ProjectAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}
    
class ImageAdmin(admin.ModelAdmin):
    pass

class TagAdmin(admin.ModelAdmin):
    pass

admin.site.register(Project, ProjectAdmin)
admin.site.register(Image, ImageAdmin)
admin.site.register(Tag, TagAdmin)