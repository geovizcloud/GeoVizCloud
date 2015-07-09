endTour = function() {
    hopscotch.endTour()
}

var featureTour = {
    id: "tour-on-load",
    showPrevButton : "",
	showNextButton : "",
    steps:[
        {// Step 1
            target: "sel-region",
            placement: "left",
            title: "",
            content: "To get started,<br/> \
                      select a server region.",
            xOffset: "-25px",
			yOffset: "center",
            arrowOffset: "center",
            //showCTAButton: "true",
            //ctaLabel: "Skip Tutorial",
            //onCTA: endTour,
			width: "200px",
        },
        {// Step 2
            title: "",
            content: "Configure the server machine",
            target: "sel-machineconf",
            placement: "left",
			xOffset: "-120px",
            yOffset: "center",
            arrowOffset: "center",
        },
        {// Step 3
            title: "",
            content: "Select number of processors",
            target: "sel-numprocessor",
			xOffset: "-172px",
            placement: "left",
            yOffset: "center",
            arrowOffset: "center",
        },
        {// Step 4
            title: "",
            content: "Click to start visualization application",
            target: "btn-startapp",
            placement: "left",
			xOffset: "-10px",
            yOffset: "center",
            arrowOffset: "center",
        }, 
        {// Step 5
            title: "",
            content: "Select the data to visualize.",
            target: "sel-datafile",
            placement: "left",
			xOffset: "-95px",
            yOffset: "center",
            arrowOffset: "center",
        },
		{// Step 6
            title: "",
            content: "Click to load the data for visualization.",
            target: "btn-submitdata",
            placement: "left",
			xOffset: "-10px",
            yOffset: "center",
            arrowOffset: "center",
        },
		{// Step 7
            title: "",
            content: "Set display properties here.",
            target: "panel-dataprop",
            placement: "right",
			xOffset: "25px",
            yOffset: "center",
            arrowOffset: "center",
        },
    ]
};

hopscotch.startTour(featureTour);

//endTour = function() {
//    hopscotch.startTour(featureTour);
////    hopscotch.endTour()
//}
//
//init = function() {
//  var startBtnId = 'feature-helpbtn',
//      calloutId = 'startTourCallout',
//      mgr = hopscotch.getCalloutManager(),
//      state = hopscotch.getState();
//
//  if (state && state.indexOf('tour-on-load:') === 0) {
//    // Already started the tour at some point!
//    hopscotch.startTour(featureTour);
//  }
//  else {
//    // Looking at the page for the first(?) time.
//    setTimeout(function() {
//      mgr.createCallout({
//        id: calloutId,
//        target: "feature-helpbtn",
//        placement: "left",
//        title: "Welcome to Private Security Monitor website",
//        content: "Click help button <img src='assets/img/icon_help.png' style='height:20px;width:20px;'/> to take a short tutorial of website features.<br/>Close the pop-up window to quit the tutorial at any step.",
//        yOffset: "center",
//        arrowOffset: "center",        
//        bubbleWidth: "400",
//        bubblePadding: "20",
//        showCTAButton: "true",
//        ctaLabel:"Start Tutorial",
//        onCTA: endTour,
//      });
//    }, 1000);
//  }
//};
//
//init();