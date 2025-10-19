// Get the worker module
const { Worker } = require('worker_threads');
const fs = require("fs");

/*
* runWorker() -> This function instantiates a worker object, passing it the provided worker information
* 
* INPUTS 
*   - sharedBuffer (SharedArrayBuffer) -> The memory buffer that will hold the array that is to be filtered
*   - indexChunks (Array) -> A pair containing the start and end index in sharedBuffer for the current worker
*/
function runWorker(sharedBuffer, indexChunks)
{
    // Create an object to pass to the worker thread
    // This will contain all of the information that the thread needs to execute
    const dataForWorker = {
        sharedBuffer: sharedBuffer,
        indexChunks: indexChunks
    };

    return new Promise((resolve, reject) => {
        const worker = new Worker('./reduce_worker.js', { workerData: dataForWorker });

        // Get the message back from the thread
        worker.on('message', (msg) => {
            resolve(msg);
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
*   - max_chunk -> maximum chunk size for a single thread at once
*
* OUTPUT
*   None
*/
async function parallel_reduce(n_workers, arr_len, max_chunk)
{
    // Create a shared memory buffer that will be passed to each of the worker threads
    // Wrap an Int32Array around the buffer so that the memory can be more easily modified
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const sharedArray = new Int32Array(sharedBuffer); // A typed 32-bit shared integer array buffer

    // We'll use the shared buffer to hold the original array values; workers will return partial numeric sums

    // Instantiate the values in the shared array
    for (let i = 1; i <= arr_len; i++) {
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

    // Instantiate the worker threads and collect partial sums
    const workers = [];
    for (let i = 0; i < n_workers; i++) {
        workers.push(runWorker(sharedBuffer, worker_chunks[i]));
    }

    // Wait for all workers and gather partial results
    const partials = await Promise.all(workers);

    // Combine partial sums into final sum (Note: JS reduce function is single-threaded)
    const finalSum = partials.reduce((acc, val) => acc + (Number(val) || 0), 0);

    // Get the total time of program execution
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [finalSum, totalTime];
}

// Sums intergers up to n
function summation(n) {
    let result = 0;
    for (let i = 1; i <= n; i++) {
        result += i;
    }
    return result;
}

// Reduction function (addition and summation)
function reduce_func(x, y) {
    return x + summation(y);
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
function serial_reduce(arr_len)
{
    const array = new Array(arr_len);
    for (let i = 1; i <= arr_len; i++) {
        array[i-1] = i;
    }

    // Get the current time
    const start = performance.now();

    let result = 0;
    // Perform numeric reduction by accumulating
    for (let i = 0; i < array.length; i++) {
        result = reduce_func(result, array[i]);
    }

    // Get the total time of program execution
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [result, totalTime];
}

/*
* runTrials() -> This function runs three timing trials for each thread count from 1-8 to see how the long it takes the parallel function to run 
* compared to the serial function. It then packages this data into an object that can be exported to a CSV file
* 
* INPUTS
*   - arr_len (int) -> The length of the array that the functions will be performed on
*   - max_chunk -> maximum chunk size for a single thread at once
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
            const parallel_results = await parallel_reduce(n_workers, arr_len, max_chunk);
            const serial_results = serial_reduce(arr_len);

            const parallel_sum = parallel_results[0];
            const serial_sum = serial_results[0];

            const parallel_time = parallel_results[1];
            const serial_time = serial_results[1];

            console.assert((serial_sum == parallel_sum), "The two sums are not equal");
            console.log("Parallel result:", parallel_sum);
            console.log("Serial result:", serial_sum);
            console.log("Parallel Time:", parallel_time);
            console.log("Serial Time:", serial_time);


            object = {
                "Thread Count": n_workers,
                "Trial": trial,
                "Serial Time": serial_time,
                "Parallel Time": parallel_time,
                "Array Size": arr_len,
                "Serial Sum": serial_sum,
                "Parallel Sum": parallel_sum
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

// Convert data to CSV
async function executeProgram(filename = "../Data/reduce_data.csv") 
{
    // Run the trials
    const data = await runTrials(100000, 1000);

    const csvString = toCSV(data);
    fs.writeFileSync(filename, csvString, "utf8");
    console.log(`✅ CSV file saved as ${filename}`);
}

executeProgram()

