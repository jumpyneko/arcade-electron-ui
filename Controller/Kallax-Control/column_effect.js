
autowatch = 1;
inlets = 1;
outlets = 2;


// --------------------------------------------------
// SETTINGS
// --------------------------------------------------

var intervalMs = 250;
var currentFrame = 0;
var looping = false;

var red = 255;
var green = 255;
var blue = 255;


// --------------------------------------------------
// LEFT CABINET LED MAPPING
// --------------------------------------------------

var leftMap = {

    1: [
        24, 25, 26, 27,
        28, 29, 30, 31
    ],

    2: [
        32, 33, 34, 35,
        36, 37, 38, 39
    ],

    3: [
        104, 105, 106, 107,
        108, 109, 110, 111
    ],

    4: [
        112, 113, 114, 115,
        116, 117, 118, 119
    ],

    5: [
        184, 185, 186, 187,
        188, 189, 190, 191
    ],

    6: [
        16, 17, 18, 19,
        20, 21, 22, 23
    ],

    7: [
        40, 41, 42, 43,
        44, 45, 46, 47
    ],

    8: [
        96, 97, 98, 99,
        100, 101, 102, 103
    ],

    9: [
        120, 121, 122, 123,
        124, 125, 126, 127
    ],

    10: [
        176, 177, 178, 179,
        180, 181, 182, 183
    ],

    11: [
        8, 9, 10, 11,
        12, 13, 14, 15
    ],

    12: [
        48, 49, 50, 51,
        52, 53, 54, 55
    ],

    13: [
        88, 89, 90, 91,
        92, 93, 94, 95
    ],

    14: [
        128, 129, 130, 131,
        132, 133, 134, 135
    ],

    15: [
        168, 169, 170, 171,
        172, 173, 174, 175
    ],

    16: [
        0, 1, 2, 3,
        4, 5, 6, 7
    ],

    17: [
        56, 57, 58, 59,
        60, 61, 62, 63
    ],

    18: [
        80, 81, 82, 83,
        84, 85, 86, 87
    ],

    19: [
        136, 137, 138, 139,
        140, 141, 142, 143
    ],

    20: [
        160, 161, 162, 163,
        164, 165, 166, 167
    ],

    22: [
        64, 65, 66, 67,
        68, 69, 70, 71
    ],

    23: [
        72, 73, 74, 75,
        76, 77, 78, 79
    ],

    24: [
        144, 145, 146, 147,
        148, 149, 150, 151
    ],

    25: [
        152, 153, 154, 155,
        156, 157, 158, 159
    ]
};


// --------------------------------------------------
// RIGHT CABINET LED MAPPING
// --------------------------------------------------

var rightMap = {

    1: [
        184, 185, 186, 187,
        188, 189, 190, 191
    ],

    2: [
        112, 113, 114, 115,
        116, 117, 118, 119
    ],

    3: [
        104, 105, 106, 107,
        108, 109, 110, 111
    ],

    4: [
        32, 33, 34, 35,
        36, 37, 38, 39
    ],

    5: [
        24, 25, 26, 27,
        28, 29, 30, 31
    ],

    6: [
        176, 177, 178, 179,
        180, 181, 182, 183
    ],

    7: [
        120, 121, 122, 123,
        124, 125, 126, 127
    ],

    8: [
        96, 97, 98, 99,
        100, 101, 102, 103
    ],

    9: [
        40, 41, 42, 43,
        44, 45, 46, 47
    ],

    10: [
        16, 17, 18, 19,
        20, 21, 22, 23
    ],

    11: [
        168, 169, 170, 171,
        172, 173, 174, 175
    ],

    12: [
        128, 129, 130, 131,
        132, 133, 134, 135
    ],

    13: [
        88, 89, 90, 91,
        92, 93, 94, 95
    ],

    14: [
        48, 49, 50, 51,
        52, 53, 54, 55
    ],

    15: [
        8, 9, 10, 11,
        12, 13, 14, 15
    ],

    16: [
        160, 161, 162, 163,
        164, 165, 166, 167
    ],

    17: [
        136, 137, 138, 139,
        140, 141, 142, 143
    ],

    18: [
        80, 81, 82, 83,
        84, 85, 86, 87
    ],

    19: [
        56, 57, 58, 59,
        60, 61, 62, 63
    ],

    20: [
        0, 1, 2, 3,
        4, 5, 6, 7
    ],

    21: [
        152, 153, 154, 155,
        156, 157, 158, 159
    ],

    22: [
        144, 145, 146, 147,
        148, 149, 150, 151
    ],

    23: [
        72, 73, 74, 75,
        76, 77, 78, 79
    ],

    24: [
        64, 65, 66, 67,
        68, 69, 70, 71
    ]
};


// --------------------------------------------------
// COLUMN FRAMES
// Right side to left side
// --------------------------------------------------

var leftFrames = [
    [5, 10, 15, 20, 25],
    [4, 9, 14, 19, 24],
    [3, 8, 13, 18, 23],
    [2, 7, 12, 17, 22],
    [1, 6, 11, 16]
];

var rightFrames = [
    [5, 10, 15, 20],
    [4, 9, 14, 19, 24],
    [3, 8, 13, 18, 23],
    [2, 7, 12, 17, 22],
    [1, 6, 11, 16, 21]
];

