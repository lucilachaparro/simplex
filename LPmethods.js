// LPmethods.js
//
// implements lpProblem object
// for solution of LP problems by simplex method
//
// Copyright (C) 2017 Steven R. Costenoble and Stefan Waner



// Fixes during testing
// Fix 01 Accuracy issue for  minimize c = x+y subject to
//2x + y >= 12
//x+2y >= 12
//x+y >= 10
// stopped rounding each tablaeu unless testing for zeros
//
// Solución 02: En doPhase2 (), el redondeo para encontrar la entrada del fondo mínimo estaba causando un problema posterior
// encontrando donde ocurrió ese min
// Solución 03: en problemas mixtos, la solución no debe redondear todo a la vista
// Solución 04: el estado de lp_no_solution se cambió erróneamente a lp_optimal, lo que provocó varios problemas al informar una solución cuando existe una.
// Solución 05: no más errores en la región factible vacía; Afecta a la rama y al límite también.
// Solución 06: ¿Qué pasa si la rama y el límite no encuentran ninguna solución de enteros ...




window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
	// try to standardize error messages?
	errorMsg=errorMsg.replace(/uncaught exception: /,"").replace(/Uncaught /,"");
    if (lp_reportErrorsTo == "alert")
    	alert('Error: ' + errorMsg);
	else if (lp_reportErrorsTo != "")
		document.getElementById(lp_reportErrorsTo).innerHTML
			= '<span style="color:indianred">'+errorMsg+'</span>';
}


