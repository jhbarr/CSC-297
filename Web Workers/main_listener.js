import { run_parallel_filter, run_serial_filter } from "./Filter/filter_main.js";
import { run_parallel_map, run_serial_map } from "./Map/map_main.js";
import { run_parallel_reduce } from "./Reduce_2/reduce_2_main.js";

// Grab DOM elements
const filterButton = document.getElementById('filterButton');
const mapButton = document.getElementById('mapButton');
const reduceButton = document.getElementById('reduceButton')

const input = document.getElementById('numberInput');
const workerInput = document.getElementById('workerInput');
const chunkInput = document.getElementById('chunkInput');
const output = document.getElementById('output');
const timeOutput = document.getElementById('timeOutput');
const checkbox = document.getElementById("timingCheckbox");


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
* same_array() -> This function checks whether two specified arrays are the same
* 
* INPUTS 
*   - arr1 (Array) -> The first array
*   - arr2 (Array) -> The second array
* 
* OUTPUTS
*   - same (Bool) -> Whether the two arrays are equal
*/
function same_array(arr1, arr2)
{
    const same = arr1.length === arr2.length && arr1.every((element, index) => element === arr2[index]);
    return same;
}


/*
* filter_predicate_func() -> This function takes the sum of all numbers up to the given input and then returns whether that number is even
* 
* INPUTS
*   - x (int) -> The number to be summed to
* 
* OUTPUTS
*   - bool -> Whether the resulting number is even or not
*/
function filter_predicate_func(x)
{
    let sum = 0;
    for (let i = 0; i < x; i++) {
        sum += 1;
    }
    return sum % 2 == 0;
}


// Execute the filtration function
filterButton.addEventListener('click', async () => {
    // Get the necessary information from the HTML page
    const arr_len = parseInt(input.value);
    const max_chunk = parseInt(chunkInput.value);

    // Convert the predicate func to a string so that it can be passed to the functions
    const predicate_func_string = filter_predicate_func.toString();

    try{
        // If the user has requested to time the functions, then 
        // Loop through the different number of worker threads from 1-8 and time them
        if (checkbox.checked)
        {
            // Create an array to hold the results of the timing
            const data = [];

            // Go through each of the thread counts and run three trials on the function
            for (let n_workers = 1; n_workers < 9; n_workers++)
            {
                for (let trial= 1; trial < 6; trial++)
                {
                    // Run the function on the specified parameters
                    const [parallelArr, paralleltime] = await run_parallel_filter(arr_len, n_workers, max_chunk, predicate_func_string);
                    const [serialArr, serialTime] = run_serial_filter(arr_len, predicate_func_string);
                    
                    // Add a check to make sure that the two outputted arrays are the same
                    const same = same_array(parallelArr, serialArr);
                    if (!same)
                    {
                        throw new Error("The two arrays are not the same");
                    }

                    // Add the resultant information to the export file
                    const object = {
                        "Thread Count": n_workers,
                        "Trial": trial,
                        "Parallel Time": paralleltime,
                        "Serial Time": serialTime,
                        "Array Size": arr_len,
                        "Chunk Size": max_chunk
                    }

                    data.push(object);
                }
            }

            // Save the data to a csv file
            saveToCSV(data, "filter");
        }
        // Otherwise, simply use the user provided parameters to run the function and display the results to the user
        else
        {
            // Get the number of workers from the html file
            const n_workers = parseInt(workerInput.value);
            const [parallelArr, parallelTime] = await run_parallel_filter(arr_len, n_workers, max_chunk, filter_predicate_func); // wait for promise to resolve

            output.textContent = `Filtered Array: ${parallelArr}`;
            timeOutput.textContent = `Total Time: ${parallelTime}`;
        }
    }
    catch(err) {
        output.textContent = 'Error running workers ' + err;
    }
});



/*
* map_predicate_func() -> This function takes the sum of all numbers up to the given input and then returns that number
* 
* INPUTS
*   - x (int) -> The number to be summed to
* 
* OUTPUTS
*   - bool -> Whether the resulting number is even or not
*/
function map_predicate_func(x)
{
    let sum = 0;
    for (let i = 0; i <= x; i++) {
        sum += 1;
    }
    return sum
}