// --------------------------------------------------
// Screen frames
// --------------------------------------------------

var screenFrames = [
    { outlet: 0, doors: leftFrames[0],  mapping: leftMap  },
    { outlet: 0, doors: leftFrames[1],  mapping: leftMap  },
    { outlet: 0, doors: leftFrames[2],  mapping: leftMap  },
    { outlet: 0, doors: leftFrames[3],  mapping: leftMap  },
    { outlet: 0, doors: leftFrames[4],  mapping: leftMap  },

    // Reverse these if the right cabinet's physical left-to-right direction differs
    { outlet: 1, doors: rightFrames[0], mapping: rightMap },
    { outlet: 1, doors: rightFrames[1], mapping: rightMap },
    { outlet: 1, doors: rightFrames[2], mapping: rightMap },
    { outlet: 1, doors: rightFrames[3], mapping: rightMap },
    { outlet: 1, doors: rightFrames[4], mapping: rightMap }
];

// --------------------------------------------------
// TIMER
// --------------------------------------------------

var animationTask = new Task(playNextFrame, this);


// --------------------------------------------------
// SEND A COMPLETE COMMAND
// --------------------------------------------------

function sendCommand(outletNumber, command)
{
    outlet(outletNumber, command);
}


// --------------------------------------------------
// DRAW ONE CABINET FRAME
// --------------------------------------------------

function setDoors(outletNumber, doors, mapping, r, g, b)
{
    var doorIndex;
    var ledIndex;
    var doorNumber;
    var leds;
    var command;

    for (
        doorIndex = 0;
        doorIndex < doors.length;
        doorIndex++
    )
    {
        doorNumber = doors[doorIndex];
        leds = mapping[doorNumber];

        if (!leds)
        {
            post(
                "No mapping for door "
                + doorNumber
                + "\n"
            );

            continue;
        }

        for (
            ledIndex = 0;
            ledIndex < leds.length;
            ledIndex++
        )
        {
            command = [
                "/led/set_noshow",
                leds[ledIndex],
                r,
                g,
                b
            ];

            sendCommand(
                outletNumber,
                command
            );
        }
    }
}


// --------------------------------------------------
// PLAY NEXT FRAME
// --------------------------------------------------

function playNextFrame()
{
    var previousIndex;
    var previous;
    var current;

    previousIndex = currentFrame - 1;

    if (previousIndex < 0)
    {
        previousIndex = screenFrames.length - 1;
    }

    previous = screenFrames[previousIndex];
    current = screenFrames[currentFrame];

    // Prepare the previous column as black
    setDoors(
        previous.outlet,
        previous.doors,
        previous.mapping,
        0,
        0,
        0
    );

    // Prepare the current column as lit
    setDoors(
        current.outlet,
        current.doors,
        current.mapping,
        red,
        green,
        blue
    );

    /*
       Commit only the cabinet or cabinets that changed.
       At the transition between cabinets, both must update.
    */
    sendCommand(previous.outlet, ["/led/show"]);

    if (current.outlet !== previous.outlet)
    {
        sendCommand(current.outlet, ["/led/show"]);
    }

    currentFrame++;

    if (currentFrame >= screenFrames.length)
    {
        if (looping)
        {
            currentFrame = 0;
        }
        else
        {
            currentFrame = 0;
            animationTask.cancel();
            return;
        }
    }

    animationTask.schedule(intervalMs);
}


// --------------------------------------------------
// START LOOPING
// --------------------------------------------------

function start()
{
    animationTask.cancel();

    looping = true;
    currentFrame = 0;

    playNextFrame();
}


// --------------------------------------------------
// PLAY ONCE
// --------------------------------------------------

function once()
{
    animationTask.cancel();

    looping = false;
    currentFrame = 0;

    playNextFrame();
}


// --------------------------------------------------
// STOP AND CLEAR
// --------------------------------------------------

function stop()
{
    animationTask.cancel();

    sendCommand(0, "/led/clear");
    sendCommand(0, "/led/show");

    sendCommand(1, "/led/clear");
    sendCommand(1, "/led/show");

    currentFrame = 0;
}


// --------------------------------------------------
// CHANGE INTERVAL
// Example: interval 500
// --------------------------------------------------

function interval(milliseconds)
{
    milliseconds = parseInt(
        milliseconds,
        10
    );

    if (isNaN(milliseconds))
    {
        post("Invalid interval\n");
        return;
    }

    if (milliseconds < 1)
    {
        milliseconds = 1;
    }

    intervalMs = milliseconds;

    post(
        "Column interval: "
        + intervalMs
        + " ms\n"
    );
}


// --------------------------------------------------
// CHANGE COLOR
// Example: color 255 0 0
// --------------------------------------------------

function color(r, g, b)
{
    red = clampColor(r);
    green = clampColor(g);
    blue = clampColor(b);

    post(
        "Column color: "
        + red
        + " "
        + green
        + " "
        + blue
        + "\n"
    );
}


// --------------------------------------------------
// COLOR LIMIT
// --------------------------------------------------

function clampColor(value)
{
    value = parseInt(value, 10);

    if (isNaN(value))
    {
        value = 0;
    }

    if (value < 0)
    {
        value = 0;
    }

    if (value > 255)
    {
        value = 255;
    }

    return value;
}