// Hace todo lo necesario para resolver el problema, si puede ser resuelto
// Puede tirar error
//
lpProblem.prototype.solve = function ()
{
	// Variables locales para problemas enteros/mixtos
	// Todas las funciones internas pueden accederlas
	//
	var lp_BNB_foundSolution;				// Se encontró al menos alguna solución?
	var lp_BNB_bestObjectiveVal;			// Mejor valor objetivo hasta ahora
	var lp_BNB_bestSolution;				// Valores correspondientes de variables
	var lp_tableauCount=0;					// lleva cuenta de número total de tablas en ramificación y acotamiento

	lp_BNB_foundSolution = false;			// Necesario definir esto antes de resolver recursivamente
											// usando ramificación y acotamiento
											
	lp_trace_string = "";

	doSolve(this);							// hacer el trabajo real
	
	if ( this.isIntegral ) {
		this.integerSolution = lp_BNB_bestSolution;
		this.integerObjValue = lp_BNB_bestObjectiveVal;
	}

	return true;

	// Fin de la función solve() propiamente dicha.

	// Funciones locales a solve()
	

	// Esta es la función que hace el verdadero trabajo, pero necesita estar separada de solve()
	// para ser llamada recursivamente para programación entera. Solve() necesita definir variables globales primero.
	function doSolve ( p ) {
		// asegurarse de que el problema está bien escrito
		try
		{
			parseProblem( p );
		}
		catch (err)
		{
			p.error = err;
			throw err;				// rethrow it to caller
		}
	

		// Everything is now prepared.
		// Here we need to actually solve the darn thing
		try
		{
			doPhase1( p );
		}
		catch (err)
		{
			p.error = err;
			throw err;
		}
	
		try
		{
			doPhase2( p );
		}
		catch (err)
		{
			p.error = err;
			throw err;
		}
	
		if ( !p.isIntegral ) {

			if (p.status>=lp_phase2) {
				p.status=Math.max(p.status, lp_optimal); // Fix 04 was just lp_optimal
			}
		}
	
		else {
			// problema integral / mixto
			// Solucion 05 no te molestes si no hubo solución
			if(p.status>=lp_no_solution) return false; // Fix 05
			var indx = p.solnIsOfRightType();
			if (indx == -1) { 
				p.status=Math.max(p.status, lp_optimal); // Solucion 04 fue solo lp_optimal
				if ( lp_BNB_foundSolution ) {
					if ( (p.maximize && p.objectiveValues[p.objectiveValues.length-1] > lp_BNB_bestObjectiveVal)
						  ||
						 (!p.maximize && p.objectiveValues[p.objectiveValues.length-1] < lp_BNB_bestObjectiveVal) ) {
						lp_BNB_bestObjectiveVal = p.objectiveValues[p.objectiveValues.length-1];
						lp_BNB_bestSolution = p.solutions[p.solutions.length-1];
						if ( lp_verboseLevel >= lp_verbosity_solutions ) {
							lp_trace_string += "Best solution so far.<br>";
						}
					}
				}
				else {
					lp_BNB_foundSolution = true;
					lp_BNB_bestObjectiveVal = p.objectiveValues[p.objectiveValues.length-1];
					lp_BNB_bestSolution = p.solutions[p.solutions.length-1];
					if ( lp_verboseLevel >= lp_verbosity_solutions ) {
						lp_trace_string += "Best solution so far.<br>";
					}
				}
			}
			else {
				// branch at that index, but only if we might do better than we already have
				if ( !lp_BNB_foundSolution
						 || 
					 (p.maximize && p.objectiveValues[p.objectiveValues.length-1] > lp_BNB_bestObjectiveVal)
						 ||
					 (!p.maximize && p.objectiveValues[p.objectiveValues.length-1] < lp_BNB_bestObjectiveVal) )
					branchAndBound( p, indx );
				else

					if ( lp_verboseLevel >= lp_verbosity_solutions ) {
						lp_trace_string += "Abandoning branch, no better solution to be found here.<br>";
					}
			}
			p.status=Math.max(p.status, lp_optimal); // Fix 04 was just lp_optimal	// stop in any case 
		}
	
		return true;
	}

	// parseProblem comprueba qué información nos dieron y configura todo
	// arrojará un error si algo sale mal
	function parseProblem ( p )
	{
		if ( (p.tableaus.length > 0) && (p.unknowns.length > 0) ) {
			p.status = lp_parsed; 	// OK, tenemos un cuadro y desconocidos y también integerUnknowns si los hay
			return;
		}
		
		if ( p.systemMatrix.length > 0 && p.constraintRHS.length > 0 ) {
			createFirstTableau(p);	// Ya tenemos los coeficientes del problema, no hace falta repetirlos.
			p.status = lp_parsed;
			return;
		}

		if ( (p.objective != "") && (p.constraints.length > 0) ) {
									// need to parse objective and constraints
			if ( ! p.objective.toString().isSanitary() ) throw lp_IllegCharsErr;
			for ( var i = 0; i < p.constraints.length; ++i )
				if ( ! p.constraints[i].toString().isSanitary() ) throw lp_IllegCharsErr;

						// these will throw errors if something's wrong, let them be caught by caller
			extractUnknowns( p );
			extractCoefficients( p );
			createFirstTableau( p );

			p.status = lp_parsed;		// Cuadro creado e incógnitas a partir de objetivos y restricciones.
			return;
		}
		
		if ( p.problemStr.replace(/\s/g,"") != "" ) {
		
			if ( ! p.problemStr.isSanitary() )
				throw lp_IllegCharsErr;

			splitProblem( p );			// again, these may throw errors
			extractUnknowns( p );
			extractCoefficients( p )
			createFirstTableau( p );
			
			p.status = lp_parsed;	// created tableau and unknowns from problem string
			return;
		}
		
		throw lp_noLPErr;
	}
	
	// splitProblem toma problemStr y lo divide en función objetivo y restricciones
	function splitProblem ( p )
	{
		var pStr = ',' + p.problemStr.trim().toLowerCase().replace(/( |\t)+/g," ");
		pStr = pStr.replace(/subject to|sujeta a|sujeto a/,"subject to,"); //uniforma el lenguaje
		pStr = pStr.replace(/≤/g, "<=").replace(/≥/g,">="); //uniforma el símbolo
		pStr = pStr.replace(/\r\n|\r|\n/g, ',');	// convierte saltos de línea en comas
		pStr = pStr.replace(/ *, */g, ',');			// remueve espacios alrededor de las comas
		pStr = pStr.replace(/,+(?=,)/g, '');		// remueve comas duplicadas
		pStr = pStr.replace(/(^,)|(,$)/g, ""); 		// remueve comas de inicio y fin
		var intPart=pStr.search(/(integer)|(entero)|(entera)/gi); // trabaja con variables enteras
		if(intPart>-1){
			p.integerUnknowns = pStr.substring(intPart).replace(/(integer)|(entero)|(entera)/gi,"").replace(/\ /g,"").split(",");
			if(p.integerUnknowns.length > 0) {
				p.isIntegral = true;
				for ( var i = 0; i < p.integerUnknowns.length; i++ ) {
					p.integerMins[i] = -Infinity;
					p.integerMaxs[i] = Infinity;
				}
			}
			pStr=pStr.substring(0,intPart-1);
		}
		var inArr = pStr.split(','); //inArr contiene las líneas del problema, separa donde hay comas (eran saltos de línea)
		var obj = inArr[0]; //var obj contiene la función objetivo, la toma de la primera posición del array
		obj = obj.replace(/(imizar)|(imize)/,"").replace(/sujet/,"subject"); // uniforma el lenguaje
		//analiza si la función es de max o min
		if ( obj.indexOf("max") == 0 )
			p.maximize = true;
		else if ( obj.indexOf("min") == 0)
			p.maximize = false;
		else
			throw lp_UnspecMaxMinErr; //error si no está especificado max ni min
		
		var coreObj = (obj.indexOf("subject") == -1) //pregunta por el índice -1 para significar que no se encuentra ese elemento
					  ? obj.substring(4)
					  : obj.substring(4, Math.max(5,obj.indexOf("subject")-1)); //según la condición hace una cosa o la otra
		if (coreObj.indexOf("=") > -1) 
		{
			var objArr = coreObj.split("="); //separa el string de objetivo en un array, separa donde hay un =
			p.objectiveName = objArr[0].replace(/ /g,""); //borra los espacios (/g es global match, encuentra todas las ocurrencias)
			p.objective = objArr[1].replace(/ /g,"");
		}
		else 
			p.objective = coreObj.replace(/ /g,"");

		for (var i=1; i<inArr.length; i++)
		{
			if ( inArr[i].indexOf("=") == -1 )
				throw lp_noRelationConstrErr;
			p.constraints.push(inArr[i].replace(/ /g,""));
		} //toma las restricciones del inArr

		return;
	}

	// extractUnknowns toma los nombres de las variables del objetivo y las restricciones
	function extractUnknowns ( p )
	{
		if ( p.objective == "" ) throw lp_objNotSetErr; //error de objetivo vacío

		var outA = ("+"+p.objective)
						.replace(/ /g,"")
						.replace(/[\+\-][0-9.\/\(\)]*/g,",")
						.split(",");
		for ( var i=0; i < p.constraints.length; i++ )
		{
			var kA = ("+"+p.constraints[i])
						.replace(/ /g,"")
						.replace(/[<>=]+[0-9.\/\(\)]+/,"")
						.replace(/[\+\-][0-9.\/\(\)]*/g,",")
						.split(",");
			for ( var j=1; j<kA.length; j++ )
			{
				if ( outA.indexOf( kA[j] ) == -1 )
					outA.push( kA[j] );
			}
		}
		outA.shift();
		outA.sort();
		p.unknowns = outA;
		p.numActualUnknowns = p.unknowns.length;	// guarda este número (variables reales o de decisión), variables de slack se agregan a la lista
		return;
	}

	// extrae coeficientes, crea systemMatrix, etc.,
	// asume que extractUnknowns fue llamado recientemente y que p.unknowns contiene solo las variables reales
	function extractCoefficients ( p ) {
		p.systemMatrix = [];		// empieza vacía la matriz del sistema de ecuaciones
		p.constraintRHS = [];		// empieza vacía la matriz de los lados derechos

		// primero se arreglan las restricciones de igualdad
		var nC=p.constraints.length; //nC = número de restricciones
		
		for ( var i = 0; i < nC; i++) {
			if (p.constraints[i].search(/[<>]/)==-1) { //si no encuentra un signo de desigualdad quiere decir que hay restricciones de igualdad
				p.constraints.push(p.constraints[i].replace(/=/,"<="));
				p.constraints[i] = p.constraints[i].replace(/=/,">="); //agrega una restriccion para que sea menor y reemplaza en la original para que sea mayor
			}
		}
		
		for ( var i = 1; i <= p.constraints.length; i++ ) {
			var theConstr = p.constraints[i-1];
			p.systemRowIsStarred[i] = ( theConstr.indexOf(">=") > -1 );
			var lhs = theConstr.substring(0,theConstr.indexOf("=")-1);
			var rhs = theConstr.substring(theConstr.indexOf("=")+1);
			p.systemMatrix[i] = lhs.coefficients(p.unknowns);
			p.constraintRHS[i] = rhs.cleanEval();
		}
		
		p.objectiveCoeffs = p.objective.coefficients(p.unknowns);
		return;
	}

	// createFirstTableau crea la primer tabla, una vez que todo lo demás está definido
	function createFirstTableau ( p )
	{
		// quitar las variables de slack de la lista de incógnitas si están allí
		// (ocurre en caos de recursión para PLE)
		p.unknowns = p.unknowns.slice(0, p.numActualUnknowns);

		var numExtraConstraints = 0;		// usado en PLE
			for ( var i = 0; i < p.integerUnknowns.length; i++ ) {
				if ( p.integerMins[i] > -Infinity )	numExtraConstraints++;
				if ( p.integerMaxs[i] < Infinity )  numExtraConstraints++;
			}
		
		var numRows = p.systemMatrix.length + numExtraConstraints;
		var numCols = p.unknowns.length + numRows + 1;
		p.tableauDimensions = [numRows, numCols];
		var firstTableau = new tableau();
		
		// poner nombres de variables en la primera fila
		firstTableau[0] = [];
		for (var j = 1; j <= p.unknowns.length; j++) {
			firstTableau[0][j] = p.unknowns[j-1];
		}
		for (var ss = 1; j < p.unknowns.length + numRows; j++, ss++) {
			firstTableau[0][j] = "s" + ss.toString(); //agrega las variables de slack
		}
		firstTableau[0][j] = (p.maximize ? "" : "-") + p.objectiveName;
		
		// Luego las filas correspondientes a las restricciones
		p.rowIsStarred = p.systemRowIsStarred.slice();
		for (var i = 1; i < p.systemMatrix.length; i++) {
			firstTableau[i] = p.systemMatrix[i].slice();
			firstTableau[i].unshift( firstTableau[0][p.unknowns.length + i] ); // nombre de variables de slack/superavit
			if (p.rowIsStarred[i]) firstTableau[i][0] = "*"+firstTableau[i][0]; // marcar con asterisco si corresponde
			for (var j=1;j<numRows+1;j++) firstTableau[i].push( (i!=j)? 0 : (p.rowIsStarred[i]? -1:1) );
			firstTableau[i].push( p.constraintRHS[i] );
		}

		// Luego las filas correspondientes a las restricciones agregadas en la PLE
		if ( p.isIntegral ) {
			for ( var u = 0; u < p.integerUnknowns.length; u++ ) {
				var j = p.unknowns.indexOf( p.integerUnknowns[u] );
				if ( p.integerMins[u] > -Infinity ) {
					firstTableau[i] = new Array(numCols+1).fill(0);
					firstTableau[i][0] = '*' + firstTableau[0][p.unknowns.length + i];
					firstTableau[i][j+1] = 1;
					firstTableau[i][p.unknowns.length + i] = -1;
					firstTableau[i][numCols] = p.integerMins[u];
					p.rowIsStarred[i] = true;
					i++;
				}
				if ( p.integerMaxs[u] < Infinity ) {
					firstTableau[i] = new Array(numCols+1).fill(0);
					firstTableau[i][0] = firstTableau[0][p.unknowns.length + i];
					firstTableau[i][j+1] = 1;
					firstTableau[i][p.unknowns.length + i] = 1;
					firstTableau[i][numCols] = p.integerMaxs[u];
					p.rowIsStarred[i] = false;
					i++;
				}
			}
		}

		// Luego la fila correspondiente a la función objetivo
		firstTableau[i] = p.objectiveCoeffs.slice();
		firstTableau[i].unshift( firstTableau[0][numCols-1] );
		if (p.maximize) {
			for (var j=1;j<=p.unknowns.length;j++)
				firstTableau[i][j]*=-1;
		}
		for (var j=1;j<numRows+1;j++)
			firstTableau[i].push( (i!=j)? 0 : 1 );
		firstTableau[i].push(0);
			
//		firstTableau.roundToSigDig(p.maxSigDigits); // round to avoid false negatives or non-zero elements
		// Fix 01; in the first tableau there should be none of that, as no calculation is done prior to this
		// so removed .roundToSigDig(p.maxSigDigits)
		p.tableaus.push(firstTableau);
		p.tableauDimensions=[numRows,numCols];
		
		// agregar las variables de slack a la lista de incógnitas
		for ( j = p.unknowns.length+1; j < firstTableau[0].length-1; j++ )
			p.unknowns.push( firstTableau[0][j] );
	
		if ( lp_verboseLevel >= lp_verbosity_tableaus ) {
			lp_trace_string += "&#160;<br>Tableau " + ++lp_tableauCount + ":<br>";
			lp_trace_string += p.tableaus[0].toHTML( p.mode, p.sigDigits, {});
			lp_trace_string += "<br>";
		}
	
		calculateSolution(p);
		
		if ( lp_verboseLevel >= lp_verbosity_solutions ) {
			lp_trace_string += p.lastSolutionToString() + "<br>";
		}

		return;
	}
	
	function doPhase1( p )
	{
		if(p.status >= lp_phase1) return;
		else if(p.rowIsStarred.indexOf(true)==-1)
		{
			p.status = lp_phase1;
			return;
		}
		else {
			// trabajo de la fase 1:
			var numRows=p.tableauDimensions[0], numCols=p.tableauDimensions[1];
			var foundZeros=false;
			while (p.status < lp_phase1)
			{
				var currentTablIndex=p.tableaus.length-1;
				if(currentTablIndex > p.maxNumTableaus) 
					throw lo_tooManyTabloeausErr + p.maxNumTableaus;
				var currentTabl = p.tableaus[currentTablIndex];
				// desmarcar todas las filas con ceros en el lado derecho
				// dando vuelta las inecuaciones
				// es necesario en casos como
				// -x - y >= 0
				foundZeros=false;
				for (i = 1; i <= numRows-1; i++)
					{
						//  01 Si es realmente pequeño, primero cero:
						if (roundSigDig(currentTabl[i][numCols],p.maxSigDigits)==0) currentTabl[i][numCols]=0;
						if ((p.rowIsStarred[i])&&(currentTabl[i][numCols]==0))
						{
							if (!foundZeros)
							{
								var newTabl = new tableau( currentTabl );
								foundZeros=true;
							}
							for (var j = 1; j <= numCols-1; j++) newTabl[i][j] *= -1;
							p.rowIsStarred[i] = false;
							newTabl[i][0] = newTabl[i][0].replace( /\*/, '' );	// remove the star!
						}
					}
				if (foundZeros)
					{
						p.tableaus.push(newTabl); // no rounding should be necessary afer multiplying by -1 (I hope!)
						if(p.rowIsStarred.indexOf(true)==-1)
							{
								p.status = lp_phase1;
								return;
							}
						currentTabl = p.tableaus[currentTablIndex+1];
					}
				// normal phase 1 procedure:
				var firstStRow=p.rowIsStarred.indexOf(true);
				
				if (Math.max.apply(null, currentTabl[firstStRow].slice(1,numCols-1).roundToSigDig(p.maxSigDigits)) <= 0) // Fix 01 rounding in the test
				{
					
					p.message = lp_emptyFeasibleRegionErr; // Fix 05  (previously threw an error instead)
					p.status = lp_no_solution; // Fix 05  
					return; // Fix 05 
					
				}
				
				else var maxStRowEntry=Math.max.apply(null, currentTabl[firstStRow].slice(1,numCols-1)); // Fix 01 cont. -- no rounding here: need to get the actual maximum to find its index corectly two lines down
				var pivotRow=0, pivotCol=0;
				pivotCol = currentTabl[firstStRow].indexOf(maxStRowEntry);
				var testRatios = [];
				var ratioMin=Infinity;
				for (var i = 1; i <=numRows-1; i++) {
					testRatios[i]=(currentTabl[i][pivotCol]>0)
						? roundSigDig(currentTabl[i][numCols]/currentTabl[i][pivotCol],p.maxSigDigits) 
						: Infinity;
					if(testRatios[i] < ratioMin){
						pivotRow = i;
						ratioMin = testRatios[i];
					}
					else if(testRatios[i] == ratioMin){
						if (Math.random()>.5) pivotRow = i; // random tie-breaking to avoid cycling
					}
				}
				if (pivotRow==0) {
					p.status = lp_no_solution;
					p.message = (p.maximize)?lp_noMaxErr:lp_noMinErr; // Fix 05 
					return;
				}
				else {
					if ( lp_verboseLevel > lp_verbosity_solutions ) {
						try {
							lp_trace_string += phase1Pivot( pivotRow, pivotCol, currentTabl, testRatios );
						}
						catch (e) {}
					}
					// pivot on pivot row and column and lose the star in the pivot row
					p.rowIsStarred[pivotRow] = false; // lose the star
					p.tableaus.push( 
						currentTabl.pivot(pivotRow, pivotCol, p.maxSigDigits) // Fix 01 removed .roundToSigDig(p.maxSigDigits)
						);

					if ( lp_verboseLevel >= lp_verbosity_tableaus ) {
						lp_trace_string += "&#160;<br>Tableau " + ++lp_tableauCount + ":<br>";
						lp_trace_string += p.tableaus[p.tableaus.length-1].toHTML( p.mode, p.sigDigits, {});
						lp_trace_string += "<br>";
					}
	
					calculateSolution(p);
					
					if ( lp_verboseLevel >= lp_verbosity_solutions ) {
						lp_trace_string += p.lastSolutionToString() + "<br>";
					}

					if(p.rowIsStarred.indexOf(true)==-1) {
						p.status = lp_phase1;
						return;
					}
				}
			}
			
			return;
		}
	}

	function doPhase2( p )
	{
		if (p.status < lp_phase1)
			throw lp_phase2TooSoonErr;
		else if (p.status >= lp_phase2)
			return;
		
		var numRows=p.tableauDimensions[0], numCols=p.tableauDimensions[1], pivotRow=0, pivotCol=0, ratioMin=Infinity;
		while (p.status < lp_phase2)
			{
				var currentTablIndex=p.tableaus.length-1;
				if(currentTablIndex > p.maxNumTableaus) 
					throw lo_tooManyTabloeausErr + p.maxNumTableaus;
				var currentTabl = p.tableaus[currentTablIndex];
				// at this point there may be rounding errors causing false negatives so everything needs to be rounded
																	// Fix 01 added rounding
																	// Fix 02 save rounded row to locate min
				var roundedBottomRow = currentTabl[numRows].slice(1,numCols-1).roundToSigDig(p.maxSigDigits);
				var minBottomEntry=Math.min.apply(null, roundedBottomRow);
				negIndicator=(minBottomEntry<0);
				pivotRow=0; pivotCol=0;
				if(!negIndicator) {
					p.status = lp_phase2;
				}
				else {
					pivotCol = roundedBottomRow.indexOf(minBottomEntry)+1;	// Fix 02 use saved rounded row
																			// and correct for 0 based index
					var testRatios = [];
					ratioMin=Infinity;
					for (var i = 1; i <=numRows-1; i++) {
						testRatios[i]=(currentTabl[i][pivotCol]>0)
							? roundSigDig(currentTabl[i][numCols]/currentTabl[i][pivotCol],p.maxSigDigits) 
							: Infinity;
						if(testRatios[i] < ratioMin){
							pivotRow = i;
							ratioMin = testRatios[i];
						}
						else if((testRatios[i] == ratioMin) &&(ratioMin != Infinity)){
							if (Math.random()>.5) pivotRow = i; // random tie-breaking to avoid cycling
						}
					}
					if (pivotRow==0) {
						p.status = lp_no_solution;
						p.message = (p.maximize)?lp_noMaxErr:lp_noMinErr; // Fix 05 
						return;
					}
					else {
						if ( lp_verboseLevel > lp_verbosity_solutions ) {
							try {
								lp_trace_string += phase2Pivot( pivotRow, pivotCol, currentTabl, testRatios );
							}
							catch (e) {}
						}
						
						p.tableaus.push( 
							currentTabl.pivot(pivotRow, pivotCol, p.maxSigDigits)
							);
						// Fix 01 removed .roundToSigDig(p.maxSigDigits)

						if ( lp_verboseLevel >= lp_verbosity_tableaus ) {
							lp_trace_string += "&#160;<br>Tableau " + ++lp_tableauCount + ":<br>";
							lp_trace_string += p.tableaus[p.tableaus.length-1].toHTML( p.mode, p.sigDigits, {});
							lp_trace_string += "<br>";
						}

						calculateSolution(p);
						
						if ( lp_verboseLevel >= lp_verbosity_solutions ) {
							lp_trace_string += p.lastSolutionToString() + "<br>";
						}
					}
				}
				
			}
		return;
	
	}



// Used for integer/mixed problems
// If an unknown is not yet integer, try either forcing it <= floor or >= ceiling	
	function branchAndBound( p, indx ) {
		var theBranchVarVal = p.solutions[p.solutions.length-1][indx];
		var theBranchVarName = p.unknowns[indx];
		var theIntegerIndx = p.integerUnknowns.indexOf( theBranchVarName );

		var newProbl1 = new lpProblem(p);
		newProbl1.integerMaxs[theIntegerIndx] = Math.floor(theBranchVarVal);

		var newProbl2 = new lpProblem(p) ;
		newProbl2.integerMins[theIntegerIndx] = Math.ceil(theBranchVarVal);

		try {				// may fail
			doSolve( newProbl1 );
		}
		catch (e) {
			if ( lp_verboseLevel >= lp_verbosity_solutions ) {
				lp_trace_string += e + "<br>";
			}
		}
		finally {
			if (( lp_verboseLevel >= lp_verbosity_solutions ) && (newProbl2.message!="")) lp_trace_string += newProbl2.message + "<br>"; // Fix 05 
			p.tableaus = p.tableaus.concat( newProbl1.tableaus );
		}
		
		try {
			doSolve( newProbl2 );
		}
		catch (e) {
			if ( lp_verboseLevel >= lp_verbosity_solutions ) {
				lp_trace_string += e + "<br>";
			}
		}
		finally {
			if (( lp_verboseLevel >= lp_verbosity_solutions ) && (newProbl2.message!="")) lp_trace_string += newProbl2.message + "<br>";
			p.tableaus = p.tableaus.concat( newProbl2.tableaus );
		}

		return true
	}


	function calculateSolution (p) {
		var numRows=p.tableauDimensions[0], numCols=p.tableauDimensions[1], theSoln=[];
		var currentTablIndex=p.tableaus.length-1;
		var currentTabl = p.tableaus[currentTablIndex];
		for (var i=0; i<p.unknowns.length; i++){
			theSoln[i]=0;
			for (var j=1; j<numRows; j++) {
				if (currentTabl[j][0].replace(/\*/g,'')==p.unknowns[i]) {
					theSoln[i] = currentTabl[j][numCols]/currentTabl[j][i+1];
					break;
				}
			}
		}
		p.solutions.push(theSoln);
		
		var objVal = currentTabl[numRows][numCols]/currentTabl[numRows][numCols-1];
		if ( !p.maximize ) objVal = -objVal;
		p.objectiveValues.push( objVal );
		return;
	}

}


