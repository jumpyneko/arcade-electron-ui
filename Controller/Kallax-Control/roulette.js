autowatch = 1;
inlets = 1;
outlets = 2;


/*
    RANDOM PIXEL ROULETTE

    One of the 48 valid squares is illuminated.
    The illuminated square changes randomly.

    Warm-white colour at full brightness:
    255 130 40
*/


/* Time between roulette changes */
var intervalMs = 100;

/* Overall brightness: 0.0 to 1.0 */
var brightnessValue = 1.0;

/* Warm-white colour */
var lightR = 255;
var lightG = 130;
var lightB = 40;

var running = false;
var currentPosition = -1;
var previousPosition = -1;

var animationTask = new Task(tick, this);

var commandQueue = [];
var queueTask = new Task(sendQueueChunk, this);
var queueChunkSize = 32;
var queueBusy = false;


/*
    LED mapping: left cabinet
*/

var leftMap = {
1:[24,25,26,27,28,29,30,31],
2:[32,33,34,35,36,37,38,39],
3:[104,105,106,107,108,109,110,111],
4:[112,113,114,115,116,117,118,119],
5:[184,185,186,187,188,189,190,191],

6:[16,17,18,19,20,21,22,23],
7:[40,41,42,43,44,45,46,47],
8:[96,97,98,99,100,101,102,103],
9:[120,121,122,123,124,125,126,127],
10:[176,177,178,179,180,181,182,183],

11:[8,9,10,11,12,13,14,15],
12:[48,49,50,51,52,53,54,55],
13:[88,89,90,91,92,93,94,95],
14:[128,129,130,131,132,133,134,135],
15:[168,169,170,171,172,173,174,175],

16:[0,1,2,3,4,5,6,7],
17:[56,57,58,59,60,61,62,63],
18:[80,81,82,83,84,85,86,87],
19:[136,137,138,139,140,141,142,143],
20:[160,161,162,163,164,165,166,167],

22:[64,65,66,67,68,69,70,71],
23:[72,73,74,75,76,77,78,79],
24:[144,145,146,147,148,149,150,151],
25:[152,153,154,155,156,157,158,159]
};


/*
    LED mapping: right cabinet
*/

var rightMap = {
1:[184,185,186,187,188,189,190,191],
2:[112,113,114,115,116,117,118,119],
3:[104,105,106,107,108,109,110,111],
4:[32,33,34,35,36,37,38,39],
5:[24,25,26,27,28,29,30,31],

6:[176,177,178,179,180,181,182,183],
7:[120,121,122,123,124,125,126,127],
8:[96,97,98,99,100,101,102,103],
9:[40,41,42,43,44,45,46,47],
10:[16,17,18,19,20,21,22,23],

11:[168,169,170,171,172,173,174,175],
12:[128,129,130,131,132,133,134,135],
13:[88,89,90,91,92,93,94,95],
14:[48,49,50,51,52,53,54,55],
15:[8,9,10,11,12,13,14,15],

16:[160,161,162,163,164,165,166,167],
17:[136,137,138,139,140,141,142,143],
18:[80,81,82,83,84,85,86,87],
19:[56,57,58,59,60,61,62,63],
20:[0,1,2,3,4,5,6,7],

21:[152,153,154,155,156,157,158,159],
22:[144,145,146,147,148,149,150,151],
23:[72,73,74,75,76,77,78,79],
24:[64,65,66,67,68,69,70,71]
};


/*
    The two cabinets are treated as one continuous display.

    o: outlet/cabinet
       0 = left
       1 = right

    d: door number
*/

