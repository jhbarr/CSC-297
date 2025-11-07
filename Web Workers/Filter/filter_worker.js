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
* run_filter() -> This function runs map on the given array in the index window specified by the main thread
* 
* INPUTS 
*   - sharedBuffer (SharedArrayBuffer) -> This is the shared memory buffer that contains the elements that must be mapped
*   - filterBuffer (SharedArrayBuffer) -> This is the shared memofy buffer where the results of the predicate functions are stored
*   - indexChunk (Array) -> This contains the start and end indices that the worker thread should execute on in the sharedbuffer
*/
function run_filter(sharedBuffer, filterBuffer, indexChunk)
{
    // Wrap the memory buffers with an array wrapper for easier access and update
    const sharedArray = new Int32Array(sharedBuffer);
    const filterArray = new Int32Array(filterBuffer);

    const indexStart = indexChunk[0];
    const indexEnd = indexChunk[1];

    // Iterate through the index chunk in the array
    for (let i = indexStart; i < indexEnd; i++)
    {
        const val = sharedArray[i];
        filterArray[i] = predicate_func(val);
    } 
}


// Add a listener for messages from the main thread
onmessage = function (event) {
    const {sharedBuffer, filterBuffer, indexChunk} = event.data;

    // Run the filtration using the provided data
    run_filter(sharedBuffer, filterBuffer, indexChunk);

    this.postMessage({ status: 'done'});
};