lpProblem.prototype.formatObjectiveValues = function ( mode = 0 ) {
	if ( mode == 0 ) mode = this.mode;

	return this.objectiveValues.map( x => {
		return (mode == lp_Decimal) ? roundSigDig( x, this.sigDigits )
									: x.toFracStr();
		}
	);
}


lpProblem.prototype.formatLastObjectiveValue = function ( mode = 0 ) {
	if ( mode == 0 ) mode = this.mode;
	var lastIndex = this.objectiveValues.length - 1;
	return (mode == lp_Decimal) ? roundSigDig(this.objectiveValues[lastIndex], this.sigDigits)
								: this.objectiveValues[lastIndex].toFracStr();
}



lpProblem.prototype.formatUnknowns = function ( includeSlackVariables = false ) {
	return this.unknowns.slice(0, includeSlackVariables ? this.unknowns.length
														: this.numActualUnknowns );
}


lpProblem.prototype.formatSolutions = function ( includeSlackVariables = false, mode = 0 ) {
	if ( mode == 0 ) mode = this.mode;
	
	return this.solutions.map( s => {
		var soln = [];
		var numVars = (includeSlackVariables ? this.unknowns.length : this.numActualUnknowns);
		for ( var i = 0; i < numVars; i++ )
			soln[i] = (mode == lp_Decimal) ? roundSigDig( s[i], this.sigDigits )
										   : s[i].toFracStr();
		return soln;
	} );
}


