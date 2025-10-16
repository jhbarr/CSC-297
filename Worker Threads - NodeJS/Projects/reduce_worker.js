
// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

// Dereference the information passed to the worker from the parent thread
const { sharedBuffer, indexChunks } = workerData;

/*
* predicate_func(x, y) -> Reduce operator for two values
* INPUTS: x, y (int)
* OUTPUT: int (reduced value)
*/
function predicate_func(x, y) {
    // Example: sum
    return x + y;
}


// Worker reduction function: reduce assigned chunks and return result
function reduceChunks(arrayBuffer, indexChunks) {
    const array = new Int32Array(arrayBuffer);
    let partialResult = null;
    for (let j = 0; j < indexChunks.length; j++) {
        const indexStart = indexChunks[j][0];
        const indexEnd = indexChunks[j][1];
        for (let i = indexStart; i < indexEnd; i++) {
            const val = Atomics.load(array, i);
            if (partialResult === null) {
                partialResult = val;
            } else {
                partialResult = predicate_func(partialResult, val);
            }
        }
    }
    return partialResult;
}

// Execute reduction and send result to parent
const result = reduceChunks(sharedBuffer, indexChunks);
parentPort.postMessage(result);
