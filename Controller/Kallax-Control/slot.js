autowatch = 1;
inlets = 1;
outlets = 2;


/*
    RED BACKGROUND + THREE-SQUARE SELECTION

    COMMANDS

    start
        Fade all LEDs from black to red.
        Then begin continuous random shuffling.

    shuffle
        Restore full red and resume continuous
        random shuffling without repeating the fade-in.

    slotSelected 1 2 3
        Stop shuffling.
        Lock the specified three global slots.
        The selected slots gently pulse.
        The red background slowly dims.

    picker 1 2 3
        The first number becomes the active choice.
        It stays fixed cool white.
        The other two continue pulsing warm white.
        The red background dims a little further.

    stop
        Stop animation at the current state.

    black
        Stop and switch everything off.

    interval 500
        Change the shuffle interval.

    fadeduration 2000
        Change the initial black-to-red fade duration.

    color 255 130 40
        Change the selected-square colour.

    background 255 0 0
        Change the background colour.

    brightness 1.0
        Change overall brightness.

    pulsedepth 0.25
        Change selected-square pulse depth.

    pulseperiod 5000
        Change one complete pulse duration.

    backgroundlevel 0.7
        Change the locked background target brightness.

    backgroundfadetime 4000
        Change locked background dimming duration.
*/


// --------------------------------------------------
// COLOURS
// --------------------------------------------------

/* Red background */
var backgroundR = 255;
var backgroundG = 0;
var backgroundB = 0;


/* Warm-white selected squares */
var lightR = 255;
var lightG = 130;
var lightB = 40;


/* Fixed colour for the active picker choice */
var activeR = 255;
var activeG = 255;
var activeB = 255;


/* Overall brightness */
var brightnessValue = 1.0;


// --------------------------------------------------
// INITIAL FADE-IN SETTINGS
// --------------------------------------------------

/* Black-to-red fade duration */
var fadeDurationMs = 2000;


/*
    Fade update interval.

    The fade uses /led/all, so each update sends
    only one command to each Raspberry Pi.
*/
var fadeIntervalMs = 35;


// --------------------------------------------------
// SHUFFLE SETTINGS
// --------------------------------------------------

/* Time between random groups of three */
var shuffleIntervalMs = 100;


// --------------------------------------------------
// LOCKED-SELECTION PULSE SETTINGS
// --------------------------------------------------

/*
    The selected brightness moves between:

        1.0 - pulseDepth
        and
        1.0
*/
var pulseDepth = 0.6;


/* One complete pulse takes five seconds */
var pulsePeriodMs = 3000;


/*
    How often the selected squares are updated.

    This updates only the 3 selected squares.
*/
var pulseIntervalMs = 120;


/*
    Short steady hold after slotSelected.
    The requested squares appear immediately,
    then the pulse/background dim begins.
*/
var lockedStartDelayMs = 350;
var lockedActivationTime = 0;


// --------------------------------------------------
// LOCKED BACKGROUND DIMMING
// --------------------------------------------------

/*
    Background starts at full brightness and slowly
    dims to 70% after slotSelected is received.
*/
var lockedBackgroundLevel = 1.0;
var lockedBackgroundTarget = 0.5;


/* Background dimming duration */
var lockedBackgroundFadeMs = 7000;


/*
    Number of background brightness steps.

    The whole background is resent only when it enters
    a new step. This greatly reduces OSC traffic.
*/
var lockedBackgroundSteps = 8;


/* Internal background state */
var lastBackgroundStep = -1;
var lockedBackgroundStartTime = 0;


// --------------------------------------------------
// PICKER SETTINGS
// --------------------------------------------------

/* The picker background dims a little further */
var pickerBackgroundTarget = 0.3;
var pickerBackgroundFadeMs = 1800;
var pickerBackgroundSteps = 6;

/* Internal picker state */
var pickerActiveSlot = -1;
var pickerSlots = [];
var pickerBackgroundStartLevel = 0.5;
var pickerBackgroundStartTime = 0;
var lastPickerBackgroundStep = -1;


