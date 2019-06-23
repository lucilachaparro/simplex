# simplex
Este solucionador de problemas de programación lineal permite ingresar un problema en español o inglés, luego lo analiza y lo resuelve. Para verlo en acción, abrir el archivo demo en un navegador.

## Para usarlo en un código propio
Usar el solucionador involucra cuatro pasos:

1. Crear un objeto lpProblem y especificar el problema de PL a resolver.
2. Fijar banderas describiendo el tipo de problema a resolver o el tipo de salida que se quiere.
3. Llamar a solve().
4. Recuperar la solución.

### Creando un lpProblem
Un nuevo objeto lpProblem se crea con
```
p = new lpProblem();
```
El constructor toma como argumento opcional, otro lpProblem para copiar. Si no se copia un objeto existente, el próximo paso es especificar el problema de PL a resolver. Esto se puede hacer de una de las siguientes maneras:

#### Especificar el problema de PL como string.

Establecer `p.problemStr` como un problema completo de PL, dado como string. El string debe tener la forma
```
Maximizar <objetivo linear> sujeto a
<restricciones lineales separadas por comas o saltos de línea>
```
`Maximizar` puede ser reemplazado por `minimizar` y puede usarse inglés también. Si se desea restringir una o más variables a valores enteros, se debe agregar lo siguiente al final del string:
```
integer <lista de variables separadas por comas>
```
Especificar expresiones lineales usando yuxtaposición para la multiplicación, es decir `2x + 3y`, no `2*x+3*y`. Usar `<=` y `>=` para especificar inecuaciones. La función objetivo puede ser especificada como expresión lineal o como una ecuación declarando el nombre de la función objetivo, de la forma `p = 2x + 3y`. Las restricciones deben tener la forma `<expresión lineal> <= <número>` donde la igualdad también puede ser `>=` o `=`. No colocar comas en los números (afecta al análisis).

#### Especificar el problema de LP fijando las propiedades de objetivo y restricciones.
- Fijar `p.objective` a un string representando la función objetivo, de la forma `[max|min]imizar [var =] <expresión lineal>`. 
- Fijar `p.constraints` a un arreglo de strings representando las restricciones.
- Si se está resolviendo un problema entero o mixto, fijar `p.isIntegral` a `true` y fijar `p.integerUnknowns` a un arreglo de nombres de variables que deben ser restringidas a valores enteros.

### Poniendo banderas
- `p.mode` puede tomar uno de los siguientes valores
  - `lp_Integral` para que todas las tablas tengan entradas enteras y salidas fraccionales.
  - `lp_Fraction` para que todas las tablas tengan entradas fraccionales y salidas también dadas como fracción.
  - `lp_Decimal` para que las tablas y soluciones usen notación decimal.
- `p.showArtificialVariables` por default está en `false`, en cuyo caso las variables de slack y superávit no se muestran como parte de las soluciones. Si se fija a `true`, estas variables se presentan en las soluciones.
- `p.sigDigits` es el número de dígitos significativos a mostrar en modo decimal en las entradas de las tablas y en soluciones. Por default queda en 6.
- `lp_verboseLevel` es una variable global que controla lo que se guarda en el string `lp_trace_string` mientras el problema está siendo resuelto. El default es no guardar nada. Si `lp_verboseLevel = lp_verbosity_tableaus`, se guardan todas las tablas intermedias. Si `lp_verboseLevel = lp_verbosity_solutions` entonces todas las tablas y las correspondientes soluciones básicas se guardan. El string guardado es HTML, adecuado para insertar en un `<div>`, por ejemplo, para mostrar en una página web.
- `lp_reportErrorsTo` es un string global que controla como se reportan los errores. Si está vacío (por default lo está), los errores no se reportan. Si se fija a `"alert"`, los errores causan alertas que son avisadas. Si se fija al ID de un elemento HTML, los errores se insertan en dicho elemento en la página.

### Llamando a `solve()`
Una vez que el problema está establecido y las banderas puestas correctamente, , llamar a `p.solve()`, que no toma argumentos. Si hay algún problema con la forma en que se planteó el problema, puede generar un error, que será un string describiendo el problema. El string estará también disponible como `p.error`.

