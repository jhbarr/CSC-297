// Get the parent port and data from the main file
const { parentPort, workerData } = require('worker_threads');

const {sharedBuffer, indexChunks} = workerData;

/*
* predicate_func() -> This function takes the sum of all numbers up to the given input and then returns that number
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
    for (let i = 0; i <= x; i++) {
        sum += 1;
    }
    return sum
}

/*
* map() -> This executes the first step of the filtration process. The worker goes through its index section and counts how
*   many times the filtration function returns true
* 
* INPUTS
*   - array (Int32Array) -> The shared memory buffer of the input array
*   - indexStart (int) -> The index that the worker should start looking at in the input array
*   - indexEnd (int) -> The index that the worker should stop looking
*/
function map(sharedBuffer, indexChunks)
{
    // Wrap the shared buffer in the integer array
    const array = new Int32Array(sharedBuffer);

    // Modify part of the array
    for (let i = 0; i < indexChunks.length; i++){
        const indexStart = indexChunks[i][0];
        const indexEnd = indexChunks[i][1];

        for (let j = indexStart; j < indexEnd; j++) {
            const val = Atomics.load(array, j);
            
            const map_value = predicate_func(val)

            Atomics.exchange(array, j, map_value);
        }
    }
}


// Run the worker map function
map(sharedBuffer, indexChunks);
parentPort.postMessage("Done");
       