// --------------------------------------------------
// OSC QUEUE SETTINGS
// --------------------------------------------------

var commandQueue = [];
var queueTask = new Task(sendQueueChunk, this);

var queueChunkSize = 24;
var queueDelayMs = 12;
var queueBusy = false;


// --------------------------------------------------
// EFFECT STATE
// --------------------------------------------------

var mode = "idle";

var fadeStartTime = 0;
var pulseStartTime = 0;

var selectedSlots = [];

var animationTask = new Task(tick, this);


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
// VALID GLOBAL SLOT NUMBERS
// --------------------------------------------------

/*
    Global numbering:

        1–25  = left cabinet doors 1–25
        26–50 = right cabinet doors 1–25

    Missing physical slots:

        21 = missing left door 21
        50 = missing right door 25
*/

var validSlots = buildValidSlots();


// --------------------------------------------------
// START WITH BLACK-TO-RED FADE
// --------------------------------------------------

function start()
{
    animationTask.cancel();
    cancelQueue();

    selectedSlots = [];
    pickerSlots = [];
    pickerActiveSlot = -1;

    lockedBackgroundLevel = 1.0;
    lastBackgroundStep = -1;

    mode = "fade";
    fadeStartTime = currentTimeMs();

    sendAll(0, 0, 0);

    tick();
}


// --------------------------------------------------
// RESUME CONTINUOUS RANDOM SHUFFLE
// --------------------------------------------------

function shuffle()
{
    animationTask.cancel();
    cancelQueue();

    mode = "shuffle";

    lockedBackgroundLevel = 1.0;
    lastBackgroundStep = -1;

    /*
        /led/all restores every square to full red,
        including the previously selected squares.
    */

    selectedSlots = [];
    pickerSlots = [];
    pickerActiveSlot = -1;

    sendBackground();

    /*
        Wait briefly before selecting the first
        new random group.
    */

    animationTask.schedule(100);
}


// --------------------------------------------------
// LOCK THREE EXACT GLOBAL SLOTS
// --------------------------------------------------

function slotSelected(slot1, slot2, slot3)
{
    var requested;

    requested = [
        parseInt(slot1, 10),
        parseInt(slot2, 10),
        parseInt(slot3, 10)
    ];

    if (!validateSelectedSlots(requested))
    {
        return;
    }

    animationTask.cancel();
    cancelQueue();

    pickerSlots = [];
    pickerActiveSlot = -1;

    lockedBackgroundLevel = 1.0;
    lastBackgroundStep = -1;

    /*
        Immediately replace the current shuffle group
        with the requested slots. Only the old and new
        selections are updated here.
    */

    mode = "lockedDelay";

    replaceSelection(
        requested,
        1.0
    );

    /*
        Keep the selected squares steady briefly before
        starting the pulse and background dim.
    */

    lockedActivationTime =
        currentTimeMs()
        + lockedStartDelayMs;

    animationTask.schedule(
        lockedStartDelayMs
    );
}



// --------------------------------------------------
// PICK ONE OF THE THREE LOCKED SLOTS
// --------------------------------------------------

function picker(activeSlot, otherSlot1, otherSlot2)
{
    var requested;

    requested = [
        parseInt(activeSlot, 10),
        parseInt(otherSlot1, 10),
        parseInt(otherSlot2, 10)
    ];

    if (!validateSelectedSlots(requested))
    {
        return;
    }

    if (!sameThreeSlots(requested, selectedSlots))
    {
        post(
            "picker values must be the same three "
            + "slots received by slotSelected\n"
        );

        return;
    }

    animationTask.cancel();
    cancelQueue();

    pickerSlots = requested.slice(0);
    pickerActiveSlot = requested[0];

    mode = "picker";

    pickerBackgroundStartLevel =
        lockedBackgroundLevel;

    pickerBackgroundStartTime =
        currentTimeMs();

    lastPickerBackgroundStep = -1;

    /*
        Show the active choice immediately.
        No complete background redraw is needed here.
    */

    updatePickerSquares(
        currentPulseLevel()
    );

    animationTask.schedule(
        pulseIntervalMs
    );
}


