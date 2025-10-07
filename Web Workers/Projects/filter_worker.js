// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

// Dereference the information passed to the worker from the parent thread
const {sharedBuffer, resultBuffer, indexStart, indexEnd, outputStart, predicate} = workerData;

/*
* filter_1() -> This executes the first step of the filtration process. The worker goes through its index section and counts how
*   many times the filtration function returns true
* 
* INPUTS
*   - arrayBuffer (SharedMemoryBuffer) -> The shared memory buffer of the input array
*   - indexStart (int) -> The index that the worker should start looking at in the input array
*   - indexEnd (int) -> The index that the worker should stop looking
*/
function filter_1(arrayBuffer, indexStart, indexEnd)
{
    // Wrap the shared buffer in the integer array
    const array = new Int32Array(arrayBuffer);

    // Initialize a variable to count how many times the filtration function returns true
    let count = 0;

    // Modify part of the array
    for (let i = indexStart; i < indexEnd; i++) {
        val = Atomics.load(array, i);

        let sum = 0;
        for (let i = 0; i < val; i++) {
            sum += i;
        }
        if (sum % 2 == 0) {
            count++;
        }
    }   

    return count;
}

/*
* filter_2() -> This exeuctes the second step of the filtration process. the worker thread goes through its set of indices and 
*   adds the values to the output array for which the filtration function returns true
*   
* INPUTS
*   - sharedBuffer (SharedMemoryBuffer) -> The shared memory buffer of the input array
*   - resultBuffer (SharedMemoryBuffer) -> The shared memory buffer of the output array
*   - indexStart (int) -> The index that the worker should start looking at in the input array
*   - indexEnd (int) -> The index that the worker should stop looking
*   - outputStart (int) -> The index at which the thread should start adding to the output array
*/
function filter_2(sharedBuffer, resultBuffer, indexStart, indexEnd, outputStart)
{
    // Wrap the two buffers in an Int32Array so that it is more easily accessible and modifiable
    const resultArray = new Int32Array(resultBuffer);
    const array = new Int32Array(sharedBuffer);

    // Get the position that the thread should start inserting into the result array
    let pos = outputStart;

    for (let i = indexStart; i < indexEnd; i++) {
        val = Atomics.load(array, i);

        let sum = 0;
        for (let i = 0; i < val; i++) {
            sum += i;
        }

        if (sum % 2 == 0) {
            Atomics.exchange(resultArray, pos, val);

            pos += 1;
        }
    }
}

// Execute different steps of the filtration process depending on the message from the parent thread
switch (predicate) {
    case 'filter_1':
        parentPort.postMessage(filter_1(sharedBuffer, indexStart, indexEnd));
        break;
    case 'filter_2':
        parentPort.postMessage(filter_2(sharedBuffer, resultBuffer, indexStart, indexEnd, outputStart));
        break;
}