lpProblem.prototype.formatLastSolution = function ( includeSlackVariables = false, mode = 0 ) {
	if ( mode == 0 ) mode = this.mode;
	var soln = [];
	var numVars = (includeSlackVariables ? this.unknowns.length : this.numActualUnknowns);
	var solnIndex = this.solutions.length-1;
	for ( var i = 0; i < numVars; i++ )
		soln[i] = (mode == lp_Decimal) ? roundSigDig( this.solutions[solnIndex][i], this.sigDigits )
									   : this.solutions[solnIndex][i].toFracStr();
	return soln;
}


lpProblem.prototype.formatIntegerObjectiveValue = function ( mode = 0 ) {
	if ( mode == 0 ) mode = this.mode;
	return (mode == lp_Decimal) ? roundSigDig(this.integerObjValue, this.sigDigits)
								: this.integerObjValue.toFracStr();
}


lpProblem.prototype.formatIntegerSolution = function ( includeSlackVariables = false ) {
	var soln = [], isInt=false;
	var numVars = (includeSlackVariables ? this.unknowns.length : this.numActualUnknowns);
	for ( var i = 0; i < numVars; i++ ) {
	isInt=(this.integerUnknowns.indexOf(this.unknowns[i]) > -1); // Fix 03 added this line and the next
		soln[i] = ((this.mode == lp_Decimal)&&(!isInt)) ? roundSigDig( this.integerSolution[i], this.sigDigits )
									   : this.integerSolution[i].toFracStr();
	}
	
	return soln;
}



