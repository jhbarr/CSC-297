import { run_parallel_filter } from "./Filter/filter_main.js";

// Grab DOM elements
const filterButton = document.getElementById('filterButton');

const input = document.getElementById('numberInput');
const workerInput = document.getElementById('workerInput');
const chunkInput = document.getElementById('chunkInput');
const output = document.getElementById('output');
const timeOutput = document.getElementById('timeOutput');

// Execute the filtration function
filterButton.addEventListener('click', async () => {
    // Get the necessary information from the HTML page
    const arr_len = parseInt(input.value);
    const n_workers = parseInt(workerInput.value);
    const max_chunk = parseInt(chunkInput.value);

    // Attempt to run the workers and display the final filtered array
    try {
        const [arr, totalTime] = await run_parallel_filter(arr_len, n_workers, max_chunk); // wait for promise to resolve
        output.textContent = `Mapped Array: ${arr}`;
        timeOutput.textContent = `Total Time: ${totalTime}`;
    } catch (err) {
        output.textContent = 'Error running workers ' + err;
    }
});