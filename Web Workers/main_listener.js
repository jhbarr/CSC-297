import { run_parallel_filter } from "./Filter/filter_main.js";
import { run_parallel_map } from "./Map/map_main.js";

// Grab DOM elements
const filterButton = document.getElementById('filterButton');
const mapButton = document.getElementById('mapButton');

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

    console.log("CSV file downloaded as filter_data.csv");
}



// Execute the filtration function
filterButton.addEventListener('click', async () => {
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
                for (let trial= 1; trial < 4; trial++)
                {
                    // Run the function on the specified parameters
                    const [arr, totalTime] = await run_parallel_filter(arr_len, n_workers, max_chunk);

                    // Add the resultant information to the export file
                    const object = {
                        "Thread Count": n_workers,
                        "Trial": trial,
                        "Parallel Time": totalTime,
                        "Array Size": arr_len
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

            const [arr, totalTime] = await run_parallel_filter(arr_len, n_workers, max_chunk); // wait for promise to resolve
            output.textContent = `Filtered Array: ${arr}`;
            timeOutput.textContent = `Total Time: ${totalTime}`;
        }
    }
    catch(err) {
        output.textContent = 'Error running workers ' + err;
    }
});



// Execute the map function
mapButton.addEventListener('click', async () => {
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
                for (let trial= 1; trial < 4; trial++)
                {
                    // Run the function on the specified parameters
                    const [arr, totalTime] = await run_parallel_map(arr_len, n_workers, max_chunk);

                    // Add the resultant information to the export file
                    const object = {
                        "Thread Count": n_workers,
                        "Trial": trial,
                        "Parallel Time": totalTime,
                        "Array Size": arr_len
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

            const [arr, totalTime] = await run_parallel_map(arr_len, n_workers, max_chunk); // wait for promise to resolve
            output.textContent = `Mapped Array: ${arr}`;
            timeOutput.textContent = `Total Time: ${totalTime}`;
        }
    }
    catch(err) {
        output.textContent = 'Error running workers ' + err;
    }
});