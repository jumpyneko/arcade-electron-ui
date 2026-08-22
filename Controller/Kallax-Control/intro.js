autowatch = 1;
inlets = 1;
outlets = 2;

/*
    IMAGE-BASED COLOUR TEXTURE

    start
        Clear to black, reveal all physical squares in random order,
        then continue with soft random colour variations.

    stop
        Freeze the current image.

    restart
        Begin again from black.

    black
        Stop and switch everything off.

    revealspeed 80
        Milliseconds between revealed squares.

    textureinterval 350
        Milliseconds between texture changes.

    changes 2
        Number of random squares changed per texture step.

    variation 0.08
        Strength of the colour variation, from 0.0 to 0.30.

    brightness 1.0
        Overall brightness, from 0.0 to 1.5.
*/

var revealIntervalMs = 250;
var textureIntervalMs = 450;
var squaresPerTextureStep = 5;
var variationAmount = 0.5;
var brightnessValue = 1.0;

var mode = "idle";
var revealOrder = [];
var revealPosition = 0;
var currentColors = [];

var animationTask = new Task(tick, this);

var commandQueue = [];
var queueTask = new Task(sendQueueChunk, this);
var queueChunkSize = 10;
var queueDelayMs = 12;
var queueBusy = false;


// --------------------------------------------------
// COLOUR MAP SAMPLED FROM THE REFERENCE IMAGE
// 5 rows x 10 columns
// --------------------------------------------------

var baseColors = [
    [
        [114,197,227], [87,191,232], [195,224,220], [162,212,236], [202,225,237],
        [93,193,236], [68,189,236], [68,187,236], [91,192,231], [205,229,239]
    ],
    [
        [248,209,111], [144,185,225], [203,216,233], [81,172,224], [78,179,229],
        [133,167,213], [190,211,236], [210,198,223], [218,228,237], [226,230,236]
    ],
    [
        [193,120,58], [218,66,73], [231,139,74], [226,162,67], [212,222,82],
        [238,174,66], [232,161,65], [126,45,47], [251,223,121], [240,179,77]
    ],
    [
        [237,177,80], [218,155,65], [250,228,108], [247,203,70], [247,208,135],
        [242,225,148], [245,199,116], [218,164,67], [241,183,92], [156,59,55]
    ],
    [
        [31,31,31], [209,139,62], [238,170,104], [210,131,60], [225,115,92],
        [209,171,69], [191,116,61], [191,106,55], [204,104,56], [158,60,51]
    ]
];


// --------------------------------------------------
// LED MAPPINGS
// --------------------------------------------------

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


// Physical 10 x 5 display.
var screen = [
    [
        {o:0,d:1},{o:0,d:2},{o:0,d:3},{o:0,d:4},{o:0,d:5},
        {o:1,d:1},{o:1,d:2},{o:1,d:3},{o:1,d:4},{o:1,d:5}
    ],
    [
        {o:0,d:6},{o:0,d:7},{o:0,d:8},{o:0,d:9},{o:0,d:10},
        {o:1,d:6},{o:1,d:7},{o:1,d:8},{o:1,d:9},{o:1,d:10}
    ],
    [
        {o:0,d:11},{o:0,d:12},{o:0,d:13},{o:0,d:14},{o:0,d:15},
        {o:1,d:11},{o:1,d:12},{o:1,d:13},{o:1,d:14},{o:1,d:15}
    ],
    [
        {o:0,d:16},{o:0,d:17},{o:0,d:18},{o:0,d:19},{o:0,d:20},
        {o:1,d:16},{o:1,d:17},{o:1,d:18},{o:1,d:19},{o:1,d:20}
    ],
    [
        null,
        {o:0,d:22},{o:0,d:23},{o:0,d:24},{o:0,d:25},
        {o:1,d:21},{o:1,d:22},{o:1,d:23},{o:1,d:24},
        null
    ]
];


// --------------------------------------------------
// MAIN COMMANDS
// --------------------------------------------------

function start()
{
    animationTask.cancel();
    cancelQueue();

    sendAll(0, 0, 0);

    buildInitialColors();
    buildRevealOrder();

    revealPosition = 0;
    mode = "reveal";

    animationTask.schedule(80);
}

function restart()
{
    start();
}

function stop()
{
    mode = "idle";
    animationTask.cancel();
}

