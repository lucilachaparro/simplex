// LPdefs.js
//
// definición del objeto lpProblem
// para resolución de problemas de PL usando método simplex
//
// Copyright (C) 2017 Steven R. Costenoble and Stefan Waner

// modos de PL
const lp_Integral = 1;					// resolver usando enteros?
const lp_Fraction = lp_Integral+1;		// usando fracciones?
const lp_Decimal = lp_Fraction+1;		// usando decimales?

// estado de PL
const lp_no_problem = 0;				// no hay problema (aún)
const lp_parsed = lp_no_problem+1;		// problema parseado o leído
const lp_phase1 = lp_parsed+1;			// se terminó la fase I
const lp_phase2 = lp_phase1+1;			// se terminó la fase II
const lp_optimal = lp_phase2+1;			// completamente terminado. no necesariamente la fase 2 para programación entera
const lp_no_solution = lp_optimal+1;	// no hay solución, no continuar

// nivel de verbosidad
const lp_verbosity_none = 0;			// cuánta verbosidad hay que usar? (cuànto "texto" a mostrar)
const lp_verbosity_tableaus = lp_verbosity_none + 1;		// mostrar todas las tablas
const lp_verbosity_solutions = lp_verbosity_tableaus + 1;	// mostrar todas las tablas y soluciones intermedias

// globales
var lp_verboseLevel = lp_verbosity_none;
var lp_reportErrorsTo = "";  			// vacío para reporte estándar, "alerta" o id de un elemento html
var lp_trace_string = "";				// string que contiene las tablas, soluciones, etc.

// mensajes de error (deberían ser reasignables por un contenedor de orden superior, pero de momento son constantes)
var lp_noLPErr = "No se ingresó problema de PL";
var lp_IllegCharsErr = "Caracteres ilegales";
var lp_UnspecMaxMinErr = "No se especificó max o min";
var lp_noRelationConstrErr = "Restricciones deben contener '=', '<=', or '>='";
var lo_tooManyTabloeausErr = "Número de tablas excede ";
var lp_emptyFeasibleRegionErr = "No hay solución, región factible vacía";
var lp_noMaxErr = "No hay valor máximo, la función puede ser arbitrariamente grande (no está acotada)";
var lp_noMinErr = "No hay valor mínimo, la función puede ser arbitrariamente grande en negativo"; //este no lo entiendo, cómo es cuando no se halla mínimo?
var lp_phase2TooSoonErr = "Intentando hacer fase II cuando la fase I no está completa";
var lp_badExprErr = "Algo es incorrecto en la expresión ";
var lp_illegalCoeffErr = "Coeficiente ilegal de ";
var lp_inExprErr = " en la expresión\n";
var lp_objNotSetErr = "Objetivo no definido en extractUnknowns";
var lp_noNiceSolutionErr = "No existe solución con los enteros deseados"



// Definiendo el lpProblem
// Hacer uno de los siguientes:
//   1) Proveer un lpProblem existente cuando se construye el objeto
//   2) Poner en problemStr un problema de PL completo
//		Para problemas de entera/mixta, agregar "integer x,y,x" como la última línea, con variables que deben ser enteras
//   3) Definir el objetivo con la función objetivo, con un string de la forma:
//         "[max|min]izar var = expresión lineal" y
//      Definir restricciones con un array de restricciones de la forma
//         "expresión linear <=, >=, o = número"
//   4) Definir maximize, objectiveName, unkowns, y numActualUnknowns, y
//      definir tableaus como un array de un elemento conteniendo la primer tabla
//
// Una vez que el problema está definido, llamar a solve().
//
// El éxito lo indica this.status, que puede ser lp_optimal o lp_no_solution.
//
// Para problemas ordinarios de PL, las soluciones, icluyendo todos los pasos intermedios, se encuentran en
// 		this.objectiveValues y this.solutions, con tablas en this.tableaus
//		Usar la rutina formatXXX() apropiada para dejarlos bien formateados.
//
// Para problemas de programación entera, la solución está en
// 		this.integerSolution y this.integerObjValue.
//		Usar formatIntegerXXX() para dejarlo bien formateado.


