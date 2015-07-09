"""=============================================================================
util.py

General Unilities for the Web App
============================================================================="""
# =========
#  Imports  
# =========
# ---------------
# Python Imports
# ---------------
import csv
import datetime
import json
import operator
import re # Regular Expression operations
import StringIO
import sys,os
import tempfile,zipfile
import base64
import collections

# ---------------
# Django Imports
# ---------------
from django.conf import settings
from django.core.servers.basehttp import FileWrapper # Wrap large files for zip download
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseForbidden
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.db.models.loading import get_model
from django.template.defaultfilters import slugify
from django.contrib import admin

# --------------------
# Application Imports
# --------------------
## Settings attributes

# =================
# GLOBAL VARIABLES 
# =================

# ===========
# Decorators
# ===========
# 'render_to', 
# 'HumanReadableSize', 'GetDirSize', 'GetFileSize', 'GetShapefileSize',
# 'CleanNullValue',
# 'HasPermission',
#============================================================================
# render_to Decorator to save time returning templates
def render_to(template):
    """
    Decorator for Django views that sends returned dict to render_to_response 
    function with given template and RequestContext as context instance.

    If view doesn't return dict then decorator simply returns output.
    Additionally view can return two-tuple, which must contain dict as first
    element and string with template name as second. This string will
    override template name, given as parameter

    Parameters:

     - template: template name to use
    """
    def renderer(func):
        def wrapper(request, *args, **kw):
            output = func(request, *args, **kw)
            if isinstance(output, (list, tuple)):
                return render_to_response(output[1], output[0], RequestContext(request))
            elif isinstance(output, dict):
                return render_to_response(template, output, RequestContext(request))
            return output
        return wrapper
    return renderer

# Check user permissions
def HasPermission(user,app,perm,model):
    return user.has_perm('%s.%s_%s' % (app,perm,model))