lpProblem.prototype.solutionToString = function () {
	if(this.status == lp_no_solution) {return this.message} // Fix 04 
	var objVal = this.isIntegral
					? this.formatIntegerObjectiveValue()
					: this.formatLastObjectiveValue();
	var vars = this.formatUnknowns( this.showArtificialVariables );
	if(this.isIntegral) { // Fix 06
		if(typeof this.integerSolution == "undefined") {
			return lp_noNiceSolutionErr;
		}
	}
	var soln = this.isIntegral
					? this.formatIntegerSolution( this.showArtificialVariables )
					: this.formatLastSolution( this.showArtificialVariables );
	var str = this.objectiveName + " = " + objVal + "; ";
	for ( var i = 0; i < vars.length; i++ ) {
		str += vars[i] + " = " + soln[i];
		if ( i < vars.length-1 ) str += ", ";
	}
	return str;
}



lpProblem.prototype.lastSolutionToString = function () {
	var objVal = this.formatLastObjectiveValue();
	var vars = this.formatUnknowns( this.showArtificialVariables ); 
	var soln = this.formatLastSolution( this.showArtificialVariables );
	var str = this.objectiveName + " = " + objVal + "; ";
	for ( var i = 0; i < vars.length; i++ ) {
		str += vars[i] + " = " + soln[i];
		if ( i < vars.length-1 ) str += ", ";
	}
	return str;
}




