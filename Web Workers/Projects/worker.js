// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

// Destructure the object
const { sharedBuffer, indexStart, indexEnd, predicate } = workerData;

// Wrap the shared buffer in the integer array
const array = new Int32Array(sharedBuffer);

function map(array, indexStart, indexEnd)
{
    // Modify part of the array
    for (let i = indexStart; i < indexEnd; i++) {
        const old_val = Atomics.load(array, i);
        Atomics.exchange(array, i, old_val * 2);
    }
}

// Listen for messages from the main thread
switch (predicate) {
      case 'map':
        map(array, indexStart, indexEnd);
        break;
    }

parentPort.postMessage(`Worker processed indexes ${indexStart}–${indexEnd}`);
