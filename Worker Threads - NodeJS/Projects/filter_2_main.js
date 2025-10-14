// Get the worker module
const { Worker } = require('worker_threads');
const fs = require("fs");

/*
* runWorker() -> This function instantiates a worker object, passing it the provided worker information
* 
* INPUTS 
*   - sharedBuffer (SharedArrayBuffer) -> This is the memory buffer that will hold the array that is to be filtered
*   - resultBuffer (SharedArrayBuffer) -> The memory buffer that will hold the result array
*   - indexStart (int) -> The index that the worker thread should start executing at with respect to the original array
*   - indexEnd (int) -> The index that the worker thread should stop executing at
*/
function runWorker(sharedBuffer, resultBuffer, indexChunks)
{
    // Create an object to pass to the worker thread
    // This will contain all of the information that the thread needs to execute
    const dataForWorker = {
        sharedBuffer: sharedBuffer,
        resultBuffer: resultBuffer,
        indexChunks: indexChunks
    };

    return new Promise((resolve, reject) => {
        const worker = new Worker('./filter_2_worker.js', { workerData: dataForWorker });

        // Get the message back from the thread
        worker.on('message', (msg) => {
            resolve();
        });    
        worker.on('error', reject);
        worker.on('exit', (code) => {
        if (code !== 0)
            reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

/*
* parallel_filter() -> This function executes the main filter code by first creating worker threads to assess how long the filtered array will be
*   It then creates another batch of threads to create the new filtered array
* 
* INPUTS
*   - n_workers (int) -> The number of worker threads to be used
*   - arr_len (int) -> The length of the array to be filtered
*  
* OUTPUT
*   None
*/
async function parallel_filter(n_workers, arr_len, max_chunk)
{
    // Create a shared memory buffer that will be passed to each of the worker threads
    // Wrap an Int32Array around the buffer so that the memory can be more easily modified
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const sharedArray = new Int32Array(sharedBuffer); // A typed 32-bit shared integer array buffer

    // Create a shared memory buffer to hold the result of the predicate filter on each of the array elements
    const filterBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const filterArray = new Int32Array(filterBuffer);

    // Instantiate the values in the shared array
    for (let i = 1; i <= arr_len; i++) 
    {
        sharedArray[i-1] = i;
    }

    // Get the start time
    const start = performance.now()

    // Create the index chunks of specified size
    const chunks = [];
    for (let i = 0; i < arr_len; i += max_chunk)
    {
        const start = i;
        const end = Math.min(i + max_chunk, arr_len);

        chunks.push([start, end]);
    }

    const worker_chunks = Array.from({ length: n_workers }, () => []);
        chunks.forEach((range, i) => {
            worker_chunks[i % n_workers].push(range);
    });

    // Instantiate the worker threads
    const workers = [];
    for (let i = 0; i < n_workers; i++) 
    {
        // console.log(worker_chunks[i]);
        workers.push(runWorker(sharedBuffer, filterBuffer, worker_chunks[i]));
    }

    // Wait for all of the worker threads to finish their processes
    await Promise.all(workers);

    // Go through each of the values in the results array
    // If an element in the result array is true, add the element with the corresponding index from the original array to the final array
    const finalArray = [];
    for (let i = 0; i < arr_len; i++) 
    {
        if (filterArray[i])
        {
            finalArray.push(sharedArray[i]);
        }
    }

    // Get the total time of program execution
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [Array.from(finalArray), totalTime];
}


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
* serial_filter() -> This function performs the filter function serially
* 
* INPUT 
*   - arr_len (int) -> The length of the array to be filtered
* 
* OUTPUT
*   - result_array (Int32Array) -> The resultant array after filtration
*/
function serial_filter(arr_len)
{
    const array = new Array(arr_len)
    const filterArray = new Array(arr_len);
    const finalArray = [];

    // Instantiate the values in the shared array
    for (let i = 1; i <= arr_len; i++) 
    {
        array[i-1] = i;
    }

    // Get the current time
    const start = performance.now();

    // Go through the array and set each index to either 0 or 1 in the filter array 
    // depending on the predicate return of the element from the original array
    for (let i = 0; i < arr_len; i++)
    {
        if (predicate_func(array[i]))
        {
            filterArray[i] = 1;
        }
        else
        {
            filterArray[i] = 0;
        }
    }

    // Then go through the filter array and add the element from the corresponding index to the final array
    for (let i = 0; i < arr_len; i++) 
    {
        if (filterArray[i])
        {
            finalArray.push(array[i]);
        }
    }

    // Get the total time of program execution
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [finalArray, totalTime];
}

/*
* runTrials() -> This function runs three timing trials for each thread count from 1-8 to see how the long it takes the parallel function to run 
* compared to the serial function. It then packages this data into an object that can be exported to a CSV file
* 
* INPUTS
*   - arr_len (int) -> The length of the array that the functions will be performed on
* 
* OUTPUTS
*   - data (Array) -> An array of objects that containts the times for each thread count trial from the serial and paralle functions
*/
async function runTrials(arr_len, max_chunk)
{
    // Create an array to hold all of the trial results
    const data = [];

    for (let n_workers = 1; n_workers < 9; n_workers++){
        console.log("Thread Count =", n_workers);

        for (let trial = 1; trial < 4; trial++){
            const parallel_results = await parallel_filter(n_workers, arr_len, max_chunk);
            const serial_results = serial_filter(arr_len);

            const parallel_array = parallel_results[0];
            const serial_array = serial_results[0];

            const parallel_time = parallel_results[1];
            const serial_time = serial_results[1];

            console.log("Parallel Time:", parallel_time);
            console.log("Serial Time:", serial_time);

            console.assert(JSON.stringify(parallel_array) === JSON.stringify(serial_array), "The two arrays are not equal");

            object = {
                "Thread Count": n_workers,
                "Trial": trial,
                "Serial Time": serial_time,
                "Parallel Time": parallel_time,
                "Array Size": arr_len
            }

            data.push(object);
        }

        console.log("")
    }

    // Return the final data
    return data
}

// Convert array of objects to CSV
function toCSV(data) {
    const headers = Object.keys(data[0]);
    const csvRows = [
    headers.join(","), // header row
    ...data.map(row => headers.map(header => JSON.stringify(row[header] ?? "")).join(","))
    ];
    return csvRows.join("\n");
}

// Function to convert data to CSV and trigger download
async function executeProgram(filename = "../Data/filter_2_data.csv") 
{
    // Run the trials
    const data = await runTrials(100000, 100);

    const csvString = toCSV(data);
    fs.writeFileSync(filename, csvString, "utf8");
    console.log(`✅ CSV file saved as ${filename}`);
}


// Export the data to the CSV
executeProgram()

// async function func(n_workers, arr_len, max_chunk)
// {
//     const res = await parallel_filter(n_workers, arr_len, max_chunk);
//     console.log(res);
// }

// func(4, 20, 2);
