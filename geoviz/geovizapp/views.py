from django.shortcuts import render_to_response, get_object_or_404, redirect
from django.http import HttpResponse, HttpResponseRedirect, StreamingHttpResponse
from django.template import RequestContext
from django.db import models

# Import from general utilities
from util import *
from shutil import copyfile

# Import from app
from geoviz.settings import ROOT_APP_URL, STORAGE_ROOTPATH, STATIC_URL
from geovizapp.models import *

# imports for starcluster
import starcluster
from starcluster.config import StarClusterConfig
from starcluster.cluster import ClusterManager

# import for merge image
from PIL import Image

'''-----------------------
Home Page
-----------------------'''
# App Page
@render_to("geovizapp/geovizcloud.html")
def geovizcloud(request):
    varlist = json.dumps(["acp","hgt","alp"])
    var3dlist = json.dumps(["delt","dl","sc","dd","dw","dflx"])
    var3dlistflow = json.dumps(["uh,vh","zhyb","omg","rr","dc"])
    return {"varlist":varlist,"var3dlist":var3dlist,"var3dlistflow":var3dlistflow}

# Home page
@render_to("geovizapp/home.html")
def home(request):
    varlist = json.dumps(["acp","hgt","alp"])
    var3dlist = json.dumps(["delt","dl","sc","dd","dw","dflx"])
    var3dlistflow = json.dumps(["uh,vh","zhyb","omg","rr","dc"])
    return {"varlist":varlist,"var3dlist":var3dlist,"var3dlistflow":var3dlistflow}

# Run Test page
@render_to("geovizapp/runtest.html")
def runtest(request):
    varlist = json.dumps(["acp","hgt","alp"])
    var3dlist = json.dumps(["delt","dl","sc","dd","dw","dflx"])
    var3dlistflow = json.dumps(["uh,vh","zhyb","omg","rr","dc"])
    return {"varlist":varlist,"var3dlist":var3dlist,"var3dlistflow":var3dlistflow}



class NCVRImage:
    def __init__(self, filepath=""):
        self.filepath = filepath

    ##create an image based on the intersection
    ##given a folder that saves the images, merge images, and delete original images
    def MergeImageFromFolder(self, folderpath, finalimage, width, height, iso=False):
        list = os.listdir(folderpath)
        imgbase = Image.new("RGBA", (width, height))
        imgbase.save(finalimage, "PNG")
        for everyfile in list:
            img = Image.open(folderpath+everyfile)
            imgsize = everyfile.split("_")
            if iso==True:
                ##[w1, viewconfig.height-h2, w2, viewconfig.height-h1]
                imgbase.paste(img,(int(imgsize[0]),int(height)-int(imgsize[3].split(".")[0]),int(imgsize[2]),int(height) -int(imgsize[1]) )) ## left upper right lower
            else:
                imgbase.paste(img,(int(imgsize[0]),int(imgsize[1]),int(imgsize[2]),int(imgsize[3].split(".")[0]))) ## left upper right lower
            os.remove(folderpath+"/"+everyfile)
        imgbase.save(finalimage, "PNG")
        ##delete previous file

