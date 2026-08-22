autowatch = 1;
inlets = 1;
outlets = 2;

/*
    Time between fade updates.
    Smaller values produce smoother movement.
*/
var intervalMs = 100;

/*
    Total fade duration in milliseconds.
    12000 = 12 seconds from black to white.
*/
var fadeDurationMs = 12000;

/*
    Overall maximum brightness:
    1.0 = full white
    0.5 = half brightness
*/
var brightnessValue = 1.0;

var fadePosition = 0.0;
var running = false;
var lastTime = 0;

var animationTask = new Task(tick, this);


/*
    Start a new fade from black to white.
*/
function start()
{
    animationTask.cancel();

    fadePosition = 0.0;
    running = true;
    lastTime = new Date().getTime();

    sendAll(0, 0, 0);
    animationTask.schedule(intervalMs);
}


/*
    Stop the fade at its current brightness.
*/
function stop()
{
    running = false;
    animationTask.cancel();
}


/*
    Restart the fade from black.
*/
function restart()
{
    start();
}


/*
    Immediately show one calculated frame.
*/
function once()
{
    renderFrame();
}


/*
    Change the update interval from Max.

    Example:
    interval 100
*/
function interval(ms)
{
    intervalMs = Math.max(
        20,
        Number(ms)
    );
}


/*
    Change the fade duration from Max.

    Example:
    duration 12000
*/
function duration(ms)
{
    fadeDurationMs = Math.max(
        100,
        Number(ms)
    );
}


/*
    Change the maximum brightness.

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

    renderFrame();
}


/*
    Immediately set both cabinets to black.
*/
function black()
{
    running = false;
    animationTask.cancel();

    fadePosition = 0.0;
    sendAll(0, 0, 0);
}


/*
    Immediately set both cabinets to white.
*/
function white()
{
    running = false;
    animationTask.cancel();

    fadePosition = 1.0;
    renderFrame();
}


/*
    Main animation clock.
*/
function tick()
{
    var currentTime;
    var elapsed;

    if (!running)
    {
        return;
    }

    currentTime = new Date().getTime();
    elapsed = currentTime - lastTime;
    lastTime = currentTime;

    fadePosition += elapsed / fadeDurationMs;

    if (fadePosition >= 1.0)
    {
        fadePosition = 1.0;
        running = false;
    }

    renderFrame();

    if (running)
    {
        animationTask.schedule(intervalMs);
    }
}


/*
    Calculate and send the current white brightness.
*/
function renderFrame()
{
    var smoothPosition;
    var whiteValue;

    smoothPosition = fadePosition
        * fadePosition
        * (3.0 - 2.0 * fadePosition);

    whiteValue = clamp255(
        255
        * smoothPosition
        * brightnessValue
    );

    sendAll(
        whiteValue,
        whiteValue * (130 / 255),
        whiteValue * (40 / 255)
    );
}


/*
    Send /led/all to both Raspberry Pis.

    Outlet 0 = left cabinet
    Outlet 1 = right cabinet
*/
function sendAll(r, g, b)
{
    var command;

    command = [
        "/led/all",
        clamp255(r),
        clamp255(g),
        clamp255(b)
    ];

    outlet(0, command);
    outlet(1, command);
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
        clamp(value, 0, 255)
    );
}