// --------------------------------------------------
// STOP AT CURRENT VISUAL STATE
// --------------------------------------------------

function stop()
{
    mode = "idle";
    animationTask.cancel();
}


// --------------------------------------------------
// STOP AND SWITCH EVERYTHING BLACK
// --------------------------------------------------

function black()
{
    mode = "idle";

    animationTask.cancel();
    cancelQueue();

    selectedSlots = [];

    sendAll(0, 0, 0);
}


// --------------------------------------------------
// MAIN CLOCK
// --------------------------------------------------

function tick()
{
    if (mode === "fade")
    {
        updateRedFade();
    }
    else if (mode === "shuffle")
    {
        updateShuffle();
    }
    else if (mode === "lockedDelay")
    {
        beginLockedAnimation();
    }
    else if (mode === "locked")
    {
        updateLockedPulse();
    }
    else if (mode === "picker")
    {
        updatePicker();
    }
}


// --------------------------------------------------
// BEGIN LOCKED PULSE AFTER SHORT HOLD
// --------------------------------------------------

function beginLockedAnimation()
{
    var remaining;

    if (mode !== "lockedDelay")
    {
        return;
    }

    remaining =
        lockedActivationTime
        - currentTimeMs();

    if (remaining > 0)
    {
        animationTask.schedule(
            remaining
        );

        return;
    }

    if (queueBusy)
    {
        animationTask.schedule(
            20
        );

        return;
    }

    mode = "locked";

    pulseStartTime = currentTimeMs();

    lockedBackgroundStartTime =
        currentTimeMs();

    lockedBackgroundLevel = 1.0;
    lastBackgroundStep = -1;

    updateLockedPulse();
}


// --------------------------------------------------
// BLACK-TO-RED FADE
// --------------------------------------------------

function updateRedFade()
{
    var elapsed;
    var progress;
    var level;

    elapsed =
        currentTimeMs()
        - fadeStartTime;

    progress =
        elapsed
        / fadeDurationMs;

    if (progress >= 1.0)
    {
        sendBackground();

        selectedSlots = [];

        mode = "shuffle";

        chooseAndShowRandomSlots();

        animationTask.schedule(
            shuffleIntervalMs
        );

        return;
    }

    progress = clamp(
        progress,
        0.0,
        1.0
    );

    level = smoothstep(progress);

    sendAll(
        backgroundR
            * brightnessValue
            * level,

        backgroundG
            * brightnessValue
            * level,

        backgroundB
            * brightnessValue
            * level
    );

    animationTask.schedule(
        fadeIntervalMs
    );
}


// --------------------------------------------------
// CONTINUOUS RANDOM SHUFFLE
// --------------------------------------------------

function updateShuffle()
{
    if (mode !== "shuffle")
    {
        return;
    }

    if (!queueBusy)
    {
        chooseAndShowRandomSlots();
    }

    animationTask.schedule(
        shuffleIntervalMs
    );
}


// --------------------------------------------------
// LOCKED PULSE + BACKGROUND DIM
// --------------------------------------------------

