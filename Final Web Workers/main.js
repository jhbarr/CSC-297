// Import necessary classes
import Filter from "./Filter/filter.js";
import Map from "./Map/map.js";
import Reduce from "./Reduce/reduce.js";

// Grab DOM elements
const filterButton = document.getElementById('filterButton');
const mapButton = document.getElementById('mapButton');
const reduceButton = document.getElementById('reduceButton')

const workerInput = document.getElementById('workerInput');
const chunkInput = document.getElementById('chunkInput');
const output = document.getElementById('output');
const timeOutput = document.getElementById('timeOutput');

/*
* same_array() -> This function checks whether two specified arrays are the same
* 
* INPUTS 
*   - arr1 (Array) -> The first array
*   - arr2 (Array) -> The second array
* OUTPUTS
*   - None
*/
function same_array(arr1, arr2)
{
    const same = arr1.length === arr2.length && arr1.every((element, index) => element === arr2[index]);
    if (!same) 
    {
        throw new Error("The two map arrays are not the same");
    }
}




function filter_func(x)
{
    let sum = 0;
    for (let i = 0; i < x; i++) {
        sum += 1;
    }
    return sum % 2 == 0;
}

filterButton.addEventListener('click', async () => {
    // Retrieve the necessary information regarding the configuration of the parallel filter
    const arr_len = 100000;
    const max_chunk = parseInt(chunkInput.value);
    const thread_count = parseInt(workerInput.value);

    // Create the input array
    const input_array = [];
    for (let i = 0; i < arr_len; i++)
    {
        input_array.push(i);
    }

    // Create an instance of the filter object with the specified information
    // Run the parallel and serial filter functions from that filter instance
    let filter = new Filter({ thread_count: thread_count });
    const [parallel_arr, parallel_time] = await filter.run_parallel_filter({ array: input_array, input_function: filter_func, block_size: max_chunk });
    const [serial_arr, serial_time] = filter.run_serial_filter({ array: input_array, input_function: filter_func });

    // Assert that the two resultant arrays are the same
    try{
        same_array(parallel_arr, serial_arr)
    }
    catch (err)
    {
        console.log("The parallel and serial arrays are NOT the same");
    }
  
    // output.textContent = `Filtered Array: ${parallel_arr}`;
    timeOutput.textContent = `Parallel Time: ${parallel_time}   Serial Time: ${serial_time}`;
});




/*
------ MAIN MAP FUNCTIONALITY ------
*/
/*
* map_predicate_func() -> This function takes the sum of all numbers up to the given input and then returns that number
* 
* INPUTS
*   - x (int) -> The number to be summed to
* OUTPUTS
*   - bool -> Whether the resulting number is even or not
*/
function map_func(x)
{
    let sum = 0;
    for (let i = 0; i <= x; i++) {
        sum += 1;
    }
    return sum * 3
}

mapButton.addEventListener('click', async () => {
    // Retrieve the necessary information regarding the configuration of the parallel filter
    const arr_len = 100000;
    const max_chunk = parseInt(chunkInput.value);
    const thread_count = parseInt(workerInput.value);

    // Create the input array
    const input_array = [];
    for (let i = 0; i < arr_len; i++)
    {
        input_array.push(i);
    }

    // Create an instance of the filter object with the specified information
    // Run the parallel and serial filter functions from that filter instance
    let map = new Map({ thread_count: thread_count });
    const [parallel_arr, parallel_time] = await map.run_parallel_map({ array: input_array, input_function: map_func, block_size: max_chunk });
    const [serial_arr, serial_time] = map.run_serial_map({ array: input_array, input_function: map_func });

    // Assert that the two resultant arrays are the same
    try{
        same_array(parallel_arr, serial_arr)
    }
    catch (err)
    {
        console.log("The parallel and serial arrays are NOT the same");
    }
  
    // output.textContent = `Filtered Array: ${parallel_arr}   Serial Array: ${serial_arr}`;
    timeOutput.textContent = `Parallel Time: ${parallel_time}   Serial Time: ${serial_time}`;
});




/*
------ MAIN REDUCE FUNCTIONALITY ------
*/
/*
* reduce_func() -> This function takes the sum of all numbers up to the given input and then returns that number
* 
* INPUTS
*   - x (int) -> The number to be summed to
* OUTPUTS
*   - bool -> Whether the resulting number is even or not
*/
function reduce_func(partial_res, x)
{
    let result = 0;
    for (let i = 1; i <= partial_res; i++) {
        result += 1;
    }
    const res = result + x;
    return res;
}

reduceButton.addEventListener('click', async () => {
    // Retrieve the necessary information regarding the configuration of the parallel filter
    const arr_len = 10000;
    const max_chunk = parseInt(chunkInput.value);
    const thread_count = parseInt(workerInput.value);

    // Create the input array
    const input_array = [];
    for (let i = 0; i < arr_len; i++)
    {
        input_array.push(i);
    }

    // Create an instance of the filter object with the specified information
    // Run the parallel and serial filter functions from that filter instance
    let reduce = new Reduce({ thread_count: thread_count });
    const [parallel_res, parallel_time] = await reduce.run_parallel_reduce({ array: input_array, input_function: reduce_func, block_size: max_chunk });
    const [serial_res, serial_time] = reduce.run_serial_reduce({ array: input_array, input_function: reduce_func });

    // Assert that the two resultant arrays are the same
    if (parallel_res != serial_res)
    {
        console.log("The parallel and serial arrays are NOT the same");
    }
    
  
    output.textContent = `Filtered Result: ${parallel_res}   Serial Result: ${serial_res}`;
    timeOutput.textContent = `Parallel Time: ${parallel_time}   Serial Time: ${serial_time}`;
});