lpProblem.prototype.solnIsOfRightType = function ( )
{
	// returns first index of a non-compliant solution; -1 if none found
	var lastSoln=this.solutions[this.solutions.length-1];
	for (var i=0;i<this.integerUnknowns.length;i++) {
		var j = this.unknowns.indexOf(this.integerUnknowns[i]);
		var theSoln=lastSoln[j];
		if(roundSigDig(theSoln,this.maxSigDigits)!=Math.round(theSoln)) {
			return j;
		}
	}
	return -1;
}

// tableau routines

tableau.prototype.pivot = function ( pRow, pCol, sigDigs ) {

	var arr = new tableau( this );				// work on a copy
	var thePivot = arr[pRow][pCol];
	var nRows = arr.length-1, nCols = arr[1].length-1;
	
	for ( var j = 1; j <= nCols; j++ )
		arr[pRow][j] = arr[pRow][j] / thePivot;
	
	for ( var i = 1; i <= nRows; i++ )
		if ( i != pRow ) {
			var theFactor = arr[i][pCol];
			for ( var j = 1; j <= nCols; j++ )	// use roundSigDig to avoid subtractive error
				arr[i][j] = roundSigDig( arr[i][j], sigDigs+2 )
							- roundSigDig( arr[pRow][j] * theFactor, sigDigs+2 );
		}

	arr[pRow][0] = arr[0][pCol];	// Record change in active variable
	
	return arr;
}


// The following utility routine creates an array of strings representing the tableau entries
//
tableau.prototype.stringArray = function ( theMode, sigDigs ) {

	var nRows = this.length-1;
	var nCols = this[1].length-1;
	var tabl = this.map( function(r) { return r.slice(); } );	// copy to return
	var i, j;
	
	switch ( theMode ) {
		case lp_Integral:		// integral mode, need to convert all entries to integers
			for ( i = 1; i <= nRows; i++ ) {
				var rowLcm = 1;							// lcm of the denominators in the row
				for ( j = 1; j <= nCols; j++ ) {
					var frac = tabl[i][j].toFracArr();
					rowLcm = lcm( rowLcm, frac[2] );
				}
				for ( j = 1; j <= nCols; j++ )
					tabl[i][j] = Math.round( tabl[i][j] * rowLcm ).toString();
			}
			break;

		case lp_Fraction:		// fraction mode, convert all entries to fractions
			for ( i = 1; i <= nRows; i++ )
				for ( j = 1; j <= nCols; j++ )
					tabl[i][j] = roundSigDig( tabl[i][j], sigDigs ).toFracStr();
			break;

		case lp_Decimal:		// decimal mode, just convert to strings
			for ( i = 1; i <= nRows; i++ )
				for ( j = 1; j <= nCols; j++ )
					tabl[i][j] = roundSigDig( tabl[i][j], sigDigs ).toString();
			break;
	}
	
	filaZ = [];
	filaZ = tabl;
	console.log(filaZ); 
	return tabl;
}