function updateLockedPulse()
{
    var now;

    var pulseElapsed;
    var pulseAngle;
    var normalizedPulse;
    var selectedLevel;

    var backgroundElapsed;
    var backgroundProgress;
    var backgroundStep;

    if (mode !== "locked")
    {
        return;
    }

    if (queueBusy)
    {
        animationTask.schedule(
            pulseIntervalMs
        );

        return;
    }

    now = currentTimeMs();


    /*
        GENTLE SELECTED-SQUARE PULSE

        Cosine is used so the selected squares begin
        at maximum brightness when slotSelected arrives.
    */

    pulseElapsed =
        now - pulseStartTime;

    pulseAngle =
        (
            pulseElapsed
            / pulsePeriodMs
        )
        * Math.PI
        * 2.0;

    normalizedPulse =
        0.5
        + 0.5
        * Math.cos(pulseAngle);

    selectedLevel =
        1.0
        - pulseDepth
        + pulseDepth
        * normalizedPulse;


    /*
        SLOW BACKGROUND DIMMING
    */

    backgroundElapsed =
        now
        - lockedBackgroundStartTime;

    backgroundProgress = clamp(
        backgroundElapsed
            / lockedBackgroundFadeMs,
        0.0,
        1.0
    );

    backgroundProgress =
        smoothstep(backgroundProgress);

    backgroundStep = Math.round(
        backgroundProgress
            * lockedBackgroundSteps
    );


    /*
        When the background enters a new step,
        redraw all valid squares in one buffered frame.

        This does not use /led/all, because /led/all
        would temporarily overwrite the selected
        warm-white squares with red.
    */

    if (
        backgroundStep
        !== lastBackgroundStep
    )
    {
        lastBackgroundStep =
            backgroundStep;

        lockedBackgroundLevel =
            1.0
            + (
                lockedBackgroundTarget
                - 1.0
            )
            * (
                backgroundStep
                / lockedBackgroundSteps
            );

        renderLockedCompleteFrame(
            selectedLevel
        );
    }
    else
    {
        /*
            Between background steps, only the three
            selected squares are updated.
        */

        updateSelectedBrightness(
            selectedLevel
        );
    }

    animationTask.schedule(
        pulseIntervalMs
    );
}



// --------------------------------------------------
// PICKER: FIXED ACTIVE + TWO PULSING OPTIONS
// --------------------------------------------------

function updatePicker()
{
    var elapsed;
    var progress;
    var step;
    var pulseLevel;

    if (mode !== "picker")
    {
        return;
    }

    if (queueBusy)
    {
        animationTask.schedule(
            pulseIntervalMs
        );

        return;
    }

    pulseLevel = currentPulseLevel();

    elapsed =
        currentTimeMs()
        - pickerBackgroundStartTime;

    progress = clamp(
        elapsed / pickerBackgroundFadeMs,
        0.0,
        1.0
    );

    progress = smoothstep(progress);

    step = Math.round(
        progress * pickerBackgroundSteps
    );

    if (step !== lastPickerBackgroundStep)
    {
        lastPickerBackgroundStep = step;

        lockedBackgroundLevel =
            pickerBackgroundStartLevel
            + (
                pickerBackgroundTarget
                - pickerBackgroundStartLevel
            )
            * (
                step
                / pickerBackgroundSteps
            );

        renderPickerCompleteFrame(
            pulseLevel
        );
    }
    else
    {
        updatePickerSquares(
            pulseLevel
        );
    }

    animationTask.schedule(
        pulseIntervalMs
    );
}


function currentPulseLevel()
{
    var elapsed;
    var angle;
    var normalized;

    elapsed =
        currentTimeMs()
        - pulseStartTime;

    angle =
        (
            elapsed
            / pulsePeriodMs
        )
        * Math.PI
        * 2.0;

    normalized =
        0.5
        + 0.5
        * Math.cos(angle);

    return 1.0
        - pulseDepth
        + pulseDepth
        * normalized;
}


function updatePickerSquares(pulseLevel)
{
    var i;
    var slot;
    var leftChanged;
    var rightChanged;

    if (pickerSlots.length !== 3)
    {
        return;
    }

    cancelQueue();
    commandQueue = [];

    leftChanged = false;
    rightChanged = false;

    for (i = 0; i < pickerSlots.length; i++)
    {
        slot = pickerSlots[i];

        if (slot === pickerActiveSlot)
        {
            queueGlobalSlot(
                slot,
                activeR * brightnessValue,
                activeG * brightnessValue,
                activeB * brightnessValue
            );
        }
        else
        {
            queueGlobalSlot(
                slot,
                lightR * brightnessValue * pulseLevel,
                lightG * brightnessValue * pulseLevel,
                lightB * brightnessValue * pulseLevel
            );
        }

        if (slot <= 25)
        {
            leftChanged = true;
        }
        else
        {
            rightChanged = true;
        }
    }

    queueShowForChangedCabinets(
        leftChanged,
        rightChanged
    );

    beginQueue();
}


