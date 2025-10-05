// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

const {sharedBuffer, resultBuffer, indexStart, indexEnd, outputStart, predicate} = workerData;

function filter_1(arrayBuffer, indexStart, indexEnd)
{
    // Wrap the shared buffer in the integer array
    const array = new Int32Array(arrayBuffer);

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

function filter_2(sharedBuffer, resultBuffer, indexStart, indexEnd, outputStart)
{
    const resultArray = new Int32Array(resultBuffer);
    const array = new Int32Array(sharedBuffer);
    let pos = outputStart;

    for (let i = indexStart; i < indexEnd; i++) {
        val = Atomics.load(array, i);
        if (val % 2 == 0) {
            Atomics.exchange(resultArray, pos, val);

            pos += 1;
        }
    }

    return "done";
}



// Listen for messages from the main thread
switch (predicate) {
    case 'filter_1':
        parentPort.postMessage(filter_1(sharedBuffer, indexStart, indexEnd));
        break;
    case 'filter_2':
        parentPort.postMessage(filter_2(sharedBuffer, resultBuffer, indexStart, indexEnd, outputStart));
        break;
}