def writeconfig_ray(request):
    if request.method == 'POST':
        config_txt = request.POST["configtxt"]
        root_path = STORAGE_ROOTPATH
        wwconfig_path = root_path + "wwconfig.txt"
        with open(wwconfig_path,'wb') as f:
            f.write(config_txt)

        conf_new_path = root_path+ "config"
        cfg = StarClusterConfig(conf_new_path)
        cfg.load()
        cluster = cfg.get_cluster_template("geovizcluster")

        tasknum = int(request.POST["tasknum"])
        gpunum = math.sqrt(tasknum)
        datafile = "data/"+request.POST["datafile"]
        varname = "dd"
        if request.POST["varname3d"] and request.POST["varname3d"] != "":
            varname = request.POST["varname3d"]
        intrange = 80
        curtime = 8
        if request.POST["curtime"] and request.POST["curtime"] != "":
            curtime = int(request.POST["curtime"])

        w,h = int(request.POST["wwwidth"]),int(request.POST["wwheight"])
        wdiv,hdiv = w/gpunum,h/gpunum

        #node_alias_list = []
        img_list = []

        for index,node in enumerate(cluster.nodes):
            #node_alias_list.append(node.alias)
            # send wwconfig file   
            #local_config_path = "/home/bitnami/apps/django/django_projects/geoviz/geoviz/geovizapp/static/data/wwconfig.txt"
            local_config_path = wwconfig_path
            remote_config_path = "/home/ubuntu/CollabViz/wwconfig.txt"
            node.ssh.switch_user("ubuntu")
            node.ssh.put(local_config_path,remote_config_path)

            imgoutpath = "image/sub/"
            remote_root_path = "/home/ubuntu/CollabViz/"
            remote_img_path = remote_root_path + imgoutpath

            tmp_imgs = []
            eachround = int(math.ceil(tasknum*1.0/gpunum))
            for i in range(index*eachround,(index+1)*eachround):
                if i < tasknum:
                    curgpu = i
                    wrange, hrange = int(i/gpunum),int(i%gpunum)
                    w1,h1 = int(wrange*wdiv),int(hrange*hdiv)
                    w2,h2 = int((wrange+1)*wdiv),int((hrange+1)*hdiv)
                    tmp_imgs.append("%d_%d_%d_%d.png" % (w1,h1,w2,h2))
            img_list.append(tmp_imgs)

            cmd = "sudo /home/ubuntu/anaconda/bin/python %s%s %d %d %d %s %s %d %d" % (remote_root_path,"NetCDFCUDARayCasting.py",tasknum,gpunum,index,datafile,varname,intrange,curtime)
            node.ssh.execute(cmd,source_profile=False,detach=True)

        local_img_path = root_path+"img/sub/"
        for index,node in enumerate(cluster.nodes):
            for img in img_list[index]:
                img_get = False
                img_get_path = remote_img_path + img
                while not img_get:
                    if node.ssh.isfile(img_get_path):
                        node.ssh.get(img_get_path,local_img_path+img)
                        img_get = True
                        cmd = "sudo rm %s" % img_get_path
                        node.ssh.execute(cmd,source_profile=False,detach=True)

        ncvrimage = NCVRImage(filepath=local_img_path)
        final_ray_img_file = "ray_%s.png" % datetime.datetime.now().strftime('%Y%m%d%H%H%M%S')
        final_ray_img_file_path = root_path + "img/" + final_ray_img_file
        ncvrimage.MergeImageFromFolder(local_img_path,final_ray_img_file_path,w,h)

        response_data = {"newimgfile":final_ray_img_file}
        return HttpResponse(json.dumps(response_data),content_type="application/json")

