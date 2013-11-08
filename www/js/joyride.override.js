/**
 *
 *@Author - Eugene Mutai
 *@Twitter - JheneKnights
 *
 * Date: 6/10/13
 * Time: 11:14 AM
 * Description: This overrides the Joyride plug-in to the way I want it to work
 *
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/gpl-2.0.php
 *
 * Copyright (C) 2013
 * @Version -
 */


var joyRide = {
    //variable to override
    position: "left", //side the pointer should appear
    el: "joyRide-override",
    clone: $('.joyride-tip-guide'),
    tip_class: "span.joyride-nub", //the pointer of joyride, to animate it
    expose: '<div class="override-expose"></div>', //the div that will move around,
    exposeClass: '.override-expose',
    style: {display:"none", position: "fixed", top: 0, right: 0, zIndex: 8},
    showLimit: 3, //how many times to show joyride on appstart

    //passes the index to this to find the ELEMENT in question
    stepOnIt: function (index) {
        var id = null; var that = joyRide.el;
        $(that).children().each(function(a,b) {
            if(a == index) {
                if($(this).data('id')) {
                    joyRide.shiftGears($(this).data('id'))
                }
                else if($(this).data('show')) {
                    joyRide.shiftGears($(this).data('show'));
                }else{
                    //do nothing
                }
            }
        })
    },

    //EXPOSE THE ELEMENT AND DO THE ANIMATION
    shiftGears: function(id) {
        var el = $('#' + id);

        console.log(el);
        var offset = el.offset();
        var clone = el.clone();
        var dim = {width: el.width(), height: el.height()}
        var top = joyRide.style.top;

        if(dim.width > ($(window).width()/2) ) top = offset.top;

        clone.css({display:'block'}); //make sure the element dsnt inherit it's mother's hidden style

        //change and reposition the expose element
        $(joyRide.exposeClass)
            .empty() //empty and append new clone
            .append(clone)//resize it to the required size, animating it to the correct position
            .animate({left: offset.left, top: top, width: dim.width, height: dim.height}, 300)
            .show();

        //animate the tip
        $(joyRide.tip_class).css({display:'block'}).animate({right: offset.left + (dim.width/3)}, 400);
        $("html, body").animate({ scrollTop: 0}, 0);
    },

    //Load joyRide
    startJourney: function(el) {
        var joyride = false;
        joyRide.overRide(el); //initialise the override;
        //1st check if the app has ever been used before
        if(localStorage) {
            if(!localStorage.getItem('statusJoyRide')) {
                localStorage.setItem('statusJoyRide', '1');
                joyRide.rideOrDie(el)
            }else{
                if(parseInt(localStorage.getItem('statusJoyRide')) < joyRide.showLimit) {
                    var newValue = parseInt(localStorage.getItem('statusJoyRide')) + 1;
                    localStorage.setItem('statusJoyRide', newValue);
                    joyRide.rideOrDie(el)
                }else{
                    var newValue = parseInt(localStorage.getItem('statusJoyRide')) + 1;
                    localStorage.setItem('statusJoyRide', newValue);
                    joyRide.rideOrDie(el, false)
                }
            }
            console.log("The user has used the app before -- " + localStorage.getItem('statusJoyRide'))
        }
        else{
            if($.cookie('statusJoyRide') == null) {
                $.cookie('statusJoyRide', 1, { expires: 1000, path: '/' });
                joyRide.rideOrDie(el)
            }else{
                if(parseInt($.cookie('statusJoyRide')) < joyRide.showLimit) {
                    var newValue = parseInt($.cookie('statusJoyRide')) + 1;
                    $.cookie('statusJoyRide', newValue);
                    joyRide.rideOrDie(el);
                }else{
                    var newValue = parseInt($.cookie('statusJoyRide')) + 1;
                    $.cookie('statusJoyRide', newValue);
                    joyRide.rideOrDie(el, false)
                }
            }
        }
    },

    rideOrDie: function(el, bool) {
        var start = bool !== undefined ? bool : true;
        //To start USER INTRODUCTION
        $(el).joyride({
            autoStart: start, //if the user has ever seen it before just pause it or hide it
            preRideCallback: function(index, tip, clone) {
                console.log(index, tip, clone);
                joyRide.clone = clone;
            },
            preStepCallback: function(index, tip) {
                console.log(index, tip);
                joyRide.stepOnIt(index);
                $('.overlay').show('fast');
            },
            postRideCallback: function() {
                $('.overlay').hide('fast');
                joyRide.destroy();
            }
        })
    },

    //INITIALISE THIS OVER-RIDE
    overRide: function(element) {
        joyRide.el = element;
        $('body').append(joyRide.expose)
        setTimeout(function() {
            $(joyRide.exposeClass).css(joyRide.style);
            //load up the 1st element
            joyRide.stepOnIt(0);
        }, 0)
    },

    //Restore the system back to normal
    destroy: function() {
        $(joyRide.exposeClass).empty().hide();
        $(joyRide.tip_class).parent().hide();
        console.log("request to destroy over-ride received");
    }
}
