'''
Created on Apr 20, 2012

@author: Eric
'''
from django.contrib import admin
from pj.models import Project, Image, Tag, Member

class ImageInline(admin.TabularInline):
    model = Image
class TagInline(admin.TabularInline):
    model = Tag
class MemberInline(admin.TabularInline):
    model = Member

class ProjectAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}
    
    inlines = [
               ImageInline, 
               TagInline,
               MemberInline
               ]

class ImageAdmin(admin.ModelAdmin):
    pass

class TagAdmin(admin.ModelAdmin):
    pass

class MemberAdmin(admin.ModelAdmin):
    pass

admin.site.register(Project, ProjectAdmin)
admin.site.register(Image, ImageAdmin)
admin.site.register(Tag, TagAdmin)
admin.site.register(Member, TagAdmin)