def writeconfig_iso(request):
    if request.method == 'POST':
        config_txt = request.POST["configtxt"]
        root_path = STORAGE_ROOTPATH
        wwconfig_path = root_path + "wwconfig.txt"
        with open(wwconfig_path,'wb') as f:
            f.write(config_txt)

        conf_new_path = root_path+ "config"
        cfg = StarClusterConfig(conf_new_path)
        cfg.load()
        cluster = cfg.get_cluster_template("geovizcluster")

        tasknum = int(request.POST["tasknum"])
        gpunum = math.sqrt(tasknum)
        datafile = "data/"+request.POST["datafile"]
        varname = "dd"
        if request.POST["varname3d"] and request.POST["varname3d"] != "":
            varname = request.POST["varname3d"]
        intrange = 40
        curtime = 8
        if request.POST["curtime"] and request.POST["curtime"] != "":
            curtime = int(request.POST["curtime"])
        isovale = 0.0000001
        if request.POST["isovalue"] and request.POST["isovalue"] != "":
            isovalue = float(request.POST["isovalue"])

        w,h = int(request.POST["wwwidth"]),int(request.POST["wwheight"])
        wdiv,hdiv = w/gpunum,h/gpunum

        #node_alias_list = []
        img_list = []

        for index,node in enumerate(cluster.nodes):
            #node_alias_list.append(node.alias)
            # send wwconfig file   
            #local_config_path = "/home/bitnami/apps/django/django_projects/geoviz/geoviz/geovizapp/static/data/wwconfig.txt"
            local_config_path = wwconfig_path
            remote_config_path = "/home/ubuntu/CollabViz/wwconfig.txt"
            node.ssh.switch_user("ubuntu")
            node.ssh.put(local_config_path,remote_config_path)

            imgoutpath = "image/sub/"
            remote_root_path = "/home/ubuntu/CollabViz/"
            remote_img_path = remote_root_path + imgoutpath

            tmp_imgs = []
            eachround = int(math.ceil(tasknum*1.0/gpunum))
            for i in range(index*eachround,(index+1)*eachround):
                if i < tasknum:
                    curgpu = i
                    wrange, hrange = int(i/gpunum),int(i%gpunum)
                    w1,h1 = int(wrange*wdiv),int(hrange*hdiv)
                    w2,h2 = int((wrange+1)*wdiv),int((hrange+1)*hdiv)
                    tmp_imgs.append("%d_%d_%d_%d.png" % (w1,h1,w2,h2))
            img_list.append(tmp_imgs)

            cmd = "sudo DISPLAY=:1 /home/ubuntu/anaconda/bin/python %s%s %d %d %d %s %s %d %d %f" % (remote_root_path,"NetCDFCUDAIsosurface.py",tasknum,gpunum,index,datafile,varname,intrange,curtime,isovale)
            node.ssh.execute(cmd,source_profile=False,detach=True)

        local_img_path = root_path+"img/sub/"
        for index,node in enumerate(cluster.nodes):
            for img in img_list[index]:
                img_get = False
                img_get_path = remote_img_path + img
                while not img_get:
                    if node.ssh.isfile(img_get_path):
                        node.ssh.get(img_get_path,local_img_path+img)
                        imgstatinfo = os.stat(local_img_path+img)
                        if imgstatinfo.st_size > 0:
                            img_get = True
                            cmd = "sudo rm %s" % img_get_path
                            node.ssh.execute(cmd,source_profile=False,detach=True)

        ncvrimage = NCVRImage(filepath=local_img_path)
        final_iso_img_file = "iso_%s.png" % datetime.datetime.now().strftime('%Y%m%d%H%H%M%S')
        final_iso_img_file_path = root_path + "img/" + final_iso_img_file
        ncvrimage.MergeImageFromFolder(local_img_path,final_iso_img_file_path,w,h,iso=True)

        response_data = {"newimgfile":final_iso_img_file}
        return HttpResponse(json.dumps(response_data),content_type="application/json")