tableau.prototype.toString = function ( theMode, sigDigs )
{
	var tabl = this.stringArray( theMode, sigDigs );
	var nRows = tabl.length-1;
	var nCols = tabl[1].length-1;
	var theStr = "";
	var maxLen = [];					// ancho de cada columna
	var i, j;
	
	for ( j = 0; j <= nCols; j++ )
		maxLen[j] = 5;					// columnas no menos de 5 caracteres de ancho

	for ( i = 0; i <= nRows; i++ )
		for ( j = 0; j <= nCols; j++ )
			if ( typeof tabl[i][j] === "string" )
				maxLen[j] = Math.max( maxLen[j], tabl[i][j].length+1 );

	// fila superior
	theStr += ''.padEnd( maxLen[0] ) + '| ';
	for ( j = 1; j <= nCols-1; j++ )
		theStr += tabl[0][j].padCenter( maxLen[j] );
	theStr += '|\n';
	
	// linea horizontal
	theStr += ''.padEnd( maxLen[0], '-' );
	theStr += '+-';
	for ( j = 1; j <= nCols-1; j++ )
		theStr += ''.padEnd( maxLen[j], '-' );
	theStr += '+-' + ''.padEnd( maxLen[nCols], '-' ) + '\n';
	
	// filas intermedias
	for ( i = 1; i <= nRows-1; i++ ) {
		theStr += (tabl[i][0]+' ').padStart( maxLen[0] );
		theStr += '| ';
		for ( j = 1; j <= nCols-1; j++ )
			theStr += tabl[i][j].padCenter( maxLen[j] );
		theStr += '| ' + tabl[i][nCols].padCenter( maxLen[nCols] ) + '\n';
	}
	
	// linea horizontal
	theStr += ''.padEnd( maxLen[0], '-' );
	theStr += '+-';
	for ( j = 1; j <= nCols-1; j++ )
		theStr += ''.padEnd( maxLen[j], '-' );
	theStr += '+-' + ''.padEnd( maxLen[nCols], '-' ) + '\n';
	
	// fila inferior
	theStr += (tabl[nRows][0]+' ').padStart( maxLen[0] );
	theStr += '| ';
	for ( j = 1; j <= nCols-1; j++ )
		theStr += tabl[nRows][j].padCenter( maxLen[j] );
	theStr += '| ' + tabl[nRows][nCols].padCenter( maxLen[nCols] ) + '\n';

	return theStr;
	
}


tableau.prototype.toHTML = function ( theMode, sigDigs ,params)
{
	var tabl = this.stringArray( theMode, sigDigs );
	var nRows = tabl.length-1;
	var nCols = tabl[1].length-1;
	var padding = ("cellPadding" in params)?params.cellPadding:10;
	var borCol =  ("lineColor" in params)?params.lineColor:"black";
	var theStr = '<table cellpadding = ' + padding.toString() + ' cellspacing = "0"  style="display: inline; display: inline-table;"><tr><td style = "border-bottom: thin solid ' + borCol + '; border-right: thin solid ' + borCol + '"></td>';
	
	// fila superior
	for (var i = 1; i<=nCols; i++) theStr += '<td style = "border-bottom: thin solid ' + borCol + ';  width:40px;text-align:center;' + ((i==nCols-1)?('border-right: thin solid ' + borCol) : '') + '"><b><i>' + ((i==nCols)?"":tabl[0][i].replace(/-/,"&minus;")) + '</i></b></td>';
	theStr += '</tr>';

	// filas intermedias
	for (var i = 1; i <= nRows-1; i++) {
		theStr += '<tr><td style = "text-align:right; border-right: thin solid ' + borCol + '"><b><i>' + tabl[i][0].replace(/-/,"&minus;") + '</i></b></td>';
		for (var j = 1; j <= nCols; j++) {
			theStr += (j==nCols-1)?('<td style = "text-align:center; white-space:nowrap; border-right: thin solid ' + borCol + '">') : ('<td style = "text-align:center; white-space:nowrap">');
			
			theStr += tabl[i][j].toString().replace(/-/,"&minus;") + '</td>'
		}
		theStr += '</tr>';
	}

	// fila inferior
	theStr += '<tr><td style = "text-align:right;border-top: thin solid ' + borCol + '; border-right: thin solid ' + borCol + '; "><b><i>' + tabl[nRows][0].replace(/-/,"&minus;") + '</i></b></td>';
	for (var j = 1; j <= nCols; j++) theStr += '<td style = "text-align:center; white-space:nowrap; border-top: thin solid ' + borCol + ';' + ((j==nCols-1)?('border-right: thin solid ' + borCol) : '') + '">'  + tabl[nRows][j].toString().replace(/-/,"&minus;") + '</td>';

	theStr += '</tr>';
	theStr += '</table>';
	return theStr;
}



// Utilities


