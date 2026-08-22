autowatch = 1;
inlets = 1;
outlets = 2;


/*
    THREE FLASHES + OPTIMIZED CENTRE-OUT FADE

    SEQUENCE

    1. All LEDs fade up/down three times.
       The third flash ends fully illuminated.

    2. All LEDs remain fully illuminated briefly.

    3. Physical column pairs fade from the centre
       toward the outside:

           centre:
               leftFrames[0] + rightFrames[4]

           then:
               leftFrames[1] + rightFrames[3]

               leftFrames[2] + rightFrames[2]

               leftFrames[3] + rightFrames[1]

           outside:
               leftFrames[4] + rightFrames[0]

    4. The final state is black.

    OPTIMIZATION

    - The three flashes use /led/all.
    - The column fade sends only columns whose
      brightness step has changed.
    - Columns that are waiting, or already black,
      are not repeatedly transmitted.
*/


// --------------------------------------------------
// COLOUR SETTINGS
// --------------------------------------------------

var lightR = 255;
var lightG = 130;
var lightB = 40;

var brightnessValue = 1.0;


// --------------------------------------------------
// FLASH SETTINGS
// --------------------------------------------------

/*
    Duration of one fade direction.

    Each normal flash consists of:
        fade up   = flashHalfMs
        fade down = flashHalfMs

    The third flash fades up and remains on.
*/
var flashHalfMs = 140;


/*
    Update interval during the flashes.
    /led/all sends only one message to each Pi.
*/
var flashIntervalMs = 30;


/*
    How long all LEDs remain fully illuminated
    after the third flash.
*/
var fullHoldMs = 700;


// --------------------------------------------------
// COLUMN FADE SETTINGS
// --------------------------------------------------

/*
    Duration of the fade for each column pair.
*/
var columnFadeMs = 900;


/*
    Delay before the next pair begins.

    Because this is shorter than columnFadeMs,
    the fades overlap.
*/
var pairStaggerMs = 650;


/*
    Number of brightness steps in each column fade.

    10 is relatively smooth while reducing OSC traffic.
*/
var columnFadeSteps = 10;


/*
    How often the column state is checked.

    No OSC is sent unless a column reaches
    a new brightness step.
*/
var columnCheckIntervalMs = 60;


// --------------------------------------------------
// OSC QUEUE SETTINGS
// --------------------------------------------------

var commandQueue = [];
var queueTask = new Task(sendQueueChunk, this);

var queueChunkSize = 48;
var queueDelayMs = 10;
var queueBusy = false;


// --------------------------------------------------
// EFFECT STATE
// --------------------------------------------------

var running = false;
var effectState = "idle";
var stateStartTime = 0;

var animationTask = new Task(tick, this);


/*
    Remember the last transmitted brightness step
    for each physical column.

    Global physical order:

        0  = far-left
        1
        2
        3
        4  = centre-left
        5  = centre-right
        6
        7
        8
        9  = far-right
*/

var lastColumnSteps = [
    1, 1, 1, 1, 1,
    1, 1, 1, 1, 1
];


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
// VERIFIED PHYSICAL CABINET COLUMNS
// --------------------------------------------------

/*
    Both arrays are written from the physical
    right side of that cabinet toward its left side.

    These definitions come directly from the
    working column animation.
*/

var leftFrames = [

    /*
        Left cabinet physical rightmost column.
        This is the centre-left column of the artwork.
    */
    [5, 10, 15, 20, 25],

    [4, 9, 14, 19, 24],

    [3, 8, 13, 18, 23],

    [2, 7, 12, 17, 22],

    /*
        Left cabinet physical leftmost column.
    */
    [1, 6, 11, 16]
];


var rightFrames = [

    /*
        Right cabinet physical rightmost column.
    */
    [5, 10, 15, 20],

    [4, 9, 14, 19, 24],

    [3, 8, 13, 18, 23],

    [2, 7, 12, 17, 22],

    /*
        Right cabinet physical leftmost column.
        This is the centre-right column of the artwork.
    */
    [1, 6, 11, 16, 21]
];


// --------------------------------------------------
// PHYSICAL GLOBAL COLUMN ORDER
// --------------------------------------------------

/*
    This array is explicitly arranged from the
    artwork's far-left edge to far-right edge.

    Left cabinet must be reversed because leftFrames
    is stored right-to-left.

    Right cabinet must also be reversed because
    rightFrames is stored right-to-left.
*/