var screen = [
[
    {o:0,d:1},
    {o:0,d:2},
    {o:0,d:3},
    {o:0,d:4},
    {o:0,d:5},

    {o:1,d:1},
    {o:1,d:2},
    {o:1,d:3},
    {o:1,d:4},
    {o:1,d:5}
],
[
    {o:0,d:6},
    {o:0,d:7},
    {o:0,d:8},
    {o:0,d:9},
    {o:0,d:10},

    {o:1,d:6},
    {o:1,d:7},
    {o:1,d:8},
    {o:1,d:9},
    {o:1,d:10}
],
[
    {o:0,d:11},
    {o:0,d:12},
    {o:0,d:13},
    {o:0,d:14},
    {o:0,d:15},

    {o:1,d:11},
    {o:1,d:12},
    {o:1,d:13},
    {o:1,d:14},
    {o:1,d:15}
],
[
    {o:0,d:16},
    {o:0,d:17},
    {o:0,d:18},
    {o:0,d:19},
    {o:0,d:20},

    {o:1,d:16},
    {o:1,d:17},
    {o:1,d:18},
    {o:1,d:19},
    {o:1,d:20}
],
[
    null,

    {o:0,d:22},
    {o:0,d:23},
    {o:0,d:24},
    {o:0,d:25},

    {o:1,d:21},
    {o:1,d:22},
    {o:1,d:23},
    {o:1,d:24},

    null
]
];


/*
    List containing only the 48 valid positions.
*/

var validPositions = buildValidPositions();


/*
    Start the roulette.

    It first switches every LED to black, then selects
    the first random square.
*/

function start()
{
    if (running)
    {
        return;
    }

    running = true;

    animationTask.cancel();
    queueTask.cancel();

    commandQueue = [];
    queueBusy = false;

    currentPosition = -1;
    previousPosition = -1;

    clearAll();
    animationTask.schedule(100);
}


/*
    Stop the roulette.

    The currently selected square remains illuminated.
*/

function stop()
{
    running = false;
    animationTask.cancel();
}


/*
    Stop and switch everything to black.
*/

function black()
{
    running = false;

    animationTask.cancel();
    queueTask.cancel();

    commandQueue = [];
    queueBusy = false;

    currentPosition = -1;
    previousPosition = -1;

    clearAll();
}


/*
    Select one new random position without starting
    the continuous animation.
*/

function once()
{
    if (queueBusy)
    {
        return;
    }

    selectNewPosition();
}


/*
    Set the roulette interval from Max.

    Example:
    interval 400
*/

function interval(ms)
{
    intervalMs = Math.max(
        50,
        Number(ms)
    );
}


/*
    Set the overall brightness from Max.

    Example:
    brightness 0.8
*/

function brightness(value)
{
    brightnessValue = clamp(
        Number(value),
        0.0,
        1.0
    );

    /*
        Update the currently illuminated square
        immediately.
    */

    if (
        currentPosition >= 0
        && !queueBusy
    )
    {
        illuminateCurrentPosition();
    }
}


/*
    Change the roulette colour from Max.

    Example:
    color 255 130 40
*/

function color(r, g, b)
{
    lightR = clamp255(r);
    lightG = clamp255(g);
    lightB = clamp255(b);

    if (
        currentPosition >= 0
        && !queueBusy
    )
    {
        illuminateCurrentPosition();
    }
}


/*
    Main animation clock.
*/

function tick()
{
    if (!running)
    {
        return;
    }

    if (!queueBusy)
    {
        selectNewPosition();
    }

    if (running)
    {
        animationTask.schedule(intervalMs);
    }
}


/*
    Randomly select a different position.
*/

function selectNewPosition()
{
    var nextPosition;

    if (validPositions.length === 0)
    {
        return;
    }

    /*
        Avoid immediately selecting the same square.
    */

    do
    {
        nextPosition = Math.floor(
            Math.random() * validPositions.length
        );
    }
    while (
        validPositions.length > 1
        && nextPosition === currentPosition
    );

    previousPosition = currentPosition;
    currentPosition = nextPosition;

    renderRouletteStep();
}


/*
    Switch off the previous square and illuminate
    the new square.
*/

