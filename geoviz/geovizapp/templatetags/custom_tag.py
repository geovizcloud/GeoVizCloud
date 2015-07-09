from django import template
register = template.Library()
from django.conf import settings

@register.simple_tag
def setting(name):
    return str(settings.__getattr__(name))