var physicalColumns = [

    /*
        Global column 1: far-left
    */
    {
        outletNumber: 0,
        doors: leftFrames[4],
        mapping: leftMap
    },

    {
        outletNumber: 0,
        doors: leftFrames[3],
        mapping: leftMap
    },

    {
        outletNumber: 0,
        doors: leftFrames[2],
        mapping: leftMap
    },

    {
        outletNumber: 0,
        doors: leftFrames[1],
        mapping: leftMap
    },

    /*
        Global column 5: centre-left
    */
    {
        outletNumber: 0,
        doors: leftFrames[0],
        mapping: leftMap
    },

    /*
        Global column 6: centre-right
    */
    {
        outletNumber: 1,
        doors: rightFrames[4],
        mapping: rightMap
    },

    {
        outletNumber: 1,
        doors: rightFrames[3],
        mapping: rightMap
    },

    {
        outletNumber: 1,
        doors: rightFrames[2],
        mapping: rightMap
    },

    {
        outletNumber: 1,
        doors: rightFrames[1],
        mapping: rightMap
    },

    /*
        Global column 10: far-right
    */
    {
        outletNumber: 1,
        doors: rightFrames[0],
        mapping: rightMap
    }
];


// --------------------------------------------------
// START
// --------------------------------------------------

function start()
{
    animationTask.cancel();
    queueTask.cancel();

    commandQueue = [];
    queueBusy = false;

    resetColumnSteps();

    running = true;
    effectState = "flash";
    stateStartTime = currentTimeMs();

    sendAll(0, 0, 0);

    tick();
}


// --------------------------------------------------
// STOP AT CURRENT STATE
// --------------------------------------------------

function stop()
{
    running = false;
    effectState = "idle";

    animationTask.cancel();
    queueTask.cancel();

    commandQueue = [];
    queueBusy = false;
}


// --------------------------------------------------
// STOP AND CLEAR
// --------------------------------------------------

function black()
{
    stop();
    sendAll(0, 0, 0);
}


// --------------------------------------------------
// RESTART
// --------------------------------------------------

function restart()
{
    start();
}


// --------------------------------------------------
// CHANGE COLOUR
// Example: color 255 130 40
// --------------------------------------------------

function color(r, g, b)
{
    lightR = clamp255(r);
    lightG = clamp255(g);
    lightB = clamp255(b);

    post(
        "Effect color: "
        + lightR
        + " "
        + lightG
        + " "
        + lightB
        + "\n"
    );
}


// --------------------------------------------------
// CHANGE BRIGHTNESS
// Example: brightness 0.8
// --------------------------------------------------

function brightness(value)
{
    brightnessValue = clamp(
        Number(value),
        0.0,
        1.0
    );

    post(
        "Effect brightness: "
        + brightnessValue
        + "\n"
    );
}


// --------------------------------------------------
// CHANGE FLASH HALF-DURATION
// Example: flashspeed 140
// --------------------------------------------------

function flashspeed(ms)
{
    flashHalfMs = Math.max(
        30,
        Number(ms)
    );
}


// --------------------------------------------------
// CHANGE FULL HOLD
// Example: hold 700
// --------------------------------------------------

function hold(ms)
{
    fullHoldMs = Math.max(
        0,
        Number(ms)
    );
}


// --------------------------------------------------
// CHANGE COLUMN FADE DURATION
// Example: fadeduration 900
// --------------------------------------------------

function fadeduration(ms)
{
    columnFadeMs = Math.max(
        100,
        Number(ms)
    );
}


// --------------------------------------------------
// CHANGE PAIR STAGGER
// Example: stagger 650
// --------------------------------------------------

function stagger(ms)
{
    pairStaggerMs = Math.max(
        20,
        Number(ms)
    );
}


// --------------------------------------------------
// CHANGE FADE STEPS
// Example: steps 10
// --------------------------------------------------

function steps(value)
{
    value = parseInt(value, 10);

    if (isNaN(value))
    {
        return;
    }

    columnFadeSteps = Math.max(
        2,
        Math.min(32, value)
    );

    post(
        "Column fade steps: "
        + columnFadeSteps
        + "\n"
    );
}


// --------------------------------------------------
// CHANGE COLUMN CHECK INTERVAL
// Example: interval 60
// --------------------------------------------------

function interval(ms)
{
    columnCheckIntervalMs = Math.max(
        20,
        Number(ms)
    );
}


// --------------------------------------------------
// MAIN TIMER
// --------------------------------------------------