function renderPickerCompleteFrame(pulseLevel)
{
    var i;
    var slot;

    cancelQueue();
    commandQueue = [];

    for (i = 0; i < validSlots.length; i++)
    {
        slot = validSlots[i];

        if (slot === pickerActiveSlot)
        {
            queueGlobalSlot(
                slot,
                activeR * brightnessValue,
                activeG * brightnessValue,
                activeB * brightnessValue
            );
        }
        else if (arrayContains(pickerSlots, slot))
        {
            queueGlobalSlot(
                slot,
                lightR * brightnessValue * pulseLevel,
                lightG * brightnessValue * pulseLevel,
                lightB * brightnessValue * pulseLevel
            );
        }
        else
        {
            queueGlobalSlot(
                slot,
                backgroundR * brightnessValue * lockedBackgroundLevel,
                backgroundG * brightnessValue * lockedBackgroundLevel,
                backgroundB * brightnessValue * lockedBackgroundLevel
            );
        }
    }

    queueShowForChangedCabinets(
        true,
        true
    );

    beginQueue();
}


// --------------------------------------------------
// DRAW COMPLETE LOCKED FRAME
// --------------------------------------------------

function renderLockedCompleteFrame(
    selectedLevel
)
{
    var i;
    var slot;
    var isSelected;

    cancelQueue();

    commandQueue = [];

    /*
        Redraw all 48 physical squares.

        Selected squares:
            pulsing warm white

        All other squares:
            dimmed red background
    */

    for (i = 0; i < validSlots.length; i++)
    {
        slot = validSlots[i];

        isSelected = arrayContains(
            selectedSlots,
            slot
        );

        if (isSelected)
        {
            queueGlobalSlot(
                slot,

                lightR
                    * brightnessValue
                    * selectedLevel,

                lightG
                    * brightnessValue
                    * selectedLevel,

                lightB
                    * brightnessValue
                    * selectedLevel
            );
        }
        else
        {
            queueGlobalSlot(
                slot,

                backgroundR
                    * brightnessValue
                    * lockedBackgroundLevel,

                backgroundG
                    * brightnessValue
                    * lockedBackgroundLevel,

                backgroundB
                    * brightnessValue
                    * lockedBackgroundLevel
            );
        }
    }

    /*
        Both cabinets received new values.
    */

    queueShowForChangedCabinets(
        true,
        true
    );

    beginQueue();
}


// --------------------------------------------------
// CHOOSE THREE COMPLETELY NEW RANDOM SLOTS
// --------------------------------------------------

function chooseAndShowRandomSlots()
{
    var candidates;
    var newSelection;
    var i;
    var randomIndex;

    candidates = [];

    /*
        Remove the three currently selected slots
        from the candidate list.

        Therefore all three white squares move.
    */

    for (i = 0; i < validSlots.length; i++)
    {
        if (
            !arrayContains(
                selectedSlots,
                validSlots[i]
            )
        )
        {
            candidates.push(
                validSlots[i]
            );
        }
    }

    newSelection = [];

    while (
        newSelection.length < 3
        && candidates.length > 0
    )
    {
        randomIndex = Math.floor(
            Math.random()
            * candidates.length
        );

        newSelection.push(
            candidates[randomIndex]
        );

        candidates.splice(
            randomIndex,
            1
        );
    }

    replaceSelection(
        newSelection,
        1.0
    );
}


// --------------------------------------------------
// REPLACE CURRENT RANDOM SELECTION
// --------------------------------------------------

