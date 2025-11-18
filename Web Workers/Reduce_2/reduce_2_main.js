/*
------ REDUCE_2 MAIN ------
This logic controls the creation of web workers that executes a reduction on an array of specified size. 
-------------------------
*/

// Global State Variable object
const global_vars = {
    working_array_buffer: null,
    reduction_array_buffer: null,
    index_chunks: null,
    index_chunk_info: null,
    predicate_func: null,
}

const argument_vars = {
    worker_pool: null,
    max_chunk: null,
}

/*
* update_working_array() -> Update the working array based on the current reduction array
* 
* INPUTS
*   None
* 
* OUTPUTS 
*   None
*/
function update_working_array()
{
    global_vars.working_array_buffer = global_vars.reduction_array_buffer;
}

/*
* update_reduction_array() -> Update the working array based on the current reduction array
* 
* INPUTS
*   None
* 
* OUTPUTS 
*   None
*/
function update_reduction_array()
{
    const working_array_len = global_vars.reduction_array_buffer.byteLength / Int32Array.BYTES_PER_ELEMENT;
    const reduction_arr_len = Math.ceil(working_array_len / argument_vars.max_chunk);
    const reduction_array_buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * reduction_arr_len);

    global_vars.reduction_array_buffer = reduction_array_buffer;
}


/*
* update_index_chunks() -> Creates an array of index chunks for the current working array
* 
* INPUTS
*   None
* 
* OUTPUTS
*   None
*/
function update_index_chunks()
{
    const working_array_len = global_vars.working_array_buffer.byteLength / Int32Array.BYTES_PER_ELEMENT;
    const max_chunk = argument_vars.max_chunk;

    
    const index_chunk_info = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
    const ici_array = new Int32Array(index_chunk_info);
    ici_array[0] = 0;
    ici_array[1] = Math.ceil(working_array_len / max_chunk);

    // Create the index chunks of specified size
    const indexChunks = [];
    let indexCounter = 0;
    for (let i = 0; i < working_array_len; i += max_chunk)
    {
        const start = i;
        const end = Math.min(i + max_chunk, working_array_len);

        indexChunks.push([start, end, indexCounter]);
        indexCounter += 1;
    }

    global_vars.index_chunk_info = index_chunk_info;
    global_vars.index_chunks = indexChunks;
}


/*
* schedule_worker() -> This function handles sending the most recently relevant data to the workers
*   This function will take in a worker who needs to be assigned a task and that is (assumed to be) currently idle
*   Ideally, no worker would be calling this function if they are not idle
*   It then either:
*       1. tells the worker to wait if there are no index chunks left, but there are still other workers executing tasks
*       2. Updates the necessary arrays and batch activates all idle workers (where necessary)
* 
* INPUTS
*   - worker (Worker) -> A worker that needs to have a task assigned to it
* 
* OUTPUTS
*   - None
*/
function schedule_worker(worker)
{
    // Initially, set the status of the worker to not busy
    // Otherwise, it would not be asking the scheduler for a task
    const worker_pool_object = argument_vars.worker_pool.find(worker_pool_object => worker_pool_object.worker == worker);
    worker_pool_object.busy = false;

    // If there are no more index chunks left to give the worker, check if all of the workers have finished executing
    // If so, we can create a new working array of smaller size, made up of the results from the previous reduction round
    // if not, we tell the worker to wait until all workers have finished
    const allIdle = argument_vars.worker_pool.every(worker => !worker.busy);

    // If not all of the workers are finished, we must tell this worker to remain idle until they finish
    if (!allIdle) return;

    // console.log("Intermediate Reduction Array:", new Int32Array(global_vars.reduction_array_buffer));

    // Check the length of the current working array and see if it's small enough to reduce sequentially
    // If not, create a new working array, reduction array and index chunk array and send that information to the 
    // workers for another round of reductions
    const THRESHOLD = 10;

    const working_array_buffer_len = global_vars.reduction_array_buffer.byteLength / Int32Array.BYTES_PER_ELEMENT;
    if (allIdle && working_array_buffer_len >= THRESHOLD)
    {

        console.log()
        update_working_array();
        update_reduction_array();
        update_index_chunks();

        const loop_max = Math.min(argument_vars.worker_pool.length, global_vars.index_chunks.length);
        for (let i = 0; i < loop_max; i++) 
        {
            const data = {
                working_array_buffer: global_vars.working_array_buffer, 
                reduction_array_buffer: global_vars.reduction_array_buffer, 
                index_chunks: global_vars.index_chunks,
                index_chunk_info: global_vars.index_chunk_info,
                predicate_func_string: global_vars.predicate_func.toString(),
            }

            argument_vars.worker_pool[i].busy = true;
            argument_vars.worker_pool[i].worker.postMessage(data);
        }
        return;
    }
    
    // If all other conditional cases fail, then we ust have completed the reduction to a adequate extent
    // Therefore, we can terminate the worker
    for (let i = 0; i < argument_vars.worker_pool.length; i++)
    {
        argument_vars.worker_pool[i].resolver();
    }
}

/*
* create_worker() -> this function takes in a worker instance and creates an asynchronous promise for its completion
*   It also details the control flow for what to do when the worker finishes an assigned task
* 
* INPUTS
*   - worker (Worker) -> A worker instance
* 
* OUTPUTS
*   - Promise -> An asynchronous promise for the completion of the worker
*/
function create_worker(worker, worker_pool, index)
{
    return new Promise(( resolve, reject ) => {
        worker_pool[index].resolver = resolve;

        // Worker message control flow
        worker.onmessage = (event) => {
            schedule_worker(worker);
        }

        // Worker error control flow
        worker.onerror = (e) => {
            console.error("Worker error:", e.message, e.filename, e.lineno);
            reject();
        };
    });
}