// Execute the map function
mapButton.addEventListener('click', async () => {
    // Get the necessary information from the HTML page
    const arr_len = parseInt(input.value);
    const max_chunk = parseInt(chunkInput.value);

    // Convert the predicate func to a string so that it can be passed to the functions
    const predicate_func_string = map_predicate_func.toString();

    try{
        // If the user has requested to time the functions, then 
        // Loop through the different number of worker threads from 1-8 and time them
        if (checkbox.checked)
        {
            // Create an array to hold the results of the timing
            const data = [];

            // Go through each of the thread counts and run three trials on the function
            for (let n_workers = 1; n_workers < 9; n_workers++)
            {
                for (let trial= 1; trial < 6; trial++)
                {
                    // Run the function on the specified parameters
                    const [parallelArr, parallelTime] = await run_parallel_map(arr_len, n_workers, max_chunk, predicate_func_string);
                    const [serialArr, serialTime] = run_serial_map(arr_len, predicate_func_string);

                    const same = same_array(parallelArr, serialArr)
                    if (!same)
                    {
                        throw new Error("The two map arrays are not the same");
                    }

                    // Add the resultant information to the export file
                    const object = {
                        "Thread Count": n_workers,
                        "Trial": trial,
                        "Parallel Time": parallelTime,
                        "Serial Time": serialTime,
                        "Array Size": arr_len,
                        "Chunk Size": max_chunk
                    }

                    data.push(object);
                }
            }

            // Save the data to a csv file
            saveToCSV(data, "map");
        }
        // Otherwise, simply use the user provided parameters to run the function and display the results to the user
        else
        {
            // Get the number of workers from the html file
            const n_workers = parseInt(workerInput.value);

            const [arr, totalTime] = await run_parallel_map(arr_len, n_workers, max_chunk, predicate_func_string); // wait for promise to resolve
            const [serialArr, serialTime] = run_serial_map(arr_len, predicate_func_string);

            console.log(same_array(arr, serialArr));

            output.textContent = `Mapped Array: ${arr}`;
            timeOutput.textContent = `Total Time: ${totalTime}`;
        }
    }
    catch(err) {
        output.textContent = 'Error running workers ' + err;
    }
});


// Execute the reduce function
reduceButton.addEventListener('click', async () => {
    // Get the necessary information from the HTML page
    const arr_len = parseInt(input.value);
    const max_chunk = parseInt(chunkInput.value);

    try{
        // If the user has requested to time the functions, then 
        // Loop through the different number of worker threads from 1-8 and time them
        if (checkbox.checked)
        {
            // Create an array to hold the results of the timing
            const data = [];

            // Go through each of the thread counts and run three trials on the function
            for (let n_workers = 1; n_workers < 9; n_workers++)
            {
                for (let trial= 1; trial < 6; trial++)
                {
                    // Run the function on the specified parameters
                    const [finalSum, totalTime] = await run_parallel_reduce(arr_len, n_workers, max_chunk);

                    // Add the resultant information to the export file
                    const object = {
                        "Thread Count": n_workers,
                        "Trial": trial,
                        "Parallel Time": totalTime,
                        "Array Size": arr_len,
                        "Chunk Size": max_chunk
                    }

                    data.push(object);
                }
            }

            // Save the data to a csv file
            saveToCSV(data, "reduce_2");
        }
        // Otherwise, simply use the user provided parameters to run the function and display the results to the user
        else
        {
            // Get the number of workers from the html file
            const n_workers = parseInt(workerInput.value);

            const [finalSum, totalTime] = await run_parallel_reduce(arr_len, n_workers, max_chunk); // wait for promise to resolve
            output.textContent = `Reduce Result: ${finalSum}`;
            timeOutput.textContent = `Total Time: ${totalTime}`;
        }
    }
    catch(err) {
        output.textContent = 'Error running workers ' + err;
    }
});