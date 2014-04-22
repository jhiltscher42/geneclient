define(["jquery","async_j"],function($,async_j)
       {

	   var commands=["R1","R2","DISPLACE","GT BRANCH","LT BRANCH","GTE BRANCH","LTE BRANCH","EQ BRANCH","NEQ BRANCH","INC R1","INC R2","DEC R1","DEC R2","EXT R1"];

	   var GENESERVER="http://gene-exper.rhcloud.com";

	   function GeneClient(poolName,EXTfunctions,$display)
	   {
	       var IP=0;
	       var R1=0;
	       var R2=0;
	       var lastCommand="";
	       
	       function updateDisplay(){
		   if ($display){
		       $display.find(".IP").text(IP).end()
			       .find(".R1").text(R1).end()
                               .find(".R2").text(R2).end()
	   		       .find(".lastCommand").text(lastCommand).end();
		   }
	       }

	       var myGeneName;

	       var me=this;
	       
	       var instructions;
	       var instructionsLoaded=new async_j.promise();
	       var instructionsFetched=0;

	       var readyToFetchNext=new async_j.promise();
	 
	       $.get(GENESERVER+"/pools?").then(function(poolsAsString){
		       var pools=JSON.parse(poolsAsString);
		       if (pools.indexOf(poolName)>=0) 
			   {
			       readyToFetchNext.resolve("OK");
			   }
		       else
			   {
			       $.ajax({method:"put",url:GENESERVER+"/pools/"+poolName}).then(readyToFetchNext.resolve,readyToFetchNext.reject);
			   }
		   });

	       readyToFetchNext.then(function(){
		       $.get(GENESERVER+"/pools/"+poolName+"/next?"+Math.random())
			   .then(function(geneName)
				 {
				     var nameMatch=/\/gene\/(\w+)/;
				     geneName=nameMatch.exec(geneName)[1];

				     $.get(GENESERVER+"/gene/"+geneName)
					 .then(function(geneData)
					       {
						   myGeneName=geneName;
						   instructions=JSON.parse(geneData);
						   instructionsLoaded.resolve("OK");
					       }
					       ,instructionsLoaded.reject);
				 }
				 ,instructionsLoaded.reject);
		   },instructionsLoaded.reject);

	       function fitTo(length){
		   return function(val){
		       if (isNaN(val)) return val;
		       while (val<0) val+=length;
		       return val%length;
		   }
	       }
	       
	       function fetch(){
		   return instructionsLoaded.then(function(){
			   var ret=instructions[IP];
			   instructionsFetched++;
			   IP++;
			   IP%=instructions.length;
			   return ret;
		       });
	       }
	       
	       //["R1","R2","DISPLACE","GT BRANCH","LT BRANCH","GTE BRANCH","LTE BRANCH","EQ BRANCH","NEQ BRANCH","INC R1","INC R2","DEC R1","DEC R2","EXT R1"];

	       function branch(compType){
		   return function(){
		       var compTypes={
			   LT:function(a,b){return a<b;},
			   LTE:function(a,b){return a<=b;},
			   GT:function(a,b){return a>b;},
			   GTE:function(a,b){return a>=b;},
			   EQ:function(a,b){return a==b;},
			   NEQ:function(a,b){return a!=b;}
		       }
		       if (compTypes[compType](R1,R2)){
			   return fetch()
			       .then(fitTo(instructions.length))
			       .then(function(data){
				       IP=data;
				   });
		       }
		   }
	       }

	       var cmdHash={
		   R1:function(){
		       return fetch().then(function(data){
			       R1=data;
			   });
		   },
		   R2:function(){
		       return fetch().then(function(data){
			       R2=data;
			   });
		   },
		   DISPLACE:function(){
		       IP=IP+Math.floor(instructions.length/2)+fitTo(instructions.length)(R1);
		       IP%=instructions.length;
		   },
		   "GT BRANCH":branch("GT"),
		   "LT BRANCH":branch("LT"),
		   "GTE BRANCH":branch("GTE"),
		   "LTE BRANCH":branch("LTE"),
		   "EQ BRANCH":branch("EQ"),
		   "NEQ BRANCH":branch("NEQ"),
		   "INC R1":function(){R1++},
		   "INC R2":function(){R2++},
		   "DEC R1":function(){R1--},
		   "DEC R2":function(){R2--},
		   "EXT R1":function(){
		       return fetch()
		       .then(fitTo(EXTfunctions.length))
		       .then(function(EXTfunctionIndex){
			       var extFuncToCall=EXTfunctions[EXTfunctionIndex];
			       var params=[];
			       for (var n=0;n<extFuncToCall.length;n++)
				   {
				       params[n]=fetch();  //fills params with promises...
				   }
			       return async_j.all(params).then(function(fulfilledParams){
				       var ret=extFuncToCall.apply(me,fulfilledParams);
				       if (!isNaN(ret)) R1=ret;
				   }); 
			   })
		   }
	       };
	       
	       function doCommand(index){
		   if (commands[index] in cmdHash){
		       return cmdHash[commands[index]]();
		   }
	       }
		      
	       function updateLastCommand(index){
		   lastCommand=commands[index];
		   updateDisplay();
		   return index;
	       }

	       function command(){
		   return fetch()
		       .then(fitTo(commands.length))
		       .then(updateLastCommand)
		       .then(doCommand)
		       .then(updateDisplay);
	       }
	       
	       this.command=command;
	       this.setScore=function(score){
		   if (isNaN(score))
		       {
			   console.log(score+" is invalid as a score");
		       }
		   else
		       {
			   $.ajax({method:"put",url:GENESERVER+"/gene/"+myGeneName+"/"+score});
		       }
	       }
	   }

       
	return GeneClient;
       });
