// Get the worker module
const { Worker } = require('worker_threads');
const fs = require("fs");

/*
* runWorker() -> This function instantiates a worker object, passing it the provided worker information
* 
* INPUTS 
*   - sharedBuffer (SharedArrayBuffer) -> This is the memory buffer that will hold the array that is to be filtered
*   - resultBuffer (SharedArrayBuffer) -> The memory buffer that will hold the result array (CAN be null)
*   - indexStart (int) -> The index that the worker thread should start executing at with respect to the original array
*   - indexEnd (int) -> The index that the worker thread should stop executing at
*   - outputStart (int) -> The index at which the worker thread should start inserting values into the output array
*   - predicate (String) -> The function that the worker thread should execute
*/
function runWorker(sharedBuffer, resultBuffer, indexStart, indexEnd, outputStart, predicate)
{
    // Create an object to pass to the worker thread
    // This will contain all of the information that the thread needs to execute
    const dataForWorker = {
        sharedBuffer: sharedBuffer,
        resultBuffer: resultBuffer,
        indexStart: indexStart,
        indexEnd: indexEnd,
        outputStart: outputStart,
        predicate: predicate,
    };

    return new Promise((resolve, reject) => {
        const worker = new Worker('./filter_worker.js', { workerData: dataForWorker });

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
* create_workers() -> This function creates a batch of worker threads using the provided inputs
* 
* INPUTS 
*   - sharedBuffer (SharedArrayBuffer) -> This is the memory buffer that will hold the array that is to be filtered
*   - resultBuffer (SharedArrayBuffer) -> The memory buffer that will hold the result array (CAN be null)
*   - indexArray (Array) -> An array holding the indices of where each worker thread should start inserting into the result array
*   - n_workers (int) -> The number of worker threads to be created
*   - arr_len (int) -> the length of the original array
*   - chunk_size (int) -> the size of the index chunk that each worker thread should execute on the original array
*   - predicate (String) -> The name of the function that the worker thread should execute
* 
* OUTPUTS 
*   - workers (Array) -> A list of all of the worker threads that have been created
*/
function create_workers(sharedBuffer, resultBuffer, indexArray, n_workers, arr_len, chunk_size, predicate) 
{
    // Instantiate a batch of workers
    const workers = [];
    let outputStart = 0;

    // Iterate through each of the worker threads
    for (let i = 0; i < n_workers; i++)
    {   
        // Calculate the threads starting and ending indices
        const start = i * chunk_size;
        const end = Math.min(start + chunk_size, arr_len);

        // This if statement prevents the case that we are executing the initial filtration step
        // In which case the index array will not have been created yet
        if (indexArray){
            outputStart = indexArray[i];
        }
        
        // Create the worker thread
        if (start < end) {
            workers.push(runWorker(sharedBuffer, resultBuffer, start, end, outputStart, predicate));
        }
    }

    return workers;
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
async function parallel_filter(n_workers, arr_len)
{
    // Create a shared memory buffer that will be passed to each of the worker threads
    // Wrap an Int32Array around the buffer so that the memory can be more easily modified
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const sharedArray = new Int32Array(sharedBuffer); // A typed 32-bit shared integer array buffer

    // Instantiate the values in the shared array
    for (let i = 1; i <= arr_len; i++) 
    {
        sharedArray[i-1] = i;
    }

    // Get the start time
    const start = performance.now()

    // Split the array into equal chunks
    // So that each thread will execute on similar sized chunks of indices
    const chunk_size = Math.ceil(arr_len / n_workers);

    // Create a batch of workers
    let workers = create_workers(sharedBuffer, null, null, n_workers, arr_len, chunk_size, 'filter_1');

    // Wait for all workers and collect their messages
    // Additionally, get the total number of predicate results for each thread 
    const results = await Promise.all(workers);

    // Create an array to hold which indices of the output array each thread should work on
    const indexArray = new Array(n_workers + 1).fill(0);
    for (let i = 0; i < n_workers; i++)
    {
        indexArray[i + 1] = indexArray[i] + results[i];
    }

    // Create a shared buffer for the new filtered array
    const resultBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * indexArray.at(-1));

    // Create a new batch of workers to filter the old array and add it to the new memory buffer
    workers = create_workers(sharedBuffer, resultBuffer, indexArray, n_workers, arr_len, chunk_size, 'filter_2');

    // Wait for all of the workers to finish to continue execution
    await Promise.all(workers);

    // Get the end time and total time
    const end = performance.now();
    const totalTime = (end - start) / 1000;
    
    const finalArray = new Int32Array(resultBuffer);
    return [finalArray, totalTime];
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
        sum += i;
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
    const finalArray = [];

    // Instantiate the values in the shared array
    for (let i = 1; i <= arr_len; i++) 
    {
        array[i-1] = i;
    }

    // Get the current time
    const start = performance.now();

    // Go through each element in the array and add it to the final array
    // if the value passes the predicate function
    for (let j = 0; j < arr_len; j++) {
        if (predicate_func(array[j]))
        {
            finalArray.push(array[j]);
        }
    }

    // Get the end time and total time
    const end = performance.now()
    const totalTime = (end - start) / 1000;

    // Return the resultant array
    return [finalArray, totalTime]
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
async function runTrials(arr_len)
{
    // Create an array to hold all of the trial results
    const data = [];

    for (let n_workers = 1; n_workers < 9; n_workers++){
        console.log("Thread Count =", n_workers);

        for (let trial = 1; trial < 4; trial++){
            const parallel_results = await parallel_filter(n_workers, arr_len);
            const serial_results = serial_filter(arr_len);

            const parallel_array = Array.from(parallel_results[0])
            const serial_array = serial_results[0]

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
async function exportToCSV(filename = "../Data/filter_data.csv") 
{
    // Run the trials
    const data = await runTrials(100000);

    const csvString = toCSV(data);
    fs.writeFileSync(filename, csvString, "utf8");
    console.log(`✅ CSV file saved as ${filename}`);
}


// Export the data to the CSV
exportToCSV()