function black()
{
    mode = "idle";
    animationTask.cancel();
    cancelQueue();
    sendAll(0, 0, 0);
}

function once()
{
    if (mode === "texture" && !queueBusy)
    {
        updateTexture();
    }
}


// --------------------------------------------------
// CLOCK
// --------------------------------------------------

function tick()
{
    if (mode === "reveal")
    {
        revealNextSquare();
    }
    else if (mode === "texture")
    {
        updateTexture();
    }
}


// --------------------------------------------------
// RANDOM REVEAL
// --------------------------------------------------

function revealNextSquare()
{
    var item;
    var rgb;

    if (queueBusy)
    {
        animationTask.schedule(20);
        return;
    }

    if (revealPosition >= revealOrder.length)
    {
        mode = "texture";
        animationTask.schedule(textureIntervalMs);
        return;
    }

    item = revealOrder[revealPosition];
    rgb = currentColors[item.y][item.x];

    queueOneCell(
        item.x,
        item.y,
        rgb[0],
        rgb[1],
        rgb[2]
    );

    revealPosition++;
    animationTask.schedule(revealIntervalMs);
}

function buildRevealOrder()
{
    var x;
    var y;
    var i;
    var j;
    var temp;

    revealOrder = [];

    for (y = 0; y < 5; y++)
    {
        for (x = 0; x < 10; x++)
        {
            if (screen[y][x])
            {
                revealOrder.push({x:x, y:y});
            }
        }
    }

    // Fisher-Yates shuffle.
    for (i = revealOrder.length - 1; i > 0; i--)
    {
        j = Math.floor(Math.random() * (i + 1));
        temp = revealOrder[i];
        revealOrder[i] = revealOrder[j];
        revealOrder[j] = temp;
    }
}


// --------------------------------------------------
// SOFT MOVING TEXTURE
// --------------------------------------------------

function updateTexture()
{
    var chosen = [];
    var available = [];
    var i;
    var index;
    var item;
    var newColor;

    if (mode !== "texture")
    {
        return;
    }

    if (queueBusy)
    {
        animationTask.schedule(20);
        return;
    }

    for (i = 0; i < revealOrder.length; i++)
    {
        available.push(i);
    }

    while (
        chosen.length < squaresPerTextureStep
        && available.length > 0
    )
    {
        index = Math.floor(Math.random() * available.length);
        chosen.push(available[index]);
        available.splice(index, 1);
    }

    commandQueue = [];

    for (i = 0; i < chosen.length; i++)
    {
        item = revealOrder[chosen[i]];
        newColor = variedColor(baseColors[item.y][item.x]);

        currentColors[item.y][item.x] = newColor;

        queueCellWithoutShow(
            item.x,
            item.y,
            newColor[0],
            newColor[1],
            newColor[2]
        );
    }

    queueShowsForCommands();
    beginQueue();

    animationTask.schedule(textureIntervalMs);
}


// --------------------------------------------------
// COLOUR VARIATION
// --------------------------------------------------

function variedColor(baseRgb)
{
    var hsv = rgbToHsv(
        baseRgb[0],
        baseRgb[1],
        baseRgb[2]
    );

    var hueShift = randomSigned() * variationAmount * 0.12;
    var saturationShift = randomSigned() * variationAmount * 0.35;
    var valueShift = randomSigned() * variationAmount * 0.45;

    hsv[0] = wrap01(hsv[0] + hueShift);
    hsv[1] = clamp(hsv[1] + saturationShift, 0.0, 1.0);
    hsv[2] = clamp(hsv[2] + valueShift, 0.05, 1.0);

    return hsvToRgb(hsv[0], hsv[1], hsv[2]);
}

function buildInitialColors()
{
    var x;
    var y;

    currentColors = [];

    for (y = 0; y < 5; y++)
    {
        currentColors[y] = [];

        for (x = 0; x < 10; x++)
        {
            currentColors[y][x] = [
                baseColors[y][x][0],
                baseColors[y][x][1],
                baseColors[y][x][2]
            ];
        }
    }
}


// --------------------------------------------------
// QUEUE CELLS
// --------------------------------------------------

function queueOneCell(x, y, r, g, b)
{
    commandQueue = [];

    queueCellWithoutShow(x, y, r, g, b);
    queueShowsForCommands();
    beginQueue();
}

