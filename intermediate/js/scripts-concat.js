window.log=function(){log.history=log.history||[];log.history.push(arguments);if(this.console){arguments.callee=arguments.callee.caller;console.log(Array.prototype.slice.call(arguments))}};(function(e){function h(){}for(var g="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),f;f=g.pop();){e[f]=e[f]||h}})(window.console=window.console||{});$.fn.ready(function(){var c=document,b=window,d="00952fa8399754a3a92a70c8b1157a5e";var a={callbacks:{play:function(e){$("#owl-"+e.id).removeClass("stopped").removeClass("buffering").addClass("playing")},pause:function(e){$("#owl-"+e.id).removeClass("playing").removeClass("buffering").addClass("stopped")}},render:function(e){return'<div id="owl-'+e.id+'" class="owl"></div>'},data:{}};$.getJSON("http://api.soundcloud.com/playlists/1362578.json?client_id="+d,function(e){var f=e.tracks.map(function(g){var h=new Audio();h.addEventListener("play",a.callbacks.play.bind(null,g),false);h.addEventListener("pause",a.callbacks.pause.bind(null,g),false);h.src=g.stream_url+"?client_id="+d;g.audio=h;a.data[g.id]=g;return a.render(g)}).join("");$("#main").html(f)})});window.log=function(){log.history=log.history||[];log.history.push(arguments);if(this.console){arguments.callee=arguments.callee.caller;console.log(Array.prototype.slice.call(arguments))}};(function(e){function h(){}for(var g="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),f;f=g.pop();){e[f]=e[f]||h}})(window.console=window.console||{});