autowatch = 1;
inlets = 1;
outlets = 2;

/*
    FINAL NAME SELECTION — NO FLASHING

    name 13
        Fade every non-selected square from dim red to black.
        Keep slot 13 fixed in super white.

    black
        Stop and switch everything off.

    fadetime 1800
    backgroundlevel 0.3
    brightness 1.0
    steps 12
*/

var backgroundR = 255;
var backgroundG = 0;
var backgroundB = 0;
var backgroundStartLevel = 0.3;

var selectedR = 255;
var selectedG = 255;
var selectedB = 255;

var brightnessValue = 1.0;

var fadeOutMs = 1800;
var fadeSteps = 12;
var checkIntervalMs = 25;

var mode = "idle";
var selectedSlot = 0;
var fadeStartTime = 0;
var lastFadeStep = -1;

var animationTask = new Task(tick, this);

var commandQueue = [];
var queueTask = new Task(sendQueueChunk, this);
var queueChunkSize = 8;
var queueDelayMs = 18;
var queueBusy = false;

/* Final cleanup: resend black to all non-selected squares. */
var finalCleanupPasses = 2;
var finalCleanupDelayMs = 100;
var finalCleanupCount = 0;
var cleanupTask = new Task(runFinalCleanup, this);

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

var validSlots = buildValidSlots();

function name(slotNumber)
{
    slotNumber = parseInt(slotNumber, 10);

    if (!isValidSlot(slotNumber))
    {
        post("Invalid physical slot: " + slotNumber +
            ". Valid range is 1-50, excluding 21 and 50.\n");
        return;
    }

    animationTask.cancel();
    cleanupTask.cancel();
    cancelQueue();

    selectedSlot = slotNumber;
    fadeStartTime = currentTimeMs();
    lastFadeStep = -1;
    mode = "fade";

    tick();
}

function tick()
{
    var elapsed;
    var progress;
    var stepIndex;
    var level;

    if (mode !== "fade")
    {
        return;
    }

    if (queueBusy)
    {
        animationTask.schedule(checkIntervalMs);
        return;
    }

    elapsed = currentTimeMs() - fadeStartTime;
    progress = clamp(elapsed / fadeOutMs, 0.0, 1.0);
    stepIndex = Math.round(progress * fadeSteps);

    if (stepIndex !== lastFadeStep)
    {
        lastFadeStep = stepIndex;

        level = backgroundStartLevel *
            (1.0 - smoothstep(stepIndex / fadeSteps));

        renderCompleteFrame(level);
    }

    if (progress >= 1.0)
    {
        mode = "selected";
        finalCleanupCount = 0;
        cleanupTask.schedule(finalCleanupDelayMs);
        return;
    }

    animationTask.schedule(checkIntervalMs);
}

/*
    One buffered frame:
    - selected slot is always super white
    - every other slot gets the current fading red
    - /led/show happens only after all values are queued

    This avoids the previous red/white rapid flashing.
*/
function renderCompleteFrame(backgroundLevel)
{
    var i;
    var slot;

    cancelQueue();
    commandQueue = [];

    for (i = 0; i < validSlots.length; i++)
    {
        slot = validSlots[i];

        if (slot === selectedSlot)
        {
            queueGlobalSlot(
                slot,
                selectedR * brightnessValue,
                selectedG * brightnessValue,
                selectedB * brightnessValue
            );
        }
        else
        {
            queueGlobalSlot(
                slot,
                backgroundR * brightnessValue * backgroundLevel,
                backgroundG * brightnessValue * backgroundLevel,
                backgroundB * brightnessValue * backgroundLevel
            );
        }
    }

    commandQueue.push({outletNumber:0, command:["/led/show"]});
    commandQueue.push({outletNumber:1, command:["/led/show"]});

    beginQueue();
}


/*
    Final reliability cleanup.

    UDP can occasionally drop one of the last black commands.
    This resends the final state several times without ever
    turning the selected square red or black.
*/
function runFinalCleanup()
{
    var i;
    var slot;

    if (mode !== "selected" || selectedSlot === 0)
    {
        return;
    }

    if (queueBusy)
    {
        cleanupTask.schedule(30);
        return;
    }

    /*
        Final cleanup without /led/all.

        Only the 47 non-selected squares are resent as black.
        The selected square is never touched, so it remains
        continuously super white with no final flicker.
    */

    commandQueue = [];

    for (i = 0; i < validSlots.length; i++)
    {
        slot = validSlots[i];

        if (slot !== selectedSlot)
        {
            queueGlobalSlot(slot, 0, 0, 0);
        }
    }

    commandQueue.push({outletNumber:0, command:["/led/show"]});
    commandQueue.push({outletNumber:1, command:["/led/show"]});

    beginQueue();

    finalCleanupCount++;

    if (finalCleanupCount < finalCleanupPasses)
    {
        cleanupTask.schedule(finalCleanupDelayMs + 500);
    }
}

function queueGlobalSlot(globalSlot, r, g, b)
{
    var outletNumber;
    var doorNumber;
    var mapping;
    var leds;
    var i;

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

    while (commandQueue.length > 0 && count < queueChunkSize)
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

function black()
{
    mode = "idle";
    animationTask.cancel();
    cleanupTask.cancel();
    cancelQueue();
    selectedSlot = 0;

    outlet(0, ["/led/all", 0, 0, 0]);
    outlet(1, ["/led/all", 0, 0, 0]);
}

function fadetime(ms)
{
    ms = parseInt(ms, 10);
    if (!isNaN(ms))
    {
        fadeOutMs = Math.max(200, ms);
    }
}

function backgroundlevel(value)
{
    backgroundStartLevel = clamp(Number(value), 0.0, 1.0);
}

function brightness(value)
{
    brightnessValue = clamp(Number(value), 0.0, 1.0);
}

function steps(value)
{
    value = parseInt(value, 10);
    if (!isNaN(value))
    {
        fadeSteps = Math.max(4, Math.min(24, value));
    }
}

function isValidSlot(slotNumber)
{
    slotNumber = parseInt(slotNumber, 10);

    return !isNaN(slotNumber)
        && slotNumber >= 1
        && slotNumber <= 50
        && slotNumber !== 21
        && slotNumber !== 50;
}

function buildValidSlots()
{
    var result = [];
    var i;

    for (i = 1; i <= 50; i++)
    {
        if (isValidSlot(i))
        {
            result.push(i);
        }
    }

    return result;
}

function smoothstep(value)
{
    value = clamp(value, 0.0, 1.0);
    return value * value * (3.0 - 2.0 * value);
}

function currentTimeMs()
{
    return new Date().getTime();
}

function clamp(value, minimum, maximum)
{
    return Math.max(minimum, Math.min(maximum, value));
}

function clamp255(value)
{
    return Math.round(clamp(Number(value), 0, 255));
}
