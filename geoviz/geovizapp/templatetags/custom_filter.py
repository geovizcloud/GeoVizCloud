"""=============================================================================
custom_filter.py

Custom filter for Django template
============================================================================="""
from django import template
from django.contrib.auth.models import Group
register = template.Library()

@register.filter(name='replace')
def replace(value,arg):
    str = arg.split(",")
    return value.replace(str[0],str[1])

@register.filter(name='has_group')
def has_group(user, group_name):
    try:
        group = Group.objects.get(name=group_name)
        return True if group in user.groups.all() else False
    except:
        return False