function queueCellWithoutShow(x, y, r, g, b)
{
    var cell = screen[y][x];

    if (!cell)
    {
        return;
    }

    queueDoorColor(
        cell.o,
        cell.d,
        r * brightnessValue,
        g * brightnessValue,
        b * brightnessValue
    );
}

function queueDoorColor(outletNumber, doorNumber, r, g, b)
{
    var mapping;
    var leds;
    var i;

    mapping = outletNumber === 0 ? leftMap : rightMap;
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

function queueShowsForCommands()
{
    var leftChanged = false;
    var rightChanged = false;
    var i;

    for (i = 0; i < commandQueue.length; i++)
    {
        if (commandQueue[i].outletNumber === 0)
        {
            leftChanged = true;
        }
        else
        {
            rightChanged = true;
        }
    }

    if (leftChanged)
    {
        commandQueue.push({
            outletNumber: 0,
            command: ["/led/show"]
        });
    }

    if (rightChanged)
    {
        commandQueue.push({
            outletNumber: 1,
            command: ["/led/show"]
        });
    }
}


// --------------------------------------------------
// QUEUE DELIVERY
// --------------------------------------------------

function beginQueue()
{
    if (commandQueue.length === 0)
    {
        queueBusy = false;
        return;
    }

    queueBusy = true;
    sendQueueChunk();
}

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
        outlet(item.outletNumber, item.command);
        count++;
    }

    if (commandQueue.length > 0)
    {
        queueTask.schedule(queueDelayMs);
    }
    else
    {
        queueBusy = false;
    }
}

function cancelQueue()
{
    queueTask.cancel();
    commandQueue = [];
    queueBusy = false;
}


// --------------------------------------------------
// FULL DISPLAY COMMAND
// --------------------------------------------------

function sendAll(r, g, b)
{
    outlet(0, ["/led/all", clamp255(r), clamp255(g), clamp255(b)]);
    outlet(1, ["/led/all", clamp255(r), clamp255(g), clamp255(b)]);
}


// --------------------------------------------------
// CONTROLS
// --------------------------------------------------

function revealspeed(ms)
{
    revealIntervalMs = Math.max(20, Number(ms));
}

function textureinterval(ms)
{
    textureIntervalMs = Math.max(80, Number(ms));
}

function changes(value)
{
    squaresPerTextureStep = Math.max(
        1,
        Math.min(8, parseInt(value, 10))
    );
}

function variation(value)
{
    variationAmount = clamp(Number(value), 0.0, 0.30);
}

function brightness(value)
{
    brightnessValue = clamp(Number(value), 0.0, 1.5);
}


// --------------------------------------------------
// HSV CONVERSION
// --------------------------------------------------

function rgbToHsv(r, g, b)
{
    r /= 255.0;
    g /= 255.0;
    b /= 255.0;

    var maxValue = Math.max(r, g, b);
    var minValue = Math.min(r, g, b);
    var difference = maxValue - minValue;
    var h = 0.0;
    var s = maxValue === 0 ? 0 : difference / maxValue;
    var v = maxValue;

    if (difference !== 0)
    {
        if (maxValue === r)
        {
            h = ((g - b) / difference) % 6;
        }
        else if (maxValue === g)
        {
            h = (b - r) / difference + 2;
        }
        else
        {
            h = (r - g) / difference + 4;
        }

        h /= 6.0;

        if (h < 0)
        {
            h += 1.0;
        }
    }

    return [h, s, v];
}

function hsvToRgb(h, s, v)
{
    var i = Math.floor(h * 6.0);
    var f = h * 6.0 - i;
    var p = v * (1.0 - s);
    var q = v * (1.0 - f * s);
    var t = v * (1.0 - (1.0 - f) * s);
    var r;
    var g;
    var b;

    switch (i % 6)
    {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        default: r = v; g = p; b = q; break;
    }

    return [
        clamp255(r * 255.0),
        clamp255(g * 255.0),
        clamp255(b * 255.0)
    ];
}


// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function randomSigned()
{
    return Math.random() * 2.0 - 1.0;
}

function wrap01(value)
{
    while (value < 0.0)
    {
        value += 1.0;
    }

    while (value >= 1.0)
    {
        value -= 1.0;
    }

    return value;
}

function clamp(value, minimum, maximum)
{
    return Math.max(minimum, Math.min(maximum, value));
}

function clamp255(value)
{
    return Math.round(clamp(Number(value), 0, 255));
}
