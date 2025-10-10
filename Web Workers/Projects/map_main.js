// Get the worker module
const { Worker } = require('worker_threads');
const fs = require("fs");

/*
* runWorker() -> This function instantiates a worker object, passing it the provided worker information
* 
* INPUTS 
*   - sharedData (SharedArrayBuffer) -> This is the memory buffer that will hold the input array
*   - indexStart (int) -> The start of the sub array that the worker should work on
*   - indexStart (int) -> The end of the sub array that the worker should work on
*   - predicate (String) -> The function that the worker thread should execute
* OUTPUTS 
*   - (Promise) -> A worker applying map the to indicated section
*/
function runWorker(sharedData, indexStart, indexEnd)
{
    // Create an object to pass to the worker thread
    // This will contain all of the information that the thread needs to execute
    const dataForWorker ={
        sharedBuffer: sharedData,
        indexStart: indexStart,
        indexEnd: indexEnd,
    };

    return new Promise((resolve, reject) => {
        const worker = new Worker('./map_worker.js', { workerData: dataForWorker });
        
        // Wait for worker to finish
        worker.on('message', (msg) => {
            //console.log(msg);
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
* parallel_map() -> This function executes the main map code 
* 
* INPUTS
*   - n_workers (int) -> The number of worker threads to be used
*   - arr_len (int) -> The length of the array to be filtered
*  
* OUTPUT
*   [Array, Double] -> This function returns the mapped array plus the time it took to create it
*/
async function parallel_map(n_workers, arr_len)
{
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const sharedArray = new Int32Array(sharedBuffer); // A typed 32-bit shared integer array buffer

    // Instantiate the values in the shared array
    for (let i = 0; i < arr_len; i++) 
    {
        sharedArray[i] = i;
    }

    // Get the start time
    const start = performance.now()

    // Split the array into equal chunks
    const chunk_size = Math.ceil(arr_len / n_workers);
    const workers = [];
    for (let i = 0; i < n_workers; i++)
    {   
        const start = i * chunk_size;
        const end = Math.min(start + chunk_size, arr_len);

        if (start < end) {
            workers.push(runWorker(sharedBuffer, start, end));
        }
    }

    // Wait for all workers
    await Promise.all(workers);

    // Get the end time and total time
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [sharedArray, totalTime];
}


/*
* predicate_func() -> This function takes the sum of all numbers up to the given input and then returns that number
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
    for (let i = 0; i <= x; i++) {
        sum += 1;
    }
    return sum
}

/*
* serial_map() -> This function goes through the input array and execute the map function on each of the elements in the array in serial
* 
* INPUTS
*   - arr_len (int) -> The length of the array to be filtered
*  
* OUTPUT
*   [Array, Double] -> This function returns the mapped array plus the time it took to create it
*/
function serial_map(arr_len)
{
    const array = new Array(arr_len)

    // Instantiate the values in the shared array
    for (let i = 0; i < arr_len; i++) 
    {
        array[i] = i;
    }

    // Get the start time
    const start = performance.now()
    
    // Go through and execute the predicate function on each of the elements
    for (let i = 0; i < arr_len; i++) {
        array[i] = predicate_func(i);
    }

    // Get the end time and total time
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [array, totalTime];
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
            const parallel_results = await parallel_map(n_workers, arr_len);
            const serial_results = serial_map(arr_len);

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
async function executeProgram(filename = "../Data/map_data.csv") 
{
    // Run the trials
    const data = await runTrials(100000);

    const csvString = toCSV(data);
    fs.writeFileSync(filename, csvString, "utf8");
    console.log(`✅ CSV file saved as ${filename}`);
}


// Export the data to the CSV
executeProgram();
// async function run()
// {
//     let results = await parallel_map(4, 5);
//     const s = serial_map(5)[0];

//     results = Array.from(results[0]);
//     console.log(s);
//     console.log(results);

//     console.assert(JSON.stringify(results) === JSON.stringify(s), "The two arrays are not equal");
// }

// run();