function replaceSelection(
    newSelection,
    selectedLevel
)
{
    var oldSelection;
    var i;
    var leftChanged;
    var rightChanged;

    oldSelection =
        selectedSlots.slice(0);

    cancelQueue();

    commandQueue = [];

    leftChanged = false;
    rightChanged = false;


    /*
        Restore all previous selected squares to
        full red, unless one is also part of the
        new selection.
    */

    for (i = 0; i < oldSelection.length; i++)
    {
        if (
            !arrayContains(
                newSelection,
                oldSelection[i]
            )
        )
        {
            queueGlobalSlot(
                oldSelection[i],

                backgroundR
                    * brightnessValue,

                backgroundG
                    * brightnessValue,

                backgroundB
                    * brightnessValue
            );

            if (oldSelection[i] <= 25)
            {
                leftChanged = true;
            }
            else
            {
                rightChanged = true;
            }
        }
    }


    /*
        Illuminate the new selected squares.
    */

    for (i = 0; i < newSelection.length; i++)
    {
        queueGlobalSlot(
            newSelection[i],

            lightR
                * brightnessValue
                * selectedLevel,

            lightG
                * brightnessValue
                * selectedLevel,

            lightB
                * brightnessValue
                * selectedLevel
        );

        if (newSelection[i] <= 25)
        {
            leftChanged = true;
        }
        else
        {
            rightChanged = true;
        }
    }

    selectedSlots =
        newSelection.slice(0);

    queueShowForChangedCabinets(
        leftChanged,
        rightChanged
    );

    beginQueue();
}


// --------------------------------------------------
// UPDATE ONLY THE THREE SELECTED SQUARES
// --------------------------------------------------

