// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

const {sharedBuffer, indexStart, indexEnd, predicate} = workerData;

// Wrap the shared buffer in the integer array
const array = new Int32Array(sharedBuffer);

function filter_1(array, indexStart, indexEnd)
{
    let count = 0;
    // Modify part of the array
    for (let i = indexStart; i < indexEnd; i++) {
        val = Atomics.load(array, i);
        if (val % 2 == 0) {
            count += 1;
        }
    }

    return count;
}



// Listen for messages from the main thread
switch (predicate) {
    case 'filter_1':
        parentPort.postMessage(filter_1(array, indexStart, indexEnd));
        break;
    
}