def writeconfig_iso_animation(request):
    if request.method == 'POST':
        config_txt = request.POST["configtxt"]
        root_path = STORAGE_ROOTPATH
        wwconfig_path = root_path + "wwconfig.txt"
        with open(wwconfig_path,'wb') as f:
            f.write(config_txt)

        conf_new_path = root_path+ "config"
        cfg = StarClusterConfig(conf_new_path)
        cfg.load()
        cluster = cfg.get_cluster_template("geovizcluster")

        tasknum = int(request.POST["tasknum"])
        gpunum = math.sqrt(tasknum)
        datafile = "data/"+request.POST["datafile"]
        varname = "dd"
        if request.POST["varname3d"] and request.POST["varname3d"] != "":
            varname = request.POST["varname3d"]
        intrange = 40
        vartime = 25
        isovale = 0.0000001
        if request.POST["isovalue"] and request.POST["isovalue"] != "":
            isovalue = float(request.POST["isovalue"])

        w,h = int(request.POST["wwwidth"]),int(request.POST["wwheight"])
        wdiv,hdiv = w/gpunum,h/gpunum

        #node_alias_list = []

        response_final_iso_img_file = "iso_%s" % datetime.datetime.now().strftime('%Y%m%d%H%H%M%S')

        for t in range(vartime):

            img_list = []

            for index,node in enumerate(cluster.nodes):
                #node_alias_list.append(node.alias)
                # send wwconfig file   
                #local_config_path = "/home/bitnami/apps/django/django_projects/geoviz/geoviz/geovizapp/static/data/wwconfig.txt"
                local_config_path = wwconfig_path
                remote_config_path = "/home/ubuntu/CollabViz/wwconfig.txt"
                node.ssh.switch_user("ubuntu")
                node.ssh.put(local_config_path,remote_config_path)

                imgoutpath = "image/sub/"
                remote_root_path = "/home/ubuntu/CollabViz/"
                remote_img_path = remote_root_path + imgoutpath

                tmp_imgs = []
                eachround = int(math.ceil(tasknum*1.0/gpunum))
                for i in range(index*eachround,(index+1)*eachround):
                    if i < tasknum:
                        curgpu = i
                        wrange, hrange = int(i/gpunum),int(i%gpunum)
                        w1,h1 = int(wrange*wdiv),int(hrange*hdiv)
                        w2,h2 = int((wrange+1)*wdiv),int((hrange+1)*hdiv)
                        tmp_imgs.append("%d_%d_%d_%d.png" % (w1,h1,w2,h2))
                img_list.append(tmp_imgs)

                cmd = "sudo DISPLAY=:1 /home/ubuntu/anaconda/bin/python %s%s %d %d %d %s %s %d %d %f" % (remote_root_path,"NetCDFCUDAIsosurface.py",tasknum,gpunum,index,datafile,varname,intrange,t,isovale)
                node.ssh.execute(cmd,source_profile=False,detach=True)

            local_img_path = root_path+"img/sub/"
            for index,node in enumerate(cluster.nodes):
                for img in img_list[index]:
                    img_get = False
                    img_get_path = remote_img_path + img
                    while not img_get:
                        if node.ssh.isfile(img_get_path):
                            node.ssh.get(img_get_path,local_img_path+img)
                            imgstatinfo = os.stat(local_img_path+img)
                            if imgstatinfo.st_size > 0:
                                img_get = True
                                cmd = "sudo rm %s" % img_get_path
                                node.ssh.execute(cmd,source_profile=False,detach=True)

            ncvrimage = NCVRImage(filepath=local_img_path)
            final_iso_img_file = "%s_%d.png" % (response_final_iso_img_file,t)
            final_iso_img_file_path = root_path + "img/" + final_iso_img_file
            ncvrimage.MergeImageFromFolder(local_img_path,final_iso_img_file_path,w,h,iso=True)

        response_data = {"newimgfile":response_final_iso_img_file}
        return HttpResponse(json.dumps(response_data),content_type="application/json")

def writeconfig_flow(request):
    if request.method == 'POST':
        config_txt = request.POST["configtxt"]
        root_path = STORAGE_ROOTPATH
        wwconfig_path = root_path + "wwconfig.txt"
        with open(wwconfig_path,'wb') as f:
            f.write(config_txt)

        conf_new_path = root_path+ "config"
        cfg = StarClusterConfig(conf_new_path)
        cfg.load()
        cluster = cfg.get_cluster_template("geovizcluster")

        tasknum = int(request.POST["tasknum"])
        gpunum = math.sqrt(tasknum)
        datafile = "data/"+request.POST["datafile"]
        varname1,varname2 = "uh","vh"
        if request.POST["varnameflow"] and request.POST["varnameflow"] != "":
            varnameflow = request.POST["varnameflow"].split(",")
            varname1,varname2 = varnameflow[0],varnameflow[1]
        intrange = 80
        tseq = 8
        if request.POST["tseq"] and request.POST["tseq"] != "":
            curtime = int(request.POST["tseq"])
        colorselect = "ocean"
        if request.POST["colorselect"] and request.POST["colorselect"] != "":
            colorselect = request.POST["colorselect"]
        totalclass = 20
        if request.POST["totalclass"] and request.POST["totalclass"] != "":
            totalclass = int(request.POST["totalclass"])
            
        w,h = int(request.POST["wwwidth"]),int(request.POST["wwheight"])
        wdiv,hdiv = w/gpunum,h/gpunum

        #node_alias_list = []
        img_list = []

        for index,node in enumerate(cluster.nodes):
            #node_alias_list.append(node.alias)
            # send wwconfig file   
            #local_config_path = "/home/bitnami/apps/django/django_projects/geoviz/geoviz/geovizapp/static/data/wwconfig.txt"
            local_config_path = wwconfig_path
            remote_config_path = "/home/ubuntu/CollabViz/wwconfig.txt"
            node.ssh.switch_user("ubuntu")
            node.ssh.put(local_config_path,remote_config_path)

            imgoutpath = "image/"
            remote_root_path = "/home/ubuntu/CollabViz/"
            remote_img_path = remote_root_path + imgoutpath

            tmp_imgs = []
            for i in range(index*tasknum/gpunum,(index+1)*tasknum/gpunum):
                tmp_imgs.append("flowgpu%d.png" % i)
            tmp_imgs.append("legend.png")
            img_list.append(tmp_imgs)

            cmd = "sudo DISPLAY=:1 /home/ubuntu/anaconda/bin/python %s%s %d %d %d %s %s %s %d %s %d" % (remote_root_path,"NetCDFCUDAFlow.py",tasknum,gpunum,index,datafile,varname1,varname2,tseq,colorselect,totalclass)
            node.ssh.execute(cmd,source_profile=False,detach=True)

        local_img_path = root_path+"img/sub/"
        for index,node in enumerate(cluster.nodes):
            for img in img_list[index]:
                img_get = False
                img_get_path = remote_img_path + img
                while not img_get:
                    if node.ssh.isfile(img_get_path):
                        node.ssh.get(img_get_path,local_img_path+img)
                        img_get = True
                        cmd = "sudo rm %s" % img_get_path
                        node.ssh.execute(cmd,source_profile=False,detach=True)

        ncvrimage = NCVRImage(filepath=local_img_path)
        final_flow_img_file = "flow_%s.png" % datetime.datetime.now().strftime('%Y%m%d%H%H%M%S')
        final_flow_img_file_path = root_path + "img/" + final_flow_img_file
        ncvrimage.MergeImageFromFolder(local_img_path,final_flow_img_file_path,w,h)

        response_data = {"newimgfile":final_flow_img_file}
        return HttpResponse(json.dumps(response_data),content_type="application/json")

