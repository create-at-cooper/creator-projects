'''
Created on Apr 20, 2012

@author: Eric
'''
from django.contrib import admin
from pj.models import Project, Image, Tag, Member

class ImageInline(admin.TabularInline):
    model = Image
class MemberInline(admin.TabularInline):
    model = Project.members.through #@UndefinedVariable

class ProjectAdmin(admin.ModelAdmin):
    prepopulated_fields = {"slug": ("title",)}
    
    inlines = [
               ImageInline, 
               MemberInline
               ]
    
    exclude = ('members', )
    
    list_display = ('title', 'created', 'created_by')
    list_filter = ('created', 'created_by')
    
    search_fields = ['title', 'description', 'created_by', 'members__name', 'tags__name']

class ImageAdmin(admin.ModelAdmin):
    list_display = ('project', 'image')
    list_filter = ('project', )
    
    search_fields = ['project__title', 'image']

class TagAdmin(admin.ModelAdmin):
    list_display = ('name', )
    search_fields = ['name']

class MemberAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_info', 'user')
    list_display_links = ('name', 'user')
    list_editable = ('contact_info', )
    
    search_fields = ['name', 'contact_info', 'user__username', 'user__email']

admin.site.register(Project, ProjectAdmin)
admin.site.register(Image, ImageAdmin)
admin.site.register(Tag, TagAdmin)
admin.site.register(Member, MemberAdmin)