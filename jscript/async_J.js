define([],function(){
	/* a proper implementation of the Promises/A+ spec. */
	
	//see http://promises-aplus.github.io/promises-spec/ for details
	
	//a promise is an object which has a .then(onFulfilled, onRejected) method, which returns a new promise.
	
	var PENDING=0,RESOLVED=1,REJECTED=2;
	
	nextTick=window.setImmediate?window.setImmediate.bind(window):function(cb){setTimeout(cb,0);};

	var console={log:function(){}};
	
	var nextID=0;
	
	function promise(){
		var me=this;
		var id=nextID++;
		console.log("promise ",id," created");
		
		var callbacks={fullfilled:[],rejected:[],next:[]};
		var status=PENDING;
		var resolvedValue;
		var rejectedReason;
		
		this.always=function(onAlways){
			return me.then(onAlways,onAlways);
		}

		this.then=function(onFulfilled, onRejected){
			console.log(id,"creating next");
			var next=new promise();

			//if (onFulfilled && (typeof onFulfilled)=='function'){
			callbacks.fullfilled.push(ensurePromising(onFulfilled,next,"resolve"));
			//}
			//if (onRejected && (typeof onRejected)=='function') 
					
			callbacks.rejected.push(ensurePromising(onRejected,next,"reject"));

			if (status!=PENDING)
			{
				fulfillNextTick();
				
//				if (status==REJECTED) next.reject(rejectedReason);
//				else if (status==RESOLVED) next.resolve(resolvedValue);
			
			}
			return next.restricted;
//			return me;
		};
		
		this.restricted={then:this.then,always:this.always};
		
		this.reject=function(rejectReason){
			console.log("promise ",id," rejected('",rejectReason,"')");
			status=REJECTED;
			rejectedReason=rejectReason;
			me.reject=function(){console.log(id,"rerejected?!"); throw "OW";}
			me.resolve=function(){console.log(id,"reresolved?!"); throw "OW";}
//			delete this.reject;
//			delete this.resolve;
			fulfillNextTick();
		};
		
		this.resolve=function(resolveValue){
			console.log("promise ",id," resolved('",resolveValue,"')");
			status=RESOLVED;
			resolvedValue=resolveValue;
			me.reject=function(){console.log(id,"rerejected?!");throw "OW";}
			me.resolve=function(){console.log(id,"reresolved?!");throw "OW";}
//			delete this.reject;
//			delete this.resolve;
			fulfillNextTick();
		}
		
		//3.2.6.1 if either returns a value that is not a promise, promise2 (here called next)
		//must be fulfilled with that value
		//3.2.6.2 if either throws an exception, promise2 must be rejected with the thrown exception as the reason
		//3.2.6.3 if either returns a promise, promise 2 must assume the state of the returned promise
		function ensurePromising(F,next,defaultMethod){
			//we want to make sure all our 'then's return promises.  all non promise values are wrapped in a fresh promise, 
			//all thrown exceptions cause the promise to be rejected.
			console.log(id,"ensurePromising",F,next,defaultMethod);
			return function(val){
				var Fret;
				try{
//					console.log("callback",id);
					if (F && typeof(F)=="function") 
					{
						Fret=F(val);
						if (Fret && Fret.then && typeof(Fret.then)=="function") 
							Fret.then(next.resolve.bind(next),next.reject.bind(next));  //3.2.6.3
						else 
							next.resolve(Fret);   //3.2.6.1
					}
					else
					{
						console.log("default->"+defaultMethod);
						next[defaultMethod](val);  //3.2.6.4 and 3.2.6.5
					}
				}
				catch(x){
					next.reject(x); //3.2.6.2
				}
			}
				
		}
		
		function emptyWith(arr,val){
			while (arr.length){
				var F=arr.shift();
				F(val);
			}
		}
		
		function fulfillNextTick(){
			nextTick(function(){
				if (status==REJECTED) {
					console.log("empty reject");
					emptyWith(callbacks.rejected,rejectedReason);
				}
				else {
					emptyWith(callbacks.fullfilled,resolvedValue);
				}
			});
		}
		
	}
	
	function getThen(possiblePromise){
		//if possiblePromise has a then(), return that.  otherwise, create a resolved promise
		if (possiblePromise && possiblePromise.then && typeof(possiblePromise.then)=="function") return possiblePromise;
		var ret=new promise();
		ret.resolve(possiblePromise);
		return ret;
	}

	function all(){
		//resolves [resolved promise values] if all its arguments resolve, rejects otherwise.
		//ex: all(promisedA,promisedB,promisedC) -> [A,B,C] or rejected
		//first reject out is rejectionReason
		var allArgs=arguments;
		var ret=new promise();
		var ignoreReject=false,resolved=0;
		var combined=[];

		if (Array.isArray(allArgs[0])) allArgs=allArgs[0];
		
		if (allArgs.length==0)
		    {
			ret.resolve([]);
		    }
		else
		    {
			allArgs.forEach(function(P,index){
				getThen(P).then(
						function(v){
						    combined[index]=v; 
						    resolved++;
						    if (resolved==allArgs.length)
							{
							    console.log("all resolving");
							    ret.resolve(combined);
							}
						    return v;
						},
						function(e){
						    if (!ignoreReject){
							ingoreReject=true;
							console.log("rejecting");
							ret.reject(e);
						    }
						});
			    });
		    }
		
		return ret.restricted;
	}

	function any(){
		//resolves with the first of its arguments to resolve, rejects only if all of them do
		//ex: any(promisedA,promisedB,promisedC) -> {resolvedA | resolvedB | resolvedC} or [rejectedA,rejectedB,rejectedC]

		var allArgs=arguments;
		var ret=new promise();
		var ignoreResolve=false,rejected=0;
		var combined=[];
		
		if (Array.isArray(allArgs[0])) allArgs=allArgs[0];
		
		if (allArgs.length==0)
		    {
			ret.resolve([]);
		    }
		else
		    {
			allArgs.forEach(function(P,index){
				getThen(P).then(
						function(v){
						    if (!ignoreResolve)
							{
							    ingoreResolve=true;
							    console.log("any resolving");
							    ret.resolve(v);
							}
						},
						function(e)
						{
						    combined[index]=e; 
						    rejected++;
						    if (rejected==allArgs.length)
							{ 
							    console.log("any rejecting");
							    ret.reject(combined);
							}
						    return v;
						}
						);
			    });
		    }
		
		return ret.restricted;
	}

	function some(){
		//resolves when all of its arguments resolve or reject
		//ex: some(promisedA,promisedB,promisedC) -> [resolvedA, resolvedB, resolvedC], or [rejectedA,rejectedB,rejectedC], etc...

		var allArgs=arguments;
		var ret=new promise();
		var done=0;
		var combined=[];

		if (Array.isArray(allArgs[0])) allArgs=allArgs[0];
		
		if (allArgs.length==0)
		    {
			ret.resolve([]);
		    }
		else
		    {
			allArgs.forEach(function(P,index){
				getThen(P).then(
						function(v){
						    combined[index]=v;
						    done++;
						    if (done==allArgs.length) ret.resolve(combined);
						},
						function(e)
						{
						    done++;
						    if (done==allArgs.length) ret.resolve(combined);
						}
						);
			    });
		    }
		return ret.restricted;
	}
		
	function delay(ms,valToResolve){
	    var ret=new promise();
	    setTimeout(ret.resolve.bind(ret,valToResolve),ms);
	    return ret.restricted;
	}
	
	function liftNormal(fn){
	    //takes a function that returns a plain value, and converts it to return a promise
	    return function(){
		var myArgs=[].slice.call(arguments,0);
		var myPromise=new promise();
		try
		    {
			var ret=fn.apply(this,myArgs);
			if (ret && ret.then) ret.then(myPromise.resolve,myPromise.reject);
			else myPromise.resolve(ret);
		    }
		catch(e){
		    myPromise.reject(e);
		}
		return myPromise;
	    }
	}

	return {promise:promise,all:all,any:any,some:some,delay:delay,liftNormal:liftNormal};
	
});

  
  