@render_to("geovizapp/home.html")
def start_cluster(request):
    gpunum = request.POST["gpunum"]
    cluster_size = int(math.sqrt(int(gpunum)))
    varlist = json.dumps(["acp","hgt","alp"])
    var3dlist = json.dumps(["delt","dl","sc","dd","dw","dflx"])
    var3dlistflow = json.dumps(["uh,vh","zhyb","omg","rr","dc"])
    
    root_path = STORAGE_ROOTPATH  # use this for server
#    root_path = "C:/QLiu/RemoteVizNow/NOW_geoviz/" # use this for localhost
    conf_template_path = root_path + "config_template"
    conf_new_path = root_path+ "config"
    
    with open(conf_template_path,'r') as f:
        conf_template = f.read()
    
    new_conf = conf_template.replace("[MY_CLUSTER_SIZE]",str(cluster_size))
    
    with open(conf_new_path,'wb') as f:
        f.write(new_conf)
        
    cfg = StarClusterConfig(conf_new_path)
    cfg.load()
    cluster = cfg.get_cluster_template("geovizcluster")
    try:
        cluster.start()
    except Exception as e:
        print e

    while not cluster.is_cluster_up():
        sleep(10)

    for node in cluster.nodes:
        cmd = "sudo /usr/bin/X :1 && screen"
        node.ssh.execute(cmd,source_profile=False,detach=True)
    
    return {
            "varlist":varlist,
            "var3dlist":var3dlist,
            "var3dlistflow":var3dlistflow,
            "startcluster":"yes",
            "region":"1",
            "instancetype":"1",
            "gpunum":gpunum,
            }
            
@render_to("geovizapp/home.html")
def terminate_cluster(request):
    gpunum = request.POST["gpunum"]
    varlist = json.dumps(["acp","hgt","alp"])
    var3dlist = json.dumps(["delt","dl","sc","dd","dw","dflx"])
    var3dlistflow = json.dumps(["uh,vh","zhyb","omg","rr","dc"])

    root_path = STORAGE_ROOTPATH  # use this for server
#    root_path = "C:/QLiu/RemoteVizNow/NOW_geoviz/" # use this for localhost
    conf_new_path = root_path+ "config"

    cfg = StarClusterConfig(conf_new_path)
    cfg.load()
    cluster = cfg.get_cluster_template("geovizcluster")
    try:
        cluster.terminate_cluster(force=True)
    except:
        cluster.terminate_cluster(force=True)

    return {
            "varlist":varlist,
            "var3dlist":var3dlist,
            "var3dlistflow":var3dlistflow,
            "terminatecluster":"yes",
            }