String.prototype.coefficients = function (unknowns)
{
	// will return the array of numerical coefficients, calculating any fractions or other implicit calculations
	var nU=unknowns.length, 
		reUPl, reUMn,
		sortedCoeffs=[], 
		str=this.replace(/ /g,"");
	for (var i=0;i<nU;i++){
		try {
			reUPl = new RegExp("("+unknowns[i]+")\\+","g");
			reUMn = new RegExp("("+unknowns[i]+")\\-","g");
			str=str.replace(reUPl,"$1 ").replace(reUMn,"$1 -");
		} catch(e) {
			throw lp_badExprErr + this + ":\n" + e.message;
		}
		
	}
	termArray=str.split(" "); // unsorted as per unknowns but each term ends in an unknown name
	// need to insert coeffs of 1 when missing; these begin wih a letter
	
	// sort them. to make it easy, separate each term into a pair (coeff, unknown)
	var expandedTermArray=[],sortedCoeffs=[];
	for (var i=0;i<termArray.length;i++){
		if(termArray[i].search(/[a-zA-Z]/)==0)termArray[i]="1"+termArray[i];
		else if(termArray[i].search(/\-[a-zA-Z]/)==0)termArray[i]=termArray[i].replace(/(\-)([a-zA-Z])/,"-1$2");
		expandedTermArray[i]=(termArray[i].replace(/ /g,"").replace(/([a-zA-Z])/," $1")).split(" ");
	}
	var foundTerm=false;
	for (var i=0;i<nU;i++){
		foundTerm=false;
		for (var j=0;j<expandedTermArray.length;j++){
			if(expandedTermArray[j][1]==unknowns[i]){
				try{
					sortedCoeffs.push((expandedTermArray[j][0]).cleanEval());
				}
				catch (e){
					throw lp_illegalCoeffErr + unknowns[i] + lp_inExprErr + this 
							+ ((e != "") ? (":\n" + e) : "");
				}
				foundTerm=true;
				j=expandedTermArray.length;
			}
		}
		if(!foundTerm)sortedCoeffs.push(0);
	}
	
	return sortedCoeffs;
}

String.prototype.cleanEval = function ()
{
	if ( ! this.isArithmetical() )
		throw lp_IllegCharsErr;
	try {
		return eval( this.toString() );
	}
	catch(err) {
		throw err.message;
	}
}

String.prototype.isSanitary = function ()
{
	return this.toString() == this.toString().replace(/[^0-9.,\/\(\)\+\-<>=≤≥a-zA-Z \t\r\n]/g,"");
}

String.prototype.isArithmetical = function ()
{
	return this.toString() == this.toString().replace(/[^0-9.\/\(\)\+\-]/g,"");
}

String.prototype.padCenter = function ( len, padding = ' ' ) {
	var needed = len - this.length;
	if (needed <= 0 ) return this;

	var start = Math.floor( (needed+1)/2 ) + this.length;
	return this.padStart( start, padding ).padEnd( len, padding );
}


// Here's a cute version of Array.prototype.roundToSigDig() that should work on any array
// returns a copy of the array, not the original array
Array.prototype.roundToSigDig = function ( numDigs )
{
	return this.map( function(elt) {
		if ( typeof elt === "number" )
			return roundSigDig( elt, numDigs );
		else if ( Array.isArray( elt ) )
			return elt.roundToSigDig( numDigs );
		else
			return elt;
		} );
}

// * number routines

Number.prototype.toFracArr = function ( maxDenom = 1000 ) {
	var theFrac = [ , 0, 1];
	var p1 = 1, p2 = 0, q1 = 0, q2 = 1;
	var p, q;
	var a = 0;
	var n, d;
	var negFlag = (this < 0);
	var x = ( negFlag ? -this : this );
	
	while ( true ) {
		var intPart = Math.floor( x );
		var decPart = roundSigDig( x - intPart, 15 );
		x = decPart;
		a = intPart;
		p = a*p1 + p2;
		q = a*q1 + q2;
		
		if ( (Math.abs(p) > 10000000000) || (q > maxDenom) ) {
			n = p1;
			d = q1;
			break;
		}
		
		if ( x == 0 ) {
			n = p;
			d = q;
			break;
		}
		
		p2 = p1;
		p1 = p;
		q2 = q1;
		q1 = q;
		x = 1/x;
	} // while ( true )
	
	theFrac[1] = (negFlag ? -n : n);
	theFrac[2] = d;
	
	return theFrac;
}

Number.prototype.toFracStr = function ( maxDenom = 1000 ) {
	var fracArr = this.toFracArr( maxDenom );
	if ( fracArr[2] == 1 )
		return fracArr[1].toString();
	else
		return fracArr[1].toString() + "/" + fracArr[2].toString();
}


function gcd ( a, b ) {
	var r;
	
	a = Math.abs(a);
	b = Math.abs(b);
	
	if ( a < b ) {
		var t = a;
		a = b;
		b = t;
	}
	
	while ( b > 0 ) {
		r = a % b;
		a = b;
		b = r;
	}
	
	return a;
}

function lcm ( a, b ) {
	return (a * b) / gcd(a,b);
}


function shiftRight(n, k) {
	return Math.pow(10,k)*n
}

function roundSigDig(theNumber, numDigits) {
	if (theNumber == 0) return(0);
	else if(Math.abs(theNumber) < .00000000000000000000001) return(0);
	// ignores numbers less than 10^(-23)
	else
		{
		var k = Math.floor(Math.log(Math.abs(theNumber))/Math.log(10))-numDigits+1
		var k2 = shiftRight(Math.round(shiftRight(Math.abs(theNumber),-k)),k);
		// just in case..
		try{ // without the try 
			k2=Number(k2.toPrecision(numDigits+3)); // otherwise issues with very tiny numbers
			if (theNumber > 0) return(k2);
		}
		catch(e){}
		return (theNumber > 0)?k2:(-k2);
	}
} // roundSigDig


function roundDec(theNumber, numPlaces) {
	return shiftRight(Math.round(shiftRight(theNumber,numPlaces)),-numPlaces);
} // roundDec