function renderRouletteStep()
{
    var previousCell;
    var currentCell;

    if (queueBusy)
    {
        return;
    }

    queueBusy = true;

    commandQueue = [];
    queueTask.cancel();

    /*
        Turn the previous position black.
    */

    if (previousPosition >= 0)
    {
        previousCell = validPositions[previousPosition];

        queueDoorColor(
            previousCell.o,
            previousCell.d,
            0,
            0,
            0
        );
    }

    /*
        Illuminate the new position.
    */

    if (currentPosition >= 0)
    {
        currentCell = validPositions[currentPosition];

        queueDoorColor(
            currentCell.o,
            currentCell.d,
            lightR * brightnessValue,
            lightG * brightnessValue,
            lightB * brightnessValue
        );
    }

    /*
        Update both cabinets together.
    */

    queueShowCommands();
    sendQueueChunk();
}


/*
    Re-send the illuminated square at the current
    brightness or colour.
*/

function illuminateCurrentPosition()
{
    var currentCell;

    if (currentPosition < 0)
    {
        return;
    }

    queueBusy = true;

    commandQueue = [];
    queueTask.cancel();

    currentCell = validPositions[currentPosition];

    queueDoorColor(
        currentCell.o,
        currentCell.d,
        lightR * brightnessValue,
        lightG * brightnessValue,
        lightB * brightnessValue
    );

    queueShowCommands();
    sendQueueChunk();
}


/*
    Add /led/show for both cabinets.
*/

function queueShowCommands()
{
    commandQueue.push({
        outletNumber: 0,
        command: ["/led/show"]
    });

    commandQueue.push({
        outletNumber: 1,
        command: ["/led/show"]
    });
}


/*
    Convert the screen layout into a simple array
    containing exactly 48 valid squares.
*/

function buildValidPositions()
{
    var positions = [];
    var y;
    var x;
    var cell;

    for (y = 0; y < screen.length; y++)
    {
        for (x = 0; x < screen[y].length; x++)
        {
            cell = screen[y][x];

            if (cell)
            {
                positions.push({
                    o: cell.o,
                    d: cell.d,
                    x: x,
                    y: y
                });
            }
        }
    }

    return positions;
}


/*
    Queue all eight LEDs belonging to one square.
*/

function queueDoorColor(
    outletNumber,
    doorNumber,
    r,
    g,
    b
)
{
    var mapping;
    var leds;
    var i;

    if (outletNumber === 0)
    {
        mapping = leftMap;
    }
    else
    {
        mapping = rightMap;
    }

    leds = mapping[doorNumber];

    if (!leds)
    {
        return;
    }

    for (i = 0; i < leds.length; i++)
    {
        commandQueue.push({
            outletNumber: outletNumber,
            command: [
                "/led/set_noshow",
                leds[i],
                clamp255(r),
                clamp255(g),
                clamp255(b)
            ]
        });
    }
}


/*
    Send the queued OSC commands in small chunks.
*/

function sendQueueChunk()
{
    var count = 0;
    var item;

    while (
        commandQueue.length > 0
        && count < queueChunkSize
    )
    {
        item = commandQueue.shift();

        sendCommand(
            item.outletNumber,
            item.command
        );

        count++;
    }

    if (commandQueue.length > 0)
    {
        queueTask.schedule(10);
    }
    else
    {
        queueBusy = false;
    }
}


/*
    Switch all LEDs on both Raspberry Pis to black.

    This uses the Raspberry Pi /led/all command.
*/

function clearAll()
{
    outlet(
        0,
        ["/led/all", 0, 0, 0]
    );

    outlet(
        1,
        ["/led/all", 0, 0, 0]
    );
}


/*
    Send one OSC command to the appropriate outlet.
*/

function sendCommand(outletNumber, command)
{
    outlet(outletNumber, command);
}


function clamp(value, minimum, maximum)
{
    return Math.max(
        minimum,
        Math.min(maximum, value)
    );
}


function clamp255(value)
{
    return Math.round(
        clamp(Number(value), 0, 255)
    );
}