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
const checkbox = document.getElementById("timingCheckbox");

/*
* ---------- UILITY FUNCTIONS --------------
*/
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

/*
* saveToCSV() -> This function takes in an array of objects and convers and exports that data to a csv file
* 
* INPUTS 
*   - data (Array) -> This is an array of objects 
* 
* OUTPUTS 
*   None
*/
function saveToCSV(data, filename) {
    if (!data || !data.length) {
    console.error("No data provided");
    return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
    headers.join(","), // header row
    ...data.map(row =>
        headers.map(header => JSON.stringify(row[header] ?? "")).join(",")
    )
    ];

    const csvString = csvRows.join("\n");

    // Create a Blob from the CSV string
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_data.csv`; // Desired file name

    // Trigger the download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`CSV file downloaded as ${filename}_data.csv`);
}



/*
------ MAIN MAP FUNCTIONALITY ------
*/
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
    const input_array = new Int32Array(arr_len);
    for (let i = 0; i < arr_len; i++)
    {
        input_array[i] = i;
    }

    // If the user has requested to time the functions, then 
    // Loop through the different number of worker threads from 1-8 and time them
    if (checkbox.checked)
    {
        // Create an array to hold the results of the timing
        const data = [];

        // Go through each of the thread counts and run three trials on the function
        for (let thread_count = 1; thread_count < 9; thread_count++)
        {
            // Create a parallel instance with the new number of workers
            let filter = new Filter({ thread_count: thread_count });

            for (let trial= 1; trial < 6; trial++)
            {
                // Run the function on the specified parameters
                const [parallel_arr, parallel_time] = await filter.run_parallel_filter({ array: input_array, input_function: filter_func, block_size: max_chunk });
                const [serial_arr, serial_time] = filter.run_serial_filter({ array: input_array, input_function: filter_func });

                try{
                    same_array(parallel_arr, serial_arr)
                }
                catch (err)
                {
                    console.log("The parallel and serial arrays are NOT the same");
                }

                // Add the resultant information to the export file
                const object = {
                    "Thread Count": thread_count,
                    "Trial": trial,
                    "Parallel Time": parallel_time,
                    "Array Size": arr_len,
                    "Chunk Size": max_chunk
                }

                data.push(object);
            }
        }

        // Save the data to a csv file
        saveToCSV(data, "filter");
    }

    else
    {
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
    
        // output.textContent = `Parallel Array: ${parallel_arr}`;
        timeOutput.textContent = `Parallel Time: ${parallel_time}   Serial Time: ${serial_time}`;
    }
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
    const input_array = new Int32Array(arr_len);
    for (let i = 0; i < arr_len; i++)
    {
        input_array[i] = i;
    }

    // If the user has requested to time the functions, then 
    // Loop through the different number of worker threads from 1-8 and time them
    if (checkbox.checked)
    {
        // Create an array to hold the results of the timing
        const data = [];

        // Go through each of the thread counts and run three trials on the function
        for (let thread_count = 1; thread_count < 9; thread_count++)
        {
            // Create a parallel instance with the new number of workers
            let map = new Map({ thread_count: thread_count });

            for (let trial= 1; trial < 6; trial++)
            {
                // Run the function on the specified parameters
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
                
                // Add the resultant information to the export file
                const object = {
                    "Thread Count": thread_count,
                    "Trial": trial,
                    "Parallel Time": parallel_time,
                    "Serial Time": serial_time,
                    "Array Size": arr_len,
                    "Chunk Size": max_chunk
                }

                data.push(object);
            }
        }

        // Save the data to a csv file
        saveToCSV(data, "map");
    }

    else
    {
        // Create an instance of the filter object with the specified information
        // Run the parallel and serial filter functions from that filter instance
        let map = new Map({ thread_count: thread_count });
        const [parallel_arr, parallel_time] = await map.run_parallel_map({ array: input_array, input_function: filter_func, block_size: max_chunk });
        const [serial_arr, serial_time] = map.run_serial_map({ array: input_array, input_function: filter_func });

        // Assert that the two resultant arrays are the same
        try{
            same_array(parallel_arr, serial_arr)
        }
        catch (err)
        {
            console.log("The parallel and serial arrays are NOT the same");
        }
    
        // output.textContent = `Parallel Array: ${parallel_arr}`;
        timeOutput.textContent = `Parallel Time: ${parallel_time}   Serial Time: ${serial_time}`;
    }
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
    const res = Math.floor(result / x) + x;
    return res;
}

reduceButton.addEventListener('click', async () => {
    // Retrieve the necessary information regarding the configuration of the parallel filter
    const arr_len = 100000;
    const max_chunk = parseInt(chunkInput.value);
    const thread_count = parseInt(workerInput.value);

    // Create the input array
    const input_array = new Int32Array(arr_len);
    for (let i = 1; i <= arr_len; i++)
    {
        input_array[i] = i;
    }

    // If the user has requested to time the functions, then 
    // Loop through the different number of worker threads from 1-8 and time them
    if (checkbox.checked)
    {
        // Create an array to hold the results of the timing
        const data = [];

        // Go through each of the thread counts and run three trials on the function
        for (let thread_count = 1; thread_count < 9; thread_count++)
        {
            // Create a parallel instance with the new number of workers
            let reduce = new Reduce({ thread_count: thread_count });

            for (let trial= 1; trial < 6; trial++)
            {
                // Run the function on the specified parameters
                const [parallel_res, parallel_time] = await reduce.run_parallel_reduce({ array: input_array, input_function: reduce_func, block_size: max_chunk });
                const [serial_res, serial_time] = reduce.run_serial_reduce({ array: input_array, input_function: reduce_func });

                // Assert that the two resultant arrays are the same
                if (parallel_res != serial_res)
                {
                    console.log("The parallel and serial arrays are NOT the same");
                }
                
                // Add the resultant information to the export file
                const object = {
                    "Thread Count": thread_count,
                    "Trial": trial,
                    "Parallel Time": parallel_time,
                    "Array Size": arr_len,
                    "Chunk Size": max_chunk
                }

                data.push(object);
            }
        }

        // Save the data to a csv file
        saveToCSV(data, "reduce");
    }
    
    else
    {
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
        
    
        output.textContent = `Parallel Result: ${parallel_res}   Serial Result: ${serial_res}`;
        timeOutput.textContent = `Parallel Time: ${parallel_time}   Serial Time: ${serial_time}`;
    }
});