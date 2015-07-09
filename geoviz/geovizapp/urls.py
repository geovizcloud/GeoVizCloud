from django.conf.urls import patterns, include, url
from django.conf import settings
from django.contrib.auth.views import logout

# Uncomment the next two lines to enable the admin:
#from django.contrib import admin
#admin.autodiscover()

urlpatterns = patterns('geovizapp.views',
	# Home page URL
	url(r'^home/$','home'),
        url(r'^geovizcloud/$','geovizcloud'),
        url(r'^runtest/$','runtest'),

        # Write Config
	url(r'writeconfig_ray/$','writeconfig_ray'),
        url(r'writeconfig_iso/$','writeconfig_iso'),
        url(r'writeconfig_iso/animation/$','writeconfig_iso_animation'),
        url(r'writeconfig_flow/$','writeconfig_flow'),
	
	# Start Cluster
	url(r'startcluster/$','start_cluster'),
	url(r'terminatecluster/$','terminate_cluster'),
)