class lpProblem
{
	constructor ( problem = null ) {
			//expresión lineal a optimizar
		this.objective = (problem != null && typeof problem.objective == 'string') 
							? problem.objective : "";			

			// array de restricciones, expresión lineal <=, >=, o = número
		this.constraints = (problem != null && Array.isArray(problem.constraints)) 
							? problem.constraints.slice() : [];

			// programación entera/mixta?
		this.isIntegral = (problem != null && typeof problem.isIntegral == 'boolean') 
							? problem.isIntegral : false;

			// solve using integers, fractions, or decimals?
		this.mode = (problem != null && typeof problem.mode == 'number')
							? problem.mode : lp_Decimal;

			// false for minimize
		this.maximize = (problem != null && typeof problem.maximize == 'boolean') 
							? problem.maximize : true;

			// either supplied with string problem or generated
		this.objectiveName = (problem != null && typeof problem.objectiveName == 'string') 
							? problem.objectiveName : "Obj";

			// array of names of unknowns (includes slack/surplus variables)
		this.unknowns = (problem != null && Array.isArray(problem.unknowns)) 
							? problem.unknowns.slice() : [];

			// array of unknowns for which integer values are required (mixed programming)
		this.integerUnknowns = (problem != null && Array.isArray(problem.integerUnknowns)) 
							? problem.integerUnknowns.slice() : [];
			// whether or not to show the values of the slack and surplus variables in the solution
		this.showArtificialVariables = false;
			// initial matrix of system, a la Ax >= b.
			// doesn't need to be copied, as it won't change if already filled in
		this.systemMatrix = (problem != null && Array.isArray(problem.systemMatrix))
							? problem.systemMatrix : [];

		this.systemRowIsStarred = (problem != null && Array.isArray(problem.systemRowIsStarred))
							? problem.systemRowIsStarred : [];

			// same for right hand sides of constraints
		this.constraintRHS = (problem != null && Array.isArray(problem.constraintRHS))
							? problem.constraintRHS : [];

			// similar for objective function
		this.objectiveCoeffs = (problem != null && Array.isArray(problem.objectiveCoeffs))
							? problem.objectiveCoeffs : [];

			// additional constraints used in integer programming, indexed like integerUnknowns
		this.integerMins = (problem != null && Array.isArray(problem.integerMins))
							? problem.integerMins.slice() : [];
		this.integerMaxs = (problem != null && Array.isArray(problem.integerMaxs))
							? problem.integerMaxs.slice() : [];

			// how many original unknowns?
		this.numActualUnknowns = (problem != null && typeof problem.numActualUnknowns == 'number') 
							? problem.numActualUnknowns : 0;

		this.rowIsStarred = [];			// ith entry is true if i row is starred

		this.tableaus = [];				// array of tableaus
		this.tableauDimensions = [];	// number of rows, number of columns
		this.maxNumTableaus=50;			// quite arbitrary make it a setting if associated error is thrown

		this.status = lp_no_problem;	// are we there yet?

		this.solutions = [];			// array of intermediate solutions
		this.objectiveValues = [];		// array of intermediate objective values
		this.error = "";				// error message for badly set up problem etc
		this.message = "";				// message when there is no solution for one reason or another
		
		this.integerSolution = [];		// used to return solution to integer programming problems
		this.integerObjValue = 0;
		
		this.problemStr = (problem != null && typeof problem == 'string') ? problem : "";
		
		// settings
		this.maxSigDigits = 13;			// try to push to 16 but issues with roundSigDig which internally uses three more
		this.sigDigits = 6;				// user specified for rounding of tableaus and results
		
	}
	

	// Functions
	
	solve ( ) {}								// solve it, return true if succeeded

	formatObjectiveValues ( mode = 0 ) {}			// return array of objective values, in proper form

	formatLastObjectiveValue ( mode = 0 ) {}		// same, just the last value										

											// return array of unknowns, with or w/o slack vars	
	formatUnknowns ( includeSlackVariables = false ) {}

											// use this to get the solutions, in proper form,
											// with or w/o slack vars
											// mode defaults to setting of this.mode
											// returns an array of arrays, each in order of unknowns
	formatSolutions ( includeSlackVariables = false, mode = 0 ) {}
	
											// same, but just last solution, not all intermediates
	formatLastSolution ( includeSlackVariables = false, mode = 0 ) {}

											// use these to get the integer solution when doing ILP
	formatIntegerObjectiveValue ( mode = 0) {}
	formatIntegerSolution ( includeSlackVariables = false ) {}

											// return string showing values of vars in last or integer solution,
											// using settings of showArtificialVariables & mode
	solutionToString () {}
											// same, but shows last solution, even if doing ILP
	lastSolutionToString () {}
}


// tableau class is a subclass of Array
// The 0th row and column contain labels
// The entries of the tableau itself are indexed from [1][1]
//
class tableau extends Array
{
	constructor ( arr = [] ) {			// construct from a given 2D array or tableau
		super();
		for ( var i = 0; i < arr.length; i++ )
			this[i] = arr[i].slice();
	}

	pivot ( pRow, pCol, sigDigs ) {}	// pivot, return a new tableau
	
	toString ( theMode, sigDigs ) {}	// returns an ascii formatted string representing the tableau
	
	toHTML ( theMode, sigDigs , params) {}		// returns an HTML table representing the tableau
}