function tick()
{
    var nextInterval;

    if (!running)
    {
        return;
    }

    nextInterval = columnCheckIntervalMs;

    if (effectState === "flash")
    {
        updateFlashes();
        nextInterval = flashIntervalMs;
    }
    else if (effectState === "hold")
    {
        updateHold();
        nextInterval = flashIntervalMs;
    }
    else if (effectState === "columnFade")
    {
        updateColumnFade();
        nextInterval = columnCheckIntervalMs;
    }

    if (running)
    {
        animationTask.schedule(nextInterval);
    }
}


// --------------------------------------------------
// THREE FADED FLASHES
// --------------------------------------------------

function updateFlashes()
{
    var elapsed;
    var segment;
    var segmentPosition;
    var level;
    var totalFlashTime;

    elapsed = currentTimeMs() - stateStartTime;

    /*
        Five half-segments:

        0: first fade up
        1: first fade down
        2: second fade up
        3: second fade down
        4: third fade up and remain on
    */

    totalFlashTime = flashHalfMs * 5;

    if (elapsed >= totalFlashTime)
    {
        sendAllScaled(1.0);

        effectState = "hold";
        stateStartTime = currentTimeMs();

        return;
    }

    segment = Math.floor(
        elapsed / flashHalfMs
    );

    segmentPosition =
        (elapsed % flashHalfMs)
        / flashHalfMs;

    segmentPosition = smoothstep(
        segmentPosition
    );

    if (
        segment === 0
        || segment === 2
        || segment === 4
    )
    {
        level = segmentPosition;
    }
    else
    {
        level = 1.0 - segmentPosition;
    }

    sendAllScaled(level);
}


// --------------------------------------------------
// FULL-LIGHT HOLD
// --------------------------------------------------

function updateHold()
{
    var elapsed;

    elapsed = currentTimeMs() - stateStartTime;

    if (elapsed < fullHoldMs)
    {
        return;
    }

    /*
        /led/all has left every LED fully illuminated.

        The remembered column brightness therefore
        begins at full brightness.
    */

    resetColumnSteps();

    effectState = "columnFade";
    stateStartTime = currentTimeMs();
}


// --------------------------------------------------
// OPTIMIZED CENTRE-OUT COLUMN FADE
// --------------------------------------------------

function updateColumnFade()
{
    var elapsed;
    var totalDuration;

    elapsed = currentTimeMs() - stateStartTime;

    totalDuration =
        (4 * pairStaggerMs)
        + columnFadeMs;

    if (elapsed >= totalDuration)
    {
        /*
            Wait for the final queued OSC batch
            before sending the final /led/all black.
        */

        if (!queueBusy)
        {
            running = false;
            effectState = "idle";

            animationTask.cancel();

            sendAll(0, 0, 0);
        }

        return;
    }

    if (!queueBusy)
    {
        renderChangedColumns(elapsed);
    }
}


// --------------------------------------------------
// SEND ONLY COLUMNS WHOSE STEP CHANGED
// --------------------------------------------------

function renderChangedColumns(elapsed)
{
    var columnIndex;
    var level;
    var stepIndex;
    var steppedLevel;

    var leftChanged;
    var rightChanged;
    var anyChanged;

    if (queueBusy)
    {
        return;
    }

    commandQueue = [];
    queueTask.cancel();

    leftChanged = false;
    rightChanged = false;
    anyChanged = false;

    for (
        columnIndex = 0;
        columnIndex < physicalColumns.length;
        columnIndex++
    )
    {
        level = columnLevel(
            columnIndex,
            elapsed
        );

        /*
            Convert the continuous fade into a limited
            number of brightness levels.
        */

        stepIndex = Math.round(
            level * columnFadeSteps
        );

        /*
            Do not resend an unchanged column.
        */

        if (
            stepIndex
            === lastColumnSteps[columnIndex]
        )
        {
            continue;
        }

        lastColumnSteps[columnIndex] = stepIndex;

        steppedLevel =
            stepIndex
            / columnFadeSteps;

        queuePhysicalColumn(
            columnIndex,
            lightR
                * brightnessValue
                * steppedLevel,
            lightG
                * brightnessValue
                * steppedLevel,
            lightB
                * brightnessValue
                * steppedLevel
        );

        anyChanged = true;

        if (
            physicalColumns[columnIndex]
                .outletNumber === 0
        )
        {
            leftChanged = true;
        }
        else
        {
            rightChanged = true;
        }
    }

    /*
        Nothing entered a new fade step.
        Send no OSC at all.
    */

    if (!anyChanged)
    {
        return;
    }

    /*
        Commit only the cabinet or cabinets
        whose columns changed.
    */

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

    queueBusy = true;
    sendQueueChunk();
}


