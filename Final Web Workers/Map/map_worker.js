/*
* execute_map() -> This function executes the mapping of the input array on the specified index chunk
* and it writes the results of those filters to the filter array
*
* INPUTS
*   - input_array : Array -> The array containing the input elements
*   - filter_array : Array -> The array where the filtrations results should be stored
*   - index_start : int -> The starting index of the input array where the worker should start filtration
*   - index_end : iny -> The ending index where the worker should stop filtering
* OUTPUTS
*   - None
*/
function execute_map(input_array, input_func, index_start, index_end)
{
    // Iterate through the index chunk in the array
    for (let i = index_start; i < index_end; i++)
    {
        const val = input_array[i];
        input_array[i] = input_func(val);
    }
}

onmessage = function (event) {
    const {
        input_array_buffer, 
        input_func_string, 
        index_chunk_array, 
        index_info_buffer
    } = event.data;

    // Wrap the memory buffers in the necessary array wrappers
    const input_array = new Int32Array(input_array_buffer);
    const input_func = new Function('data', `return (${input_func_string})(data);`);
    const index_info_array = new Int32Array(index_info_buffer);

    // Keep attempting to retrieve a new index chunk set until there are none left
    // At which point the worker should alert the main thread
    const total_index_chunks = index_info_array[1];
    while (true)
    {
        const next_index = Atomics.add(index_info_array, 0, 1);
        if (next_index >= total_index_chunks) break;

        const index_chunk = index_chunk_array[next_index];
        const index_start = index_chunk[0];
        const index_end = index_chunk[1];
        execute_map(input_array, input_func, index_start, index_end);
    }

    this.postMessage({ status: 'done' });
}