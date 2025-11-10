/*
------ Map MAIN ------
This logic controls the creation of web workers that execute mapping on an array of specified size. 
-------------------------
*/

/*
* create_workers() -> This function creates promise objects for each worker thread and then posts the initial data to those thread
*   It additionally handles what happens when a worker thread finished and "asks" for more indices to work with
* 
* INPUTS
*   - worker (Worker) -> This is the worker object that had been initialized and is ready to be dispatched
*   - data (Object) -> The data that is to be posted to the worker thread
*   - indexChunks (Array) -> An array of predetermined index chunks that a worker thread can gain access to once they are done
* 
* OUTPUTS
*   - promise (Promise) -> This function returns a promise object for the worker (as it executes it's code asynchronously)
*/
function create_workers(worker, data, indexChunks) {
    // Create a promise object for the worker
    return new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
            // Check if there are more index chunks to be executed on
            if (indexChunks.length != 0) {
                const new_chunk = indexChunks.shift();
                data.indexChunk = new_chunk;
                worker.postMessage(data);
            }
            // Otherwise, we want to resolve this worker object
            else 
            {
                resolve('done');
            }
        }

        // Handle the case that the worker responds with an error
        worker.onerror = (e) => {
            console.error("Worker error:", e.message, e.filename, e.lineno);
            reject(error);
        };

        // Post the message to the worker
        // (if there are index chunks that have yet to be executed on)
        if (indexChunks.length != 0) {
            const new_chunk = indexChunks.shift();
            data.indexChunk = new_chunk;
            worker.postMessage(data);
        }
    });
}


/*
* initialize_workers() -> This function initializes the array that will be filtered as well as creates 
*   the workers and their promise objects
* 
* INPUTS 
*   - n_workers (int) -> The number of workers that should be created to filter the array
*   - max_chunk (int) -> The size of the index chunks that each thread will execute on at any give time
*   - arr_len (int) -> The length of the array that is to be filtered
*   - predicate_func_string (String) -> A string representation of the function that the worker thread should execute
* 
* OUTPUTS
*   - workerPromises (Array) -> An array of promise objects that are associated with each worker
*   - filterArray (Int32Array) -> An array wrapper around the shared memory buffer that each worker updates depending on predicate results
*   - sharedArray (Int32Array) -> The array that contains the original elements that are to be filtered
*/
function initialize_workers(sharedBuffer, n_workers, indexChunks, predicate_func_string)
{
    // Create the worker objects
    const workers = [];
    for (let i = 0; i < n_workers; i++)
    {
        const worker = new Worker('./Map/map_worker.js');
        workers.push(worker);
    }

    // Collect all of the promises for the workers
    const workerPromises = workers.map((worker, index) => {
        // Create a data object to pass to the workers
        const worker_data = {
            sharedBuffer: sharedBuffer,
            predicate_func_string: predicate_func_string,
            indexChunks: 0
        }

        // Create the workers
        return create_workers(worker, worker_data, indexChunks);
    });

    // Return the necessary information 
    return workerPromises
}


/*
* async run_workers() -> This function waits for each worker promise to finish that then creates the final filtered array
* 
* INPUTS 
*   - workerPromises (Array) -> An array of promise objects that are associated with each worker
*   - filterArray (Int32Array) -> An array wrapper around the shared memory buffer that each worker updates depending on predicate results
*   - sharedArray (Int32Array) -> The array that contains the original elements that are to be filtered 
* 
* OUTPUTS
*   - finalArray (Array) -> The final filtered array
*/
async function run_workers(workerPromises, sharedArray)
{
    // Wait for all of the promises to resolve
    await Promise.all(workerPromises)
        .catch((error) => {
            // One or more workers encountered an error
            console.error('One or more workers failed');
            // console.log("This is the error:", error)
    });

    // Return the filtered array
    return sharedArray
}

/*
* async run_parallel_filter() -> This function executes the parallel filter process and returns the filtered array and the time
*   that it took for the computer to execute that filtration. 
* 
* INPUTS
*   - arr_len (int) -> The length of the array that should be created
*   - n_workers (int) -> The number of web worker threads that should execute the function
*   - max_chunk (int) -> The size of the index chunks that should be given to the workers
*   - predicate_func_string (String) -> A string representation of the function that the worker thread should execute
*   
* OUTPUTS
*   - arr (Array) -> The final array after the function executing
*   - totalTime (float) -> The amount of time that it took to execute the function
*/
export async function run_parallel_map(arr_len, n_workers, max_chunk, predicate_func_string)
{
    // Create a shared memory buffer to hold the array that is to be filtered
    const sharedBuffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const sharedArray = new Int32Array(sharedBuffer);

    // Instantiate the values in the shared array
    for (let i = 0; i < arr_len; i++) 
    {
        sharedArray[i] = i;
    }

    // Create the index chunks of specified size
    const indexChunks = [];
    for (let i = 0; i < arr_len; i += max_chunk)
    {
        const start = i;
        const end = Math.min(i + max_chunk, arr_len);

        indexChunks.push([start, end]);
    }

    // Get the start time
    const start = performance.now()

    // Get the necessary information from the initialization of the worker threads
    const workerPromises = initialize_workers(sharedBuffer, n_workers, indexChunks, predicate_func_string); 

    // Attempt to run the workers and display the final filtered array
    let arr;
    try {
        arr = await run_workers(workerPromises, sharedArray); // wait for promise to resolve
    } catch (err) {
        console.log('Error running workers ' + err);
    }

    // Get the total elapsed time
    const end = performance.now();
    const totalTime = (end - start) / 1000;
    // timeOutput.textContent = `Elapsed Time: ${totalTime}`;

    return [arr, totalTime]
}



/*
* run_serial_map() -> This function goes through the input array and execute the map function on each of the elements in the array in serial
* 
* INPUTS
*   - arr_len (int) -> The length of the array to be filtered
*  
* OUTPUT
*   [Array, Double] -> This function returns the mapped array plus the time it took to create it
*/
export function run_serial_map(arr_len, predicate_func_string)
{
    const array = new Array(arr_len)

    // Turn the predicate function string into an actual function
    const predicate_func = new Function('data', `return (${predicate_func_string})(data);`);

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