/*
* initialize_workers() -> This function will create a pool of workers and a list of worker promises that can be awaited on
* 
* INPUTS
*   - n_workers (int) -> The number of workers that should be created
* 
* OUTPUTS
*   - worker_pool (Array) -> An array of objects including the worker instances and their activity status
*       ex. [ { worker: new Worker('..'), busy: true }, ...]
*   - worker_promises (Array) -> An array of promise objects 
*/
function initialize_workers(n_workers)
{
    // Create the workers and the worker_pool
    const worker_pool = [];
    for (let i = 0; i < n_workers; i++)
    {
        const worker = new Worker('./Reduce_2/reduce_2_worker.js');
        const data = {
            worker: worker,
            busy: false,
            resolver: null,
        }
        worker_pool.push(data);
    }

    // Create the array of worker promises
    // Do this by calling hte create_worker() function on each of the worker objects
    const worker_promises = worker_pool.map((data, index) => {
       return create_worker(data.worker, worker_pool, index);
    });


    return [worker_pool, worker_promises];
}


/* 
* async resolve_worker_promises() -> This function waits for the worker pomises to resolve and then executes the final reduction 
* 
* INPUTS
*   - worker_promises (Array) -> The array of worker promises that need to be resolved
* 
* OUTPUTS
*   - finalRes (int) -> The final reduced output
*/
async function resolve_worker_promises(worker_promises)
{
    // Wait for all of the promises to resolve
    await Promise.all(worker_promises)
        .then(() => {
            console.log("All worker promises resolved");
        })
        .catch((error) => {
            // One or more workers encountered an error
            console.log("One or more workers failed:", error)
    });

    // Get the reduction array and reduce it sequentially
    const reduction_array = new Int32Array(global_vars.reduction_array_buffer);
    const finalRes = reduction_array.reduce(global_vars.predicate_func, 1); // THIS MIGHT THROWN AN ERROR - OR CAUSE WEIRD RESULTS

    return finalRes;
}


/*
* async run_parallel_reduce() -> This function executes the overall parallel reduction on an array that it creates based on 
*   specified parameters
* 
* INPUTS
*   - arr_len (int) -> The length of the array that should be created
*   - n_workers (int) -> The number of web worker threads that should execute the function
*   - max_chunk (int) -> The size of the index chunks that should be given to the workers
*   - predicate_func (Function) -> This is the filtration function that will be run on every element of the array
*   
* OUTPUTS
*   - res (Array) -> The final result produced by the reduction function
*   - totalTime (float) -> The amount of time that it took to execute the function
*/
export async function run_parallel_reduce(array, arr_len, n_workers, max_chunk, predicate_func)
{
    // Set the global argument variables
    global_vars.predicate_func = predicate_func;
    argument_vars.max_chunk = max_chunk;

    // Create the initial working array buffer and wrapper array
    // Set that array to the global working_array_buffer variable
    const working_array_buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * arr_len);
    const working_array = new Int32Array(working_array_buffer);
    global_vars.working_array_buffer = working_array_buffer;

     // Initialize the values in the shared array
    for (let i = 0; i < arr_len; i++) 
    {
        working_array[i] = array[i];
    }

    // Creat the initial reduction array buffer and wrapper array
    // Set that array buffer to the global reduction_array_buffer variable
    const reduction_arr_len = Math.ceil(arr_len / max_chunk);
    const reduction_array_buffer = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * reduction_arr_len);
    global_vars.reduction_array_buffer = reduction_array_buffer;

    // Set up the index chunks
    update_index_chunks();

    // Get the start time
    const start = performance.now()
    
    // Initialize and start a pool of workers using the initialize worker functions
    // Initially, the created workers will be started but idle and waiting for a message to begin working
    const [worker_pool, worker_promises] = initialize_workers(n_workers);
    argument_vars.worker_pool = worker_pool;

    // Now we must start the idle workers by scheduling jobs for them to execute
    // We do this via calling the schedule_worker() function
    const loop_max = Math.min(argument_vars.worker_pool.length, global_vars.index_chunks.length);
    for (let i = 0; i < loop_max; i++) 
    {
        const data = {
                working_array_buffer: global_vars.working_array_buffer, 
                reduction_array_buffer: global_vars.reduction_array_buffer, 
                index_chunks: global_vars.index_chunks,
                index_chunk_info: global_vars.index_chunk_info,
                predicate_func_string: global_vars.predicate_func.toString()
        }

        argument_vars.worker_pool[i].busy = true;
        argument_vars.worker_pool[i].worker.postMessage(data);
    }

    

    // Await for each of the worker promises to resolve so that we can return the final reduction result
    let res;
    res = await resolve_worker_promises(worker_promises); // wait for promise to resolve

    // Get the total elapsed time
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [res, totalTime]
}


/*
* run_serial_reduce() -> This function reduces an array of given size in sequence
* 
* INPUTS
*   - arr_len (int) -> The length of the array that should be created
*   - predicate_func (Function) -> The function used to reduce the array
* 
*   - res (Array) -> The final result produced by the reduction function
*   - totalTime (float) -> The amount of time that it took to execute the function
*/
export function run_serial_reduce(array, arr_len, predicate_func)
{
    const working_array = [];
    for (let i = 0; i < arr_len; i++)
    {
        working_array.push(array[i]);
    }

    // Get the start time
    const start = performance.now()

    let res = 1;
    for (let i = 0; i < arr_len; i++)
    {
        res = predicate_func(res, working_array[i]);
    }

    // Get the total elapsed time
    const end = performance.now();
    const totalTime = (end - start) / 1000;

    return [res, totalTime]
}