// --------------------------------------------------
// COLUMN BRIGHTNESS
// --------------------------------------------------

function columnLevel(columnIndex, elapsed)
{
    var pairIndex;
    var pairStartTime;
    var progress;

    /*
        Physical global order:

            0 1 2 3 4 | 5 6 7 8 9

        Pair order:

            pair 0: columns 4 and 5
            pair 1: columns 3 and 6
            pair 2: columns 2 and 7
            pair 3: columns 1 and 8
            pair 4: columns 0 and 9
    */

    if (columnIndex <= 4)
    {
        pairIndex = 4 - columnIndex;
    }
    else
    {
        pairIndex = columnIndex - 5;
    }

    pairStartTime =
        pairIndex * pairStaggerMs;

    if (elapsed <= pairStartTime)
    {
        return 1.0;
    }

    progress =
        (elapsed - pairStartTime)
        / columnFadeMs;

    progress = clamp(
        progress,
        0.0,
        1.0
    );

    return 1.0 - smoothstep(progress);
}


// --------------------------------------------------
// QUEUE ONE VERIFIED PHYSICAL COLUMN
// --------------------------------------------------

function queuePhysicalColumn(
    columnIndex,
    r,
    g,
    b
)
{
    var column;

    column = physicalColumns[columnIndex];

    queueDoors(
        column.outletNumber,
        column.doors,
        column.mapping,
        r,
        g,
        b
    );
}


// --------------------------------------------------
// QUEUE A LIST OF DOORS
// --------------------------------------------------

function queueDoors(
    outletNumber,
    doors,
    mapping,
    r,
    g,
    b
)
{
    var doorIndex;
    var doorNumber;
    var leds;
    var ledIndex;

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
            commandQueue.push({
                outletNumber: outletNumber,

                command: [
                    "/led/set_noshow",
                    leds[ledIndex],
                    clamp255(r),
                    clamp255(g),
                    clamp255(b)
                ]
            });
        }
    }
}


// --------------------------------------------------
// SEND QUEUE IN CHUNKS
// --------------------------------------------------

function sendQueueChunk()
{
    var count;
    var item;

    count = 0;

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
        queueTask.schedule(
            queueDelayMs
        );
    }
    else
    {
        queueBusy = false;
    }
}


// --------------------------------------------------
// /led/all FOR FLASHES
// --------------------------------------------------

function sendAllScaled(level)
{
    level = clamp(
        level,
        0.0,
        1.0
    );

    sendAll(
        lightR
            * brightnessValue
            * level,

        lightG
            * brightnessValue
            * level,

        lightB
            * brightnessValue
            * level
    );
}


function sendAll(r, g, b)
{
    sendCommand(
        0,
        [
            "/led/all",
            clamp255(r),
            clamp255(g),
            clamp255(b)
        ]
    );

    sendCommand(
        1,
        [
            "/led/all",
            clamp255(r),
            clamp255(g),
            clamp255(b)
        ]
    );
}


// --------------------------------------------------
// RESET COLUMN MEMORY
// --------------------------------------------------

function resetColumnSteps()
{
    var columnIndex;

    for (
        columnIndex = 0;
        columnIndex < 10;
        columnIndex++
    )
    {
        lastColumnSteps[columnIndex]
            = columnFadeSteps;
    }
}


// --------------------------------------------------
// SEND OSC COMMAND
// --------------------------------------------------

function sendCommand(
    outletNumber,
    command
)
{
    outlet(
        outletNumber,
        command
    );
}


// --------------------------------------------------
// SMOOTH FADE CURVE
// --------------------------------------------------

function smoothstep(value)
{
    value = clamp(
        value,
        0.0,
        1.0
    );

    return value
        * value
        * (
            3.0
            - 2.0 * value
        );
}


// --------------------------------------------------
// TIME
// --------------------------------------------------

function currentTimeMs()
{
    return new Date().getTime();
}


// --------------------------------------------------
// LIMIT VALUES
// --------------------------------------------------

function clamp(
    value,
    minimum,
    maximum
)
{
    return Math.max(
        minimum,
        Math.min(
            maximum,
            value
        )
    );
}


function clamp255(value)
{
    return Math.round(
        clamp(
            Number(value),
            0,
            255
        )
    );
}