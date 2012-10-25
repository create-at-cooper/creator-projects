from django.conf import settings
from django.conf.urls import patterns, include, url
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth.views import login
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.generic.base import TemplateView
from pj.views import project, member, tag, api_login, api_logout,\
    redirect_logout

# Uncomment the next two lines to enable the admin:
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'projects.views.home', name='home'),
    # url(r'^projects/', include('projects.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),

    url(r'^$', TemplateView.as_view(template_name='index.html'), name='home'),
    
    url(r'^login', login, name='login'),
    url(r'^logout', redirect_logout, name='logout'),
    
    url(r'^api/login$', api_login),
    url(r'^api/logout$', api_logout),
    url(r'^api/project$', project),
    url(r'^api/member$', member),
    url(r'^api/tag$', tag),
)

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns() + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)