### Recuperando la solución
Luego de llamar a `p.solve()`, checkear `p.status`, que será `lp_optimal` si se encontró una solución óptima, o `lp_no_solution` si no hubo solución. En este último caso, la propiedad `p.message` contiene un string indicando por qué no se encontró solución.

Asumiendo que se encontró una solución, `p.tableaus` será un arreglo de todas las tablas generadas por el método simplex (ver Tablas más abajo para más información acerca de las tablas y métodos para mostrarlas de forma correcta) y `p.solutions` será un arreglo de soluciones, siendo cada una un arreglo de valores para las variables. La propiedad `p.unknowns` es un arreglo con los nombres de las variables en el orden en el cual aparecen sus valores en las soluciones.

Para obtener las soluciones como strings bien formateados, llamar a una de las siguientes:

- `p.solutionToString()` retorna un string con la solución del problema, según lo establecido en `p.showArtificialVariables` y `p.mode`.
- `p.lastSolutionToString()` es usado internamente para retornar la solución básica de la última tabla, que no necesariamente será la solución del problema en el caso de programación lineal entera o mixta.
- `p.formatUnknowns ( includeArtificalVariables )` retorna un arerglo con los nombres de las incógnitas en el orden usado en las funciones siguientes. El argumento opcional indica si se incluyen o no las variables de slack o superávit (default: `false`).
- `p.formatLastSolution ( includeArtificalVariables, mode )` retorna la solución del problema como un arreglo de strings dando los valores de las variables en el orden especificado en `p.unknowns`. Los argumentos opcionales indican si se incluyen o no las variables de slack o superávit (default: `false`) y el modo de solución a mostrar (default: valor de `p.mode`).
- `p.formatIntegerSolution ( includeArtificalVariables, mode )` es la rutina correspondiente a usar si se hace programación lineal entera o mixta.
- `p.formatLastObjectiveValue ( mode )` retorna un string representando el valor óptimo de la función objetivo (para PL no entera/mixta). mode es opcional, por default queda como `p.mode`.
- `p.formatIntegerObjectiveValue ( mode )` es la rutina correspondiente a usar si se hace programación lineal entera o mixta.
- `p.formatSolutions ( includeArtificalVariables, mode )` es similar a `formatLastSolution`, pero retorna un arreglo de soluciones básicas, una para cada tabla generada por el método simplex.
- `p.formatObjectiveValues ( mode )` es similar a `formatLastObjectiveValue` pero retorna un arreglo de todos los valores de la función objetivo para todas las tablas.

## Tablas
La clase `tableau` extiende `Array`; las tablas son arreglos de dos dimensiones. La fila 0 contiene los nombres de las variables correspondientes a cada columna y la columna 0 contiene las variables actualmente activas correspondientes a cada fila. La tabla en sí empieza en el index [1][1], de forma que la matriz propiamente dicha usa indexado empezando en 1.

Hay tres métodos agregados a la clase `Array`:

- `pivot ( row, col, sigDigs )` hace cálculo con el pivot en `[row][col]` y retorna una nueva tabla. `sigDigs` se usa para mitigar el error y usualmente debe estar fijado en un número alto, como 13.
- `toString ( mode, sigDigs )` retorna un string formateado en ASCII representando la tabla. No contiene tags HTML y puede se usado en tags como `<pre>` (pero los tags no son parte del string). `mode` es uno de los siguientes: `lp_Integral`, `lp_Fraction`, o `lp_Decimal`, y `sigDigs` es usado para redondear las entradas, por lo que puede ser un número como 6.
- `toHTML ( mode, sigDigs, params )` retorna un string de código HTML representando la tabla como una `<table>`. `mode` y `sigDigs` funcionan como para `toString`. `params` es un argumento opcional: si tiene una propiedad `cellPadding`, la misma se usa para el padding en la `<table>`  (default: 10); si tiene una propiedad `lineColor`, la misma se usa para determinar el color de las líneas que separan las primeras y últimas filas y columnas del resto de la tabla (default: `"black"`).
