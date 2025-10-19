// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

// Dereference the information passed to the worker from the parent thread
const { sharedBuffer, indexChunks } = workerData;



// Sums intergers up to n
function summation(n) {
    let result = 0;
    for (let i = 1; i <= n; i++) {
        result += i;
    }
    return result;
}

// Reduction function (addition and summation)
function reduce_func(x, y) {
    return x + summation(y);
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
            partialSum = reduce_func(partialSum, val);
        }
    }
    return partialSum;
}

// Execute reduction and send numeric partial sum to parent
const result = reduceChunks(sharedBuffer, indexChunks);
parentPort.postMessage(result);
