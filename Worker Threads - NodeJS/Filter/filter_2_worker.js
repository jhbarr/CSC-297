// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

// Dereference the information passed to the worker from the parent thread
const {sharedBuffer, resultBuffer, indexChunks} = workerData;

/*
* predicate_func() -> This function takes the sum of all numbers up to the given input and then returns whether that number is even
* 
* INPUTS
*   - x (int) -> The number to be summed to
* 
* OUTPUTS
*   - bool -> Whether the resulting number is even or not
*/
function predicate_func(x)
{
    let sum = 0;
    for (let i = 0; i < x; i++) {
        sum += 1;
    }
    return sum % 2 == 0;
}

/*
* filter() -> This executes the first step of the filtration process. The worker goes through the array and sets the element in the filter 
*   array to be either 0 or 1 depending on the predicate result
* 
* INPUTS
*   - arrayBuffer (SharedMemoryBuffer) -> The shared memory buffer of the input array
*   - indexStart (int) -> The index that the worker should start looking at in the input array
*   - indexEnd (int) -> The index that the worker should stop looking
*/
function filter(arrayBuffer, resultBuffer, indexChunks)
{
    // Wrap the shared buffer in the integer array
    const array = new Int32Array(arrayBuffer);
    const resultArray = new Int32Array(resultBuffer);

    for (let j = 0; j < indexChunks.length; j++){
        const indexStart = indexChunks[j][0];
        const indexEnd = indexChunks[j][1];

        // Modify part of the array
        for (let i = indexStart; i < indexEnd; i++) {
            val = Atomics.load(array, i);

            if (predicate_func(val)){
                Atomics.exchange(resultArray, i, 1);
            }
            else{
                Atomics.exchange(resultArray, i, 0);
            }
        }
    }
}

// Execute the filtration function
filter(sharedBuffer, resultBuffer, indexChunks);
parentPort.postMessage("Done");
