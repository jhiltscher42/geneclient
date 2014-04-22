require(["geneclient","async_j"],function(GENE,async_j){
	
	function test(Name){

	    var switches=[];
	    for (var n=0;n<3;n++) switches[n]={tripped:false,trigger:new async_j.promise()};
	    
	    function trip(which, val){
		if (!switches[which].tripped){
		    switches[which].tripped=true;
		    switches[which].trigger.resolve(val);
		}
	    }

	    var testGene=new GENE("test",[
			       function(v1,v2){
				   console.log(v1+v2); 
				   console.log("GENE "+Name+" called function with arity 2",v1,v2);
				   trip(0,v1+v2);
				   return 0;
			       },
			       function(){
				   console.log("GENE "+Name+" called function with arity 0");
				   trip(1,2);
				   return 1;
			       },
			       function(v1){
				   console.log("GENE "+Name+" called function with arity 1",v1);
				   trip(2,v1);
				   return 2;
			       }
				      ],null,$("#testDisplay"));

	    var isDone=false;
	    var stepsToTake=300;
	    
	    function stepForward()
	    {
		//$("#counter").text(stepsToTake);
		if (stepsToTake--)
		    {
			testGene.command().then(function(){
				if (!isDone) stepForward();
			    },console.error.bind(console));
		    }
		else
		    {
			console.log("too long");
			testGene.setScore(0);
			console.timeEnd("runTime "+Name );
		    }
	    }
	    
	    async_j.all.apply(async_j,switches.map(function(sw){return sw.trigger;}))
		.then(function(vals){
			testGene.setScore(vals.reduce(function(a,b){return a+b;}));
			isDone=true;
			console.timeEnd("runTime "+Name);
		    });
	    
	    console.time("runTime "+Name);
	    stepForward();
	}

	test("one"); 
	test("two");
	test("three");
	test("four");
	test("five");
	test("six");
	test("seven");
	test("eight");
	test("nine");
	test("ten");
	
	
		      
});
