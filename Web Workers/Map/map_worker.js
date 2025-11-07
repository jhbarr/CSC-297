/*
* run_map() -> This function runs map on the given array in the index window specified by the main thread
* 
* INPUTS 
*   - sharedBuffer (SharedArrayBuffer) -> This is the shared memory buffer that contains the elements that must be mapped
*   - indexChunk (Array) -> This contains the start and end indices that the worker thread should execute on in the sharedbuffer
*/
function run_filter(sharedBuffer, indexChunk)
{
    // Wrap the memory buffers with an array wrapper for easier access and update
    const sharedArray = new Int32Array(sharedBuffer);

    const indexStart = indexChunk[0];
    const indexEnd = indexChunk[1];

    // Iterate through the index chunk in the array
    for (let i = indexStart; i < indexEnd; i++)
    {
        sharedArray[i] = sharedArray[i] * 3;
    }

    // Post a completion message to the main thread
    this.postMessage({ status: 'done'});
}


// Add a listener for messages from the main thread
onmessage = function (event) {
    const {sharedBuffer, indexChunk} = event.data;

    // Run the map using the provided data
    run_filter(sharedBuffer, indexChunk);

    this.postMessage({ status: 'done'});
};