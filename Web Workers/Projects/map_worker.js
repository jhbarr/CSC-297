// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

const {sharedBuffer, indexStart, indexEnd, predicate} = workerData;

// Wrap the shared buffer in the integer array
const array = new Int32Array(sharedBuffer);


/*
* map() -> This executes the first step of the filtration process. The worker goes through its index section and counts how
*   many times the filtration function returns true
* 
* INPUTS
*   - array (Int32Array) -> The shared memory buffer of the input array
*   - indexStart (int) -> The index that the worker should start looking at in the input array
*   - indexEnd (int) -> The index that the worker should stop looking
*/
function map(array, indexStart, indexEnd)
{
    // Modify part of the array
    for (let i = indexStart; i < indexEnd; i++) {
        const old_val = Atomics.load(array, i);
        let sum = 0;
        for (let c = 0; c < old_val; c++) {
            sum += c;
        }

        Atomics.exchange(array, i, sum);
    }
}


// Listen for messages from the main thread
switch (predicate) {
    case 'map':
        map(array, indexStart, indexEnd);
        break;
}

parentPort.postMessage(`Worker processed indexes ${indexStart}–${indexEnd}`);