function updateSelectedBrightness(level)
{
    var i;
    var leftChanged;
    var rightChanged;

    if (selectedSlots.length !== 3)
    {
        return;
    }

    cancelQueue();

    commandQueue = [];

    leftChanged = false;
    rightChanged = false;

    for (i = 0; i < selectedSlots.length; i++)
    {
        queueGlobalSlot(
            selectedSlots[i],

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

        if (selectedSlots[i] <= 25)
        {
            leftChanged = true;
        }
        else
        {
            rightChanged = true;
        }
    }

    queueShowForChangedCabinets(
        leftChanged,
        rightChanged
    );

    beginQueue();
}


// --------------------------------------------------
// GLOBAL SLOT TO CABINET/DOOR CONVERSION
// --------------------------------------------------

function queueGlobalSlot(
    globalSlot,
    r,
    g,
    b
)
{
    var outletNumber;
    var doorNumber;
    var mapping;

    globalSlot = parseInt(
        globalSlot,
        10
    );

    if (!isValidSlot(globalSlot))
    {
        return;
    }

    if (globalSlot <= 25)
    {
        outletNumber = 0;
        doorNumber = globalSlot;
        mapping = leftMap;
    }
    else
    {
        outletNumber = 1;
        doorNumber = globalSlot - 25;
        mapping = rightMap;
    }

    queueDoorColor(
        outletNumber,
        doorNumber,
        mapping,
        r,
        g,
        b
    );
}


// --------------------------------------------------
// QUEUE ONE COMPLETE SQUARE
// --------------------------------------------------

function queueDoorColor(
    outletNumber,
    doorNumber,
    mapping,
    r,
    g,
    b
)
{
    var leds;
    var i;

    leds = mapping[doorNumber];

    if (!leds)
    {
        post(
            "No LED mapping for door "
            + doorNumber
            + "\n"
        );

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


// --------------------------------------------------
// ADD /led/show ONLY WHERE NEEDED
// --------------------------------------------------

function queueShowForChangedCabinets(
    leftChanged,
    rightChanged
)
{
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
// BEGIN QUEUE DELIVERY
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


// --------------------------------------------------
// SEND QUEUE IN SMALL CHUNKS
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
        item =
            commandQueue.shift();

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
// CANCEL PENDING QUEUE
// --------------------------------------------------

function cancelQueue()
{
    queueTask.cancel();

    commandQueue = [];
    queueBusy = false;
}


// --------------------------------------------------
// SEND FULL BACKGROUND COLOUR
// --------------------------------------------------

function sendBackground()
{
    sendAll(
        backgroundR
            * brightnessValue,

        backgroundG
            * brightnessValue,

        backgroundB
            * brightnessValue
    );
}


// --------------------------------------------------
// /led/all TO BOTH CABINETS
// --------------------------------------------------

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
// SEND ONE OSC COMMAND
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
// VALIDATE slotSelected INPUT
// --------------------------------------------------

function validateSelectedSlots(slots)
{
    var i;

    if (slots.length !== 3)
    {
        post(
            "slotSelected requires exactly "
            + "three slot numbers\n"
        );

        return false;
    }

    for (i = 0; i < slots.length; i++)
    {
        if (!isValidSlot(slots[i]))
        {
            post(
                "Invalid physical slot: "
                + slots[i]
                + ". Valid range is 1-50, "
                + "excluding 21 and 50.\n"
            );

            return false;
        }
    }

    if (
        slots[0] === slots[1]
        || slots[0] === slots[2]
        || slots[1] === slots[2]
    )
    {
        post(
            "slotSelected requires three "
            + "different slot numbers\n"
        );

        return false;
    }

    return true;
}


// --------------------------------------------------
// CHECK ONE GLOBAL SLOT
// --------------------------------------------------

function isValidSlot(slotNumber)
{
    slotNumber = parseInt(
        slotNumber,
        10
    );

    if (
        isNaN(slotNumber)
        || slotNumber < 1
        || slotNumber > 50
    )
    {
        return false;
    }

    if (
        slotNumber === 21
        || slotNumber === 50
    )
    {
        return false;
    }

    return true;
}


// --------------------------------------------------
// BUILD THE 48 VALID GLOBAL SLOT NUMBERS
// --------------------------------------------------

function buildValidSlots()
{
    var slots;
    var i;

    slots = [];

    for (i = 1; i <= 50; i++)
    {
        if (isValidSlot(i))
        {
            slots.push(i);
        }
    }

    return slots;
}



// --------------------------------------------------
// CHECK THAT TWO LISTS CONTAIN THE SAME THREE SLOTS
// --------------------------------------------------

function sameThreeSlots(first, second)
{
    var i;

    if (
        first.length !== 3
        || second.length !== 3
    )
    {
        return false;
    }

    for (i = 0; i < first.length; i++)
    {
        if (!arrayContains(second, first[i]))
        {
            return false;
        }
    }

    return true;
}


// --------------------------------------------------
// ARRAY CHECK
// --------------------------------------------------

function arrayContains(array, value)
{
    var i;

    for (i = 0; i < array.length; i++)
    {
        if (array[i] === value)
        {
            return true;
        }
    }

    return false;
}


// --------------------------------------------------
// CHANGE SHUFFLE INTERVAL
// Example: interval 600
// --------------------------------------------------

function interval(ms)
{
    ms = parseInt(ms, 10);

    if (isNaN(ms))
    {
        post(
            "Invalid shuffle interval\n"
        );

        return;
    }

    shuffleIntervalMs = Math.max(
        100,
        ms
    );

    post(
        "Shuffle interval: "
        + shuffleIntervalMs
        + " ms\n"
    );
}


// --------------------------------------------------
// CHANGE INITIAL FADE DURATION
// Example: fadeduration 2000
// --------------------------------------------------

function fadeduration(ms)
{
    ms = parseInt(ms, 10);

    if (isNaN(ms))
    {
        return;
    }

    fadeDurationMs = Math.max(
        100,
        ms
    );
}


// --------------------------------------------------
// CHANGE SELECTED-SQUARE COLOUR
// Example: color 255 130 40
// --------------------------------------------------

function color(r, g, b)
{
    lightR = clamp255(r);
    lightG = clamp255(g);
    lightB = clamp255(b);

    post(
        "Selection color: "
        + lightR
        + " "
        + lightG
        + " "
        + lightB
        + "\n"
    );
}


// --------------------------------------------------
// CHANGE BACKGROUND COLOUR
// Example: background 255 0 0
// --------------------------------------------------

function background(r, g, b)
{
    backgroundR = clamp255(r);
    backgroundG = clamp255(g);
    backgroundB = clamp255(b);

    post(
        "Background color: "
        + backgroundR
        + " "
        + backgroundG
        + " "
        + backgroundB
        + "\n"
    );
}


// --------------------------------------------------
// CHANGE OVERALL BRIGHTNESS
// Example: brightness 0.8
// --------------------------------------------------

function brightness(value)
{
    brightnessValue = clamp(
        Number(value),
        0.0,
        1.0
    );
}


// --------------------------------------------------
// CHANGE PULSE DEPTH
// Example: pulsedepth 0.25
// --------------------------------------------------

function pulsedepth(value)
{
    pulseDepth = clamp(
        Number(value),
        0.0,
        0.8
    );
}


// --------------------------------------------------
// CHANGE PULSE PERIOD
// Example: pulseperiod 6000
// --------------------------------------------------

function pulseperiod(ms)
{
    ms = parseInt(ms, 10);

    if (isNaN(ms))
    {
        return;
    }

    pulsePeriodMs = Math.max(
        500,
        ms
    );

    post(
        "Pulse period: "
        + pulsePeriodMs
        + " ms\n"
    );
}


// --------------------------------------------------
// CHANGE LOCKED BACKGROUND TARGET
// Example: backgroundlevel 0.7
// --------------------------------------------------

function backgroundlevel(value)
{
    lockedBackgroundTarget = clamp(
        Number(value),
        0.0,
        1.0
    );

    post(
        "Locked background level: "
        + lockedBackgroundTarget
        + "\n"
    );
}


// --------------------------------------------------
// CHANGE LOCKED BACKGROUND FADE TIME
// Example: backgroundfadetime 5000
// --------------------------------------------------

function backgroundfadetime(ms)
{
    ms = parseInt(ms, 10);

    if (isNaN(ms))
    {
        return;
    }

    lockedBackgroundFadeMs = Math.max(
        500,
        ms
    );

    post(
        "Locked background fade time: "
        + lockedBackgroundFadeMs
        + " ms\n"
    );
}


// --------------------------------------------------
// CHANGE LOCKED BACKGROUND STEPS
// Example: backgroundsteps 10
// --------------------------------------------------

function backgroundsteps(value)
{
    value = parseInt(value, 10);

    if (isNaN(value))
    {
        return;
    }

    lockedBackgroundSteps = Math.max(
        2,
        Math.min(20, value)
    );

    post(
        "Locked background steps: "
        + lockedBackgroundSteps
        + "\n"
    );
}


// --------------------------------------------------
// CHANGE LOCKED START DELAY
// Example: lockdelay 350
// --------------------------------------------------

function lockdelay(ms)
{
    ms = parseInt(ms, 10);

    if (isNaN(ms))
    {
        return;
    }

    lockedStartDelayMs = Math.max(
        0,
        ms
    );

    post(
        "Locked start delay: "
        + lockedStartDelayMs
        + " ms\n"
    );
}



// --------------------------------------------------
// CHANGE ACTIVE PICKER COLOUR
// Example: activecolor 255 255 255
// --------------------------------------------------

function activecolor(r, g, b)
{
    activeR = clamp255(r);
    activeG = clamp255(g);
    activeB = clamp255(b);
}


// --------------------------------------------------
// CHANGE PICKER BACKGROUND TARGET
// Example: pickerbackground 0.3
// --------------------------------------------------

function pickerbackground(value)
{
    pickerBackgroundTarget = clamp(
        Number(value),
        0.0,
        1.0
    );
}


// --------------------------------------------------
// CHANGE PICKER BACKGROUND FADE TIME
// Example: pickerfadetime 1800
// --------------------------------------------------

function pickerfadetime(ms)
{
    ms = parseInt(ms, 10);

    if (isNaN(ms))
    {
        return;
    }

    pickerBackgroundFadeMs = Math.max(
        200,
        ms
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
            - 2.0
            * value
        );
}


// --------------------------------------------------
// CURRENT TIME
// --------------------------------------------------

function currentTimeMs()
{
    return new Date().getTime();
}


// --------------------------------------------------
// VALUE LIMITS
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