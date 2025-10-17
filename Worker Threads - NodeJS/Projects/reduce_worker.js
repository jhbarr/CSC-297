// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

// Dereference the information passed to the worker from the parent thread
const { sharedBuffer, indexChunks } = workerData;


// Worker function: weighted sum combiner with factorial
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

function reduce_func(x, y, index) {
    return x + factorial(y) * index;
}

// Worker reduction function: sum assigned chunks and return numeric partial sum
function reduceChunks(arrayBuffer, indexChunks) {
    const array = new Int32Array(arrayBuffer);
    let partialSum = 0;
    for (let j = 0; j < indexChunks.length; j++) {
        const indexStart = indexChunks[j][0];
        const indexEnd = indexChunks[j][1];
        for (let i = indexStart; i < indexEnd; i++) {
            const val = array[i];
            partialSum = reduce_func(partialSum, val, i);
        }
    }
    return partialSum;
}

// Execute reduction and send numeric partial sum to parent
const result = reduceChunks(sharedBuffer, indexChunks);
parentPort.postMessage(result);
