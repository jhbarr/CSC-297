/*
* run_reduce() -> This function reduces a portion of a given array down to one element and adds that element to a running reduction array
* 
* INPUTS
*   - working_array_buffer (Shared Memory Buffer) -> The memory buffer holding the working array
*   - reduction_array_buffer (Shared Memory Buffer) -> the memory buffer holding the reduction redults
*   - index_chunk (Array) -> Array holding the start index, end index, and reduction array index necessary for the reduction
*   - predicate_func (Function) -> The function that will actually perform the reduction on the array
* 
* OUTPUTS 
*   none
*/
function run_reduce(working_array_buffer, reduction_array_buffer, index_chunk, predicate_func)
{
    // Wrap the memory buffers with an array wrapper for easier access and update
    const working_array = new Int32Array(working_array_buffer);
    const reduction_array = new Int32Array(reduction_array_buffer);

    const indexStart = index_chunk[0];
    const indexEnd = index_chunk[1];
    const reduction_index = index_chunk[2];

    let partialVal = working_array[indexStart];

    // Iterate through the index chunk in the array
    for (let i = indexStart + 1; i < indexEnd; i++) {
        const val = working_array[i];
        partialVal = predicate_func(partialVal, val);
    }

    // Update the reduction array
    reduction_array[reduction_index] = partialVal;
} 

// Add a listener for messages from the main thread
onmessage = function (event) {
    const {working_array_buffer, reduction_array_buffer, predicate_func_string, index_chunks, index_chunk_info} = event.data;

    // Turn the predicate function string into an actual function
    const predicate_func = new Function('return ' + predicate_func_string)(); 
    const index_chunk_info_array = new Int32Array(index_chunk_info);
    const total_chunks = index_chunk_info_array[1];

    // console.log("worker - index_chunk_info:", index_chunk_info_array)

    while (true)
    {
        const nextIndex = Atomics.add(index_chunk_info_array, 0, 1);
        if (nextIndex >= total_chunks) break;

        const next_chunk = index_chunks[nextIndex];
        run_reduce(working_array_buffer, reduction_array_buffer, next_chunk, predicate_func);
    }

    this.postMessage({ status: 'done' });
};